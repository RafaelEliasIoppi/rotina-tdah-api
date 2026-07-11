import rateLimit from 'express-rate-limit';

/**
 * Rate limit estrito e específico para as rotas de /auth/*.
 * Protege register/login/refresh contra força bruta: 10 req/min por IP.
 * Desligado em ambiente de teste para não interferir nos testes de integração.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Muitas requisições. Tente novamente em instantes.', code: 'RATE_LIMITED' } },
});

export default authRateLimit;
