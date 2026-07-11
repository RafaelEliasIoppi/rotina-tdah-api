import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Middleware de autenticação: extrai o Bearer token do header Authorization,
 * verifica o JWT e injeta `req.user = { id, email }`.
 * Sem token ou token inválido → 401 JSON (via errorHandler).
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Token de acesso ausente ou malformado'));
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(unauthorized('Token de acesso inválido ou expirado'));
  }
}

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  err.code = 'UNAUTHORIZED';
  return err;
}

export default requireAuth;
