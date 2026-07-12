import { showToast } from "./notifications.js";

// Accountability partner (par único) + body doubling assíncrono. Exige
// login (o par e o progresso compartilhado não fazem sentido offline) —
// se o usuário não estiver logado, a UI mostra um convite discreto para
// entrar, sem bloquear o resto do app (mesmo espírito "offline-first" do
// resto do produto).

var _Api = null;
function setApiHook(apiModule) {
  _Api = apiModule;
}

var socialOverlay = document.getElementById("socialOverlay");
var socialBtn = document.getElementById("socialBtn");
var socialCloseBtn = document.getElementById("socialCloseBtn");
var socialBody = document.getElementById("socialBody");

function apiAvailable() {
  return !!(_Api && _Api.isLoggedIn && _Api.isLoggedIn());
}

/* ---------- Accountability partner ---------- */

function renderLoggedOut() {
  socialBody.innerHTML =
    '<p class="social-hint">Entre com sua conta para convidar um parceiro de responsabilização — a pessoa que vê seu progresso do dia (só a contagem, nunca suas tarefas) e vice-versa.</p>' +
    '<div class="social-source">Fonte: Regra 6 de "Vencendo o TDAH Adulto" (Barkley) — prestação de contas a terceiros eleva conclusão de metas de 65% para 95% segundo estudos citados na literatura clínica de TDAH.</div>';
}

function renderNoPartner() {
  socialBody.innerHTML =
    '<p class="social-hint">Convide alguém de confiança para ser seu parceiro de responsabilização. Vocês veem só o progresso um do outro hoje (quantas tarefas concluídas de quantas no total) — nunca o conteúdo da rotina.</p>' +
    '<button class="btn btn-primary" id="socialCreateInviteBtn" type="button">Gerar código de convite</button>' +
    '<div class="social-divider">ou</div>' +
    '<div class="social-accept-row">' +
      '<input type="text" id="socialCodeInput" class="social-code-input" placeholder="Código recebido" maxlength="6">' +
      '<button class="btn" id="socialAcceptBtn" type="button">Entrar com código</button>' +
    '</div>' +
    '<div id="socialInviteResult"></div>';

  document.getElementById("socialCreateInviteBtn").addEventListener("click", handleCreateInvite);
  document.getElementById("socialAcceptBtn").addEventListener("click", handleAcceptInvite);
}

function handleCreateInvite() {
  _Api.fetch("/social/invite", { method: "POST" }).then(function (data) {
    var el = document.getElementById("socialInviteResult");
    el.innerHTML = '<div class="social-invite-code">Seu código: <strong>' + data.code + '</strong><br>Compartilhe com a pessoa — válido por 7 dias.</div>';
  }).catch(function (err) {
    showToast(err.message || "Não foi possível gerar o convite.");
  });
}

function handleAcceptInvite() {
  var code = document.getElementById("socialCodeInput").value.trim();
  if (!code) return;
  _Api.fetch("/social/invite/accept", { method: "POST", body: { code: code } }).then(function () {
    showToast("Parceiro conectado!");
    renderPartnerStatus();
  }).catch(function (err) {
    showToast(err.message || "Código inválido ou expirado.");
  });
}

function renderPartnerStatus(data) {
  if (!data) {
    _Api.fetch("/social/partner", { method: "GET" }).then(renderPartnerStatus).catch(function (err) {
      // Erro real de servidor/rede não é o mesmo que "usuário sem parceiro" —
      // tratar os dois igual escondeu um bug de produção (tabelas ausentes)
      // atrás de uma tela que parecia normal. Só cai no estado "sem parceiro"
      // quando o backend responde algo utilizável; erro de fato mostra toast.
      showToast(err.message || "Não foi possível carregar seu parceiro agora.");
      renderNoPartner();
    });
    return;
  }
  if (!data.partner) { renderNoPartner(); return; }

  var mePct = data.me.total ? Math.round((data.me.done / data.me.total) * 100) : 0;
  var partnerPct = data.partnerProgress.total ? Math.round((data.partnerProgress.done / data.partnerProgress.total) * 100) : 0;

  socialBody.innerHTML =
    '<div class="social-partner-card">' +
      '<div class="social-partner-name">Parceiro: ' + escapeHtml(data.partner.displayName) + '</div>' +
      '<div class="social-progress-row"><span>Você</span><div class="social-progress-track"><div class="social-progress-fill" style="width:' + mePct + '%"></div></div><span>' + data.me.done + '/' + data.me.total + '</span></div>' +
      '<div class="social-progress-row"><span>' + escapeHtml(data.partner.displayName) + '</span><div class="social-progress-track"><div class="social-progress-fill" style="width:' + partnerPct + '%"></div></div><span>' + data.partnerProgress.done + '/' + data.partnerProgress.total + '</span></div>' +
    '</div>' +
    '<button class="btn" id="socialRemovePartnerBtn" type="button">Desfazer parceria</button>';

  document.getElementById("socialRemovePartnerBtn").addEventListener("click", function () {
    if (!confirm("Desfazer a parceria de responsabilização?")) return;
    _Api.fetch("/social/partner", { method: "DELETE" }).then(function () {
      showToast("Parceria desfeita.");
      renderNoPartner();
    }).catch(function (err) { showToast(err.message || "Não foi possível desfazer."); });
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openSocial() {
  socialOverlay.classList.add("show");
  if (!apiAvailable()) { renderLoggedOut(); return; }
  socialBody.innerHTML = '<p class="social-hint">Carregando...</p>';
  renderPartnerStatus();
}
function closeSocial() {
  socialOverlay.classList.remove("show");
}

/* ---------- Body doubling assíncrono ---------- */
// Heartbeat leve enquanto um bloco de foco (Pomodoro) está rodando —
// contagem agregada de "quantas pessoas estão em bloco de foco agora",
// sem identificar ninguém. Funciona mesmo sem parceiro/login: sem sessão,
// as chamadas simplesmente não fazem nada (offline-first).

var heartbeatTimer = null;

function startFocusPresence(onCountUpdate) {
  if (!apiAvailable()) { if (onCountUpdate) onCountUpdate(null); return; }
  function beat() {
    _Api.fetch("/social/focus/heartbeat", { method: "POST" }).then(function (data) {
      if (onCountUpdate) onCountUpdate(data.activeCount);
    }).catch(function () {});
  }
  beat();
  heartbeatTimer = setInterval(beat, 60000); // renova a cada 1 min (janela ativa no backend é 15 min)
}

function stopFocusPresence() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (apiAvailable()) {
    _Api.fetch("/social/focus/heartbeat", { method: "DELETE" }).catch(function () {});
  }
}

function initSocial() {
  socialBtn.addEventListener("click", openSocial);
  socialCloseBtn.addEventListener("click", closeSocial);
  socialOverlay.addEventListener("click", function (ev) {
    if (ev.target === socialOverlay) closeSocial();
  });
}

export { initSocial, openSocial, closeSocial, setApiHook, socialOverlay, startFocusPresence, stopFocusPresence };
