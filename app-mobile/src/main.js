import { setSyncHook as setTasksSyncHook } from "./tasks.js";
import { renderDayTabs, renderBlocks, setSyncHook as setRenderSyncHook } from "./render.js";
import { initNotifications, showToast, setSyncHook as setNotificationsSyncHook } from "./notifications.js";
import { initEditor, closeEditor, closePlacesPrivacy, setPlacesOverlayHook } from "./editor.js";
import { initAuth, closeAuth } from "./auth.js";
import { initEducation, closeTdahInfo } from "./education.js";
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

  // "Princípio do dia": texto muda conforme o dia do mês (31 variações).
  var principleTextEl = document.getElementById("principleText");
  if (principleTextEl) principleTextEl.textContent = principleForDate();

  // "Exercício do dia": técnica prática que muda conforme o dia do mês (31 variações).
  var exerciseTextEl = document.getElementById("exerciseText");
  if (exerciseTextEl) exerciseTextEl.textContent = exerciseForDate();

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
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="36" fill="%234338ca"/><path d="M56 100l24 24 56-56" stroke="%23ffffff" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
    else if (tdahInfoOverlay.classList.contains("show")) closeTdahInfo();
    else if (authOverlay.classList.contains("show")) closeAuth();
    else if (editOverlay.classList.contains("show")) closeEditor();
  });

  // Sincronização (Fase 6): migração one-time + outbox + status. Deve iniciar
  // por último, depois que todos os hooks acima já estão registrados.
  Sync.init();
})();
