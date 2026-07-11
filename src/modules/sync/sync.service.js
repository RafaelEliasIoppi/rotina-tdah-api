import * as repo from './sync.repo.js';

/**
 * SERVIÇO DE SYNC OFFLINE-FIRST (Fase 4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEMÂNTICA DE CONFLITO: LAST-WRITE-WINS (LWW) por timestamp.
 * ─────────────────────────────────────────────────────────────────────────────
 * O cliente offline acumula mutações e as envia em /sync/push, cada uma com o
 * `clientUpdatedAt` (quando a mudança ocorreu no dispositivo). Para cada mutação
 * sobre uma entidade versionada (task, reminder), comparamos com o `updated_at`
 * da versão vigente no servidor:
 *
 *   - servidor.updated_at > clientUpdatedAt  → o servidor tem uma escrita MAIS
 *     RECENTE. A mutação do cliente é considerada perdedora do conflito: NÃO
 *     sobrescreve nada, vai para `conflicts` com reason 'stale', e devolvemos a
 *     versão vigente do servidor (`server`) para o cliente reconciliar.
 *   - caso contrário → aplica (upsert/delete) e vai para `applied`.
 *
 * ISOLAMENTO POR USUÁRIO: toda mutação só toca entidades do próprio usuário
 * (resolvidas por JOIN routines.user_id). Mutação endereçada a entidade de
 * OUTRO usuário (ou inexistente, em delete/update) vai para `conflicts` com
 * reason 'forbidden' e NADA é escrito — não revelamos se a entidade existe.
 *
 * TRANSAÇÃO: todo o push roda em UMA transação (BEGIN/COMMIT). Escolha de
 * projeto: um conflito individual NÃO aborta a transação inteira — ele é
 * simplesmente pulado (nenhuma escrita é feita para aquela mutação) e reportado
 * em `conflicts`. Só um erro inesperado (ex.: falha de banco) faz ROLLBACK de
 * tudo. Assim, um lote de N mutações com alguns conflitos ainda persiste as
 * mutações válidas atomicamente, e o cliente sabe exatamente o que reconciliar.
 *
 * LIMITAÇÕES DO MVP (documentadas):
 *  - COMPLETIONS não têm coluna `updated_at` (só `created_at`) e são tratadas
 *    como FATOS IDEMPOTENTES: marcar (upsert) / desmarcar (delete). Não há
 *    resolução LWW para completions — a última operação recebida no lote vence,
 *    o que é aceitável porque a operação é idempotente e sem conteúdo mutável.
 *  - LWW pode causar perda de uma edição concorrente perdedora (comportamento
 *    esperado e documentado). O cliente recebe a versão vencedora em `conflicts`
 *    para exibir/reconciliar; não há merge campo-a-campo no MVP.
 *  - A comparação é por timestamp; relógios de cliente adiantados podem fazer
 *    uma escrita antiga "ganhar". Aceitável no MVP.
 */

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// ==== Projeções camelCase para o cliente ===================================

