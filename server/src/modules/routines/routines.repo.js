import { pool } from '../../db/pool.js';

/**
 * Camada fina de acesso a dados de rotina + tarefas.
 * Todo o SQL vive aqui para que os testes possam mockar via `vi.mock` sem Postgres real.
 *
 * REGRA DE ISOLAMENTO: nenhuma função aqui expõe tarefa/rotina sem amarrar ao user_id.
 * Operações sobre tarefas fazem JOIN em routines para garantir que a task pertence
 * à rotina do usuário logado — nunca confiam apenas no id da task.
 */

/** Busca a rotina (única no MVP) de um usuário. */
export async function findRoutineByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM routines WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

/** Cria a rotina default do usuário (sob demanda, caso não exista). */
export async function createRoutine(userId) {
  const { rows } = await pool.query(
    'INSERT INTO routines (user_id) VALUES ($1) RETURNING *',
    [userId],
  );
  return rows[0];
}

/** Lista as tarefas de uma rotina, ordenadas de forma estável. */
export async function findTasksByRoutineId(routineId) {
  const { rows } = await pool.query(
    `SELECT * FROM tasks
       WHERE routine_id = $1
       ORDER BY weekday ASC, sort_order ASC, time ASC, created_at ASC`,
    [routineId],
  );
  return rows;
}

/**
 * Substitui TODO o conjunto de tarefas da rotina em uma transação:
 * apaga as antigas, insere as novas e toca updated_at da rotina.
 * Retorna as tarefas recém-criadas.
 */
export async function replaceTasks(routineId, tasks) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serializa chamadas concorrentes na MESMA rotina (ex.: duas sessões
    // logadas na mesma conta disparando a migração one-time ao mesmo tempo):
    // a segunda transação bloqueia aqui até a primeira commitar/abortar, em
    // vez de ambas verem a tabela vazia e inserirem tudo em duplicidade.
    // Ver migration 0006_dedupe_tasks.sql para o incidente que motivou isso.
    await client.query('SELECT id FROM routines WHERE id = $1 FOR UPDATE', [routineId]);
    await client.query('DELETE FROM tasks WHERE routine_id = $1', [routineId]);

    const inserted = [];
    for (const t of tasks) {
      const { rows } = await client.query(
        `INSERT INTO tasks
           (routine_id, weekday, time, label, block, detail, rule, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          routineId,
          t.weekday,
          t.time,
          t.label,
          t.block,
          t.detail ?? '',
          t.rule ?? '',
          t.sortOrder ?? 0,
        ],
      );
      inserted.push(rows[0]);
    }

    await client.query('UPDATE routines SET updated_at = now() WHERE id = $1', [routineId]);
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Insere uma única tarefa na rotina e toca updated_at da rotina. */
export async function insertTask(routineId, t) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO tasks
         (routine_id, weekday, time, label, block, detail, rule, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *
     ), touched AS (
       UPDATE routines SET updated_at = now() WHERE id = $1
     )
     SELECT * FROM inserted`,
    [
      routineId,
      t.weekday,
      t.time,
      t.label,
      t.block,
      t.detail ?? '',
      t.rule ?? '',
      t.sortOrder ?? 0,
    ],
  );
  return rows[0];
}

/**
 * Atualiza campos de uma tarefa SOMENTE se ela pertence à rotina do usuário.
 * O JOIN em routines por user_id garante o isolamento: uma task de outro usuário
 * simplesmente não é encontrada (rowCount 0 → null).
 * `fields` é um objeto parcial com colunas já em snake_case do banco.
 * Retorna a task atualizada ou null se não pertence ao usuário.
 */
export async function updateTaskForUser(taskId, userId, fields) {
  const columns = ['weekday', 'time', 'label', 'block', 'detail', 'rule', 'sort_order'];
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

  // updated_at sempre é tocado.
  sets.push('updated_at = now()');

  // $i = taskId, $i+1 = userId
  values.push(taskId, userId);

  const { rows } = await pool.query(
    `UPDATE tasks t
        SET ${sets.join(', ')}
       FROM routines r
      WHERE t.id = $${i}
        AND t.routine_id = r.id
        AND r.user_id = $${i + 1}
      RETURNING t.*`,
    values,
  );

  if (rows[0]) {
    await pool.query(
      'UPDATE routines SET updated_at = now() WHERE id = $1',
      [rows[0].routine_id],
    );
  }
  return rows[0] || null;
}

/**
 * Remove uma tarefa SOMENTE se pertence à rotina do usuário.
 * Retorna true se removeu, false caso não pertença ao usuário (ou não exista).
 */
export async function deleteTaskForUser(taskId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM tasks t
       USING routines r
      WHERE t.id = $1
        AND t.routine_id = r.id
        AND r.user_id = $2
      RETURNING t.routine_id`,
    [taskId, userId],
  );
  if (rows[0]) {
    await pool.query(
      'UPDATE routines SET updated_at = now() WHERE id = $1',
      [rows[0].routine_id],
    );
    return true;
  }
  return false;
}
