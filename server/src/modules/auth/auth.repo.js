import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados da autenticação.
 * Isola todo o SQL para que os testes possam mockar via `vi.mock` sem Postgres real,
 * mantendo o service livre de detalhes de banco.
 */

/** Busca usuário por email (case-insensitive via citext). */
export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

/** Busca usuário por id. */
export async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

/** Busca usuário por google_sub. */
export async function findUserByGoogleSub(googleSub) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_sub = $1', [googleSub]);
  return rows[0] || null;
}

/** Cria um usuário (senha ou Google). Retorna a linha criada. */
export async function createUser({ email, passwordHash = null, googleSub = null, displayName = null }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, google_sub, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, passwordHash, googleSub, displayName],
  );
  return rows[0];
}

/** Vincula google_sub a um usuário existente (upsert por email). */
export async function setUserGoogleSub(userId, googleSub) {
  const { rows } = await pool.query(
    `UPDATE users SET google_sub = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [userId, googleSub],
  );
  return rows[0];
}

/** Cria a rotina default do usuário (1 por usuário no MVP). */
export async function createDefaultRoutine(userId) {
  const { rows } = await pool.query(
    `INSERT INTO routines (user_id) VALUES ($1) RETURNING *`,
    [userId],
  );
  return rows[0];
}

/** Persiste o hash de um refresh token. */
export async function insertRefreshToken({ userId, tokenHash, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt],
  );
  return rows[0];
}

/** Busca um refresh token pelo hash. */
export async function findRefreshTokenByHash(tokenHash) {
  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );
  return rows[0] || null;
}

/** Revoga um refresh token pelo id (marca revoked_at = now). */
export async function revokeRefreshTokenById(id) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [id],
  );
}

/** Revoga um refresh token pelo hash. */
export async function revokeRefreshTokenByHash(tokenHash) {
  const { rowCount } = await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
  return rowCount > 0;
}
