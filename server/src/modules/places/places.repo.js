import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados de locais salvos (saved_places).
 * Isola todo o SQL para que os testes mockem via `vi.mock` sem Postgres real.
 *
 * REGRA-CHAVE: toda query filtra por user_id. Nenhuma função aqui expõe ou
 * altera um local sem amarrar ao user_id do dono — não existe consulta que
 * cruze locais entre usuários (ver seção 6 do plano de geolocalização).
 */

/** Conta quantos locais o usuário já tem cadastrados (para o limite do plano grátis). */
export async function countByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM saved_places WHERE user_id = $1',
    [userId],
  );
  return rows[0].count;
}

/** Lista todos os locais do usuário. */
export async function listByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM saved_places
      WHERE user_id = $1
      ORDER BY created_at ASC`,
    [userId],
  );
  return rows;
}

/** Cria um local para o usuário. */
export async function insert(userId, { label, lat, lng, radius }) {
  const { rows } = await pool.query(
    `INSERT INTO saved_places (user_id, label, lat, lng, radius)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, label, lat, lng, radius],
  );
  return rows[0];
}

/**
 * Atualiza campos de um local SOMENTE se pertence ao usuário.
 * `fields` é um objeto parcial já em snake_case (mesmas chaves das colunas).
 * Retorna o local atualizado ou null se não pertence ao usuário / não existe.
 */
export async function updateForUser(placeId, userId, fields) {
  const columns = ['label', 'lat', 'lng', 'radius'];
  const sets = [];
  const values = [];
  let i = 1;

  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(fields, col)) {
      sets.push(`${col} = $${i}`);
      values.push(fields[col]);
      i += 1;
    }
  }

  sets.push('updated_at = now()');

  values.push(placeId, userId);

  const { rows } = await pool.query(
    `UPDATE saved_places
        SET ${sets.join(', ')}
      WHERE id = $${i} AND user_id = $${i + 1}
      RETURNING *`,
    values,
  );
  return rows[0] || null;
}

/**
 * Remove um local SOMENTE se pertence ao usuário.
 * Retorna true se removeu, false caso não pertença ao usuário (ou não exista).
 */
export async function deleteForUser(placeId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM saved_places
      WHERE id = $1 AND user_id = $2
      RETURNING id`,
    [placeId, userId],
  );
  return rows.length > 0;
}
