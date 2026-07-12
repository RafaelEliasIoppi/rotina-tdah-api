import { getTasksByDay, setTasksByDay, saveTasksByDay } from "./tasks.js";

// Hook para o módulo Sync (mesmo padrão de tasks.js/notifications.js/render.js).
var _Sync = null;
function setSyncHook(syncModule) {
  _Sync = syncModule;
}

var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
var Geofence = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geofence;

function geofencingSupported() {
  return isNative && !!Geofence;
}

/**
 * Chamado no boot do app (ver main.js). Hoje não precisa fazer nada de
 * assíncrono no arranque — geofences já registrados no Android persistem
 * entre reinicializações do app (o SO/Play Services é quem guarda o estado).
 * Existe como ponto de extensão único, seguindo o mesmo padrão de
 * initNotifications()/initEditor() em main.js.
 */
function initGeofencing() {
  // Nada a fazer hoje além de expor o módulo; mantido para simetria com os
  // outros init*() e para um futuro "reconciliar geofences órfãos" (Fase G3+).
}

/**
 * Associa um local (com raio e gatilho) a uma tarefa: grava no modelo de
 * dados da tarefa (tasks.js) e registra o geofence nativo correspondente.
 *
 * @param {string} taskId - id da tarefa (dentro de um dia específico — ver
 *   removePlaceForTask para a mesma ressalva).
 * @param {{lat:number, lng:number, radius:number, label:string}} place
 * @param {"enter"|"exit"|"both"} trigger
 * @returns {Promise<void>}
 */
function registerPlaceForTask(taskId, place, trigger) {
  if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") {
    return Promise.reject(new Error("place inválido: obrigatório { lat, lng, radius, label }"));
  }
  var radius = place.radius || 150; // raio fixo v1 (ver PLANO_GEOLOCALIZACAO.md secao 3)
  var normalizedTrigger = trigger === "exit" || trigger === "both" ? trigger : "enter";

  var task = findTaskById(taskId);
  var taskLabel = task ? task.label : "";

  var location = {
    lat: place.lat,
    lng: place.lng,
    radius: radius,
    trigger: normalizedTrigger,
    label: place.label || ""
  };

  // TODO(G3): enforcement do limite de 3 locais fica na camada de UI.

  var applyToModel = function () {
    if (task) {
      task.location = location;
      saveTasksByDay(getTasksByDay());
    }
    if (_Sync) _Sync.onRoutineChanged();
  };

  if (!geofencingSupported()) {
    // Web/dev fallback: sem plugin nativo, só persiste o dado de configuração
    // (útil para testes E2E de UI que não rodam em dispositivo Android real).
    applyToModel();
    return Promise.resolve();
  }

  return Geofence.addGeofence({
    id: taskId,
    lat: location.lat,
    lng: location.lng,
    radius: location.radius,
    trigger: location.trigger,
    label: location.label,
    taskLabel: taskLabel
  }).then(applyToModel);
}

/**
 * Remove a associação de local de uma tarefa: cancela o geofence nativo e
 * limpa o campo `location` da tarefa.
 * @param {string} taskId
 * @returns {Promise<void>}
 */
function removePlaceForTask(taskId) {
  var task = findTaskById(taskId);

  var applyToModel = function () {
    if (task) {
      delete task.location;
      saveTasksByDay(getTasksByDay());
    }
    if (_Sync) _Sync.onRoutineChanged();
  };

  if (!geofencingSupported()) {
    applyToModel();
    return Promise.resolve();
  }

  return Geofence.removeGeofence({ id: taskId }).then(applyToModel);
}

function findTaskById(taskId) {
  var tasksByDay = getTasksByDay();
  var dayKeys = Object.keys(tasksByDay);
  for (var i = 0; i < dayKeys.length; i++) {
    var list = tasksByDay[dayKeys[i]] || [];
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === taskId) return list[j];
    }
  }
  return null;
}

/**
 * Busca de endereço por texto via Nominatim (OpenStreetMap), gratuito e sem
 * API key. Política de uso do Nominatim exige identificar a aplicação via
 * header User-Agent nas requisições.
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * @param {string} query
 * @returns {Promise<Array<{label:string, lat:number, lng:number}>>}
 */
function geocodeAddress(query) {
  if (!query || !query.trim()) return Promise.resolve([]);
  var url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" + encodeURIComponent(query.trim());
  return fetch(url, {
    headers: {
      "User-Agent": "RotinaTDAH-App (contato: rafaelioppi@gmail.com)",
      "Accept": "application/json"
    }
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Falha na busca de endereço (" + res.status + ")");
      return res.json();
    })
    .then(function (results) {
      return (results || []).map(function (r) {
        return {
          label: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        };
      });
    });
}

/**
 * Fluxo de permissão de localização (FINE + BACKGROUND) via plugin nativo.
 * @returns {Promise<{location:string, backgroundLocation:string}>}
 */
function requestLocationPermissions() {
  if (!geofencingSupported()) {
    return Promise.resolve({ location: "denied", backgroundLocation: "denied" });
  }
  return Geofence.checkPermissions().then(function (res) {
    if (res.location === "granted" && res.backgroundLocation === "granted") return res;
    return Geofence.requestPermissions();
  });
}

export {
  initGeofencing,
  registerPlaceForTask,
  removePlaceForTask,
  geocodeAddress,
  requestLocationPermissions,
  geofencingSupported,
  setSyncHook
};
