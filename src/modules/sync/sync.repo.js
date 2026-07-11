import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados do SYNC (Fase 4).
 * Todo o SQL vive aqui para que os testes mockem via `vi.mock` sem Postgres real.
 *
 * REGRA DE ISOLAMENTO (transversal): nenhuma leitura/escrita toca dados sem
 * amarrar ao user_id. Tarefas/completions/reminders são sempre resolvidos com
 * JOIN em routines (ou filtro direto por user_id) para garantir que pertencem
 * ao usuário logado. Uma entidade de outro usuário simplesmente "não existe"
 * do ponto de vista destas funções — nunca é lida nem escrita.
 *
 * DELTAS: tasks/routines/reminders possuem `updated_at`; completions só possui
 * `created_at` (ver 0001_init.sql). Por isso o delta de completions usa
 * `created_at`. Todas as funções aceitam `since` (ISO) opcional; quando nulo,
 * retornam o estado completo do usuário.
 */

// ==== PULL (deltas por usuário) ============================================

/** Rotina única do usuário (ou null). */
export async function findRoutineByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM routines WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

/** Cria a rotina default do usuário (sob demanda). */
export async function createRoutine(userId) {
  const { rows } = await pool.query(
    'INSERT INTO routines (user_id) VALUES ($1) RETURNING *',
    [userId],
  );
  return rows[0];
}

/**
 * Tasks do usuário alteradas desde `since` (ou todas se `since` nulo).
 * Isolamento via JOIN routines.user_id.
 */
export async function findTasksDelta(userId, since) {
  const { rows } = await pool.query(
    `SELECT t.*
       FROM tasks t
       JOIN routines r ON r.id = t.routine_id
      WHERE r.user_id = $1
        AND ($2::timestamptz IS NULL OR t.updated_at > $2)
      ORDER BY t.weekday ASC, t.sort_order ASC, t."time" ASC, t.created_at ASC`,
    [userId, since],
  );
  return rows;
}

/**
 * Completions do usuário criadas desde `since` (ou todas).
 * Delta por `created_at` (completions não têm `updated_at`).
 */
export async function findCompletionsDelta(userId, since) {
  const { rows } = await pool.query(
    `SELECT task_id, done_date, created_at
       FROM completions
      WHERE user_id = $1
        AND ($2::timestamptz IS NULL OR created_at > $2)
      ORDER BY done_date ASC`,
    [userId, since],
  );
  return rows;
}

/** Reminders do usuário alterados desde `since` (ou todos). */
export async function findRemindersDelta(userId, since) {
  const { rows } = await pool.query(
    `SELECT task_id, weekday, "time", label, enabled, updated_at
       FROM reminders
      WHERE user_id = $1
        AND ($2::timestamptz IS NULL OR updated_at > $2)
      ORDER BY weekday ASC, "time" ASC`,
    [userId, since],
  );
  return rows;
}

/** now() do servidor em ISO — o cliente guarda como próximo `since`. */
export async function serverNow() {
  const { rows } = await pool.query('SELECT now() AS now');
  return rows[0].now;
}

// ==== PUSH (mutações em transação) =========================================

/**
 * Abre um client dedicado e executa `fn(txClient)` dentro de BEGIN/COMMIT.
 * Em erro NÃO tratado, faz ROLLBACK. Conflitos individuais NÃO devem lançar —
 * o service os trata e pula, mantendo a transação viva (ver sync.service.js).
 *
 * O objeto `tx` exposto para o service tem apenas os métodos de escrita/leitura
 * necessários, todos parametrizados por userId para isolamento.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(makeTx(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Constrói a fachada transacional usada pelo service. */
