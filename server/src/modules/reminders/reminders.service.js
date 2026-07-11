import * as repo from './reminders.repo.js';

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/** Projeção camelCase de um reminder para o cliente. */
function toPublicReminder(row) {
  return {
    taskId: row.task_id,
    weekday: row.weekday,
    time: row.time,
    label: row.label ?? null,
    enabled: row.enabled,
  };
}

/** GET /reminders — lista reminders do usuário. */
export async function listReminders(userId) {
  const rows = await repo.listReminders(userId);
  return { reminders: rows.map(toPublicReminder) };
}

/**
 * PUT /reminders — upsert do reminder do usuário para a task.
 * Só age se a task pertence ao usuário; senão 404.
 */
export async function putReminder(userId, data) {
  const owns = await repo.taskBelongsToUser(userId, data.taskId);
  if (!owns) {
    throw httpError(404, 'Tarefa não encontrada', 'TASK_NOT_FOUND');
  }
  const row = await repo.upsertReminder(userId, data);
  return { reminder: toPublicReminder(row) };
}
