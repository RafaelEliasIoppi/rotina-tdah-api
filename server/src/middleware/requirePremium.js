import * as subscriptionsRepo from '../modules/subscriptions/subscriptions.repo.js';

/**
 * Middleware que bloqueia rotas para usuários sem assinatura premium ativa.
 * Deve ser usado APÓS requireAuth (depende de req.user.id já preenchido).
 * Sem assinatura, ou plano diferente de 'premium' → 403 JSON (via errorHandler).
 */
export async function requirePremium(req, res, next) {
  try {
    const sub = await subscriptionsRepo.findByUserId(req.user.id);

    if (!sub || sub.plan !== 'premium') {
      return next(forbidden('Recurso disponível apenas para assinantes Premium'));
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  err.code = 'PREMIUM_REQUIRED';
  return err;
}

export default requirePremium;
