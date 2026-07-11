import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { putReminderSchema } from './reminders.schema.js';
import * as service from './reminders.service.js';

/** Valida `data` contra um schema zod. Em falha, lança 400 com detalhes. */
function validate(schema, data) {
  const result = schema.safeParse(data);
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

export function createRemindersRouter() {
  const router = Router();

  // Todas as rotas exigem autenticação; isolamento por req.user.id no service/repo.
  router.use(requireAuth);

  router.get(
    '/',
    wrap(async (req, res) => {
      const result = await service.listReminders(req.user.id);
      res.status(200).json(result);
    }),
  );

  router.put(
    '/',
    wrap(async (req, res) => {
      const data = validate(putReminderSchema, req.body);
      const result = await service.putReminder(req.user.id, data);
      res.status(200).json(result);
    }),
  );

  return router;
}

export default createRemindersRouter;
