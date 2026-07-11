import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Assina um access token JWT curto.
 * O payload mínimo carrega o id (sub) e o email do usuário.
 */
export function signAccessToken(user) {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

/** Verifica e decodifica um access token. Lança se inválido/expirado. */
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  return { id: payload.sub, email: payload.email };
}

/**
 * Gera um refresh token opaco (string aleatória forte).
 * Retorna o token em claro (entregue ao cliente) e seu hash (gravado no banco).
 * Nunca gravamos o token em claro.
 */
export function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshToken(token);
  return { token, tokenHash };
}

/**
 * Hash determinístico (SHA-256) do refresh token para lookup/comparação no banco.
 * Usamos hash rápido (não bcrypt) porque o token já tem alta entropia (384 bits).
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Data de expiração do refresh token a partir de agora. */
export function refreshExpiresAt() {
  const ms = env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}
