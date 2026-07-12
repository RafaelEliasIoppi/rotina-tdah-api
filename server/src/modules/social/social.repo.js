import { pool } from '../../db/pool.js';
import crypto from 'crypto';

/**
 * Camada fina de acesso a dados do módulo social (accountability partner +
 * body doubling assíncrono).
 *
 * REGRA-CHAVE (mesma dos demais módulos): toda query de par filtra pelo
 * usuário autenticado — um usuário nunca lê/altera o par de outro sem ser
 * parte dele. O par (user_a, user_b) é sempre armazenado com user_a < user_b
 * para evitar duplicidade (a,b) vs (b,a); as funções abaixo escondem esse
 * detalhe do service (recebem/retornam sempre "o outro usuário", não
 * a/b cru).
 */

function orderPair(u1, u2) {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

/** Gera um código de convite curto e humano-legível (6 caracteres). */
export function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

/** Cria um convite de accountability partner para o usuário. */
export async function createInvite(userId, code) {
  const { rows } = await pool.query(
    `INSERT INTO accountability_invites (code, from_user)
     VALUES ($1, $2)
     RETURNING id, code, from_user, created_at, expires_at`,
    [code, userId],
  );
  return rows[0];
}

/** Busca um convite válido (não usado, não expirado) pelo código. */
export async function findValidInvite(code) {
  const { rows } = await pool.query(
    `SELECT * FROM accountability_invites
      WHERE code = $1 AND used_at IS NULL AND expires_at > now()
      LIMIT 1`,
    [code],
  );
  return rows[0] || null;
}

/** Marca um convite como usado. */
export async function markInviteUsed(inviteId) {
  await pool.query('UPDATE accountability_invites SET used_at = now() WHERE id = $1', [inviteId]);
}

/** Cria o par de accountability entre dois usuários (idempotente). */
export async function createPair(userId1, userId2) {
  const [userA, userB] = orderPair(userId1, userId2);
  const { rows } = await pool.query(
    `INSERT INTO accountability_pairs (user_a, user_b)
     VALUES ($1, $2)
     ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
     RETURNING id, user_a, user_b, created_at`,
    [userA, userB],
  );
  return rows[0];
}

/** Retorna o parceiro atual do usuário (id + display_name), ou null se não tem par. */
export async function findPartner(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.email
       FROM accountability_pairs p
       JOIN users u ON u.id = CASE WHEN p.user_a = $1 THEN p.user_b ELSE p.user_a END
      WHERE p.user_a = $1 OR p.user_b = $1
      LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

/** Desfaz o par de accountability do usuário (remove a linha, seja ele user_a ou user_b). */
export async function deletePair(userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM accountability_pairs WHERE user_a = $1 OR user_b = $1',
    [userId],
  );
  return rowCount > 0;
}

/**
 * Progresso do dia de um usuário (para exibir ao parceiro): quantas tasks
 * distintas da rotina de hoje ele já concluiu. Não expõe QUAIS tasks —
 * só a contagem, preservando privacidade do conteúdo da rotina do parceiro.
 */
export async function countTodayCompletions(userId, dateISO) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM completions WHERE user_id = $1 AND done_date = $2',
    [userId, dateISO],
  );
  return rows[0].count;
}

/** Total de tasks da rotina de hoje do usuário (para calcular %). weekday: 1=seg..7=dom. */
export async function countTodayTotalTasks(userId, weekday) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM tasks t
       JOIN routines r ON r.id = t.routine_id
      WHERE r.user_id = $1 AND t.weekday = $2`,
    [userId, weekday],
  );
  return rows[0].count;
}

/* ---------- Body doubling (heartbeat de foco ativo) ---------- */

/** Registra/atualiza o heartbeat de sessão de foco ativa do usuário. */
export async function upsertFocusHeartbeat(userId) {
  await pool.query(
    `INSERT INTO focus_sessions (user_id, started_at, updated_at)
     VALUES ($1, now(), now())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()`,
    [userId],
  );
}

/** Remove o heartbeat do usuário (encerrou/pausou o bloco de foco). */
export async function deleteFocusHeartbeat(userId) {
  await pool.query('DELETE FROM focus_sessions WHERE user_id = $1', [userId]);
}

/**
 * Conta quantas sessões de foco estão "ativas agora" — heartbeat atualizado
 * nos últimos `windowSeconds` segundos. Não retorna nenhum dado identificável
 * de outros usuários, só a contagem agregada (é isso que sustenta o efeito
 * de "presença social" do body doubling sem exigir infraestrutura de
 * vídeo/chat nem expor quem está em foco).
 */
export async function countActiveFocusSessions(windowSeconds) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM focus_sessions
      WHERE updated_at > now() - ($1 || ' seconds')::interval`,
    [windowSeconds],
  );
  return rows[0].count;
}