function makeTx(client) {
  return {
    // ---- TASK ----

    /**
     * Estado atual de uma task DO USUÁRIO (via JOIN routines). Retorna a linha
     * ({ id, updated_at, ... }) ou null se não existe / não é do usuário.
     */
    async getTaskForUser(userId, taskId) {
      const { rows } = await client.query(
        `SELECT t.*
           FROM tasks t
           JOIN routines r ON r.id = t.routine_id
          WHERE t.id = $1 AND r.user_id = $2
          LIMIT 1`,
        [taskId, userId],
      );
      return rows[0] || null;
    },

    /**
     * A task com este id existe (para QUALQUER usuário)? Usado para blindar o
     * upsert por id contra sequestro de PK de outro usuário: se o id já existe
     * mas NÃO é do usuário, o caller trata como forbidden e não escreve.
     */
    async taskIdExists(taskId) {
      const { rows } = await client.query('SELECT 1 FROM tasks WHERE id = $1 LIMIT 1', [taskId]);
      return rows.length > 0;
    },

    /** Rotina do usuário (para inserir tasks novas). Cria sob demanda. */
    async ensureRoutine(userId) {
      const found = await client.query(
        'SELECT * FROM routines WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
        [userId],
      );
      if (found.rows[0]) return found.rows[0];
      const created = await client.query(
        'INSERT INTO routines (user_id) VALUES ($1) RETURNING *',
        [userId],
      );
      return created.rows[0];
    },

    /**
     * Upsert de task por id na rotina do usuário. Só atualiza uma task existente
     * se ela pertence ao usuário (garantido pelo caller com getTaskForUser).
     * Para task nova, insere na rotina do usuário com o id fornecido pelo cliente.
     */
    async upsertTask(routineId, data) {
      const { rows } = await client.query(
        `INSERT INTO tasks
           (id, routine_id, weekday, "time", label, block, detail, rule, sort_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         ON CONFLICT (id) DO UPDATE
           SET weekday    = EXCLUDED.weekday,
               "time"     = EXCLUDED."time",
               label      = EXCLUDED.label,
               block      = EXCLUDED.block,
               detail     = EXCLUDED.detail,
               rule       = EXCLUDED.rule,
               sort_order = EXCLUDED.sort_order,
               updated_at = now()
         RETURNING *`,
        [
          data.id,
          routineId,
          data.weekday,
          data.time,
          data.label,
          data.block,
          data.detail ?? '',
          data.rule ?? '',
          data.sortOrder ?? 0,
        ],
      );
      return rows[0];
    },

    /** Remove a task SOMENTE se pertence ao usuário. Retorna true se removeu. */
    async deleteTaskForUser(userId, taskId) {
      const { rowCount } = await client.query(
        `DELETE FROM tasks t
           USING routines r
          WHERE t.id = $1 AND t.routine_id = r.id AND r.user_id = $2`,
        [taskId, userId],
      );
      return rowCount > 0;
    },

    // ---- COMPLETION ----

    /** A task pertence ao usuário? (JOIN routines). */
    async taskBelongsToUser(userId, taskId) {
      const { rows } = await client.query(
        `SELECT 1 FROM tasks t JOIN routines r ON r.id = t.routine_id
          WHERE t.id = $1 AND r.user_id = $2 LIMIT 1`,
        [taskId, userId],
      );
      return rows.length > 0;
    },

    /** Upsert idempotente de completion (done=true). */
    async upsertCompletion(userId, taskId, date) {
      const { rows } = await client.query(
        `INSERT INTO completions (user_id, task_id, done_date)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, task_id, done_date) DO UPDATE SET user_id = EXCLUDED.user_id
         RETURNING task_id, done_date`,
        [userId, taskId, date],
      );
      return rows[0];
    },

    /** Remove completion (done=false), sempre por user_id. */
    async deleteCompletion(userId, taskId, date) {
      const { rowCount } = await client.query(
        `DELETE FROM completions WHERE user_id = $1 AND task_id = $2 AND done_date = $3`,
        [userId, taskId, date],
      );
      return rowCount > 0;
    },

    // ---- REMINDER ----

    /** Estado atual do reminder do usuário para a task (ou null). */
    async getReminderForUser(userId, taskId) {
      const { rows } = await client.query(
        `SELECT task_id, weekday, "time", label, enabled, updated_at
           FROM reminders WHERE user_id = $1 AND task_id = $2 LIMIT 1`,
        [userId, taskId],
      );
      return rows[0] || null;
    },

    /** Upsert do reminder do usuário (UNIQUE user_id, task_id). */
    async upsertReminder(userId, { taskId, weekday, time, label = null, enabled }) {
      const { rows } = await client.query(
        `INSERT INTO reminders (user_id, task_id, weekday, "time", label, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (user_id, task_id) DO UPDATE
           SET weekday    = EXCLUDED.weekday,
               "time"     = EXCLUDED."time",
               label      = EXCLUDED.label,
               enabled    = EXCLUDED.enabled,
               updated_at = now()
         RETURNING task_id, weekday, "time", label, enabled`,
        [userId, taskId, weekday, time, label, enabled],
      );
      return rows[0];
    },

    /** Remove reminder do usuário para a task. Retorna true se removeu. */
    async deleteReminder(userId, taskId) {
      const { rowCount } = await client.query(
        `DELETE FROM reminders WHERE user_id = $1 AND task_id = $2`,
        [userId, taskId],
      );
      return rowCount > 0;
    },
  };
}
