import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  replaceTasksSchema,
  createTaskSchema,
  updateTaskSchema,
} from './routines.schema.js';
import * as service from './routines.service.js';

/**
 * Valida `req.body` contra um schema zod. Em falha, lança 400 com detalhes.
 * (Mesmo padrão do auth.router.js.)
 */
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => i.message).join('; '));
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return result.data;
}

/** Envolve um handler async e encaminha erros ao errorHandler. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Router de rotina + tarefas. Toda rota é protegida por requireAuth e
 * opera exclusivamente sobre a rotina do usuário logado (isolamento por user_id).
 */
export function createRoutinesRouter() {
  const router = Router();

  // Todas as rotas exigem autenticação.
  router.use(requireAuth);

  // GET /routine → { routine, tasks[] }
  router.get(
    '/routine',
    wrap(async (req, res) => {
      const result = await service.getRoutine(req.user.id);
      res.status(200).json(result);
    }),
  );

  // PUT /routine/tasks → substitui todo o conjunto → { tasks[] }
  router.put(
    '/routine/tasks',
    wrap(async (req, res) => {
      const { tasks } = validate(replaceTasksSchema, req.body);
      const result = await service.replaceTasks(req.user.id, tasks);
      res.status(200).json(result);
    }),
  );

  // POST /routine/tasks → cria uma tarefa → { task }
  router.post(
    '/routine/tasks',
    wrap(async (req, res) => {
      const { task } = validate(createTaskSchema, req.body);
      const result = await service.createTask(req.user.id, task);
      res.status(201).json(result);
    }),
  );

  // PATCH /routine/tasks/:id → atualiza (só se for do usuário) → { task }
  router.patch(
    '/routine/tasks/:id',
    wrap(async (req, res) => {
      const data = validate(updateTaskSchema, req.body);
      const result = await service.updateTask(req.user.id, req.params.id, data);
      res.status(200).json(result);
    }),
  );

  // DELETE /routine/tasks/:id → remove (só se for do usuário) → 204
  router.delete(
    '/routine/tasks/:id',
    wrap(async (req, res) => {
      await service.deleteTask(req.user.id, req.params.id);
      res.status(204).end();
    }),
  );

  return router;
}

export default createRoutinesRouter;
