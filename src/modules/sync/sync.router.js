import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { pullSchema, pushSchema } from './sync.schema.js';
import * as service from './sync.service.js';

/**
 * Valida `req.body` contra um schema zod. Em falha, lança 400 com detalhes.
 * (Mesmo padrão dos demais routers.)
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
 * Router de sync offline-first (Fase 4). Toda rota é protegida por requireAuth
 * e opera exclusivamente sobre os dados do usuário logado (isolamento por user_id).
 */
export function createSyncRouter() {
  const router = Router();

  router.use(requireAuth);

  // POST /sync/pull → estado (delta desde `since` ou completo).
  router.post(
    '/pull',
    wrap(async (req, res) => {
      const { since } = validate(pullSchema, req.body ?? {});
      const result = await service.pull(req.user.id, since ?? null);
      res.status(200).json(result);
    }),
  );

  // POST /sync/push → aplica mutações → { applied[], conflicts[] }.
  router.post(
    '/push',
    wrap(async (req, res) => {
      const { mutations } = validate(pushSchema, req.body ?? {});
      const result = await service.push(req.user.id, mutations);
      res.status(200).json(result);
    }),
  );

  return router;
}

export default createSyncRouter;
