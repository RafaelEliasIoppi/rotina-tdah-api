import * as repo from './routines.repo.js';

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/**
 * Projeção pública de uma tarefa no formato do cliente.
 * NUNCA expõe user_id/routine_id nem outros ids internos além do id da própria task.
 */
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
  };
}

/** Projeção pública de uma rotina. */
export function toPublicRoutine(row) {
  return {
    id: row.id,
    name: row.name ?? 'Minha rotina',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Garante a rotina do usuário: retorna a existente ou cria sob demanda.
 * A rotina default normalmente já é criada no register, mas criamos aqui
 * caso não exista (robustez).
 */
async function ensureRoutine(userId) {
  let routine = await repo.findRoutineByUserId(userId);
  if (!routine) {
    routine = await repo.createRoutine(userId);
  }
  return routine;
}

/** GET /routine → { routine, tasks[] } do usuário logado. */
export async function getRoutine(userId) {
  const routine = await ensureRoutine(userId);
  const tasks = await repo.findTasksByRoutineId(routine.id);
  return {
    routine: toPublicRoutine(routine),
    tasks: tasks.map(toPublicTask),
  };
}

/** PUT /routine/tasks → substitui todo o conjunto de tarefas. */
export async function replaceTasks(userId, tasks) {
  const routine = await ensureRoutine(userId);
  const inserted = await repo.replaceTasks(routine.id, tasks);
  return { tasks: inserted.map(toPublicTask) };
}

/** POST /routine/tasks → cria uma tarefa na rotina do usuário. */
export async function createTask(userId, task) {
  const routine = await ensureRoutine(userId);
  const row = await repo.insertTask(routine.id, task);
  return { task: toPublicTask(row) };
}

/**
 * PATCH /routine/tasks/:id → atualiza campos, SOMENTE se a task é do usuário.
 * Não pertence / não existe → 404 (não 403, para não revelar existência).
 */
export async function updateTask(userId, taskId, data) {
  // Traduz o payload (camelCase) para as colunas do banco (snake_case).
  const fields = {};
  if (data.weekday !== undefined) fields.weekday = data.weekday;
  if (data.time !== undefined) fields.time = data.time;
  if (data.label !== undefined) fields.label = data.label;
  if (data.block !== undefined) fields.block = data.block;
  if (data.detail !== undefined) fields.detail = data.detail;
  if (data.rule !== undefined) fields.rule = data.rule;
  if (data.sortOrder !== undefined) fields.sort_order = data.sortOrder;

  const row = await repo.updateTaskForUser(taskId, userId, fields);
  if (!row) throw httpError(404, 'Tarefa não encontrada', 'TASK_NOT_FOUND');
  return { task: toPublicTask(row) };
}

/**
 * DELETE /routine/tasks/:id → remove, SOMENTE se a task é do usuário.
 * Não pertence / não existe → 404.
 */
export async function deleteTask(userId, taskId) {
  const ok = await repo.deleteTaskForUser(taskId, userId);
  if (!ok) throw httpError(404, 'Tarefa não encontrada', 'TASK_NOT_FOUND');
}
