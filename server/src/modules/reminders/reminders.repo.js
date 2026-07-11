import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados dos reminders.
 * Isola todo o SQL para que os testes mockem via `vi.mock` sem Postgres real.
 *
 * REGRA-CHAVE: toda query filtra por user_id. A posse da task é verificada
 * com JOIN tasks -> routines e routines.user_id = user_id.
 */

/** Confirma que a task pertence ao usuário (via routine.user_id). */
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

/** Lista todos os reminders do usuário. */
export async function listReminders(userId) {
  const { rows } = await pool.query(
    `SELECT task_id, weekday, "time", label, enabled
       FROM reminders
      WHERE user_id = $1
      ORDER BY weekday ASC, "time" ASC`,
    [userId],
  );
  return rows;
}

/**
 * Upsert do reminder do usuário para a task (UNIQUE user_id, task_id).
 * Atualiza updated_at ao mudar (necessário para o sync da Fase 4).
 */
export async function upsertReminder(userId, { taskId, enabled, time, weekday, label = null }) {
  const { rows } = await pool.query(
    `INSERT INTO reminders (user_id, task_id, weekday, "time", label, enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, task_id) DO UPDATE
       SET weekday    = EXCLUDED.weekday,
           "time"     = EXCLUDED."time",
           label      = EXCLUDED.label,
           enabled    = EXCLUDED.enabled,
           updated_at = now()
     RETURNING task_id, weekday, "time", label, enabled`,
    [userId, taskId, weekday, time, label, enabled],
  );
  return rows[0];
}
