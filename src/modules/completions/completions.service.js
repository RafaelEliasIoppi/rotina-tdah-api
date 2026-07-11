import * as repo from './completions.repo.js';

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/** Normaliza uma data (Date ou string) para 'YYYY-MM-DD'. */
function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/** Projeção camelCase de uma completion para o cliente. */
function toPublicCompletion(row) {
  return { taskId: row.task_id, date: toDateStr(row.done_date), done: true };
}

/**
 * GET /completions — lista completions do usuário no intervalo.
 * Default: últimos 30 dias (inclui hoje) quando from/to ausentes.
 */
export async function listCompletions(userId, { from, to } = {}) {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const past = new Date(today);
  past.setUTCDate(past.getUTCDate() - 30);
  const defaultFrom = past.toISOString().slice(0, 10);

  const fromDate = from ?? defaultFrom;
  const toDate = to ?? defaultTo;

  if (fromDate > toDate) {
    throw httpError(400, 'Intervalo inválido: from é posterior a to', 'INVALID_RANGE');
  }

  const rows = await repo.listCompletions(userId, fromDate, toDate);
  return { completions: rows.map(toPublicCompletion) };
}

/**
 * PUT /completions — marca (done=true) ou desmarca (done=false).
 * Só age se a task pertence ao usuário; senão 404.
 */
export async function putCompletion(userId, { taskId, date, done }) {
  const owns = await repo.taskBelongsToUser(userId, taskId);
  if (!owns) {
    throw httpError(404, 'Tarefa não encontrada', 'TASK_NOT_FOUND');
  }

  if (done) {
    const row = await repo.upsertCompletion(userId, taskId, date);
    return { completion: toPublicCompletion(row) };
  }

  await repo.deleteCompletion(userId, taskId, date);
  return { completion: null };
}
