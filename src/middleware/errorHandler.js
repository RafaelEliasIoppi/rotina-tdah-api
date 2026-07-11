import { env } from '../config/env.js';

/**
 * Middleware de erro central.
 * Responde JSON no formato { error: { message, code } }.
 * Não vaza stack trace em produção.
 */
// eslint-disable-next-line no-unused-vars -- assinatura de 4 args é o que marca como error handler no Express
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message =
    status === 500 && env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message || 'Erro inesperado';

  if (status === 500) {
    console.error('[error]', err);
  }

  const body = { error: { message, code } };
  // Só expõe stack fora de produção, para facilitar debug.
  if (env.NODE_ENV !== 'production' && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

export default errorHandler;
