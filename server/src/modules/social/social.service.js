import * as repo from './social.repo.js';

/** Crédito de sessão de foco "ativa agora" — janela de 15 min sem heartbeat = expirou. */
const FOCUS_ACTIVE_WINDOW_SECONDS = 15 * 60;

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** JS getDay() é 0=dom..6=sáb; nosso schema usa 1=seg..7=dom. */
function todayWeekday() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/* ---------- Accountability partner ---------- */

/** POST /social/invite → gera um código de convite para o usuário compartilhar. */
export async function createInvite(userId) {
  const existing = await repo.findPartner(userId);
  if (existing) throw httpError(409, 'Você já tem um parceiro de responsabilização', 'ALREADY_PAIRED');

  const code = repo.generateInviteCode();
  const invite = await repo.createInvite(userId, code);
  return { code: invite.code, expiresAt: invite.expires_at };
}

/** POST /social/invite/accept → aceita um convite e forma o par. */
export async function acceptInvite(userId, code) {
  const existing = await repo.findPartner(userId);
  if (existing) throw httpError(409, 'Você já tem um parceiro de responsabilização', 'ALREADY_PAIRED');

  const invite = await repo.findValidInvite(code.trim().toUpperCase());
  if (!invite) throw httpError(404, 'Convite inválido ou expirado', 'INVITE_NOT_FOUND');
  if (invite.from_user === userId) throw httpError(400, 'Você não pode aceitar seu próprio convite', 'SELF_INVITE');

  await repo.markInviteUsed(invite.id);
  const pair = await repo.createPair(userId, invite.from_user);
  const partner = await repo.findPartner(userId);
  return { partner: toPublicPartner(partner) };
}

/** GET /social/partner → status do par + progresso do dia de ambos. */
export async function getPartnerStatus(userId) {
  const partner = await repo.findPartner(userId);
  if (!partner) return { partner: null };

  const date = todayISO();
  const weekday = todayWeekday();

  const [myDone, myTotal, partnerDone, partnerTotal] = await Promise.all([
    repo.countTodayCompletions(userId, date),
    repo.countTodayTotalTasks(userId, weekday),
    repo.countTodayCompletions(partner.id, date),
    repo.countTodayTotalTasks(partner.id, weekday),
  ]);

  return {
    partner: toPublicPartner(partner),
    me: { done: myDone, total: myTotal },
    partnerProgress: { done: partnerDone, total: partnerTotal },
  };
}

/** DELETE /social/partner → desfaz o par (qualquer um dos dois pode encerrar). */
export async function removePartner(userId) {
  const ok = await repo.deletePair(userId);
  if (!ok) throw httpError(404, 'Você não tem parceiro de responsabilização', 'NO_PARTNER');
}

function toPublicPartner(row) {
  return { id: row.id, displayName: row.display_name || row.email.split('@')[0] };
}

/* ---------- Body doubling assíncrono ---------- */

/** POST /social/focus/heartbeat → registra presença em bloco de foco ativo. */
export async function sendFocusHeartbeat(userId) {
  await repo.upsertFocusHeartbeat(userId);
  const count = await repo.countActiveFocusSessions(FOCUS_ACTIVE_WINDOW_SECONDS);
  return { activeCount: count };
}

/** DELETE /social/focus/heartbeat → encerra a sessão de foco (usuário pausou/fechou). */
export async function endFocusHeartbeat(userId) {
  await repo.deleteFocusHeartbeat(userId);
}

/** GET /social/focus/count → contagem agregada, sem precisar estar em foco você mesmo. */
export async function getFocusCount() {
  const count = await repo.countActiveFocusSessions(FOCUS_ACTIVE_WINDOW_SECONDS);
  return { activeCount: count };
}
