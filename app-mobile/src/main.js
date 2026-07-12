import { setSyncHook as setTasksSyncHook } from "./tasks.js";
import { renderDayTabs, renderBlocks, setSyncHook as setRenderSyncHook } from "./render.js";
import { initNotifications, showToast, setSyncHook as setNotificationsSyncHook } from "./notifications.js";
import { initEditor, closeEditor, closePlacesPrivacy, setPlacesOverlayHook } from "./editor.js";
import { initAuth, closeAuth } from "./auth.js";
import { initEducation, closeTdahInfo } from "./education.js";
import { initSelfAssessment, closeSelfAssessment, saOverlay } from "./self-assessment.js";
import { initGeofencing, setSyncHook as setGeofencingSyncHook, setApiHook as setGeofencingApiHook } from "./geofencing.js";
import * as PlacesOverlay from "./places-overlay.js";
import { initPlacesOverlay, closePlacesOverlay, placesOverlay } from "./places-overlay.js";
import { principleForDate } from "./principles.js";
import { exerciseForDate } from "./exercises.js";
import { Sync } from "./sync.js";
import { Api } from "./api.js";

(function () {
  "use strict";

  // Liga o hook de Sync nos módulos que precisam chamá-lo de volta (evita
  // import circular: sync.js já importa tasks.js/render.js/notifications.js).
  setTasksSyncHook(Sync);
  setRenderSyncHook(Sync);
  setNotificationsSyncHook(Sync);
  setGeofencingSyncHook(Sync);
  setGeofencingApiHook(Api);
  setPlacesOverlayHook(PlacesOverlay);

  /* ---------- Init ---------- */
  renderDayTabs();
  renderBlocks();

  // "Princípio do dia" / "Exercício do dia": mudam conforme o dia do ano
  // (124 variações cada). Cada item é {text, source} — a data exibida prova
  // visualmente que o conteúdo muda todo dia, e a fonte é sempre mostrada
  // junto ao texto (regra do projeto: nenhum conteúdo clínico sem fonte).
  var today = new Date();
  // Formato curto ("sáb, 11 jul") em vez de por extenso — evita truncamento
  // por ellipsis em telas estreitas e reduz a disputa visual com o label.
  var dateLabel = today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "");

  var principle = principleForDate(today);
  var principleTextEl = document.getElementById("principleText");
  var principleSourceEl = document.getElementById("principleSource");
  var principleDateEl = document.getElementById("principleDate");
  if (principleTextEl) principleTextEl.textContent = principle.text;
  if (principleSourceEl) principleSourceEl.textContent = "Fonte: " + principle.source;
  if (principleDateEl) principleDateEl.textContent = dateLabel;

  var exercise = exerciseForDate(today);
  var exerciseTextEl = document.getElementById("exerciseText");
  var exerciseSourceEl = document.getElementById("exerciseSource");
  var exerciseDateEl = document.getElementById("exerciseDate");
  if (exerciseTextEl) exerciseTextEl.textContent = exercise.text;
  if (exerciseSourceEl) exerciseSourceEl.textContent = "Fonte: " + exercise.source;
  if (exerciseDateEl) exerciseDateEl.textContent = dateLabel;

  /* ---------- PWA: manifest + service worker (installability + offline) ---------- */
  var manifest = {
    name: "Rotina Diária — Apoio TDAH",
    short_name: "Rotina TDAH",
    start_url: ".",
    display: "standalone",
    background_color: "#f6f6fb",
    theme_color: "#4338ca",
    icons: [{
      src: "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="38" fill="%234338ca"/><path d="M 96 46 A 50 50 0 1 1 60.2 137.8" fill="none" stroke="%23ffffff" stroke-width="15" stroke-linecap="round"/><circle cx="83" cy="146" r="14" fill="%23ffffff"/></svg>'
      ),
      sizes: "192x192",
      type: "image/svg+xml"
    }]
  };
  var manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  document.getElementById("manifestLink").setAttribute("href", URL.createObjectURL(manifestBlob));

  var deferredPrompt = null;
  var installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.add("show");
  });
  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) { showToast("Use o menu do navegador → \"Adicionar à tela inicial\"."); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      installBtn.classList.remove("show");
    });
  });
  window.addEventListener("appinstalled", function () {
    installBtn.classList.remove("show");
    showToast("Instalado com sucesso.");
  });

  if ("serviceWorker" in navigator) {
    try {
      var swCode = "self.addEventListener('install', e => self.skipWaiting());" +
        "self.addEventListener('activate', e => self.clients.claim());";
      var swBlob = new Blob([swCode], { type: "application/javascript" });
      var swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl).catch(function () {});
    } catch (e) {}
  }

  // Notificações/alarmes: relógio, permissões, reagendamento nativo.
  initNotifications();

  // Editor de rotina (modal "Editar rotina").
  initEditor();

  // Auth (login/cadastro/Google) + splash de boas-vindas.
  initAuth();

  // Modal "Entenda o TDAH".
  initEducation();

  // Modal "Autoavaliação · TDAH em adultos" (questionário de triagem).
  initSelfAssessment();

  // Lembretes por lugar (geofencing) — Fase G2: cadastro/dados; UI de
  // cadastro (busca de endereço, disclosure de privacidade) é a Fase G3.
  initGeofencing();

  // Descoberta central de "Lembretes por lugar" (link/card na tela principal
  // + modal "Meus locais") — camada de visibilidade por cima do fluxo já
  // existente em editor.js, não o substitui.
  initPlacesOverlay();

  // Esc fecha o modal aberto (mesma checagem central do arquivo único
  // original: tdahInfo > auth > editor, por cima do handler de auth+editor
  // já registrado em initAuth()).
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var tdahInfoOverlay = document.getElementById("tdahInfoOverlay");
    var authOverlay = document.getElementById("authOverlay");
    var editOverlay = document.getElementById("editOverlay");
    var placesPrivacyOverlay = document.getElementById("placesPrivacyOverlay");
    if (placesPrivacyOverlay.classList.contains("show")) closePlacesPrivacy();
    else if (placesOverlay.classList.contains("show")) closePlacesOverlay();
    else if (saOverlay.classList.contains("show")) closeSelfAssessment();
    else if (tdahInfoOverlay.classList.contains("show")) closeTdahInfo();
    else if (authOverlay.classList.contains("show")) closeAuth();
    else if (editOverlay.classList.contains("show")) closeEditor();
  });

  // Sincronização (Fase 6): migração one-time + outbox + status. Deve iniciar
  // por último, depois que todos os hooks acima já estão registrados.
  Sync.init();
})();
