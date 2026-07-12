import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { acceptInviteSchema } from './social.schema.js';
import * as service from './social.service.js';

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

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Router do módulo social: accountability partner (par único) e body
 * doubling assíncrono (contagem agregada de foco ativo). Toda rota exige
 * auth; nenhuma rota expõe dado de um usuário a outro além do que já é
 * intencionalmente compartilhado (nome do parceiro após par formado,
 * contagem agregada de foco).
 */
export function createSocialRouter() {
  const router = Router();

  router.use(requireAuth);

  // POST /social/invite → gera código de convite
  router.post(
    '/invite',
    wrap(async (req, res) => {
      const result = await service.createInvite(req.user.id);
      res.status(201).json(result);
    }),
  );

  // POST /social/invite/accept → aceita convite, forma o par
  router.post(
    '/invite/accept',
    wrap(async (req, res) => {
      const data = validate(acceptInviteSchema, req.body);
      const result = await service.acceptInvite(req.user.id, data.code);
      res.status(200).json(result);
    }),
  );

  // GET /social/partner → status do par + progresso do dia
  router.get(
    '/partner',
    wrap(async (req, res) => {
      const result = await service.getPartnerStatus(req.user.id);
      res.status(200).json(result);
    }),
  );

  // DELETE /social/partner → desfaz o par
  router.delete(
    '/partner',
    wrap(async (req, res) => {
      await service.removePartner(req.user.id);
      res.status(204).end();
    }),
  );

  // POST /social/focus/heartbeat → registra presença em bloco de foco
  router.post(
    '/focus/heartbeat',
    wrap(async (req, res) => {
      const result = await service.sendFocusHeartbeat(req.user.id);
      res.status(200).json(result);
    }),
  );

  // DELETE /social/focus/heartbeat → encerra sessão de foco
  router.delete(
    '/focus/heartbeat',
    wrap(async (req, res) => {
      await service.endFocusHeartbeat(req.user.id);
      res.status(204).end();
    }),
  );

  // GET /social/focus/count → contagem agregada (não exige estar em foco)
  router.get(
    '/focus/count',
    wrap(async (req, res) => {
      const result = await service.getFocusCount();
      res.status(200).json(result);
    }),
  );

  return router;
}

export default createSocialRouter;
