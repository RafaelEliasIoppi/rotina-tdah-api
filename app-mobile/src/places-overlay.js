import { countPlacesInUse, listPlacesInUse, removePlaceForTask, FREE_PLACES_LIMIT } from "./geofencing.js";
import { pinIcon } from "./render.js";
import { showToast } from "./notifications.js";
import { openEditor } from "./editor.js";

/* ---------- Descoberta central de "Lembretes por lugar" ----------
 * Card/link dinâmico na tela principal (ver index.html, próximo ao
 * ".tdah-info-link") + modal "Meus locais" que lista todos os locais
 * cadastrados (independente da tarefa em que foram criados) e permite
 * removê-los, sem precisar entrar na edição de cada tarefa individualmente.
 * Não substitui o fluxo existente em editor.js (buildPlaceSection) — apenas
 * dá visibilidade central por cima dele. */

var placesOverlay = document.getElementById("placesOverlay");
var placesDiscoveryEmpty = document.getElementById("placesDiscoveryEmpty");
var placesDiscoveryCard = document.getElementById("placesDiscoveryCard");
var placesDiscoveryIco = document.getElementById("placesDiscoveryIco");
var placesDiscoverySub = document.getElementById("placesDiscoverySub");
var placesCountEl = document.getElementById("placesCount");
var placesListEl = document.getElementById("placesList");

function pinIconLarge() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5V6a2 2 0 012-2h9l5 5v10.5a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke-linejoin="round"/><path d="M9 8h4M9 12h6M9 16h6" stroke-linecap="round"/></svg>';
}

// Atualiza o link/card da tela principal conforme quantos locais existem.
// Chamado no boot e sempre que a tela "Meus locais" é fechada (pode ter
// havido remoção) e quando um local é confirmado no editor (ver main.js).
function refreshPlacesDiscovery() {
  return countPlacesInUse().then(function (info) {
    if (!info.count) {
      placesDiscoveryEmpty.style.display = "";
      placesDiscoveryCard.style.display = "none";
      return info;
    }
    placesDiscoveryEmpty.style.display = "none";
    placesDiscoveryCard.style.display = "";
    placesDiscoveryIco.innerHTML = pinIconLarge();
    return listPlacesInUse().then(function (places) {
      var names = places.map(function (p) { return p.location.label || p.taskLabel || "Local"; }).slice(0, 3);
      var extra = places.length > names.length ? " e mais " + (places.length - names.length) : "";
      placesDiscoverySub.textContent = info.count + "/" + (info.limit || FREE_PLACES_LIMIT) + " locais usados · " + names.join(", ") + extra;
      return info;
    });
  }).catch(function () {
    // Falha silenciosa: mantém o estado visual anterior em vez de quebrar a tela principal.
  });
}

function openPlacesOverlay() {
  renderPlacesList();
  placesOverlay.classList.add("show");
}
function closePlacesOverlay() {
  placesOverlay.classList.remove("show");
  refreshPlacesDiscovery();
}

function renderPlacesList() {
  placesCountEl.textContent = "Carregando...";
  placesListEl.innerHTML = "";

  Promise.all([countPlacesInUse(), listPlacesInUse()]).then(function (results) {
    var info = results[0];
    var places = results[1];
    placesCountEl.textContent = info.count + " de " + (info.limit || FREE_PLACES_LIMIT) + " locais usados";

    placesListEl.innerHTML = "";
    if (!places.length) {
      var empty = document.createElement("div");
      empty.className = "places-empty";
      empty.textContent = "Você ainda não tem lembretes por lugar. Toque em uma tarefa na edição de rotina para configurar.";
      placesListEl.appendChild(empty);
      return;
    }

    places.forEach(function (p) {
      var item = document.createElement("div");
      item.className = "places-item";

      var ico = document.createElement("div");
      ico.className = "ico";
      ico.innerHTML = pinIcon();

      var txt = document.createElement("div");
      txt.className = "txt";
      var h4 = document.createElement("h4");
      h4.textContent = p.location.label || "Local";
      var pEl = document.createElement("p");
      pEl.textContent = (p.taskLabel || "Tarefa") + " · " + (p.location.trigger === "exit" ? "ao sair" : "ao chegar");
      txt.appendChild(h4);
      txt.appendChild(pEl);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-danger";
      removeBtn.textContent = "Remover";
      removeBtn.addEventListener("click", function () {
        if (!p.taskId) { showToast("Não foi possível remover este local."); return; }
        removePlaceForTask(p.taskId).then(function () {
          showToast("Local removido");
          renderPlacesList();
        }).catch(function () {
          showToast("Não foi possível remover o local. Tente novamente.");
        });
      });

      item.appendChild(ico);
      item.appendChild(txt);
      item.appendChild(removeBtn);
      placesListEl.appendChild(item);
    });
  }).catch(function () {
    placesCountEl.textContent = "";
    var errEl = document.createElement("div");
    errEl.className = "places-empty";
    errEl.textContent = "Não foi possível carregar seus locais agora.";
    placesListEl.appendChild(errEl);
  });
}

function initPlacesOverlay() {
  placesDiscoveryEmpty.addEventListener("click", openPlacesOverlay);
  placesDiscoveryCard.addEventListener("click", openPlacesOverlay);
  document.getElementById("placesOverlayCloseBtn").addEventListener("click", closePlacesOverlay);
  placesOverlay.addEventListener("click", function (ev) {
    if (ev.target === placesOverlay) closePlacesOverlay();
  });

  document.getElementById("placesAddBtn").addEventListener("click", function () {
    closePlacesOverlay();
    openEditor();
    showToast("Escolha a tarefa que vai receber esse lembrete e toque em \"Lembrar por lugar\"");
  });

  refreshPlacesDiscovery();
}

export { initPlacesOverlay, openPlacesOverlay, closePlacesOverlay, refreshPlacesDiscovery, placesOverlay };
