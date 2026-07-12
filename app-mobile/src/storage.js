/* ---------- AppStorage: camada única de acesso ao localStorage ----------
 * Centraliza todas as chaves usadas pelo app e o try/catch de leitura/
 * escrita, evitando magic strings e blocos try/catch duplicados espalhados
 * pelo arquivo. Não muda o formato dos dados armazenados (mesmo JSON de
 * antes) — apenas centraliza o acesso. */
var AppStorage = (function () {
  var KEYS = {
    AUTH: "rotina_tdah_auth_v1",
    TASKS: "rotina_tdah_tasks_v1",
    STATE: "rotina_tdah_v1",
    ALARMS: "rotina_tdah_alarms_v1",
    SUBSCRIPTION: "rotina_tdah_sub_v1",
    OUTBOX: "rotina_tdah_outbox_v1",
    MIGRATED: "rotina_tdah_migrated_v1",
    PLACES_DISCLOSURE_SEEN: "rotina_tdah_places_disclosure_seen_v1",
    PLACE_FEATURE_DISCOVERY_SEEN: "rotina_tdah_place_feature_discovery_seen_v1",
    SELF_ASSESSMENT_PROGRESS: "rotina_tdah_self_assessment_progress_v1"
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  // Leitura/escrita de string crua (sem JSON), usada por MIGRATED.
  function readRaw(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw || fallback;
    } catch (e) { return fallback; }
  }
  function writeRaw(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  return {
    KEYS: KEYS,
    read: read,
    write: write,
    remove: remove,
    readRaw: readRaw,
    writeRaw: writeRaw,

    getAuth: function () { return read(KEYS.AUTH, null); },
    setAuth: function (session) {
      if (session) write(KEYS.AUTH, session);
      else remove(KEYS.AUTH);
    },

    getTasksByDay: function (fallback) { return read(KEYS.TASKS, fallback); },
    setTasksByDay: function (obj) { write(KEYS.TASKS, obj); },

    getState: function () { return read(KEYS.STATE, {}); },
    setState: function (state) { write(KEYS.STATE, state); },

    getAlarms: function () { return read(KEYS.ALARMS, {}); },
    setAlarms: function (a) { write(KEYS.ALARMS, a); },

    getSubscription: function () { return read(KEYS.SUBSCRIPTION, null); },
    setSubscription: function (sub) { if (sub) write(KEYS.SUBSCRIPTION, sub); },

    getOutbox: function () {
      var arr = read(KEYS.OUTBOX, []);
      return Array.isArray(arr) ? arr : [];
    },
    setOutbox: function (arr) { write(KEYS.OUTBOX, arr); },

    getMigratedUserId: function () { return readRaw(KEYS.MIGRATED, null); },
    setMigratedUserId: function (uid) { writeRaw(KEYS.MIGRATED, String(uid)); },

    getPlacesDisclosureSeen: function () { return readRaw(KEYS.PLACES_DISCLOSURE_SEEN, null) === "1"; },
    setPlacesDisclosureSeen: function () { writeRaw(KEYS.PLACES_DISCLOSURE_SEEN, "1"); },

    getPlaceFeatureDiscoverySeen: function () { return readRaw(KEYS.PLACE_FEATURE_DISCOVERY_SEEN, null) === "1"; },
    setPlaceFeatureDiscoverySeen: function () { writeRaw(KEYS.PLACE_FEATURE_DISCOVERY_SEEN, "1"); },

    getSelfAssessmentProgress: function () { return read(KEYS.SELF_ASSESSMENT_PROGRESS, null); },
    setSelfAssessmentProgress: function (progress) {
      if (progress) write(KEYS.SELF_ASSESSMENT_PROGRESS, progress);
      else remove(KEYS.SELF_ASSESSMENT_PROGRESS);
    }
  };
})();

export { AppStorage };
