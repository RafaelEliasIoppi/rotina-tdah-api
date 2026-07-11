import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from '../../utils/tokens.js';
import * as repo from './auth.repo.js';

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/**
 * Projeção pública de um usuário. NUNCA expõe password_hash nem google_sub.
 */
export function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Emite um novo par de tokens (access JWT + refresh opaco) e grava o hash do refresh.
 */
async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await repo.insertRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt: refreshExpiresAt(),
  });
  return { accessToken, refreshToken };
}

/** POST /auth/register */
export async function register({ email, password, displayName }) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    throw httpError(409, 'Email já cadastrado', 'EMAIL_TAKEN');
  }
  const passwordHash = await hashPassword(password);
  const user = await repo.createUser({ email, passwordHash, displayName: displayName ?? null });
  // Cria automaticamente a rotina default do usuário.
  await repo.createDefaultRoutine(user.id);
  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/** POST /auth/login */
export async function login({ email, password }) {
  const user = await repo.findUserByEmail(email);
  // Mensagem genérica para não vazar existência de conta.
  const invalid = () => httpError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
  if (!user) throw invalid();
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw invalid();
  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/** POST /auth/google */
export async function loginWithGoogle({ idToken }) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw httpError(
      501,
      'Login com Google não está configurado neste servidor (GOOGLE_CLIENT_ID ausente).',
      'GOOGLE_NOT_CONFIGURED',
    );
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw httpError(401, 'idToken do Google inválido', 'INVALID_GOOGLE_TOKEN');
  }

  const googleSub = payload?.sub;
  const email = payload?.email?.toLowerCase();
  if (!googleSub || !email) {
    throw httpError(401, 'idToken do Google sem sub/email', 'INVALID_GOOGLE_TOKEN');
  }

  // Upsert por google_sub, com fallback por email (vincula conta existente).
  let user = await repo.findUserByGoogleSub(googleSub);
  if (!user) {
    const byEmail = await repo.findUserByEmail(email);
    if (byEmail) {
      user = await repo.setUserGoogleSub(byEmail.id, googleSub);
    } else {
      user = await repo.createUser({
        email,
        googleSub,
        displayName: payload?.name ?? null,
      });
      await repo.createDefaultRoutine(user.id);
    }
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/** POST /auth/refresh — rotaciona o par de tokens. */
export async function refresh({ refreshToken }) {
  const tokenHash = hashRefreshToken(refreshToken);
  const record = await repo.findRefreshTokenByHash(tokenHash);

  const invalid = () => httpError(401, 'Refresh token inválido', 'INVALID_REFRESH_TOKEN');
  if (!record) throw invalid();
  if (record.revoked_at) throw invalid();
  if (new Date(record.expires_at).getTime() <= Date.now()) throw invalid();

  const user = await repo.findUserById(record.user_id);
  if (!user) throw invalid();

  // Rotação: revoga o antigo antes de emitir o novo par.
  await repo.revokeRefreshTokenById(record.id);
  const tokens = await issueTokens(user);
  return { tokens };
}

/** POST /auth/logout — revoga o refresh token (idempotente). */
export async function logout({ refreshToken }) {
  const tokenHash = hashRefreshToken(refreshToken);
  await repo.revokeRefreshTokenByHash(tokenHash);
}

/** GET /me — carrega o usuário autenticado. */
export async function getMe(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw httpError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
  return { user: toPublicUser(user) };
}
