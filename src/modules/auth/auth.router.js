import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimit } from '../../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  googleSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schema.js';
import * as service from './auth.service.js';

/**
 * Valida `req.body` contra um schema zod. Em falha, lança 400 com detalhes.
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

export function createAuthRouter() {
  const router = Router();

  // Rate limit estrito para todo o /auth/*.
  router.use(authRateLimit);

  router.post(
    '/register',
    wrap(async (req, res) => {
      const data = validate(registerSchema, req.body);
      const result = await service.register(data);
      res.status(201).json(result);
    }),
  );

  router.post(
    '/login',
    wrap(async (req, res) => {
      const data = validate(loginSchema, req.body);
      const result = await service.login(data);
      res.status(200).json(result);
    }),
  );

  router.post(
    '/google',
    wrap(async (req, res) => {
      const data = validate(googleSchema, req.body);
      const result = await service.loginWithGoogle(data);
      res.status(200).json(result);
    }),
  );

  router.post(
    '/refresh',
    wrap(async (req, res) => {
      const data = validate(refreshSchema, req.body);
      const result = await service.refresh(data);
      res.status(200).json(result);
    }),
  );

  router.post(
    '/logout',
    wrap(async (req, res) => {
      const data = validate(logoutSchema, req.body);
      await service.logout(data);
      res.status(204).end();
    }),
  );

  return router;
}

/** Router para GET /me (protegida). Separado de /auth para montar na raiz. */
export function createMeRouter() {
  const router = Router();
  router.get(
    '/me',
    requireAuth,
    wrap(async (req, res) => {
      const result = await service.getMe(req.user.id);
      res.status(200).json(result);
    }),
  );
  return router;
}