export function toPublicRoutine(row) {
  return {
    id: row.id,
    name: row.name ?? 'Minha rotina',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicTask(row) {
  return {
    id: row.id,
    weekday: row.weekday,
    time: row.time,
    label: row.label,
    block: row.block,
    detail: row.detail ?? '',
    rule: row.rule ?? '',
    sortOrder: row.sort_order ?? 0,
    updatedAt: row.updated_at,
  };
}

function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function toPublicCompletion(row) {
  return { taskId: row.task_id, date: toDateStr(row.done_date), done: true };
}

export function toPublicReminder(row) {
  return {
    taskId: row.task_id,
    weekday: row.weekday,
    time: row.time,
    label: row.label ?? null,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  };
}

// ==== PULL ==================================================================

/**
 * POST /sync/pull — retorna o estado do usuário que mudou desde `since`
 * (ou tudo, se `since` ausente). `serverTime` é o now() do servidor que o
 * cliente guardará como próximo `since`.
 */
export async function pull(userId, since = null) {
  // Garante a rotina do usuário (cria sob demanda para clientes novos).
  let routine = await repo.findRoutineByUserId(userId);
  if (!routine) routine = await repo.createRoutine(userId);

  const [tasks, completions, reminders, serverTime] = await Promise.all([
    repo.findTasksDelta(userId, since),
    repo.findCompletionsDelta(userId, since),
    repo.findRemindersDelta(userId, since),
    repo.serverNow(),
  ]);

  return {
    routine: toPublicRoutine(routine),
    tasks: tasks.map(toPublicTask),
    completions: completions.map(toPublicCompletion),
    reminders: reminders.map(toPublicReminder),
    serverTime: serverTime instanceof Date ? serverTime.toISOString() : serverTime,
  };
}

// ==== PUSH =================================================================

/** true se `serverUpdatedAt` é ESTRITAMENTE mais novo que `clientUpdatedAt`. */
function serverIsNewer(serverUpdatedAt, clientUpdatedAt) {
  const s = new Date(serverUpdatedAt).getTime();
  const c = new Date(clientUpdatedAt).getTime();
  return s > c;
}

/**
 * POST /sync/push — aplica uma lista ordenada de mutações do cliente offline.
 * Retorna { applied: [...], conflicts: [...] }.
 *
 * Cada item de `applied` descreve a mutação aplicada; cada item de `conflicts`
 * traz { entity, op, reason, id/task, server? } para o cliente reconciliar.
 */
export async function push(userId, mutations) {
  return repo.withTransaction(async (tx) => {
    const applied = [];
    const conflicts = [];

    for (const m of mutations) {
      // Isolamos cada mutação num try local: um erro inesperado em uma mutação
      // propaga (aborta a transação). Conflitos são fluxo normal (não lançam).
      const outcome = await applyMutation(tx, userId, m);
      if (outcome.conflict) conflicts.push(outcome.conflict);
      else applied.push(outcome.applied);
    }

    return { applied, conflicts };
  });
}

/** Roteia uma mutação para o handler da sua entidade. */
async function applyMutation(tx, userId, m) {
  if (m.entity === 'task') return applyTask(tx, userId, m);
  if (m.entity === 'completion') return applyCompletion(tx, userId, m);
  return applyReminder(tx, userId, m);
}

// ---- TASK -----------------------------------------------------------------

async function applyTask(tx, userId, m) {
  const id = m.data.id;

  if (m.op === 'delete') {
    const current = await tx.getTaskForUser(userId, id);
    if (!current) {
      // Não existe OU é de outro usuário → forbidden (não revela qual).
      return forbidden('task', 'delete', { id });
    }
    if (serverIsNewer(current.updated_at, m.clientUpdatedAt)) {
      return stale('task', 'delete', { id }, toPublicTask(current));
    }
    await tx.deleteTaskForUser(userId, id);
    return ok('task', 'delete', { id });
  }

  // upsert
  const current = await tx.getTaskForUser(userId, id);
  if (current) {
    // Task existente: precisa ser do usuário (getTaskForUser já garante isso).
    if (serverIsNewer(current.updated_at, m.clientUpdatedAt)) {
      return stale('task', 'upsert', { id }, toPublicTask(current));
    }
    const routineId = current.routine_id;
    const row = await tx.upsertTask(routineId, m.data);
    return ok('task', 'upsert', { id }, toPublicTask(row));
  }

  // Task NÃO é do usuário (getTaskForUser retornou null). Ou o id é totalmente
  // novo, ou já pertence a OUTRO usuário. Blindamos contra sequestro de PK: se
  // o id já existe (em qualquer rotina), é de outro usuário → forbidden, sem
  // escrever (um ON CONFLICT (id) DO UPDATE sem esse guard sobrescreveria a
  // linha alheia, vazando/corrompendo dados de outro usuário).
  if (await tx.taskIdExists(id)) {
    return forbidden('task', 'upsert', { id });
  }
  const routine = await tx.ensureRoutine(userId);
  const row = await tx.upsertTask(routine.id, m.data);
  return ok('task', 'upsert', { id }, toPublicTask(row));
}

// ---- COMPLETION -----------------------------------------------------------

async function applyCompletion(tx, userId, m) {
  const { taskId, date } = m.data;
  const owns = await tx.taskBelongsToUser(userId, taskId);
  if (!owns) return forbidden('completion', m.op, { taskId, date });

  if (m.op === 'delete') {
    await tx.deleteCompletion(userId, taskId, date);
    return ok('completion', 'delete', { taskId, date });
  }
  const row = await tx.upsertCompletion(userId, taskId, date);
  return ok('completion', 'upsert', { taskId, date }, toPublicCompletion(row));
}

// ---- REMINDER -------------------------------------------------------------

async function applyReminder(tx, userId, m) {
  const { taskId } = m.data;
  // Reminder está amarrado a uma task; a task tem de ser do usuário.
  const owns = await tx.taskBelongsToUser(userId, taskId);
  if (!owns) return forbidden('reminder', m.op, { taskId });

  const current = await tx.getReminderForUser(userId, taskId);
  if (current && serverIsNewer(current.updated_at, m.clientUpdatedAt)) {
    return stale('reminder', m.op, { taskId }, toPublicReminder(current));
  }

  if (m.op === 'delete') {
    await tx.deleteReminder(userId, taskId);
    return ok('reminder', 'delete', { taskId });
  }
  const row = await tx.upsertReminder(userId, m.data);
  return ok('reminder', 'upsert', { taskId }, toPublicReminder(row));
}

// ==== Helpers de resultado =================================================

function ok(entity, op, ref, server) {
  return { applied: { entity, op, ...ref, ...(server ? { server } : {}) } };
}

function stale(entity, op, ref, server) {
  return { conflict: { entity, op, reason: 'stale', ...ref, server } };
}

function forbidden(entity, op, ref) {
  return { conflict: { entity, op, reason: 'forbidden', ...ref } };
}
