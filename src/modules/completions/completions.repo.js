import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados das completions.
 * Isola todo o SQL para que os testes mockem via `vi.mock` sem Postgres real.
 *
 * REGRA-CHAVE: toda query filtra por user_id. Um usuário nunca acessa nem
 * escreve completions de outro. A posse da task é verificada com JOIN
 * tasks -> routines e routines.user_id = user_id.
 */

/**
 * Confirma que a task pertence ao usuário (via routine.user_id).
 * Retorna true/false. Não importa código do módulo routines — só faz o JOIN.
 */
export async function taskBelongsToUser(userId, taskId) {
  const { rows } = await pool.query(
    `SELECT 1
       FROM tasks t
       JOIN routines r ON r.id = t.routine_id
      WHERE t.id = $1 AND r.user_id = $2
      LIMIT 1`,
    [taskId, userId],
  );
  return rows.length > 0;
}

/** Lista completions do usuário no intervalo [from, to] (inclusivo). */
export async function listCompletions(userId, from, to) {
  const { rows } = await pool.query(
    `SELECT task_id, done_date
       FROM completions
      WHERE user_id = $1 AND done_date >= $2 AND done_date <= $3
      ORDER BY done_date ASC`,
    [userId, from, to],
  );
  return rows;
}

/**
 * Insere a completion (done=true). Idempotente por UNIQUE(user_id,task_id,done_date):
 * em conflito, não duplica e retorna a linha existente.
 */
export async function upsertCompletion(userId, taskId, date) {
  const { rows } = await pool.query(
    `INSERT INTO completions (user_id, task_id, done_date)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, task_id, done_date) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING task_id, done_date`,
    [userId, taskId, date],
  );
  return rows[0];
}

/** Remove a completion (done=false). Sempre filtrando por user_id. */
export async function deleteCompletion(userId, taskId, date) {
  const { rowCount } = await pool.query(
    `DELETE FROM completions
      WHERE user_id = $1 AND task_id = $2 AND done_date = $3`,
    [userId, taskId, date],
  );
  return rowCount > 0;
}
