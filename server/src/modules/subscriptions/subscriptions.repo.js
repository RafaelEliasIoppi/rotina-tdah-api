import { pool, query } from '../../db/pool.js';

export function findByUserId(userId) {
  return query(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [userId],
  ).then((r) => r.rows[0] || null);
}

export function upsert(userId, data) {
  const cols = Object.keys(data);
  const set = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  const vals = cols.map((c) => data[c]);
  return query(
    `INSERT INTO subscriptions (user_id, ${cols.join(', ')})
     VALUES ($1, ${vals.map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (user_id)
     DO UPDATE SET ${set}, updated_at = NOW()
     RETURNING *`,
    [userId, ...vals],
  ).then((r) => r.rows[0]);
}
