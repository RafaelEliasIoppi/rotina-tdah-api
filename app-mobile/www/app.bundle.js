(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/storage.js
  var AppStorage = /* @__PURE__ */ (function() {
    var KEYS = {
      AUTH: "rotina_tdah_auth_v1",
      TASKS: "rotina_tdah_tasks_v1",
      STATE: "rotina_tdah_v1",
      ALARMS: "rotina_tdah_alarms_v1",
      SUBSCRIPTION: "rotina_tdah_sub_v1",
      OUTBOX: "rotina_tdah_outbox_v1",
      MIGRATED: "rotina_tdah_migrated_v1",
      DEDUPE_FIX_APPLIED: "rotina_tdah_dedupe_fix_v1",
      PLACES_DISCLOSURE_SEEN: "rotina_tdah_places_disclosure_seen_v1",
      PLACE_FEATURE_DISCOVERY_SEEN: "rotina_tdah_place_feature_discovery_seen_v1",
      SELF_ASSESSMENT_PROGRESS: "rotina_tdah_self_assessment_progress_v1"
    };
    function read(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
    function remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
      }
    }
    function readRaw(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw || fallback;
      } catch (e) {
        return fallback;
      }
    }
    function writeRaw(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }
    return {
      KEYS,
      read,
      write,
      remove,
      readRaw,
      writeRaw,
      getAuth: function() {
        return read(KEYS.AUTH, null);
      },
      setAuth: function(session) {
        if (session) write(KEYS.AUTH, session);
        else remove(KEYS.AUTH);
      },
      getTasksByDay: function(fallback) {
        return read(KEYS.TASKS, fallback);
      },
      setTasksByDay: function(obj) {
        write(KEYS.TASKS, obj);
      },
      getState: function() {
        return read(KEYS.STATE, {});
      },
      setState: function(state2) {
        write(KEYS.STATE, state2);
      },
      getAlarms: function() {
        return read(KEYS.ALARMS, {});
      },
      setAlarms: function(a) {
        write(KEYS.ALARMS, a);
      },
      getSubscription: function() {
        return read(KEYS.SUBSCRIPTION, null);
      },
      setSubscription: function(sub) {
        if (sub) write(KEYS.SUBSCRIPTION, sub);
      },
      getOutbox: function() {
        var arr = read(KEYS.OUTBOX, []);
        return Array.isArray(arr) ? arr : [];
      },
      setOutbox: function(arr) {
        write(KEYS.OUTBOX, arr);
      },
      getMigratedUserId: function() {
        return readRaw(KEYS.MIGRATED, null);
      },
      setMigratedUserId: function(uid) {
        writeRaw(KEYS.MIGRATED, String(uid));
      },
      // Correção one-time (2026-07-12): dispositivos que já rodaram a migração
      // normal antes da correção de duplicação (ver bug_migration_nao_aplicada_
      // producao / migration 0006_dedupe_tasks.sql) ficaram com tarefas 2x
      // salvas localmente, e a migração normal não roda de novo. Esta chave
      // separada força um único re-pull do servidor (já limpo) por dispositivo,
      // sem afetar o fluxo normal de sync depois disso.
      getDedupeFixApplied: function() {
        return readRaw(KEYS.DEDUPE_FIX_APPLIED, null) === "1";
      },
      setDedupeFixApplied: function() {
        writeRaw(KEYS.DEDUPE_FIX_APPLIED, "1");
      },
      getPlacesDisclosureSeen: function() {
        return readRaw(KEYS.PLACES_DISCLOSURE_SEEN, null) === "1";
      },
      setPlacesDisclosureSeen: function() {
        writeRaw(KEYS.PLACES_DISCLOSURE_SEEN, "1");
      },
      getPlaceFeatureDiscoverySeen: function() {
        return readRaw(KEYS.PLACE_FEATURE_DISCOVERY_SEEN, null) === "1";
      },
      setPlaceFeatureDiscoverySeen: function() {
        writeRaw(KEYS.PLACE_FEATURE_DISCOVERY_SEEN, "1");
      },
      getSelfAssessmentProgress: function() {
        return read(KEYS.SELF_ASSESSMENT_PROGRESS, null);
      },
      setSelfAssessmentProgress: function(progress) {
        if (progress) write(KEYS.SELF_ASSESSMENT_PROGRESS, progress);
        else remove(KEYS.SELF_ASSESSMENT_PROGRESS);
      }
    };
  })();

  // src/tasks.js
  var DAYS = [
    { key: "seg", label: "Segunda" },
    { key: "ter", label: "Ter\xE7a" },
    { key: "qua", label: "Quarta" },
    { key: "qui", label: "Quinta" },
    { key: "sex", label: "Sexta" }
  ];
  var BLOCK_ORDER = ["Manh\xE3", "Trabalho", "Meio-dia", "Tarde", "Noite"];
  var _Sync = null;
  function setSyncHook(syncModule) {
    _Sync = syncModule;
  }
  function defaultTasksByDay() {
    var base = [
      { id: "acordar", time: "05:45", label: "Acordar", block: "Manh\xE3", detail: "Alarme f\xEDsico, n\xE3o celular na m\xE3o. Levante imediatamente.", rule: "Regra 1 \u2014 Pare a a\xE7\xE3o" },
      { id: "espiritual-manha", time: "05:50", label: "Momento espiritual (15 min)", block: "Manh\xE3", detail: 'Ora\xE7\xE3o + leitura b\xEDblica breve, antes de qualquer tela. "Buscai primeiro o Reino de Deus" (Mt 6:33).', rule: "Regra 5 \u2014 Considere o futuro" },
      { id: "preparo-saida", time: "06:05", label: "Prepara\xE7\xE3o para sair (10 min)", block: "Manh\xE3", detail: "Lista fixa perto da porta: carteira, chave, celular, carregador. N\xE3o confie na mem\xF3ria.", rule: "Exteriorizar" },
      { id: "sair-casa", time: "06:15", label: "Sair de casa", block: "Manh\xE3", detail: "", rule: "" },
      { id: "comer-trajeto", time: "06:20", label: "Comer algo leve no trajeto/chegada", block: "Manh\xE3", detail: "Sem caf\xE9 em casa \u2014 hipoglicemia piora desaten\xE7\xE3o e irritabilidade. N\xE3o \xE9 opcional.", rule: "Manejo de energia" },
      { id: "prioridades", time: "07:30", label: "Escrever as 3 prioridades do dia", block: "Trabalho", detail: "Papel ou app, antes de mergulhar em tarefas. A lista existe fora da sua cabe\xE7a, n\xE3o dentro dela.", rule: "Regra 4 \u2014 Exteriorize" },
      { id: "bloco-foco-1", time: "08:00", label: "Bloco de foco 1 (25\u201345 min + timer vis\xEDvel)", block: "Trabalho", detail: "Pausa de 5 min ao final, com pequena recompensa (caf\xE9, alongamento).", rule: "Regra 6 \u2014 Recompensa imediata" },
      { id: "janela-livre-1", time: "09:30", label: "Janela livre: leitura/estudo (20\u201330 min)", block: "Trabalho", detail: "N\xE3o ultrapasse 30 min sem pausa. Pode alternar entre 2 atividades se uma ficar entediante.", rule: "" },
      { id: "revisar-lista-manha", time: "10:15", label: "Revisar lista de prioridades e riscar o que j\xE1 foi feito", block: "Trabalho", detail: "Refor\xE7o visual de progresso.", rule: "" },
      { id: "bloco-foco-2", time: "10:30", label: "Bloco de foco 2 (25\u201345 min + timer vis\xEDvel)", block: "Trabalho", detail: "Tarefas mais exigentes de concentra\xE7\xE3o, se essa costuma ser sua janela de mais energia.", rule: "" },
      { id: "almoco", time: "12:00", label: "Almo\xE7o \u2014 pausa real, sem tela se poss\xEDvel", block: "Meio-dia", detail: "30 segundos de gratid\xE3o antes de comer j\xE1 contam.", rule: "" },
      { id: "janela-livre-2", time: "13:30", label: "Janela livre: leitura/estudo ou outra atividade", block: "Tarde", detail: "Tarefas administrativas/repetitivas nos per\xEDodos de menor energia.", rule: "" },
      { id: "bloco-foco-3", time: "14:00", label: "Bloco de foco 3 (25\u201345 min + timer vis\xEDvel)", block: "Tarde", detail: "", rule: "" },
      { id: "antes-reuniao", time: "15:00", label: "Antes de reuni\xE3o/conversa importante: anotar 2\u20133 pontos-chave", block: "Tarde", detail: "Se perceber que est\xE1 divagando, pause e repita mentalmente o ponto principal.", rule: "Comunica\xE7\xE3o" },
      { id: "bloco-foco-4", time: "16:00", label: "Bloco de foco 4 (25\u201345 min + timer vis\xEDvel)", block: "Tarde", detail: "", rule: "" },
      { id: "revisar-fim-dia", time: "17:30", label: "Revisar prioridades: pend\xEAncias viram 1\xAA prioridade de amanh\xE3", block: "Tarde", detail: "Evita come\xE7ar o dia seguinte sem rumo.", rule: "" },
      { id: "transicao", time: "18:00", label: "Transi\xE7\xE3o mental no trajeto de volta (5 min sem celular)", block: "Noite", detail: 'Ajuda a "desligar" do trabalho antes de entrar em outro contexto.', rule: "Regula\xE7\xE3o emocional" },
      { id: "espiritual-noite", time: "20:30", label: "Momento espiritual de encerramento (10 min)", block: "Noite", detail: "Ora\xE7\xE3o de gratid\xE3o e entrega do dia. Reconhecer o erro sem se punir.", rule: "Regra 8 \u2014 Senso de humor" },
      { id: "preparar-amanha", time: "21:30", label: "Preparar o dia seguinte (10 min)", block: "Noite", detail: "Separar roupa, mochila. Definir 1\u20132 prioridades para amanh\xE3.", rule: "" },
      { id: "dormir", time: "22:30", label: "Hor\xE1rio fixo para dormir", block: "Noite", detail: "Sono ruim piora desaten\xE7\xE3o e impulsividade no dia seguinte.", rule: "" }
    ];
    var out = {};
    DAYS.forEach(function(d) {
      var list = base.map(function(t) {
        return Object.assign({}, t);
      });
      if (d.key === "seg") {
        list.splice(5, 0, { id: "planejar-semana", time: "07:35", label: "Planejar a semana inteira (10 min)", block: "Trabalho", detail: "Fragmente metas grandes em passos di\xE1rios.", rule: "Regra 6 \u2014 Decomponha o futuro" });
      }
      if (d.key === "sex") {
        list.push({ id: "revisao-semana", time: "17:45", label: "Revis\xE3o da semana: o que funcionou, o que n\xE3o", block: "Tarde", detail: "Ajuste de estrat\xE9gia \xE9 parte do processo.", rule: "" });
      }
      out[d.key] = list;
    });
    return out;
  }
  function loadTasksByDay() {
    var found = AppStorage.getTasksByDay(null);
    if (found) return found;
    var def = defaultTasksByDay();
    saveTasksByDay(def);
    return def;
  }
  function saveTasksByDay(obj) {
    AppStorage.setTasksByDay(obj);
    if (_Sync) _Sync.onRoutineChanged();
  }
  var tasksByDay = loadTasksByDay();
  function buildTasks(dayKey) {
    return (tasksByDay[dayKey] || []).slice().sort(function(a, b) {
      return a.time.localeCompare(b.time);
    });
  }
  function uniqueId(dayKey, base) {
    var list = tasksByDay[dayKey] || [];
    var id = base, n = 2;
    while (list.some(function(t) {
      return t.id === id;
    })) {
      id = base + "-" + n;
      n++;
    }
    return id;
  }
  function todayKeyBR() {
    var idx = (/* @__PURE__ */ new Date()).getDay();
    var map = { 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex" };
    return map[idx] || "seg";
  }
  function isoDate(d) {
    d = d || /* @__PURE__ */ new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function loadState() {
    return AppStorage.getState();
  }
  function saveState(state2) {
    AppStorage.setState(state2);
  }
  function loadAlarms() {
    return AppStorage.getAlarms();
  }
  function saveAlarms(a) {
    AppStorage.setAlarms(a);
  }
  var state = loadState();
  var alarms = loadAlarms();
  var currentDay = todayKeyBR();
  var currentDateISO = isoDate();
  function dayState(dateISO) {
    if (!state[dateISO]) state[dateISO] = {};
    return state[dateISO];
  }
  function effectiveDateForDay(dayKey) {
    if (dayKey === todayKeyBR()) return currentDateISO;
    return "template-" + dayKey;
  }
  function getCurrentDay() {
    return currentDay;
  }
  function setCurrentDay(v) {
    currentDay = v;
  }
  function getCurrentDateISO() {
    return currentDateISO;
  }
  function setCurrentDateISO(v) {
    currentDateISO = v;
  }
  function getTasksByDay() {
    return tasksByDay;
  }
  function setTasksByDay(obj) {
    tasksByDay = obj;
  }
  function getStateObj() {
    return state;
  }
  function setStateObj(obj) {
    state = obj;
  }
  function getAlarmsObj() {
    return alarms;
  }
  function setAlarmsObj(obj) {
    alarms = obj;
  }

  // src/notifications.js
  var _Sync2 = null;
  function setSyncHook2(syncModule) {
    _Sync2 = syncModule;
  }
  var clockEl = document.getElementById("clock");
  var toastEl = document.getElementById("toast");
  function tickClock() {
    var now = /* @__PURE__ */ new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    clockEl.textContent = hh + ":" + mm;
    var iso = isoDate();
    if (iso !== getCurrentDateISO()) {
      setCurrentDateISO(iso);
      setCurrentDay(todayKeyBR());
      renderDayTabs();
      renderBlocks();
    }
    checkDueAlarms(now);
  }
  var notifyBanner = document.getElementById("notifyBanner");
  var notifyBtn = document.getElementById("notifyBtn");
  var firedToday = {};
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var LocalNotifications = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  function notifSupported() {
    if (isNative) return !!LocalNotifications;
    return "Notification" in window;
  }
  function updateNotifyBanner() {
    if (!notifSupported()) {
      notifyBanner.classList.remove("show");
      return;
    }
    if (isNative) {
      LocalNotifications.checkPermissions().then(function(res) {
        notifyBanner.classList.toggle("show", res.display !== "granted");
      });
      var bannerText = notifyBanner.querySelector("span");
      if (bannerText) bannerText.textContent = "Ative notifica\xE7\xF5es para receber lembretes garantidos, mesmo com o app fechado.";
      return;
    }
    notifyBanner.classList.toggle("show", Notification.permission === "default");
  }
  notifyBtn.addEventListener("click", function() {
    if (!notifSupported()) return;
    if (isNative) {
      LocalNotifications.requestPermissions().then(function(res) {
        updateNotifyBanner();
        showToast(res.display === "granted" ? "Notifica\xE7\xF5es ativadas." : "Permiss\xE3o n\xE3o concedida.");
        if (res.display === "granted") rescheduleAllNativeAlarms();
      });
      return;
    }
    Notification.requestPermission().then(function() {
      updateNotifyBanner();
      showToast(Notification.permission === "granted" ? "Notifica\xE7\xF5es ativadas." : "Permiss\xE3o n\xE3o concedida.");
    });
  });
  function alarmNativeId(key) {
    var h = 0;
    for (var i = 0; i < key.length; i++) {
      h = h * 31 + key.charCodeAt(i) | 0;
    }
    return Math.abs(h) % 2147483647;
  }
  var WEEKDAY_NUM = { seg: 2, ter: 3, qua: 4, qui: 5, sex: 6 };
  function scheduleNativeAlarm(key, time, label) {
    if (!LocalNotifications) return;
    var parts = key.split(":");
    var dayKey = parts[0];
    var hh = parseInt(time.split(":")[0], 10);
    var mm = parseInt(time.split(":")[1], 10);
    LocalNotifications.schedule({
      notifications: [{
        id: alarmNativeId(key),
        title: "Rotina TDAH \u2014 " + time,
        body: label,
        schedule: { on: { weekday: WEEKDAY_NUM[dayKey], hour: hh, minute: mm }, allowWhileIdle: true },
        sound: null
      }]
    }).catch(function() {
    });
  }
  function cancelNativeAlarm(key) {
    if (!LocalNotifications) return;
    LocalNotifications.cancel({ notifications: [{ id: alarmNativeId(key) }] }).catch(function() {
    });
  }
  function rescheduleAllNativeAlarms() {
    if (!LocalNotifications) return;
    var alarms2 = getAlarmsObj();
    Object.keys(alarms2).forEach(function(key) {
      scheduleNativeAlarm(key, alarms2[key].time, alarms2[key].label);
    });
  }
  function toggleAlarm(key, time, label) {
    var alarms2 = getAlarmsObj();
    if (alarms2[key]) {
      delete alarms2[key];
      if (isNative) cancelNativeAlarm(key);
    } else {
      alarms2[key] = { time, label };
      if (isNative) {
        LocalNotifications.checkPermissions().then(function(res) {
          if (res.display === "granted") {
            scheduleNativeAlarm(key, time, label);
            return;
          }
          LocalNotifications.requestPermissions().then(function(r2) {
            if (r2.display === "granted") scheduleNativeAlarm(key, time, label);
            updateNotifyBanner();
          });
        });
      } else if (notifSupported() && Notification.permission === "default") {
        Notification.requestPermission().then(updateNotifyBanner);
      }
    }
    saveAlarms(alarms2);
    if (_Sync2) {
      _Sync2.onAlarmChanged(key, time, label, !!alarms2[key]);
    }
    renderBlocks();
    showToast(alarms2[key] ? "Lembrete ativado para " + time : "Lembrete removido");
  }
  function checkDueAlarms(now) {
    if (isNative) return;
    var alarms2 = getAlarmsObj();
    var realDay = todayKeyBR();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    var nowHM = hh + ":" + mm;
    Object.keys(alarms2).forEach(function(key) {
      var parts = key.split(":");
      var dayKey = parts[0];
      if (dayKey !== realDay) return;
      var a = alarms2[key];
      if (a.time !== nowHM) return;
      var fireFlag = key + "@" + getCurrentDateISO();
      if (firedToday[fireFlag]) return;
      firedToday[fireFlag] = true;
      fireReminder(a.label, a.time);
    });
  }
  function fireReminder(label, time) {
    showToast("\u23F0 " + time + " \u2014 " + label);
    if (notifSupported() && Notification.permission === "granted") {
      try {
        var n = new Notification("Rotina TDAH \u2014 " + time, { body: label, tag: "rotina-" + time });
      } catch (e) {
      }
    }
    if (navigator.vibrate) {
      try {
        navigator.vibrate([120, 60, 120]);
      } catch (e) {
      }
    }
  }
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove("show");
    }, 3200);
  }
  function initNotifications() {
    updateNotifyBanner();
    setInterval(tickClock, 15e3);
    tickClock();
    if (isNative && LocalNotifications) {
      LocalNotifications.checkPermissions().then(function(res) {
        if (res.display === "granted") rescheduleAllNativeAlarms();
      });
    }
  }

  // src/render.js
  var _Sync3 = null;
  function setSyncHook3(syncModule) {
    _Sync3 = syncModule;
  }
  var _openPomodoro = null;
  function setPomodoroHook(openFn) {
    _openPomodoro = openFn;
  }
  var dayTabsEl = document.getElementById("dayTabs");
  var blocksEl = document.getElementById("blocksContainer");
  var ringFill = document.getElementById("ringFill");
  var ringLabel = document.getElementById("ringLabel");
  var progressHeadline = document.getElementById("progressHeadline");
  var progressSub = document.getElementById("progressSub");
  var RING_CIRC = 169.6;
  function renderDayTabs() {
    dayTabsEl.innerHTML = "";
    DAYS.forEach(function(d) {
      var btn = document.createElement("button");
      btn.className = "daytab";
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(d.key === getCurrentDay()));
      var isReal = d.key === todayKeyBR();
      btn.innerHTML = (isReal ? '<span class="dot"></span>' : "") + d.label;
      btn.addEventListener("click", function() {
        setCurrentDay(d.key);
        renderDayTabs();
        renderBlocks();
      });
      dayTabsEl.appendChild(btn);
    });
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function checkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function bellIcon(filled) {
    return '<svg viewBox="0 0 24 24" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2"><path d="M12 3a5 5 0 00-5 5v3.3c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.3c-.3-.4-.5-.9-.5-1.4V8a5 5 0 00-5-5z" stroke-linejoin="round"/><path d="M9.5 18a2.5 2.5 0 005 0" stroke-linecap="round"/></svg>';
  }
  function pinIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11.5A7 7 0 005 9.5C5 14.9 12 21 12 21z" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3"/></svg>';
  }
  function timerIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function renderBlocks() {
    var currentDay2 = getCurrentDay();
    var tasks = buildTasks(currentDay2);
    var ds = dayState(effectiveDateForDay(currentDay2));
    var alarms2 = getAlarmsObj();
    blocksEl.innerHTML = "";
    var byBlock = {};
    tasks.forEach(function(t) {
      if (!byBlock[t.block]) byBlock[t.block] = [];
      byBlock[t.block].push(t);
    });
    BLOCK_ORDER.forEach(function(blockName) {
      var items = byBlock[blockName];
      if (!items || !items.length) return;
      var section = document.createElement("div");
      section.className = "block";
      var title = document.createElement("div");
      title.className = "block-title";
      title.innerHTML = escapeHtml(blockName) + '<span class="tag">' + items.length + " itens</span>";
      section.appendChild(title);
      items.forEach(function(t) {
        var alarmKey = currentDay2 + ":" + t.id;
        var card = document.createElement("div");
        card.className = "task" + (ds[t.id] ? " done" : "");
        card.setAttribute("role", "checkbox");
        card.setAttribute("aria-checked", String(!!ds[t.id]));
        card.tabIndex = 0;
        var detailHtml = t.detail ? '<div class="task-detail">' + escapeHtml(t.detail) + "</div>" : "";
        var ruleHtml = t.rule ? '<span class="task-rule">' + escapeHtml(t.rule) + "</span>" : "";
        var ifThenHtml = t.ifThen ? '<div class="task-if-then">' + escapeHtml(t.ifThen) + "</div>" : "";
        var timeHtml = t.time ? '<span class="task-time">' + escapeHtml(t.time) + "</span>" : "";
        var locationHtml = t.location ? '<span class="task-time task-place" title="Lembrete por local: ' + escapeHtml(t.location.label || "") + '">' + pinIcon() + escapeHtml(t.location.label || "Local") + "</span>" : "";
        card.innerHTML = '<div class="check">' + checkIcon() + '</div><div class="task-body"><div class="task-top">' + timeHtml + locationHtml + '<span class="task-label">' + escapeHtml(t.label) + "</span></div>" + detailHtml + ifThenHtml + ruleHtml + '</div><button class="alarm-btn pomodoro-trigger" type="button" aria-label="Bloco de foco" data-task-label="' + escapeHtml(t.label) + '">' + timerIcon() + '</button><button class="alarm-btn' + (alarms2[alarmKey] ? " armed" : "") + '" type="button" aria-label="Lembrete" data-alarm="' + escapeHtml(alarmKey) + '" data-time="' + escapeHtml(t.time) + '" data-label="' + escapeHtml(t.label) + '">' + bellIcon(!!alarms2[alarmKey]) + "</button>";
        card.addEventListener("click", function(ev) {
          if (ev.target.closest(".alarm-btn")) return;
          toggleTask(t.id);
        });
        card.addEventListener("keydown", function(ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggleTask(t.id);
          }
        });
        section.appendChild(card);
      });
      blocksEl.appendChild(section);
    });
    blocksEl.querySelectorAll(".alarm-btn:not(.pomodoro-trigger)").forEach(function(btn) {
      btn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        toggleAlarm(btn.dataset.alarm, btn.dataset.time, btn.dataset.label);
      });
    });
    blocksEl.querySelectorAll(".pomodoro-trigger").forEach(function(btn) {
      btn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (_openPomodoro) _openPomodoro(btn.dataset.taskLabel);
      });
    });
    updateProgress();
  }
  function toggleTask(id) {
    var currentDay2 = getCurrentDay();
    var dateISO = effectiveDateForDay(currentDay2);
    var ds = dayState(dateISO);
    ds[id] = !ds[id];
    saveState(getStateObj());
    if (_Sync3 && dateISO.indexOf("template-") !== 0) {
      _Sync3.onCompletionChanged(id, dateISO, !!ds[id]);
    }
    renderBlocks();
  }
  function updateProgress() {
    var currentDay2 = getCurrentDay();
    var tasks = buildTasks(currentDay2);
    var ds = dayState(effectiveDateForDay(currentDay2));
    var total = tasks.length;
    var done = tasks.filter(function(t) {
      return ds[t.id];
    }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var offset = RING_CIRC - RING_CIRC * pct / 100;
    ringFill.style.strokeDashoffset = String(offset);
    ringLabel.textContent = pct + "%";
    progressSub.textContent = done + " de " + total + " conclu\xEDdas";
    progressSub.textContent += currentDay2 === todayKeyBR() ? " hoje" : " (" + DAYS.find(function(d) {
      return d.key === currentDay2;
    }).label + ")";
    var headline;
    if (pct === 0) headline = "Vamos come\xE7ar";
    else if (pct < 50) headline = "Em andamento";
    else if (pct < 100) headline = "Bom progresso";
    else headline = "Dia conclu\xEDdo";
    progressHeadline.textContent = headline;
    renderStreak();
  }
  var streakRowEl = document.getElementById("streakRow");
  function renderStreak() {
    streakRowEl.innerHTML = "";
    var weekdayKeys = ["seg", "ter", "qua", "qui", "sex"];
    var todayKey = todayKeyBR();
    var state2 = getStateObj();
    weekdayKeys.forEach(function(dayKey) {
      var dateISO = effectiveDateForDay(dayKey);
      var ds = state2[dateISO] || {};
      var tasks = buildTasks(dayKey);
      var total = tasks.length;
      var done = tasks.filter(function(t) {
        return ds[t.id];
      }).length;
      var pct = total ? Math.round(done / total * 100) : 0;
      var cell = document.createElement("div");
      cell.className = "streak-day" + (pct === 100 ? " full" : pct > 0 ? " partial" : "") + (dayKey === todayKey ? " today" : "");
      cell.innerHTML = '<div class="d-label">' + DAYS.find(function(x) {
        return x.key === dayKey;
      }).label.slice(0, 3) + '</div><div class="d-pct">' + pct + "%</div>";
      streakRowEl.appendChild(cell);
    });
  }
  document.getElementById("resetBtn").addEventListener("click", function() {
    var currentDay2 = getCurrentDay();
    var dateISO = effectiveDateForDay(currentDay2);
    if (!confirm("Reiniciar o checklist de " + (currentDay2 === todayKeyBR() ? "hoje" : DAYS.find(function(d) {
      return d.key === currentDay2;
    }).label) + "?")) return;
    var state2 = getStateObj();
    state2[dateISO] = {};
    saveState(state2);
    renderBlocks();
  });

  // src/social.js
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
  function renderLoggedOut() {
    socialBody.innerHTML = '<p class="social-hint">Entre com sua conta para convidar um parceiro de responsabiliza\xE7\xE3o \u2014 a pessoa que v\xEA seu progresso do dia (s\xF3 a contagem, nunca suas tarefas) e vice-versa.</p><div class="social-source">Fonte: Regra 6 de "Vencendo o TDAH Adulto" (Barkley) \u2014 presta\xE7\xE3o de contas a terceiros eleva conclus\xE3o de metas de 65% para 95% segundo estudos citados na literatura cl\xEDnica de TDAH.</div>';
  }
  function renderNoPartner() {
    socialBody.innerHTML = '<p class="social-hint">Convide algu\xE9m de confian\xE7a para ser seu parceiro de responsabiliza\xE7\xE3o. Voc\xEAs veem s\xF3 o progresso um do outro hoje (quantas tarefas conclu\xEDdas de quantas no total) \u2014 nunca o conte\xFAdo da rotina.</p><button class="btn btn-primary" id="socialCreateInviteBtn" type="button">Gerar c\xF3digo de convite</button><div class="social-divider">ou</div><div class="social-accept-row"><input type="text" id="socialCodeInput" class="social-code-input" placeholder="C\xF3digo recebido" maxlength="6"><button class="btn" id="socialAcceptBtn" type="button">Entrar com c\xF3digo</button></div><div id="socialInviteResult"></div>';
    document.getElementById("socialCreateInviteBtn").addEventListener("click", handleCreateInvite);
    document.getElementById("socialAcceptBtn").addEventListener("click", handleAcceptInvite);
  }
  function handleCreateInvite() {
    _Api.fetch("/social/invite", { method: "POST" }).then(function(data) {
      var el = document.getElementById("socialInviteResult");
      el.innerHTML = '<div class="social-invite-code">Seu c\xF3digo: <strong>' + data.code + "</strong><br>Compartilhe com a pessoa \u2014 v\xE1lido por 7 dias.</div>";
    }).catch(function(err) {
      showToast(err.message || "N\xE3o foi poss\xEDvel gerar o convite.");
    });
  }
  function handleAcceptInvite() {
    var code = document.getElementById("socialCodeInput").value.trim();
    if (!code) return;
    _Api.fetch("/social/invite/accept", { method: "POST", body: { code } }).then(function() {
      showToast("Parceiro conectado!");
      renderPartnerStatus();
    }).catch(function(err) {
      showToast(err.message || "C\xF3digo inv\xE1lido ou expirado.");
    });
  }
  function renderPartnerStatus(data) {
    if (!data) {
      _Api.fetch("/social/partner", { method: "GET" }).then(renderPartnerStatus).catch(function(err) {
        showToast(err.message || "N\xE3o foi poss\xEDvel carregar seu parceiro agora.");
        renderNoPartner();
      });
      return;
    }
    if (!data.partner) {
      renderNoPartner();
      return;
    }
    var mePct = data.me.total ? Math.round(data.me.done / data.me.total * 100) : 0;
    var partnerPct = data.partnerProgress.total ? Math.round(data.partnerProgress.done / data.partnerProgress.total * 100) : 0;
    socialBody.innerHTML = '<div class="social-partner-card"><div class="social-partner-name">Parceiro: ' + escapeHtml2(data.partner.displayName) + '</div><div class="social-progress-row"><span>Voc\xEA</span><div class="social-progress-track"><div class="social-progress-fill" style="width:' + mePct + '%"></div></div><span>' + data.me.done + "/" + data.me.total + '</span></div><div class="social-progress-row"><span>' + escapeHtml2(data.partner.displayName) + '</span><div class="social-progress-track"><div class="social-progress-fill" style="width:' + partnerPct + '%"></div></div><span>' + data.partnerProgress.done + "/" + data.partnerProgress.total + '</span></div></div><button class="btn" id="socialRemovePartnerBtn" type="button">Desfazer parceria</button>';
    document.getElementById("socialRemovePartnerBtn").addEventListener("click", function() {
      if (!confirm("Desfazer a parceria de responsabiliza\xE7\xE3o?")) return;
      _Api.fetch("/social/partner", { method: "DELETE" }).then(function() {
        showToast("Parceria desfeita.");
        renderNoPartner();
      }).catch(function(err) {
        showToast(err.message || "N\xE3o foi poss\xEDvel desfazer.");
      });
    });
  }
  function escapeHtml2(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function openSocial() {
    socialOverlay.classList.add("show");
    if (!apiAvailable()) {
      renderLoggedOut();
      return;
    }
    socialBody.innerHTML = '<p class="social-hint">Carregando...</p>';
    renderPartnerStatus();
  }
  function closeSocial() {
    socialOverlay.classList.remove("show");
  }
  var heartbeatTimer = null;
  function startFocusPresence(onCountUpdate) {
    if (!apiAvailable()) {
      if (onCountUpdate) onCountUpdate(null);
      return;
    }
    function beat() {
      _Api.fetch("/social/focus/heartbeat", { method: "POST" }).then(function(data) {
        if (onCountUpdate) onCountUpdate(data.activeCount);
      }).catch(function() {
      });
    }
    beat();
    heartbeatTimer = setInterval(beat, 6e4);
  }
  function stopFocusPresence() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (apiAvailable()) {
      _Api.fetch("/social/focus/heartbeat", { method: "DELETE" }).catch(function() {
      });
    }
  }
  function initSocial() {
    socialBtn.addEventListener("click", openSocial);
    socialCloseBtn.addEventListener("click", closeSocial);
    socialOverlay.addEventListener("click", function(ev) {
      if (ev.target === socialOverlay) closeSocial();
    });
  }

  // src/pomodoro.js
  var START_MINUTES = 10;
  var EXTEND_MINUTES = 10;
  var RING_CIRC2 = 2 * Math.PI * 54;
  var pomodoroOverlay = document.getElementById("pomodoroOverlay");
  var pomodoroCloseBtn = document.getElementById("pomodoroCloseBtn");
  var pomodoroTaskLabel = document.getElementById("pomodoroTaskLabel");
  var pomodoroRingFill = document.getElementById("pomodoroRingFill");
  var pomodoroTimeEl = document.getElementById("pomodoroTime");
  var pomodoroPhaseEl = document.getElementById("pomodoroPhase");
  var pomodoroStartBtn = document.getElementById("pomodoroStartBtn");
  var pomodoroPauseBtn = document.getElementById("pomodoroPauseBtn");
  var pomodoroExtendBtn = document.getElementById("pomodoroExtendBtn");
  var pomodoroPresenceEl = document.getElementById("pomodoroPresence");
  function updatePresence(count) {
    if (count === null || count === void 0) {
      pomodoroPresenceEl.style.display = "none";
      return;
    }
    pomodoroPresenceEl.style.display = "";
    pomodoroPresenceEl.textContent = count <= 1 ? "Voc\xEA est\xE1 em foco agora." : "\u{1F465} " + count + " pessoas em bloco de foco agora, junto com voc\xEA.";
  }
  var totalSeconds = START_MINUTES * 60;
  var remainingSeconds = totalSeconds;
  var tickHandle = null;
  var running = false;
  var extensions = 0;
  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }
  function renderPomodoroState() {
    pomodoroTimeEl.textContent = formatTime(remainingSeconds);
    var pct = totalSeconds ? remainingSeconds / totalSeconds : 0;
    pomodoroRingFill.style.strokeDasharray = String(RING_CIRC2);
    pomodoroRingFill.style.strokeDashoffset = String(RING_CIRC2 * (1 - pct));
    pomodoroPhaseEl.textContent = extensions === 0 ? "Bloco curto para come\xE7ar" : "Estendido " + extensions + "x \u2014 ainda no ritmo";
  }
  function tick() {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderPomodoroState();
      stopTicking();
      pomodoroPhaseEl.textContent = "Tempo esgotado \u2014 ainda produtivo?";
      pomodoroStartBtn.style.display = "none";
      pomodoroPauseBtn.style.display = "none";
      pomodoroExtendBtn.style.display = "";
      showToast("\u23F1\uFE0F Bloco de foco encerrado. Continuar? Estenda +10 min ou feche.");
      if (navigator.vibrate) {
        try {
          navigator.vibrate([120, 60, 120]);
        } catch (e) {
        }
      }
      stopFocusPresence();
      pomodoroPresenceEl.style.display = "none";
      return;
    }
    renderPomodoroState();
  }
  function startTicking() {
    if (tickHandle) return;
    running = true;
    tickHandle = setInterval(tick, 1e3);
    pomodoroStartBtn.style.display = "none";
    pomodoroPauseBtn.style.display = "";
    pomodoroExtendBtn.style.display = "none";
  }
  function stopTicking() {
    running = false;
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }
  pomodoroStartBtn.addEventListener("click", function() {
    startTicking();
    startFocusPresence(updatePresence);
  });
  pomodoroPauseBtn.addEventListener("click", function() {
    stopTicking();
    stopFocusPresence();
    pomodoroPresenceEl.style.display = "none";
    pomodoroStartBtn.style.display = "";
    pomodoroPauseBtn.style.display = "none";
  });
  pomodoroExtendBtn.addEventListener("click", function() {
    extensions += 1;
    remainingSeconds = EXTEND_MINUTES * 60;
    totalSeconds = EXTEND_MINUTES * 60;
    renderPomodoroState();
    startTicking();
    startFocusPresence(updatePresence);
  });
  function openPomodoro(taskLabel) {
    pomodoroTaskLabel.textContent = taskLabel || "Bloco de foco";
    totalSeconds = START_MINUTES * 60;
    remainingSeconds = totalSeconds;
    extensions = 0;
    stopTicking();
    renderPomodoroState();
    pomodoroStartBtn.style.display = "";
    pomodoroPauseBtn.style.display = "none";
    pomodoroExtendBtn.style.display = "none";
    pomodoroPresenceEl.style.display = "none";
    pomodoroOverlay.classList.add("show");
  }
  function closePomodoro() {
    var wasRunning = running;
    stopTicking();
    if (wasRunning) stopFocusPresence();
    pomodoroOverlay.classList.remove("show");
  }
  function initPomodoro() {
    pomodoroCloseBtn.addEventListener("click", closePomodoro);
    pomodoroOverlay.addEventListener("click", function(ev) {
      if (ev.target === pomodoroOverlay) closePomodoro();
    });
  }

  // src/geofencing.js
  var _Sync4 = null;
  function setSyncHook4(syncModule) {
    _Sync4 = syncModule;
  }
  var _Api2 = null;
  function setApiHook2(apiModule) {
    _Api2 = apiModule;
  }
  var FREE_PLACES_LIMIT = 3;
  var isNative2 = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var Geofence = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geofence;
  function geofencingSupported() {
    return isNative2 && !!Geofence;
  }
  function initGeofencing() {
  }
  function registerPlaceForTask(taskId, place, trigger) {
    if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") {
      return Promise.reject(new Error("place inv\xE1lido: obrigat\xF3rio { lat, lng, radius, label }"));
    }
    var radius = place.radius || 150;
    var normalizedTrigger = trigger === "exit" || trigger === "both" ? trigger : "enter";
    var task = findTaskById(taskId);
    var taskLabel = task ? task.label : "";
    var location = {
      lat: place.lat,
      lng: place.lng,
      radius,
      trigger: normalizedTrigger,
      label: place.label || ""
    };
    var applyToModel = function() {
      if (task) {
        task.location = location;
        saveTasksByDay(getTasksByDay());
      }
      if (_Sync4) _Sync4.onRoutineChanged();
    };
    if (!geofencingSupported()) {
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
      taskLabel
    }).then(applyToModel);
  }
  function removePlaceForTask(taskId) {
    var task = findTaskById(taskId);
    var applyToModel = function() {
      if (task) {
        delete task.location;
        saveTasksByDay(getTasksByDay());
      }
      if (_Sync4) _Sync4.onRoutineChanged();
    };
    if (!geofencingSupported()) {
      applyToModel();
      return Promise.resolve();
    }
    return Geofence.removeGeofence({ id: taskId }).then(applyToModel);
  }
  function countPlacesInUse() {
    if (_Api2 && _Api2.isLoggedIn && _Api2.isLoggedIn()) {
      return _Api2.fetch("/places", { method: "GET" }).then(function(data) {
        var places = data && data.places || [];
        return { count: places.length, limit: FREE_PLACES_LIMIT, source: "api" };
      }, function() {
        return { count: countPlacesLocally(), limit: FREE_PLACES_LIMIT, source: "local" };
      });
    }
    return Promise.resolve({ count: countPlacesLocally(), limit: FREE_PLACES_LIMIT, source: "local" });
  }
  function countPlacesLocally() {
    var tasksByDay2 = getTasksByDay();
    var seen = {};
    var count = 0;
    Object.keys(tasksByDay2).forEach(function(dayKey) {
      (tasksByDay2[dayKey] || []).forEach(function(t) {
        if (!t.location) return;
        var key = (t.location.label || "") + "|" + t.location.lat + "|" + t.location.lng;
        if (seen[key]) return;
        seen[key] = true;
        count++;
      });
    });
    return count;
  }
  function listPlacesInUse() {
    if (_Api2 && _Api2.isLoggedIn && _Api2.isLoggedIn()) {
      return _Api2.fetch("/places", { method: "GET" }).then(function(data) {
        var places = data && data.places || [];
        if (!places.length) return listPlacesLocally();
        return places.map(function(p) {
          return {
            taskId: p.taskId || p.task_id || "",
            taskLabel: p.taskLabel || p.task_label || "",
            location: {
              lat: p.lat,
              lng: p.lng,
              radius: p.radius,
              trigger: p.trigger,
              label: p.label || ""
            }
          };
        });
      }, function() {
        return listPlacesLocally();
      });
    }
    return Promise.resolve(listPlacesLocally());
  }
  function listPlacesLocally() {
    var tasksByDay2 = getTasksByDay();
    var out = [];
    Object.keys(tasksByDay2).forEach(function(dayKey) {
      (tasksByDay2[dayKey] || []).forEach(function(t) {
        if (!t.location) return;
        out.push({ taskId: t.id, taskLabel: t.label || "", location: t.location });
      });
    });
    return out;
  }
  function findTaskById(taskId) {
    var tasksByDay2 = getTasksByDay();
    var dayKeys = Object.keys(tasksByDay2);
    for (var i = 0; i < dayKeys.length; i++) {
      var list = tasksByDay2[dayKeys[i]] || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === taskId) return list[j];
      }
    }
    return null;
  }
  function geocodeAddress(query) {
    if (!query || !query.trim()) return Promise.resolve([]);
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" + encodeURIComponent(query.trim());
    return fetch(url, {
      headers: {
        "User-Agent": "RotinaTDAH-App (contato: rafaelioppi@gmail.com)",
        "Accept": "application/json"
      }
    }).then(function(res) {
      if (!res.ok) throw new Error("Falha na busca de endere\xE7o (" + res.status + ")");
      return res.json();
    }).then(function(results) {
      return (results || []).map(function(r) {
        return {
          label: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        };
      });
    });
  }
  function requestLocationPermissions() {
    if (!geofencingSupported()) {
      return Promise.resolve({ location: "denied", backgroundLocation: "denied" });
    }
    return Geofence.checkPermissions().then(function(res) {
      if (res.location === "granted" && res.backgroundLocation === "granted") return res;
      return Geofence.requestPermissions();
    });
  }

  // src/editor.js
  var _PlacesOverlay = null;
  function setPlacesOverlayHook(placesOverlayModule) {
    _PlacesOverlay = placesOverlayModule;
  }
  var editOverlay = document.getElementById("editOverlay");
  var editDayTabsEl = document.getElementById("editDayTabs");
  var editRowsEl = document.getElementById("editRows");
  var editDay = getCurrentDay();
  function openEditor() {
    editDay = getCurrentDay();
    renderEditDayTabs();
    renderEditRows();
    editOverlay.classList.add("show");
  }
  function closeEditor() {
    editOverlay.classList.remove("show");
    renderDayTabs();
    renderBlocks();
  }
  function renderEditDayTabs() {
    editDayTabsEl.innerHTML = "";
    DAYS.forEach(function(d) {
      var btn = document.createElement("button");
      btn.className = "edit-daytab";
      btn.type = "button";
      btn.setAttribute("aria-selected", String(d.key === editDay));
      btn.textContent = d.label;
      btn.addEventListener("click", function() {
        editDay = d.key;
        renderEditDayTabs();
        renderEditRows();
      });
      editDayTabsEl.appendChild(btn);
    });
  }
  function trashIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function dupIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10" stroke-linecap="round"/></svg>';
  }
  function openDuplicateMenu(anchorBtn, task) {
    var others = DAYS.filter(function(d) {
      return d.key !== editDay;
    });
    var choice = prompt(
      'Duplicar "' + task.label + '" para qual dia? (' + others.map(function(d) {
        return d.label;
      }).join(", ") + ")\nDigite o nome do dia:"
    );
    if (!choice) return;
    var norm = choice.trim().toLowerCase();
    var target = others.find(function(d) {
      return d.label.toLowerCase().indexOf(norm) === 0;
    });
    if (!target) {
      showToast("Dia n\xE3o reconhecido");
      return;
    }
    var tasksByDay2 = getTasksByDay();
    var list = tasksByDay2[target.key] || (tasksByDay2[target.key] = []);
    var newId = uniqueId(target.key, task.id);
    list.push({ id: newId, time: task.time, block: task.block, label: task.label, detail: task.detail, rule: task.rule, ifThen: task.ifThen });
    saveTasksByDay(tasksByDay2);
    showToast("Copiada para " + target.label);
  }
  var placesPrivacyOverlay = document.getElementById("placesPrivacyOverlay");
  var pendingPlacesAction = null;
  function pinIconSmall() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2a7 7 0 017 7.5C19 14.8 12 21 12 21z" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3"/></svg>';
  }
  function openPlacesPrivacy(onAllow, onSkip) {
    pendingPlacesAction = { onAllow, onSkip };
    placesPrivacyOverlay.classList.add("show");
  }
  function closePlacesPrivacy() {
    placesPrivacyOverlay.classList.remove("show");
    pendingPlacesAction = null;
  }
  function ensureLocationPermission() {
    if (AppStorage.getPlacesDisclosureSeen()) {
      return requestLocationPermissions();
    }
    return new Promise(function(resolve, reject) {
      openPlacesPrivacy(
        function() {
          AppStorage.setPlacesDisclosureSeen();
          closePlacesPrivacy();
          requestLocationPermissions().then(resolve, reject);
        },
        function() {
          closePlacesPrivacy();
          reject(new Error("Usu\xE1rio optou por n\xE3o permitir localiza\xE7\xE3o agora"));
        }
      );
    });
  }
  function buildIfThenSection(task, onChanged) {
    var wrap = document.createElement("div");
    wrap.className = "if-then-section";
    var label = document.createElement("div");
    label.className = "if-then-label";
    label.textContent = "Se-Ent\xE3o (opcional)";
    wrap.appendChild(label);
    var row = document.createElement("div");
    row.className = "if-then-row";
    var current = parseIfThen(task.ifThen);
    var triggerInput = document.createElement("input");
    triggerInput.type = "text";
    triggerInput.placeholder = 'Se... (gatilho: "eu chegar em casa")';
    triggerInput.value = current.trigger;
    triggerInput.className = "if-then-input";
    var actionInput = document.createElement("input");
    actionInput.type = "text";
    actionInput.placeholder = 'ent\xE3o... (a\xE7\xE3o: "guardo as chaves no gancho")';
    actionInput.value = current.action;
    actionInput.className = "if-then-input";
    function sync() {
      var trigger = triggerInput.value.trim();
      var action = actionInput.value.trim();
      task.ifThen = trigger || action ? "Se " + trigger + ", ent\xE3o " + action : "";
      onChanged();
    }
    triggerInput.addEventListener("input", sync);
    actionInput.addEventListener("input", sync);
    row.appendChild(triggerInput);
    row.appendChild(actionInput);
    wrap.appendChild(row);
    var hint = document.createElement("div");
    hint.className = "if-then-hint";
    hint.textContent = 'Pr\xE9-planejar um gatilho situacional espec\xEDfico ("se X, ent\xE3o Y") ajuda o c\xE9rebro a agir quase no autom\xE1tico, sem depender de lembrar por conta pr\xF3pria.';
    wrap.appendChild(hint);
    return wrap;
  }
  function parseIfThen(text) {
    var m = /^Se (.*), então (.*)$/.exec(text || "");
    if (!m) return { trigger: "", action: "" };
    return { trigger: m[1], action: m[2] };
  }
  function buildPlaceSection(task, onChanged) {
    var wrap = document.createElement("div");
    wrap.className = "place-section";
    var toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "place-toggle-btn";
    var panel = document.createElement("div");
    panel.className = "place-panel";
    var subtitle = document.createElement("div");
    subtitle.className = "place-toggle-subtitle";
    subtitle.textContent = "Al\xE9m do hor\xE1rio, seja avisado ao entrar ou sair de um lugar (ex: casa, farm\xE1cia, trabalho)";
    function renderToggle() {
      if (task.location) {
        toggleBtn.innerHTML = pinIconSmall() + " Lembrete por lugar: " + escapeHtmlLocal(task.location.label || "Local") + " (" + (task.location.trigger === "exit" ? "ao sair" : "ao chegar") + ")";
        toggleBtn.classList.add("active");
        subtitle.style.display = "none";
      } else {
        toggleBtn.innerHTML = pinIconSmall() + " Lembrar por lugar";
        toggleBtn.classList.remove("active");
        subtitle.style.display = "";
      }
    }
    renderToggle();
    if (!task.location && !AppStorage.getPlaceFeatureDiscoverySeen()) {
      toggleBtn.classList.add("discovery-highlight");
    }
    toggleBtn.addEventListener("click", function() {
      if (!AppStorage.getPlaceFeatureDiscoverySeen()) {
        AppStorage.setPlaceFeatureDiscoverySeen();
        toggleBtn.classList.remove("discovery-highlight");
      }
      panel.classList.toggle("show");
      if (panel.classList.contains("show")) renderPanel();
    });
    function renderPanel() {
      panel.innerHTML = "";
      if (task.location) {
        var current = document.createElement("div");
        current.className = "place-current";
        current.textContent = "Local atual: " + (task.location.label || "Local") + " \xB7 " + (task.location.trigger === "exit" ? "ao sair" : "ao chegar");
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-danger";
        removeBtn.textContent = "Remover local desta tarefa";
        removeBtn.addEventListener("click", function() {
          removePlaceForTask(task.id).then(function() {
            renderToggle();
            panel.classList.remove("show");
            showToast("Local removido");
            if (onChanged) onChanged();
            if (_PlacesOverlay) _PlacesOverlay.refreshPlacesDiscovery();
          });
        });
        panel.appendChild(current);
        panel.appendChild(removeBtn);
        return;
      }
      var explainer = document.createElement("p");
      explainer.className = "place-explainer";
      explainer.innerHTML = '<strong>Exemplo:</strong> busque "Casa", escolha "Ao sair" \u2014 voc\xEA recebe este lembrete toda vez que sair de casa, em qualquer hor\xE1rio.';
      panel.appendChild(explainer);
      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Buscar endere\xE7o (ex: Rua X, 123, Cidade)";
      panel.appendChild(searchInput);
      var resultsEl = document.createElement("div");
      resultsEl.className = "place-results";
      panel.appendChild(resultsEl);
      var currentLocBtn = document.createElement("button");
      currentLocBtn.type = "button";
      currentLocBtn.className = "btn";
      currentLocBtn.textContent = "Usar minha localiza\xE7\xE3o atual";
      panel.appendChild(currentLocBtn);
      var selected = null;
      var selectedInfo = document.createElement("div");
      selectedInfo.className = "place-selected";
      panel.appendChild(selectedInfo);
      var triggerRow = document.createElement("div");
      triggerRow.className = "place-trigger-row";
      var enterLabel = document.createElement("label");
      var enterRadio = document.createElement("input");
      enterRadio.type = "radio";
      enterRadio.name = "place-trigger-" + task.id;
      enterRadio.value = "enter";
      enterRadio.checked = true;
      enterLabel.appendChild(enterRadio);
      enterLabel.appendChild(document.createTextNode(" Ao chegar"));
      var exitLabel = document.createElement("label");
      var exitRadio = document.createElement("input");
      exitRadio.type = "radio";
      exitRadio.name = "place-trigger-" + task.id;
      exitRadio.value = "exit";
      exitLabel.appendChild(exitRadio);
      exitLabel.appendChild(document.createTextNode(" Ao sair"));
      triggerRow.appendChild(enterLabel);
      triggerRow.appendChild(exitLabel);
      panel.appendChild(triggerRow);
      var confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "btn btn-primary";
      confirmBtn.textContent = "Confirmar local";
      confirmBtn.disabled = true;
      panel.appendChild(confirmBtn);
      function selectPlace(place) {
        selected = place;
        selectedInfo.textContent = "Selecionado: " + place.label;
        confirmBtn.disabled = false;
      }
      var searchTimer = null;
      searchInput.addEventListener("input", function() {
        clearTimeout(searchTimer);
        var q = searchInput.value;
        searchTimer = setTimeout(function() {
          if (!q.trim()) {
            resultsEl.innerHTML = "";
            return;
          }
          resultsEl.textContent = "Buscando...";
          geocodeAddress(q).then(function(results) {
            resultsEl.innerHTML = "";
            if (!results.length) {
              resultsEl.textContent = "Nenhum endere\xE7o encontrado.";
              return;
            }
            results.forEach(function(r) {
              var item = document.createElement("button");
              item.type = "button";
              item.className = "place-result-item";
              item.textContent = r.label;
              item.addEventListener("click", function() {
                selectPlace(r);
                resultsEl.innerHTML = "";
                searchInput.value = r.label;
              });
              resultsEl.appendChild(item);
            });
          }).catch(function() {
            resultsEl.textContent = "Falha na busca de endere\xE7o. Tente novamente.";
          });
        }, 500);
      });
      currentLocBtn.addEventListener("click", function() {
        if (!navigator.geolocation) {
          showToast("Localiza\xE7\xE3o n\xE3o dispon\xEDvel neste dispositivo");
          return;
        }
        currentLocBtn.disabled = true;
        currentLocBtn.textContent = "Obtendo localiza\xE7\xE3o...";
        navigator.geolocation.getCurrentPosition(function(pos) {
          currentLocBtn.disabled = false;
          currentLocBtn.textContent = "Usar minha localiza\xE7\xE3o atual";
          selectPlace({
            label: task.label || "Meu local",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        }, function() {
          currentLocBtn.disabled = false;
          currentLocBtn.textContent = "Usar minha localiza\xE7\xE3o atual";
          showToast("N\xE3o foi poss\xEDvel obter sua localiza\xE7\xE3o");
        }, { enableHighAccuracy: true, timeout: 1e4 });
      });
      confirmBtn.addEventListener("click", function() {
        if (!selected) return;
        countPlacesInUse().then(function(info) {
          if (!task.location && info.count >= (info.limit || FREE_PLACES_LIMIT)) {
            showToast("Limite de 3 locais no plano gratuito atingido.");
            return;
          }
          var trigger = exitRadio.checked ? "exit" : "enter";
          ensureLocationPermission().then(function() {
            return registerPlaceForTask(task.id, selected, trigger);
          }, function() {
            return registerPlaceForTask(task.id, selected, trigger);
          }).then(function() {
            renderToggle();
            panel.classList.remove("show");
            showToast("Lembrete por lugar salvo");
            if (onChanged) onChanged();
            if (_PlacesOverlay) _PlacesOverlay.refreshPlacesDiscovery();
          }).catch(function() {
            showToast("N\xE3o foi poss\xEDvel salvar o local. Tente novamente.");
          });
        });
      });
    }
    wrap.appendChild(toggleBtn);
    wrap.appendChild(subtitle);
    wrap.appendChild(panel);
    return wrap;
  }
  function escapeHtmlLocal(s) {
    return String(s || "").replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function renderEditRows() {
    var tasksByDay2 = getTasksByDay();
    var list = (tasksByDay2[editDay] || []).slice().sort(function(a, b) {
      return a.time.localeCompare(b.time);
    });
    editRowsEl.innerHTML = "";
    list.forEach(function(t) {
      var row = document.createElement("div");
      row.className = "edit-row";
      var timeInput = document.createElement("input");
      timeInput.type = "time";
      timeInput.value = t.time;
      timeInput.addEventListener("change", function() {
        t.time = timeInput.value;
        persistTasks();
      });
      var fields = document.createElement("div");
      fields.className = "fields";
      var labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.placeholder = "Nome da tarefa";
      labelInput.value = t.label;
      labelInput.addEventListener("input", function() {
        t.label = labelInput.value;
        persistTasks(true);
      });
      var fieldsRow = document.createElement("div");
      fieldsRow.className = "fields-row";
      var blockSelect = document.createElement("select");
      BLOCK_ORDER.forEach(function(b) {
        var opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        if (b === t.block) opt.selected = true;
        blockSelect.appendChild(opt);
      });
      blockSelect.addEventListener("change", function() {
        t.block = blockSelect.value;
        persistTasks();
      });
      fieldsRow.appendChild(blockSelect);
      var detailInput = document.createElement("textarea");
      detailInput.placeholder = "Detalhe (opcional)";
      detailInput.value = t.detail || "";
      detailInput.addEventListener("input", function() {
        t.detail = detailInput.value;
        persistTasks(true);
      });
      fields.appendChild(labelInput);
      fields.appendChild(fieldsRow);
      fields.appendChild(detailInput);
      fields.appendChild(buildIfThenSection(t, function() {
        persistTasks(true);
      }));
      fields.appendChild(buildPlaceSection(t, function() {
        persistTasks();
      }));
      var dupBtn = document.createElement("button");
      dupBtn.className = "del-btn";
      dupBtn.type = "button";
      dupBtn.setAttribute("aria-label", "Duplicar tarefa para outro dia");
      dupBtn.innerHTML = dupIcon();
      dupBtn.addEventListener("click", function() {
        openDuplicateMenu(dupBtn, t);
      });
      var delBtn = document.createElement("button");
      delBtn.className = "del-btn";
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", "Excluir tarefa");
      delBtn.innerHTML = trashIcon();
      delBtn.addEventListener("click", function() {
        if (!confirm('Excluir a tarefa "' + t.label + '"?')) return;
        var tasksByDay3 = getTasksByDay();
        tasksByDay3[editDay] = (tasksByDay3[editDay] || []).filter(function(x) {
          return x.id !== t.id;
        });
        saveTasksByDay(tasksByDay3);
        renderEditRows();
        showToast("Tarefa removida");
      });
      var btnGroup = document.createElement("div");
      btnGroup.style.display = "flex";
      btnGroup.style.flexDirection = "column";
      btnGroup.style.gap = "6px";
      btnGroup.appendChild(dupBtn);
      btnGroup.appendChild(delBtn);
      row.appendChild(timeInput);
      row.appendChild(fields);
      row.appendChild(btnGroup);
      editRowsEl.appendChild(row);
    });
  }
  var persistTimer = null;
  function persistTasks(debounced) {
    var tasksByDay2 = getTasksByDay();
    if (debounced) {
      clearTimeout(persistTimer);
      persistTimer = setTimeout(function() {
        saveTasksByDay(tasksByDay2);
      }, 300);
      return;
    }
    saveTasksByDay(tasksByDay2);
  }
  var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var DAY_KEYS = DAYS.map(function(d) {
    return d.key;
  });
  function sanitizeImportedTasksByDay(raw) {
    if (!raw || typeof raw !== "object") throw new Error("formato inv\xE1lido");
    var clean = {};
    DAY_KEYS.forEach(function(dayKey) {
      var list = Array.isArray(raw[dayKey]) ? raw[dayKey] : [];
      var seenIds = {};
      clean[dayKey] = list.map(function(item, idx) {
        if (!item || typeof item !== "object") return null;
        var time = TIME_RE.test(item.time) ? item.time : "12:00";
        var block = BLOCK_ORDER.indexOf(item.block) !== -1 ? item.block : "Trabalho";
        var label = String(item.label || "Tarefa").slice(0, 140);
        var detail = String(item.detail || "").slice(0, 500);
        var rule = String(item.rule || "").slice(0, 80);
        var ifThen = String(item.ifThen || "").slice(0, 220);
        var id = String(item.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "tarefa-" + idx;
        if (seenIds[id]) id = id + "-" + idx;
        seenIds[id] = true;
        return { id, time, block, label, detail, rule, ifThen };
      }).filter(Boolean);
    });
    return clean;
  }
  function initEditor() {
    document.getElementById("editFab").addEventListener("click", openEditor);
    document.getElementById("editCloseBtn").addEventListener("click", closeEditor);
    document.getElementById("editDoneBtn").addEventListener("click", closeEditor);
    editOverlay.addEventListener("click", function(ev) {
      if (ev.target === editOverlay) closeEditor();
    });
    document.getElementById("placesPrivacyCloseBtn").addEventListener("click", function() {
      if (pendingPlacesAction && pendingPlacesAction.onSkip) pendingPlacesAction.onSkip();
      else closePlacesPrivacy();
    });
    document.getElementById("placesPrivacySkipBtn").addEventListener("click", function() {
      if (pendingPlacesAction && pendingPlacesAction.onSkip) pendingPlacesAction.onSkip();
    });
    document.getElementById("placesPrivacyAllowBtn").addEventListener("click", function() {
      if (pendingPlacesAction && pendingPlacesAction.onAllow) pendingPlacesAction.onAllow();
    });
    placesPrivacyOverlay.addEventListener("click", function(ev) {
      if (ev.target === placesPrivacyOverlay && pendingPlacesAction && pendingPlacesAction.onSkip) {
        pendingPlacesAction.onSkip();
      }
    });
    document.getElementById("addTaskBtn").addEventListener("click", function() {
      var tasksByDay2 = getTasksByDay();
      var list = tasksByDay2[editDay] || (tasksByDay2[editDay] = []);
      var id = uniqueId(editDay, "nova-tarefa");
      list.push({ id, time: "12:00", label: "Nova tarefa", block: "Trabalho", detail: "", rule: "" });
      saveTasksByDay(tasksByDay2);
      renderEditRows();
    });
    document.getElementById("restoreDefaultBtn").addEventListener("click", function() {
      if (!confirm("Restaurar a rotina padr\xE3o? Suas edi\xE7\xF5es de hor\xE1rios/tarefas ser\xE3o substitu\xEDdas (o progresso marcado nos dias n\xE3o \xE9 afetado).")) return;
      var tasksByDay2 = defaultTasksByDay();
      setTasksByDay(tasksByDay2);
      saveTasksByDay(tasksByDay2);
      renderEditRows();
      showToast("Rotina padr\xE3o restaurada");
    });
    document.getElementById("exportBtn").addEventListener("click", function() {
      var tasksByDay2 = getTasksByDay();
      var blob = new Blob([JSON.stringify({ tasksByDay: tasksByDay2 }, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "rotina-tdah-" + isoDate() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    document.getElementById("importFile").addEventListener("change", function(ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (!confirm("Importar substitui a rotina atual (hor\xE1rios e tarefas) neste dispositivo. Continuar?")) {
        ev.target.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function() {
        try {
          var data = JSON.parse(reader.result);
          if (!data || !data.tasksByDay) throw new Error("formato inv\xE1lido");
          var tasksByDay2 = sanitizeImportedTasksByDay(data.tasksByDay);
          setTasksByDay(tasksByDay2);
          saveTasksByDay(tasksByDay2);
          renderEditRows();
          showToast("Rotina importada");
        } catch (e) {
          showToast("Arquivo inv\xE1lido");
        }
      };
      reader.readAsText(file);
      ev.target.value = "";
    });
  }

  // src/api.js
  var API_BASE = "https://rotina-tdah-api.onrender.com";
  function NetworkError(message) {
    this.name = "NetworkError";
    this.message = message || "Sem conex\xE3o com o servidor";
    this.isNetworkError = true;
  }
  NetworkError.prototype = Object.create(Error.prototype);
  function ApiError(message, status, code) {
    this.name = "ApiError";
    this.message = message || "Erro inesperado";
    this.status = status || 0;
    this.code = code || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  var Api = (function() {
    var session = loadSession();
    var listeners = [];
    function loadSession() {
      return AppStorage.getAuth();
    }
    function persist() {
      AppStorage.setAuth(session);
    }
    function setSession(user, tokens) {
      session = { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
      persist();
      emit();
    }
    function clearSession() {
      session = null;
      persist();
      emit();
    }
    function emit() {
      listeners.forEach(function(fn) {
        try {
          fn(session);
        } catch (e) {
        }
      });
    }
    function rawJson(path, opts) {
      opts = opts || {};
      var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      var init = { method: opts.method || "GET", headers };
      if (opts.body !== void 0) init.body = JSON.stringify(opts.body);
      return fetch(API_BASE + path, init).then(function(res) {
        if (res.status === 204) return { status: 204, data: null };
        return res.text().then(function(txt) {
          var data = null;
          if (txt) {
            try {
              data = JSON.parse(txt);
            } catch (e) {
              data = null;
            }
          }
          return { status: res.status, data, ok: res.ok };
        });
      }, function() {
        throw new NetworkError();
      });
    }
    function toApiError(result) {
      var msg = result.data && result.data.error && result.data.error.message;
      var code = result.data && result.data.error && result.data.error.code;
      return new ApiError(msg || "Erro " + result.status, result.status, code);
    }
    function authedFetch(path, opts, _retried) {
      opts = opts || {};
      if (!session) return Promise.reject(new ApiError("N\xE3o autenticado", 401, "NO_SESSION"));
      var headers = Object.assign({}, opts.headers || {}, { Authorization: "Bearer " + session.accessToken });
      return rawJson(path, Object.assign({}, opts, { headers })).then(function(result) {
        if (result.status === 401 && !_retried) {
          return refresh().then(function() {
            return authedFetch(path, opts, true);
          }, function() {
            clearSession();
            throw new ApiError("Sess\xE3o expirada", 401, "SESSION_EXPIRED");
          });
        }
        if (!result.ok) throw toApiError(result);
        return result.data;
      });
    }
    function refresh() {
      if (!session || !session.refreshToken) return Promise.reject(new ApiError("Sem refresh token", 401));
      return rawJson("/auth/refresh", { method: "POST", body: { refreshToken: session.refreshToken } }).then(function(result) {
        if (!result.ok || !result.data || !result.data.tokens) throw toApiError(result);
        session.accessToken = result.data.tokens.accessToken;
        session.refreshToken = result.data.tokens.refreshToken;
        persist();
        return session;
      });
    }
    return {
      NetworkError,
      ApiError,
      getSession: function() {
        return session;
      },
      isLoggedIn: function() {
        return !!session;
      },
      onChange: function(fn) {
        listeners.push(fn);
      },
      fetch: authedFetch,
      register: function(email, password, displayName) {
        return rawJson("/auth/register", { method: "POST", body: { email, password, displayName } }).then(function(result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
      },
      login: function(email, password) {
        return rawJson("/auth/login", { method: "POST", body: { email, password } }).then(function(result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
      },
      logout: function() {
        var token = session && session.refreshToken;
        var done = token ? rawJson("/auth/logout", { method: "POST", body: { refreshToken: token } }).catch(function() {
        }) : Promise.resolve();
        return done.then(function() {
          clearSession();
        });
      },
      me: function() {
        return authedFetch("/me", { method: "GET" }).then(function(data) {
          if (data && data.user && session) {
            session.user = data.user;
            persist();
            emit();
          }
          return data && data.user;
        });
      },
      googleLogin: function(idToken) {
        return rawJson("/auth/google", { method: "POST", body: { idToken } }).then(function(result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
      }
    };
  })();

  // src/auth.js
  var GOOGLE_CLIENT_ID = null;
  var SocialLogin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin;
  var socialLoginInitPromise = null;
  var isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function ensureSocialLoginInit() {
    if (!SocialLogin) return Promise.reject(new Error("SocialLogin indisponivel"));
    if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error("Google Client ID nao configurado"));
    if (!socialLoginInitPromise) {
      socialLoginInitPromise = SocialLogin.initialize({
        google: { webClientId: GOOGLE_CLIENT_ID }
      });
    }
    return socialLoginInitPromise;
  }
  var gsiScriptPromise = null;
  function ensureGsiScriptLoaded() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve();
    }
    if (!gsiScriptPromise) {
      gsiScriptPromise = new Promise(function(resolve, reject) {
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = function() {
          resolve();
        };
        s.onerror = function() {
          reject(new Error("Falha ao carregar o script do Google."));
        };
        document.head.appendChild(s);
      });
    }
    return gsiScriptPromise;
  }
  function doGoogleLoginWeb(onDone) {
    if (!GOOGLE_CLIENT_ID) {
      showToast("Google Client ID nao configurado.");
      if (onDone) onDone(false);
      return;
    }
    setAuthLoading(true);
    ensureGsiScriptLoaded().then(function() {
      return new Promise(function(resolve, reject) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: function(response) {
            if (response && response.credential) resolve(response.credential);
            else reject(new Error("Falha na autenticacao com Google."));
          }
        });
        window.google.accounts.id.prompt(function(notification) {
          if (notification && (notification.isNotDisplayed() || notification.isSkippedMoment())) {
            reject(new Error("Login com Google cancelado ou bloqueado pelo navegador."));
          }
        });
      });
    }).then(function(idToken) {
      return Api.googleLogin(idToken).then(function() {
        return Api.me().catch(function() {
          return null;
        });
      }).then(function() {
        setAuthLoading(false);
        closeAuth();
        var s = Api.getSession();
        var who = s && s.user ? s.user.displayName || s.user.email : "";
        showToast("Conectado com Google" + (who ? " como " + who : ""));
        if (onDone) onDone(true);
      });
    }).catch(function(err) {
      setAuthLoading(false);
      setAuthError(friendlyAuthError(err));
      if (onDone) onDone(false);
    });
  }
  var sessionChip = document.getElementById("sessionChip");
  function renderSessionChip() {
    Array.prototype.slice.call(sessionChip.querySelectorAll("[data-session]")).forEach(function(el) {
      sessionChip.removeChild(el);
    });
    var s = Api.getSession();
    if (s && s.user) {
      var fullLabel = s.user.displayName || s.user.email || "Conta";
      var name = document.createElement("span");
      name.className = "session-name";
      name.setAttribute("data-session", "");
      name.textContent = fullLabel;
      name.title = fullLabel;
      var out = document.createElement("button");
      out.className = "session-logout";
      out.type = "button";
      out.setAttribute("data-session", "");
      out.textContent = "Sair";
      out.addEventListener("click", handleLogout);
      sessionChip.appendChild(name);
      sessionChip.appendChild(out);
    } else {
      var btn = document.createElement("button");
      btn.className = "session-btn";
      btn.type = "button";
      btn.setAttribute("data-session", "");
      btn.textContent = "Entrar";
      btn.addEventListener("click", openAuth);
      sessionChip.appendChild(btn);
    }
  }
  function handleLogout() {
    Api.logout().then(function() {
      showToast("Voc\xEA saiu da conta.");
    });
  }
  var authOverlay = document.getElementById("authOverlay");
  var authForm = document.getElementById("authForm");
  var authTitle = document.getElementById("authTitle");
  var authNameField = document.getElementById("authNameField");
  var authNameInput = document.getElementById("authName");
  var authEmailInput = document.getElementById("authEmail");
  var authPasswordInput = document.getElementById("authPassword");
  var authSubmit = document.getElementById("authSubmit");
  var authError = document.getElementById("authError");
  var authToggleBtn = document.getElementById("authToggleBtn");
  var authToggleText = document.getElementById("authToggleText");
  var authGoogleBtn = document.getElementById("authGoogleBtn");
  var authMode = "login";
  function setAuthError(msg) {
    if (!msg) {
      authError.classList.remove("show");
      authError.textContent = "";
      return;
    }
    authError.textContent = msg;
    authError.classList.add("show");
  }
  function applyAuthMode() {
    var isReg = authMode === "register";
    authTitle.textContent = isReg ? "Criar conta" : "Entrar";
    authSubmit.textContent = isReg ? "Criar conta" : "Entrar";
    authNameField.style.display = isReg ? "block" : "none";
    authPasswordInput.setAttribute("autocomplete", isReg ? "new-password" : "current-password");
    authToggleText.textContent = isReg ? "J\xE1 tem conta?" : "N\xE3o tem conta?";
    authToggleBtn.textContent = isReg ? "Entrar" : "Criar conta";
    setAuthError("");
  }
  function openAuth() {
    authMode = "login";
    applyAuthMode();
    authForm.reset();
    setAuthError("");
    authOverlay.classList.add("show");
    setTimeout(function() {
      authEmailInput.focus();
    }, 30);
  }
  function closeAuth() {
    authOverlay.classList.remove("show");
  }
  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }
  function setAuthLoading(loading) {
    authSubmit.disabled = loading;
    authSubmit.textContent = loading ? authMode === "register" ? "Criando\u2026" : "Entrando\u2026" : authMode === "register" ? "Criar conta" : "Entrar";
  }
  function friendlyAuthError(err) {
    if (err && err.isNetworkError) {
      return "Sem conex\xE3o com o servidor. Voc\xEA pode usar o app offline; tente entrar mais tarde.";
    }
    if (err && err.name === "ApiError") {
      if (err.status === 401) return "Credenciais inv\xE1lidas.";
      if (err.status === 409) return err.message || "Email j\xE1 cadastrado.";
      return err.message || "N\xE3o foi poss\xEDvel concluir. Tente novamente.";
    }
    return "N\xE3o foi poss\xEDvel concluir. Tente novamente.";
  }
  function doGoogleLogin(onDone) {
    if (!isNativeApp) {
      doGoogleLoginWeb(onDone);
      return;
    }
    if (!SocialLogin) {
      showToast("Login com Google indisponivel neste app.");
      if (onDone) onDone(false);
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      showToast("Google Client ID nao configurado.");
      if (onDone) onDone(false);
      return;
    }
    setAuthLoading(true);
    ensureSocialLoginInit().then(function() {
      return SocialLogin.login({
        provider: "google",
        options: {}
      });
    }).then(function(res) {
      var idToken = res && res.result && res.result.idToken;
      if (!idToken) {
        setAuthLoading(false);
        setAuthError("Falha na autenticacao com Google.");
        if (onDone) onDone(false);
        return;
      }
      return Api.googleLogin(idToken).then(function() {
        return Api.me().catch(function() {
          return null;
        });
      }).then(function() {
        setAuthLoading(false);
        closeAuth();
        var s = Api.getSession();
        var who = s && s.user ? s.user.displayName || s.user.email : "";
        showToast("Conectado com Google" + (who ? " como " + who : ""));
        if (onDone) onDone(true);
      });
    }).catch(function(err) {
      setAuthLoading(false);
      if (err && err.message === "Google Client ID nao configurado") {
        showToast("Google Client ID nao configurado.");
      } else {
        setAuthError(friendlyAuthError(err));
      }
      if (onDone) onDone(false);
    });
  }
  var splashScreen = document.getElementById("splashScreen");
  var splashGoogleBtn = document.getElementById("splashGoogleBtn");
  var splashGoogleLabel = document.getElementById("splashGoogleLabel");
  var splashGoogleIcon = document.getElementById("splashGoogleIcon");
  var splashSkipBtn = document.getElementById("splashSkipBtn");
  function dismissSplash() {
    splashScreen.setAttribute("hidden", "");
  }
  function showSplash() {
    splashScreen.removeAttribute("hidden");
    applySplashSessionState();
  }
  var SPLASH_REAPPEAR_AFTER_MS = 5 * 60 * 1e3;
  var backgroundedAt = null;
  function initSplashReappearOnResume() {
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") {
        backgroundedAt = Date.now();
        return;
      }
      if (backgroundedAt === null) return;
      var elapsed = Date.now() - backgroundedAt;
      backgroundedAt = null;
      if (elapsed >= SPLASH_REAPPEAR_AFTER_MS) {
        showSplash();
      }
    });
  }
  function applySplashSessionState() {
    var s = Api.getSession();
    if (s && s.user) {
      var who = s.user.displayName || s.user.email || "";
      splashGoogleLabel.textContent = who ? "Continuar como " + who : "Continuar";
      splashGoogleIcon.style.display = "none";
    } else {
      splashGoogleLabel.textContent = "Continuar com Google";
      splashGoogleIcon.style.display = "";
    }
  }
  function initAuth() {
    document.getElementById("authCloseBtn").addEventListener("click", closeAuth);
    authOverlay.addEventListener("click", function(ev) {
      if (ev.target === authOverlay) closeAuth();
    });
    authToggleBtn.addEventListener("click", function() {
      authMode = authMode === "login" ? "register" : "login";
      applyAuthMode();
    });
    document.addEventListener("keydown", function(ev) {
      if (ev.key !== "Escape") return;
      if (authOverlay.classList.contains("show")) closeAuth();
      else if (document.getElementById("editOverlay").classList.contains("show")) closeEditor();
    });
    authForm.addEventListener("submit", function(ev) {
      ev.preventDefault();
      setAuthError("");
      var email = authEmailInput.value.trim();
      var password = authPasswordInput.value;
      var displayName = authNameInput.value.trim();
      if (!validEmail(email)) {
        setAuthError("Informe um email v\xE1lido.");
        authEmailInput.focus();
        return;
      }
      if (password.length < 8) {
        setAuthError("A senha precisa ter ao menos 8 caracteres.");
        authPasswordInput.focus();
        return;
      }
      if (authMode === "register" && !displayName) {
        setAuthError("Informe seu nome.");
        authNameInput.focus();
        return;
      }
      setAuthLoading(true);
      var op = authMode === "register" ? Api.register(email, password, displayName) : Api.login(email, password);
      op.then(function() {
        return Api.me().catch(function() {
          return null;
        });
      }).then(function() {
        setAuthLoading(false);
        closeAuth();
        var s = Api.getSession();
        var who = s && s.user ? s.user.displayName || s.user.email : "";
        showToast(authMode === "register" ? "Conta criada. Bem-vindo(a)!" : "Conectado como " + who);
      }).catch(function(err) {
        setAuthLoading(false);
        setAuthError(friendlyAuthError(err));
      });
    });
    authGoogleBtn.addEventListener("click", function() {
      doGoogleLogin();
    });
    applySplashSessionState();
    splashSkipBtn.addEventListener("click", dismissSplash);
    splashGoogleBtn.addEventListener("click", function() {
      if (Api.isLoggedIn()) {
        dismissSplash();
        return;
      }
      doGoogleLogin(function() {
        dismissSplash();
      });
    });
    fetch(API_BASE + "/config").then(function(r) {
      return r.json();
    }).then(function(cfg) {
      if (cfg && cfg.googleClientId) GOOGLE_CLIENT_ID = cfg.googleClientId;
    }).catch(function() {
    });
    Api.onChange(renderSessionChip);
    renderSessionChip();
    if (Api.isLoggedIn()) {
      Api.me().catch(function() {
      });
    }
    initSplashReappearOnResume();
  }

  // src/education.js
  var tdahInfoOverlay = document.getElementById("tdahInfoOverlay");
  var tdahInfoBtn = document.getElementById("tdahInfoBtn");
  var tdahInfoCloseBtn = document.getElementById("tdahInfoCloseBtn");
  function openTdahInfo() {
    tdahInfoOverlay.classList.add("show");
  }
  function closeTdahInfo() {
    tdahInfoOverlay.classList.remove("show");
  }
  function initEducation() {
    tdahInfoBtn.addEventListener("click", openTdahInfo);
    tdahInfoCloseBtn.addEventListener("click", closeTdahInfo);
    tdahInfoOverlay.addEventListener("click", function(ev) {
      if (ev.target === tdahInfoOverlay) closeTdahInfo();
    });
  }

  // src/faq-data.js
  var FAQ_ITEMS = [
    {
      q: "O que \xE9 TDAH, afinal?",
      a: '<p>O TDAH (Transtorno de D\xE9ficit de Aten\xE7\xE3o/Hiperatividade) \xE9 definido pela Cartilha ABP como um transtorno da autorregula\xE7\xE3o \u2014 n\xE3o simplesmente "falta de aten\xE7\xE3o" \u2014 que compromete a capacidade da pessoa de controlar deliberadamente pensamentos, emo\xE7\xF5es e comportamentos por for\xE7a de vontade, gerando preju\xEDzos de curto e longo prazo.</p><p>No modelo te\xF3rico central de Barkley, o n\xFAcleo do problema n\xE3o \xE9 a aten\xE7\xE3o em si, mas um d\xE9ficit prim\xE1rio de <strong>inibi\xE7\xE3o comportamental</strong>, que compromete quatro fun\xE7\xF5es executivas \u2014 mem\xF3ria de trabalho n\xE3o-verbal ("olho da mente"), mem\xF3ria de trabalho verbal ("voz da mente"), autocontrole emocional ("cora\xE7\xE3o da mente") e planejamento ("playground da mente") \u2014 gerando o que ele chama de "miopia do tempo": a pessoa sabe o que fazer, mas n\xE3o consegue trazer esse conhecimento para agir no momento certo.</p><p>\xC9 um transtorno do neurodesenvolvimento com forte base gen\xE9tica (herdabilidade de 70-80%), sem biomarcador ou exame de imagem que sozinho confirme o diagn\xF3stico \u2014 este \xE9 sempre cl\xEDnico.</p>',
      source: 'Cartilha ABP (se\xE7\xE3o 1); Manual Barkley (Cap. 7); "Vencendo o TDAH Adulto" (Passo 2); IACAPAP (se\xE7\xF5es Etiologia e Diagn\xF3stico)'
    },
    {
      q: 'TDAH \xE9 "falta de disciplina" ou pregui\xE7a?',
      a: '<p>N\xE3o. A Cartilha ABP dedica uma se\xE7\xE3o a desmontar esse mito explicitamente: atribui a dificuldade ao desequil\xEDbrio de dopamina e noradrenalina que afeta a motiva\xE7\xE3o para tarefas de baixo interesse.</p><p>O modelo de Barkley explica: o problema central n\xE3o \xE9 "n\xE3o saber o que fazer" (d\xE9ficit de conhecimento), mas "n\xE3o fazer o que j\xE1 se sabe, no momento em que isso importa" (d\xE9ficit de desempenho). A pessoa tem intelig\xEAncia e conhecimento intactos, mas desconectados do comportamento no momento certo, por falta da maquinaria executiva que traz consequ\xEAncias futuras para o presente.</p><p>Por ser um transtorno neurobiol\xF3gico heredit\xE1rio, tamb\xE9m n\xE3o \xE9 "falta de disciplina dos pais" \u2014 embora o ambiente influencie o manejo dos sintomas.</p>',
      source: 'Cartilha ABP (se\xE7\xE3o 7, "Mitos desmontados"); "Vencendo o TDAH Adulto" (Passo 2)'
    },
    {
      q: "Quais s\xE3o os sintomas principais do TDAH?",
      a: '<p>O DSM-5-TR lista 18 sintomas \u2014 9 de desaten\xE7\xE3o (erros por descuido, dificuldade de manter foco, parecer n\xE3o escutar, n\xE3o terminar tarefas, desorganiza\xE7\xE3o, evitar esfor\xE7o mental prolongado, perder objetos, distra\xE7\xE3o f\xE1cil, esquecimento cotidiano) e 9 de hiperatividade-impulsividade (remexer m\xE3os/p\xE9s, levantar-se quando deveria ficar sentado, inquieta\xE7\xE3o motora, "estar com o motor ligado", falar demais, precipita\xE7\xE3o de respostas, dificuldade de esperar a vez, interromper os outros).</p><p>Ao longo da vida, a hiperatividade-impulsividade tende a declinar mais que a desaten\xE7\xE3o, que permanece mais est\xE1vel. Em adultos, Barkley destaca cinco \xE1reas do cotidiano mais afetadas: gest\xE3o de tempo/planejamento, auto-organiza\xE7\xE3o/mem\xF3ria operacional, autodisciplina, automotiva\xE7\xE3o e autoativa\xE7\xE3o/concentra\xE7\xE3o.</p>',
      source: 'Cartilha ABP (se\xE7\xE3o 1, Quadro 1); IACAPAP (Tabela D.1.1); "Vencendo o TDAH Adulto" (Passo 2)'
    },
    {
      q: "Como \xE9 feito o diagn\xF3stico de TDAH? Existe exame de sangue ou de imagem?",
      a: '<p>N\xE3o existe exame de sangue, imagem cerebral ou EEG que diagnostique TDAH. O diagn\xF3stico \xE9 <strong>cl\xEDnico</strong>, feito por entrevista que avalia sintomas, contexto e preju\xEDzo funcional.</p><p>Os crit\xE9rios do DSM-5 exigem: pelo menos 6 de 9 sintomas de desaten\xE7\xE3o e/ou hiperatividade (5 de 9 para 17 anos ou mais); in\xEDcio antes dos 12 anos; dura\xE7\xE3o m\xEDnima de 6 meses; presen\xE7a em 2 ou mais ambientes; preju\xEDzo funcional claro; e exclus\xE3o de outras explica\xE7\xF5es. Escalas de avalia\xE7\xE3o ajudam a organizar a coleta de informa\xE7\xE3o, mas n\xE3o substituem o julgamento cl\xEDnico.</p><p>35 a 65% das pessoas com TDAH passam bem em testes computadorizados de aten\xE7\xE3o \u2014 um resultado "normal" nesses testes n\xE3o descarta o diagn\xF3stico.</p>',
      source: 'IACAPAP (Tabelas D.1.3-D.1.4); Cartilha ABP (se\xE7\xE3o 2); "Vencendo o TDAH Adulto" (Passo 1)'
    },
    {
      q: "TDAH em adultos \xE9 diferente de TDAH em crian\xE7as?",
      a: '<p>Sim. Na pr\xE9-escola predomina o comportamento "furac\xE3o"; na fase escolar, desorganiza\xE7\xE3o e quebra de regras; na adolesc\xEAncia, planejamento fraco e riscos; na vida adulta, esquecimento de compromissos, falta de antecipa\xE7\xE3o, inquieta\xE7\xE3o subjetiva (n\xE3o mais hiperatividade motora vis\xEDvel), decis\xF5es precipitadas e impaci\xEAncia.</p><p>Os sintomas hiperativos/impulsivos diminuem mais com o desenvolvimento do que os de desaten\xE7\xE3o. O pr\xF3prio ponto de corte diagn\xF3stico muda: pesquisas mostram que em adultos 4 dos 9 sintomas j\xE1 indicam preju\xEDzo at\xEDpico (contra 6 de 9 desenhado para crian\xE7as).</p>',
      source: 'IACAPAP (Tabela D.1.2); Manual Barkley (Cap. 6); "Vencendo o TDAH Adulto" (Passo 1)'
    },
    {
      q: "Por que tanta gente s\xF3 descobre que tem TDAH depois dos 30, 40 anos?",
      a: "<p>A hiperatividade motora, mais vis\xEDvel na inf\xE2ncia, diminui com a idade, enquanto a desaten\xE7\xE3o e os d\xE9ficits executivos \u2014 mais discretos e mais f\xE1ceis de compensar em ambientes estruturados \u2014 permanecem, tornando o quadro menos \xF3bvio.</p><p>\xC9 comum que os sintomas de um adulto s\xF3 sejam percebidos depois que um filho \xE9 diagnosticado, dada a herdabilidade alta (75-90%). Al\xE9m disso, at\xE9 poucas d\xE9cadas atr\xE1s o TDAH era visto como condi\xE7\xE3o exclusivamente infantil \u2014 uma vis\xE3o hoje descartada, mas que ainda atrasa diagn\xF3sticos.</p><p>Exig\xEAncias crescentes de autogest\xE3o (faculdade, emprego, finan\xE7as, parentalidade) exp\xF5em d\xE9ficits antes compensados por estrutura externa dos pais/escola.</p>",
      source: 'IACAPAP (se\xE7\xF5es "Apresenta\xE7\xE3o Cl\xEDnica" e "Curso e Progn\xF3stico"); Cartilha ABP (se\xE7\xF5es 4 e 6); "Vencendo o TDAH Adulto" (Passo 2)'
    },
    {
      q: "TDAH \xE9 gen\xE9tico? Passa de pai/m\xE3e para filho?",
      a: '<p>Sim \u2014 \xE9 um dos transtornos psiqui\xE1tricos com maior carga gen\xE9tica conhecida. Herdabilidade entre 70% e 90% (estudos de g\xEAmeos), com parentes de primeiro grau tendo risco 5 a 10 vezes maior. N\xE3o h\xE1 "gene \xFAnico do TDAH": m\xFAltiplos genes de efeito pequeno, cada um contribuindo um pouco.</p><p>Se um dos pais tem TDAH, 40 a 57% dos filhos biol\xF3gicos tamb\xE9m ter\xE3o o transtorno \u2014 risco cerca de 8 vezes maior.</p><p>Fatores ambientais (chumbo, tabagismo materno, prematuridade) t\xEAm influ\xEAncia m\xEDnima comparada \xE0 gen\xE9tica \u2014 a associa\xE7\xE3o entre tabagismo materno e TDAH, por exemplo, desaparece ao ajustar para hist\xF3rico familiar de TDAH.</p>',
      source: 'IACAPAP (se\xE7\xE3o "Etiologia"); Cartilha ABP (se\xE7\xE3o 4); "Vencendo o TDAH Adulto" (Passo 2)'
    },
    {
      q: 'Existem "tipos" de TDAH (subtipos)?',
      a: '<p>Sim, o DSM-5 reconhece tr\xEAs apresenta\xE7\xF5es: predominantemente desatenta, predominantemente hiperativa-impulsiva, e combinada. Mas esses subtipos n\xE3o s\xE3o muito est\xE1veis ao longo do tempo \u2014 uma crian\xE7a pode migrar de um para outro conforme a idade avan\xE7a.</p><p>O tipo combinado representa cerca de 65% ou mais dos casos cl\xEDnicos. O predominantemente hiperativo costuma ser um est\xE1gio inicial que evolui para combinado em 3 a 5 anos (at\xE9 90% dos casos). No predominantemente desatento, 30-50% pode, na verdade, ter algo distinto chamado "tempo cognitivo lento" \u2014 ainda pouco compreendido e n\xE3o reconhecido como diagn\xF3stico formal.</p>',
      source: 'Cartilha ABP (se\xE7\xF5es 1 e 3); IACAPAP (se\xE7\xE3o "Apresenta\xE7\xE3o Cl\xEDnica"); "Vencendo o TDAH Adulto" (Passo 1)'
    },
    {
      q: "Por que pessoas com TDAH esquecem tanto as coisas?",
      a: '<p>N\xE3o \xE9 um problema de for\xE7a de vontade nem de mem\xF3ria de longo prazo \u2014 \xE9 um d\xE9ficit nas fun\xE7\xF5es executivas ligadas \xE0 mem\xF3ria de trabalho. A mem\xF3ria de trabalho n\xE3o-verbal ("olho da mente") e verbal ("voz da mente") ret\xEAm informa\xE7\xF5es por tempo insuficiente para serem usadas no momento certo.</p><p>Barkley chama isso de "miopia do tempo": a pessoa tem o conhecimento intacto, mas desconectado do desempenho quando importa. Por isso a estrat\xE9gia recomendada n\xE3o \xE9 "tentar lembrar mais", e sim <strong>externalizar</strong> a informa\xE7\xE3o \u2014 cadernos de bolso, lembretes visuais no ambiente, alarmes e listas.</p>',
      source: '"Vencendo o TDAH Adulto" (Passo 2 e Passo 4, Regra 4); Manual Barkley (Cap. 3)'
    },
    {
      q: "TDAH e ansiedade andam juntos? Como diferenciar um do outro?",
      a: "<p>Sim, a comorbidade \xE9 frequente: 25-35% em amostras cl\xEDnicas segundo o Manual Barkley, chegando a 17-52% em adultos. Quanto mais tempo o TDAH passa sem tratamento, maior a chance de desenvolver ansiedade reativa ao hist\xF3rico de fracasso \u2014 al\xE9m de haver risco gen\xE9tico parcialmente compartilhado.</p><p>A diferencia\xE7\xE3o est\xE1 na natureza da desaten\xE7\xE3o: no TDAH, a distra\xE7\xE3o vem de desvio impulsivo por est\xEDmulos externos ou t\xE9dio da tarefa. Na ansiedade, vem de preocupa\xE7\xE3o/rumina\xE7\xE3o \u2014 pensamentos intrusivos internos \u2014 e costuma estar presente em todas as situa\xE7\xF5es, n\xE3o s\xF3 em tarefas chatas. TDAH geralmente precede e \xE9 cr\xF4nico; ansiedade costuma ser mais epis\xF3dica ou reativa a gatilhos.</p>",
      source: 'Manual Barkley (Cap. 4 e Cap. 10, caso "Vanessa"); "Vencendo o TDAH Adulto" (Passo 5); IACAPAP (se\xE7\xE3o "Diagn\xF3stico Diferencial")'
    },
    {
      q: "TDAH pode causar depress\xE3o?",
      a: "<p>Existe associa\xE7\xE3o forte, mas n\xE3o uma rela\xE7\xE3o de causa direta simples. A comorbidade m\xE9dia com Depress\xE3o Maior \xE9 de 25-30%, e o risco de depress\xE3o em adultos com TDAH \xE9 mais de 3 vezes maior que na popula\xE7\xE3o geral. Crian\xE7as com TDAH t\xEAm 5 vezes mais chance de depress\xE3o.</p><p>A explica\xE7\xE3o mais plaus\xEDvel combina dois mecanismos: hist\xF3rico repetido de fracasso, rejei\xE7\xE3o social e autoestima rebaixada (consequ\xEAncia funcional do TDAH n\xE3o tratado) e risco gen\xE9tico parcialmente compartilhado \u2014 n\xE3o uma causalidade \xFAnica.</p>",
      source: 'Manual Barkley (Cap. 4); "Vencendo o TDAH Adulto" (Passo 5); IACAPAP (se\xE7\xE3o "Comorbidades")'
    },
    {
      q: 'O que \xE9 "hiperfoco" e por que acontece?',
      a: '<p>As obras-fonte do projeto n\xE3o usam o termo "hiperfoco" diretamente, mas o fen\xF4meno \xE9 documentado: crian\xE7as com TDAH conseguem manter foco por longos per\xEDodos em atividades de alto interesse, mesmo com grande dificuldade em tarefas de baixo interesse.</p><p>Isso se conecta a um modelo sobre dificuldade de regular o n\xEDvel de engajamento quando a recompensa n\xE3o \xE9 imediata. Quando a tarefa \xE9 intensamente estimulante, o sistema de recompensa fica plenamente ativado e a aten\xE7\xE3o pode ficar dif\xEDcil de "desligar" \u2014 o inverso do problema usual de iniciar tarefas chatas.</p><p><em>Nota: esta \xE9 uma extrapola\xE7\xE3o razo\xE1vel a partir do que as fontes documentam sobre varia\xE7\xE3o de aten\xE7\xE3o conforme motiva\xE7\xE3o, n\xE3o uma cita\xE7\xE3o direta de um conceito chamado "hiperfoco".</em></p>',
      source: 'IACAPAP (se\xE7\xE3o "Apresenta\xE7\xE3o Cl\xEDnica" e modelo de Sonuga-Barke, se\xE7\xE3o "Dados Neuropsicol\xF3gicos")'
    },
    {
      q: "Por que \xE9 t\xE3o dif\xEDcil come\xE7ar tarefas chatas/repetitivas com TDAH?",
      a: '<p>\xC9 um problema documentado de persist\xEAncia do esfor\xE7o reduzida em condi\xE7\xF5es de baixo ou nenhum refor\xE7o imediato \u2014 n\xE3o "insensibilidade" ao refor\xE7o, mas dificuldade genu\xEDna de manter esfor\xE7o sem recompensa cont\xEDnua e pr\xF3xima no tempo.</p><p>Uma das fun\xE7\xF5es executivas mais ligadas a isso \xE9 o "cora\xE7\xE3o da mente" (autocontrole emocional): a mesma fragilidade que causa explos\xF5es emocionais dificulta gerar entusiasmo interno sem recompensa imediata. A estrat\xE9gia pr\xE1tica recomendada \xE9 antecipar deliberadamente a emo\xE7\xE3o de sucesso e fragmentar a tarefa em blocos pequenos com recompensas a cada etapa.</p>',
      source: 'Manual Barkley (Cap. 3); IACAPAP (modelo de Sonuga-Barke); "Vencendo o TDAH Adulto" (Passo 2, Passo 4 Regras 5 e 6)'
    },
    {
      q: "TDAH afeta o sono?",
      a: "<p>Sim, mas de forma complexa. H\xE1 mais dificuldades subjetivas relatadas pelos pais (dificuldade para adormecer em at\xE9 56% das crian\xE7as com TDAH vs. 23% em controles), mas sem altera\xE7\xF5es objetivas claras em exames de sono \u2014 os problemas de sono podem ser mais atribu\xEDveis a comorbidades (ansiedade, depress\xE3o) do que ao TDAH isoladamente.</p><p>O sono deve sempre ser avaliado \xE0 parte, porque pode ser causa, consequ\xEAncia ou comorbidade do TDAH \u2014 sono ruim n\xE3o tratado pode, por si s\xF3, produzir sintomas que mimetizam ou agravam o quadro.</p>",
      source: 'Manual Barkley (Cap. 3, item "Sono"); IACAPAP (se\xE7\xF5es "Comorbidades" e "Diagn\xF3stico Diferencial")'
    },
    {
      q: "Existe rela\xE7\xE3o entre TDAH e alergias/coceira/condi\xE7\xF5es at\xF3picas?",
      a: '<p>As cinco obras-fonte do projeto n\xE3o cobrem esse tema de forma substantiva \u2014 s\xF3 uma men\xE7\xE3o gen\xE9rica a "alergias" como comorbidade a rastrear no exame pedi\xE1trico, e uma frase breve do IACAPAP sobre "condi\xE7\xF5es at\xF3picas" sem detalhamento.</p><p><em>O restante desta resposta n\xE3o vem das fontes do projeto \u2014 \xE9 conhecimento cient\xEDfico geral, complementar e n\xE3o verificado pela base local.</em> A literatura mais ampla investiga: neuroinflama\xE7\xE3o e ativa\xE7\xE3o imune compartilhada (citocinas afetando circuitos dopamin\xE9rgicos); sono prejudicado por coceira/desconforto at\xF3pico como mediador indireto; fatores de risco pr\xE9-natais compartilhados; e hip\xF3teses preliminares sobre o eixo intestino-pele-c\xE9rebro. Nada disso estabelece causalidade \u2014 \xE9 correla\xE7\xE3o em debate ativo na pesquisa.</p>',
      source: 'Manual Barkley (Cap. 8, men\xE7\xE3o gen\xE9rica); IACAPAP (se\xE7\xE3o "Comorbidades", men\xE7\xE3o breve) \u2014 restante \xE9 conhecimento geral fora das fontes do projeto'
    },
    {
      q: "TDAH afeta relacionamentos e vida amorosa?",
      a: '<p>Sim, de forma substancial. Adultos com TDAH relatam relacionamentos de moderados a ruins com frequ\xEAncia 4 a 5 vezes maior, e qualidade conjugal mais que duas vezes pior que a popula\xE7\xE3o geral.</p><p>Tr\xEAs fun\xE7\xF5es executivas pesam mais: regula\xE7\xE3o emocional fraca (explos\xF5es desgastam o v\xEDnculo), autoconsci\xEAncia limitada (dificuldade de perceber em tempo real o efeito do pr\xF3prio comportamento) e leitura de "roteiros sociais". Isso gera m\xE1 interpreta\xE7\xE3o sistem\xE1tica: distra\xE7\xE3o \xE9 lida como desinteresse, impulsividade como grosseria \u2014 quando s\xE3o d\xE9ficits executivos, n\xE3o inten\xE7\xE3o.</p><p>50-70% das crian\xE7as com TDAH j\xE1 n\xE3o t\xEAm amigos \xEDntimos entre a 2\xAA/3\xAA s\xE9rie. Tratamento medicamentoso e aplica\xE7\xE3o ativa das 8 Regras nas intera\xE7\xF5es \xEDntimas tendem a melhorar a qualidade do relacionamento.</p>',
      source: '"Vencendo o TDAH Adulto" (Passo 5, se\xE7\xE3o "Relacionamentos")'
    },
    {
      q: "O tratamento do TDAH \xE9 s\xF3 rem\xE9dio?",
      a: "<p>N\xE3o. O tratamento \xE9 descrito como necessariamente multimodal, combinando medica\xE7\xE3o com terapia comportamental (crian\xE7as) ou TCC (adultos) \u2014 a combina\xE7\xE3o produz os melhores resultados. Em crian\xE7as pequenas leve/moderado, come\xE7a-se por psicoeduca\xE7\xE3o e treinamento parental antes de considerar medica\xE7\xE3o.</p><p>O estudo MTA mostrou vantagem estat\xEDstica da medica\xE7\xE3o sobre o tratamento comportamental isolado nos sintomas centrais, mas o tratamento combinado leva vantagem em desfechos secund\xE1rios (habilidades sociais, satisfa\xE7\xE3o dos pais) e permite doses menores de rem\xE9dio. Em adultos, a medica\xE7\xE3o tem papel mais central, mas terapia complementar pode ajudar com relacionamentos e h\xE1bitos acumulados.</p>",
      source: 'Cartilha ABP (se\xE7\xE3o 9); IACAPAP (Tabela D.1.8); Manual Barkley (Cap. 20); "Vencendo o TDAH Adulto" (Passo 3)'
    },
    {
      q: "Como funciona o metilfenidato (Ritalina/Concerta) no c\xE9rebro?",
      a: '<p>O metilfenidato bloqueia a recapta\xE7\xE3o pr\xE9-sin\xE1ptica de dopamina e noradrenalina, aumentando a disponibilidade desses neurotransmissores nas regi\xF5es executivas do c\xE9rebro. A dopamina est\xE1 ligada a planejamento e processamento de recompensa; a noradrenalina modula excita\xE7\xE3o e aten\xE7\xE3o \u2014 fun\xE7\xF5es tipicamente deficit\xE1rias no TDAH.</p><p>A Ritalina de libera\xE7\xE3o imediata age em 20-60 minutos, com dura\xE7\xE3o de 3-6h; o Concerta usa libera\xE7\xE3o prolongada ao longo do dia, com dura\xE7\xE3o de 10-14h. O medicamento corrige o desequil\xEDbrio, n\xE3o apenas "mascara" os sintomas.</p>',
      source: 'Manual Barkley (Cap. 17); IACAPAP (se\xE7\xE3o "Neurobiologia" e Tabela D.1.5); "Vencendo o TDAH Adulto" (Passo 3)'
    },
    {
      q: "Rem\xE9dio para TDAH vicia?",
      a: "<p>Usado de forma correta e prescrita, n\xE3o. Mais de 16 estudos longitudinais n\xE3o encontraram associa\xE7\xE3o entre uso oral prescrito de estimulantes e maior risco de abuso de subst\xE2ncias posterior \u2014 a via oral libera dopamina de forma gradual, bem diferente do abuso por via intranasal/intravenosa (picos r\xE1pidos), que \xE9 o mecanismo do v\xEDcio.</p><p>Uma metan\xE1lise mostrou risco de abuso de subst\xE2ncias reduzido em quase 2 vezes em quem foi tratado com estimulante na inf\xE2ncia, comparado a quem n\xE3o foi tratado. Isso n\xE3o elimina o risco de uso indevido do medicamento em si (desvio, venda) \u2014 fam\xEDlias com hist\xF3rico de abuso de subst\xE2ncias devem conversar com o m\xE9dico sobre formula\xE7\xF5es de longa a\xE7\xE3o, com menor potencial de abuso.</p>",
      source: '"Vencendo o TDAH Adulto" (Passo 3); Manual Barkley (Cap. 17 e 22); Cartilha ABP (se\xE7\xE3o 7, "Mitos desmontados")'
    },
    {
      q: "Quais os efeitos colaterais mais comuns da medica\xE7\xE3o?",
      a: "<p>Para estimulantes: ins\xF4nia, perda de apetite, perda de peso, dores de cabe\xE7a, n\xE1usea, ansiedade, irritabilidade e tiques motores \u2014 geralmente leves, dose-dependentes e transit\xF3rios, manej\xE1veis por ajuste de dose. Estimulantes podem reduzir a altura adulta final em at\xE9 4cm, efeito revers\xEDvel ap\xF3s suspens\xE3o, por isso \xE9 feito monitoramento peri\xF3dico de peso/altura.</p><p>Para atomoxetina (n\xE3o estimulante): n\xE1usea, boca seca, tontura, sonol\xEAncia, redu\xE7\xE3o da libido, com risco raro de dano hep\xE1tico. Grandes estudos n\xE3o mostraram associa\xE7\xE3o relevante entre estimulantes e morte s\xFAbita card\xEDaca. Qualquer efeito persistente deve ser reportado ao m\xE9dico prescritor.</p>",
      source: 'Manual Barkley (Cap. 17 e 18); IACAPAP (Tabelas D.1.7 e D.1.8); "Vencendo o TDAH Adulto" (Passo 3)'
    },
    {
      q: "D\xE1 para tratar TDAH sem rem\xE9dio?",
      a: "<p>Depende da gravidade e da idade. Treinamento comportamental parental \xE9 primeira linha para crian\xE7as menores com sintomas leves, mas seu benef\xEDcio mais consistente est\xE1 na qualidade da parentalidade e em comorbidades, n\xE3o necessariamente nos sintomas centrais do TDAH.</p><p>O estudo MTA mostrou que o tratamento comportamental isolado foi estatisticamente inferior \xE0 medica\xE7\xE3o nos sintomas centrais. Em adultos, n\xE3o h\xE1 evid\xEAncia robusta de que terapia sozinha (sem medica\xE7\xE3o) seja eficaz para o n\xFAcleo dos sintomas, embora ajude a lidar com consequ\xEAncias acumuladas. A decis\xE3o de tratar com ou sem rem\xE9dio \xE9 sempre uma conversa a ter com o m\xE9dico respons\xE1vel.</p>",
      source: 'IACAPAP (Tabela D.1.8); Manual Barkley (Caps. 12, 13, 14, 15 e 20); "Vencendo o TDAH Adulto" (Passo 3)'
    },
    {
      q: "Terapia ajuda no TDAH? Que tipo de terapia \xE9 indicada?",
      a: "<p>Sim, mas com papel diferente da medica\xE7\xE3o \u2014 n\xE3o ataca diretamente os sintomas centrais, e sim as consequ\xEAncias e habilidades ao redor deles. Para crian\xE7as: treinamento dos pais em manejo comportamental, aconselhamento a professores e treino de habilidades sociais.</p><p>Para adultos, a Terapia Cognitivo-Comportamental (TCC) \xE9 a modalidade com melhor suporte, com ganhos em organiza\xE7\xE3o, gest\xE3o do tempo e regula\xE7\xE3o emocional. Terapia breve tamb\xE9m \xE9 recomendada especificamente para processar as rea\xE7\xF5es emocionais ao diagn\xF3stico (nega\xE7\xE3o, al\xEDvio, tristeza, raiva pelo tempo perdido) \u2014 rea\xE7\xF5es descritas como normais e passageiras.</p>",
      source: 'Cartilha ABP (se\xE7\xE3o 9); Manual Barkley (Caps. 12-16); IACAPAP (Tabela D.1.8); "Vencendo o TDAH Adulto" (Passo 2 e Passo 4)'
    },
    {
      q: 'Existe "cura" para o TDAH?',
      a: '<p>N\xE3o. Nenhuma das fontes usa o termo "cura" \u2014 todas tratam o TDAH como condi\xE7\xE3o neurobiol\xF3gica de base gen\xE9tica (herdabilidade de 70-90%) que se maneja, n\xE3o se cura.</p><p>Aos 25 anos, 15% dos casos de inf\xE2ncia ainda preenchem todos os crit\xE9rios diagn\xF3sticos completos, at\xE9 65% t\xEAm sintomas residuais com algum preju\xEDzo, e 20% n\xE3o apresentam mais sintomas nem preju\xEDzo \u2014 remiss\xE3o completa acontece numa minoria, e mesmo assim n\xE3o \xE9 revers\xE3o da condi\xE7\xE3o de base, \xE9 compensa\xE7\xE3o/matura\xE7\xE3o.</p><p>Barkley usa a analogia da rampa para cadeira de rodas: buscar adapta\xE7\xF5es (medica\xE7\xE3o, rotinas externalizadas) n\xE3o \xE9 "cura" nem desculpa, \xE9 o equivalente funcional de uma rampa \u2014 o trabalho de "subir" ainda \xE9 da pessoa, mas com as ferramentas certas se torna administr\xE1vel.</p>',
      source: 'IACAPAP (se\xE7\xF5es "Etiologia" e "Curso e Progn\xF3stico"); Cartilha ABP (se\xE7\xF5es 4 e 7); "Vencendo o TDAH Adulto" (Passo 2)'
    },
    {
      q: "Por quanto tempo precisa tomar rem\xE9dio para TDAH?",
      a: '<p>N\xE3o h\xE1 prazo fixo definido \u2014 n\xE3o existem diretrizes baseadas em evid\xEAncia sobre quando parar. A boa pr\xE1tica \xE9 reavalia\xE7\xE3o peri\xF3dica (anual, por exemplo) da necessidade de continuar; muitos pacientes se beneficiam de continuar at\xE9 a idade adulta, j\xE1 que o TDAH costuma ter curso cr\xF4nico.</p><p>Para adultos, o uso cont\xEDnuo (7 dias por semana, o ano todo, incluindo fins de semana e f\xE9rias) costuma ser recomendado, j\xE1 que os preju\xEDzos afetam todas as \xE1reas da vida, n\xE3o s\xF3 trabalho/estudo. Em crian\xE7as, a pr\xE1tica de "f\xE9rias da medica\xE7\xE3o" nos fins de semana \xE9 debatida, sem benef\xEDcio claro comprovado sobre altura final. A decis\xE3o de suspender \xE9 sempre feita com o m\xE9dico respons\xE1vel.</p>',
      source: 'IACAPAP (se\xE7\xE3o "Quest\xF5es Cl\xEDnicas Especiais"); "Vencendo o TDAH Adulto" (Passo 3); Manual Barkley (Cap. 17)'
    },
    {
      q: "Por que rotina e listas ajudam tanto quem tem TDAH?",
      a: '<p>O d\xE9ficit nas fun\xE7\xF5es executivas (mem\xF3ria de trabalho n\xE3o-verbal e verbal) dificulta manter regras, prazos e planos "vivos" na cabe\xE7a \u2014 n\xE3o por falta de saber o que fazer, mas porque a informa\xE7\xE3o n\xE3o fica dispon\xEDvel no momento de agir.</p><p>A solu\xE7\xE3o \xE9 a <strong>externaliza\xE7\xE3o</strong>: tirar a informa\xE7\xE3o de dentro da mente e coloc\xE1-la fisicamente no ambiente, no ponto exato onde ser\xE1 usada \u2014 listas, alarmes, cadernos de bolso. Rotina reduz ainda a quantidade de decis\xF5es a cada momento, porque o comportamento passa a ser guiado por h\xE1bito/contexto em vez de depender da autorregula\xE7\xE3o interna, que \xE9 o recurso mais escasso.</p>',
      source: 'Manual Barkley (Cap. 7); "Vencendo o TDAH Adulto" (Passo 4, Regra 4)'
    },
    {
      q: "Pessoas com TDAH podem ter sucesso profissional?",
      a: "<p>Sim, plenamente. O ponto central n\xE3o \xE9 capacidade, e sim adequa\xE7\xE3o entre o tipo de trabalho/ambiente e o perfil de funcionamento executivo. Certos tipos de carreira tendem a ser mais compat\xEDveis (estrutura clara, retorno imediato, variedade, urg\xEAncia que dispensa planejamento longo), mas isso s\xE3o tend\xEAncias, n\xE3o regras \u2014 qualquer carreira pode funcionar com o suporte certo.</p><p>Suportes eficazes incluem: supervisor solid\xE1rio, ambiente f\xEDsico adaptado (escrit\xF3rio privado em vez de open space), hor\xE1rios fixos para checar e-mail, mentor para check-ins curtos e medica\xE7\xE3o bem ajustada. N\xE3o h\xE1 rela\xE7\xE3o entre TDAH e menor intelig\xEAncia.</p>",
      source: '"Vencendo o TDAH Adulto" (Passo 5, se\xE7\xE3o "Trabalho")'
    },
    {
      q: 'TDAH \xE9 "modinha"/est\xE1 sendo diagnosticado demais hoje em dia?',
      a: '<p>A preval\xEAncia de TDAH n\xE3o aumentou nas \xFAltimas d\xE9cadas nem varia significativamente entre culturas ou \xE9pocas \u2014 o que mudou foi o maior reconhecimento profissional e social, levando mais pessoas a buscar avalia\xE7\xE3o. Relatos cl\xEDnicos compat\xEDveis existem desde 1775, o que derruba a ideia de "transtorno das telas".</p><p>Isso n\xE3o significa aus\xEAncia de risco de sobre-diagn\xF3stico individual: a popularidade do TDAH adulto trouxe mitos sem base cient\xEDfica e press\xE3o social por diagn\xF3stico. Um estudo citado mostrou a taxa de confirma\xE7\xE3o diagn\xF3stica caindo de 85% para 50% dos encaminhados ao longo do tempo, atribu\xEDda a maior rigor na avalia\xE7\xE3o \u2014 n\xE3o a menos casos reais.</p>',
      source: 'IACAPAP (se\xE7\xE3o "Epidemiologia"); Cartilha ABP (se\xE7\xE3o "Mitos desmontados"); Manual Barkley (Cap. 11)'
    },
    {
      q: "Como lidar com procrastina\xE7\xE3o cr\xF4nica no TDAH?",
      a: '<p>A procrastina\xE7\xE3o \xE9 consequ\xEAncia direta da "miopia temporal": tarefas com prazo distante n\xE3o geram urg\xEAncia real at\xE9 estarem quase vencidas. A estrat\xE9gia espec\xEDfica de Barkley \xE9 a Regra 6 \u2014 "Decomponha o futuro": fragmentar o projeto em blocos pequenos (30-60 minutos), tornar-se respons\xE1vel perante algu\xE9m que cobra cada mini-etapa, e recompensar-se imediatamente a cada cota conclu\xEDda.</p><p>Complementarmente, visualizar ativamente a emo\xE7\xE3o de sucesso ao concluir (n\xE3o o medo do fracasso) funciona como combust\xEDvel motivacional, junto com lembretes f\xEDsicos no ambiente para reduzir a depend\xEAncia de "lembrar" sozinho de retomar o trabalho.</p>',
      source: '"Vencendo o TDAH Adulto" (Passo 4, Regras 5 e 6; conceito de miopia temporal no Passo 2); Manual Barkley (Cap. 7)'
    },
    {
      q: "TDAH tem rela\xE7\xE3o com intelig\xEAncia (\xE9 sinal de menos intelig\xEAncia)?",
      a: '<p>N\xE3o h\xE1 liga\xE7\xE3o direta. O TDAH ocorre em todo o espectro de QI. Existe uma pequena redu\xE7\xE3o m\xE9dia de QI em crian\xE7as com TDAH (cerca de 7-10 pontos), mas em adultos avaliados clinicamente esse efeito praticamente desaparece \u2014 QI m\xE9dio pr\xF3ximo ou acima da m\xE9dia geral. O QI explica menos de 14% da vari\xE2ncia no desempenho acad\xEAmico de adolescentes com TDAH.</p><p>O mito de "menos intelig\xEAncia" vem do baixo desempenho escolar gerado pelo transtorno, mal interpretado como "burrice" \u2014 quando \xE9 um problema de desempenho (n\xE3o fazer o que j\xE1 se sabe no momento certo), n\xE3o de capacidade. O mito oposto ("TDAH \xE9 sinal de mais criatividade/intelig\xEAncia") tamb\xE9m n\xE3o tem base cient\xEDfica.</p>',
      source: 'Cartilha ABP (se\xE7\xE3o "Mitos desmontados"); Manual Barkley (Cap. 11, Cap. 2/3); IACAPAP (metan\xE1lise de Frazier et al., 2004)'
    },
    {
      q: "Como uma pessoa com TDAH pode se organizar melhor no trabalho/estudos?",
      a: "<p>O n\xFAcleo pr\xE1tico s\xE3o as 8 Regras de autogest\xE3o: externalizar lembretes (caderno de bolso sempre \xE0 m\xE3o, cartazes nos pontos de decis\xE3o), fragmentar tarefas grandes em blocos de 30-60 minutos com presta\xE7\xE3o de contas e recompensa por etapa, externalizar a resolu\xE7\xE3o de problemas (post-its, quadros, listas f\xEDsicas em vez de segurar tudo na mente), e antecipar emocionalmente o resultado.</p><p>No estudo: t\xE9cnica de leitura SQ4R, gravar aulas, alternar mat\xE9rias dif\xEDceis com leves, exerc\xEDcio aer\xF3bico antes de provas (ganho de concentra\xE7\xE3o dura 45-60 minutos). No trabalho: espa\xE7o f\xEDsico privado, hor\xE1rios fixos para e-mail, notifica\xE7\xF5es silenciadas em blocos de foco, notas ativas em reuni\xF5es, e negociar explicitamente expectativas de prazo e supervis\xE3o ao escolher um cargo.</p>",
      source: '"Vencendo o TDAH Adulto" (Passo 4, Regras 4, 5, 6 e 7; Passo 5, se\xE7\xF5es "Educa\xE7\xE3o" e "Trabalho")'
    }
  ];

  // src/faq.js
  var faqOverlay = document.getElementById("faqOverlay");
  var faqBtn = document.getElementById("faqBtn");
  var faqCloseBtn = document.getElementById("faqCloseBtn");
  var faqTopics = document.getElementById("faqTopics");
  var faqSearchInput = document.getElementById("faqSearchInput");
  var faqEmptyMsg = document.getElementById("faqEmptyMsg");
  function renderFaqList(items) {
    faqTopics.innerHTML = items.map(function(item, i) {
      return '<details class="tdah-topic" data-faq-index="' + i + '"><summary>' + item.q + '<span class="plus">+</span></summary><div class="tdah-body">' + item.a + '<div class="tdah-source">Fonte: ' + item.source + "</div></div></details>";
    }).join("");
    faqEmptyMsg.style.display = items.length ? "none" : "";
  }
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function filterFaq(term) {
    var t = normalize(term);
    if (!t) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(function(item) {
      return normalize(item.q).indexOf(t) !== -1 || normalize(item.a).indexOf(t) !== -1;
    });
  }
  function openFaq() {
    faqOverlay.classList.add("show");
    faqSearchInput.value = "";
    renderFaqList(FAQ_ITEMS);
  }
  function closeFaq() {
    faqOverlay.classList.remove("show");
  }
  function initFaq() {
    faqBtn.addEventListener("click", openFaq);
    faqCloseBtn.addEventListener("click", closeFaq);
    faqOverlay.addEventListener("click", function(ev) {
      if (ev.target === faqOverlay) closeFaq();
    });
    faqSearchInput.addEventListener("input", function() {
      renderFaqList(filterFaq(faqSearchInput.value));
    });
  }

  // src/self-assessment.js
  var FREQ_OPTIONS = [
    { value: "0", label: "Nunca" },
    { value: "1", label: "\xC0s vezes" },
    { value: "2", label: "Frequentemente" },
    { value: "3", label: "Muito frequentemente" }
  ];
  var PART1_DESATENCAO = [
    "N\xE3o presta aten\xE7\xE3o em detalhes ou comete erros por descuido",
    "Dificuldade de manter aten\xE7\xE3o em tarefas ou atividades",
    "Parece n\xE3o escutar quando falam diretamente com voc\xEA",
    "N\xE3o termina tarefas, perde o foco no meio do caminho",
    "Dificuldade de organizar tarefas e atividades",
    "Evita ou reluta em tarefas que exigem esfor\xE7o mental prolongado",
    "Perde objetos necess\xE1rios (chaves, celular, documentos)",
    "Distrai-se facilmente com est\xEDmulos externos (ou pensamentos)",
    "Esquecimento em atividades cotidianas (contas, compromissos, retornar liga\xE7\xF5es)"
  ];
  var PART1_HIPERATIVIDADE = [
    "Mexe as m\xE3os/p\xE9s ou se remexe na cadeira",
    "Levanta-se em situa\xE7\xF5es em que deveria ficar sentado",
    "Sente inquieta\xE7\xE3o interna (em adultos, mais sensa\xE7\xE3o subjetiva que correr/subir)",
    "Dificuldade de ter lazer/atividades tranquilas em sil\xEAncio",
    'Sente-se "com o motor ligado", incapaz de ficar parado',
    "Fala em excesso",
    "Responde antes da pergunta terminar",
    "Dificuldade de esperar a vez (filas, tr\xE2nsito, conversas)",
    "Interrompe ou se intromete em conversas/atividades alheias"
  ];
  var PART2_QUESTIONS = [
    "Os sintomas acima j\xE1 existiam antes dos 12 anos (mesmo que n\xE3o diagnosticado na \xE9poca)?",
    "Os sintomas aparecem em mais de um ambiente (trabalho E casa E relacionamentos, n\xE3o s\xF3 um)?",
    "Os sintomas causam preju\xEDzo real e mensur\xE1vel (perda de emprego, d\xEDvidas, brigas, notas baixas, multas de tr\xE2nsito) \u2014 n\xE3o apenas desconforto ou autocr\xEDtica?",
    "Isso persiste h\xE1 pelo menos 6 meses, n\xE3o \xE9 uma fase ligada a um evento espec\xEDfico (luto, crise aguda, mudan\xE7a recente)?"
  ];
  var PART3_AREAS = [
    {
      title: "Gest\xE3o de tempo e metas",
      items: [
        "Procrastino sistematicamente, mesmo em coisas importantes",
        "Tenho p\xE9ssima no\xE7\xE3o de quanto tempo uma tarefa vai levar",
        "Cumprir prazos \xE9 uma luta constante"
      ]
    },
    {
      title: "Organiza\xE7\xE3o, mem\xF3ria e comunica\xE7\xE3o",
      items: [
        "Perco o fio da meada ao explicar algo para algu\xE9m",
        "Tenho dificuldade de manter uma sequ\xEAncia l\xF3gica ao falar ou escrever",
        "Esque\xE7o instru\xE7\xF5es complexas rapidamente"
      ]
    },
    {
      title: "Autodisciplina / impulsividade",
      items: [
        "Tomo decis\xF5es por impulso e me arrependo depois",
        "Interrompo conversas ou digo coisas sem filtrar antes",
        "Tenho rea\xE7\xF5es emocionais desproporcionais ao que gerou elas"
      ]
    },
    {
      title: "Automotiva\xE7\xE3o",
      items: [
        "S\xF3 consigo fazer algo chato se o prazo est\xE1 em cima",
        "Preciso de supervis\xE3o ou cobran\xE7a externa para manter const\xE2ncia",
        "Abandono tarefas no meio quando a novidade passa"
      ]
    },
    {
      title: "Concentra\xE7\xE3o / prontid\xE3o",
      items: [
        "Devaneio com frequ\xEAncia mesmo em conversas importantes",
        "Entedio-me r\xE1pido com tarefas repetitivas/administrativas",
        "Tenho dificuldade de manter aten\xE7\xE3o em leituras longas"
      ]
    }
  ];
  var TOTAL_STEPS = 5;
  var FREQUENT_MIN = 2;
  var saState = null;
  var saStep = 0;
  var saOverlay = document.getElementById("saOverlay");
  var saBtn = document.getElementById("saBtn");
  var saCloseBtn = document.getElementById("saCloseBtn");
  var saBackBtn = document.getElementById("saBackBtn");
  var saNextBtn = document.getElementById("saNextBtn");
  var saRestartBtn = document.getElementById("saRestartBtn");
  var saProgressFill = document.getElementById("saProgressFill");
  var saStepLabel = document.getElementById("saStepLabel");
  var saBody = document.getElementById("saBody");
  function freshState() {
    return {
      desatencao: PART1_DESATENCAO.map(function() {
        return null;
      }),
      hiperatividade: PART1_HIPERATIVIDADE.map(function() {
        return null;
      }),
      confirm: PART2_QUESTIONS.map(function() {
        return null;
      }),
      barkley: PART3_AREAS.map(function(area) {
        return area.items.map(function() {
          return false;
        });
      })
    };
  }
  function saveProgress() {
    AppStorage.setSelfAssessmentProgress({ state: saState, step: saStep });
  }
  function openSelfAssessment() {
    var saved = AppStorage.getSelfAssessmentProgress();
    if (saved && saved.state && saved.step < TOTAL_STEPS - 1) {
      saState = saved.state;
      saStep = saved.step;
    } else {
      saState = freshState();
      saStep = 0;
    }
    render();
    saOverlay.classList.add("show");
  }
  function closeSelfAssessment() {
    saOverlay.classList.remove("show");
  }
  function renderFrequencyItem(question, listRef, idx) {
    var wrap = document.createElement("div");
    wrap.className = "sa-item";
    wrap.dataset.answered = listRef.arr[idx] !== null ? "1" : "0";
    var q = document.createElement("div");
    q.className = "sa-item-q";
    q.textContent = question;
    wrap.appendChild(q);
    var opts = document.createElement("div");
    opts.className = "sa-freq-opts";
    FREQ_OPTIONS.forEach(function(opt) {
      var label = document.createElement("label");
      label.className = "sa-freq-opt";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "sa-freq-" + listRef.name + "-" + idx;
      input.value = opt.value;
      input.checked = listRef.arr[idx] === opt.value;
      input.addEventListener("change", function() {
        listRef.arr[idx] = opt.value;
        wrap.dataset.answered = "1";
        wrap.classList.remove("sa-item-unanswered");
        updateNextEnabled();
        saveProgress();
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt.label));
      opts.appendChild(label);
    });
    wrap.appendChild(opts);
    return wrap;
  }
  function renderFrequencyStep(title, questions, listName, listArr, introText, sourceText) {
    var wrap = document.createElement("div");
    var intro = document.createElement("p");
    intro.className = "sa-intro";
    intro.textContent = introText;
    wrap.appendChild(intro);
    var h1 = document.createElement("h3");
    h1.className = "sa-subhead";
    h1.textContent = title;
    wrap.appendChild(h1);
    questions.forEach(function(q, idx) {
      wrap.appendChild(renderFrequencyItem(q, { name: listName, arr: listArr }, idx));
    });
    var source = document.createElement("div");
    source.className = "sa-source";
    source.textContent = sourceText;
    wrap.appendChild(source);
    return wrap;
  }
  function renderPart1Desatencao() {
    return renderFrequencyStep(
      "Desaten\xE7\xE3o",
      PART1_DESATENCAO,
      "desatencao",
      saState.desatencao,
      "Para cada item, marque com que frequ\xEAncia isso acontece com voc\xEA nos \xFAltimos 6 meses. (1 de 2 \u2014 Desaten\xE7\xE3o)",
      "Fonte: crit\xE9rios do DSM-5, conforme citados na Cartilha ABP/Alexa e no cap\xEDtulo IACAPAP."
    );
  }
  function renderPart1Hiperatividade() {
    return renderFrequencyStep(
      "Hiperatividade / Impulsividade",
      PART1_HIPERATIVIDADE,
      "hiperatividade",
      saState.hiperatividade,
      "Continue marcando a frequ\xEAncia de cada item nos \xFAltimos 6 meses. (2 de 2 \u2014 Hiperatividade/Impulsividade)",
      "Fonte: crit\xE9rios do DSM-5, conforme citados na Cartilha ABP/Alexa e no cap\xEDtulo IACAPAP."
    );
  }
  function renderPart2() {
    var wrap = document.createElement("div");
    var intro = document.createElement("p");
    intro.className = "sa-intro";
    intro.textContent = "Sintomas isolados n\xE3o bastam. Responda sim ou n\xE3o:";
    wrap.appendChild(intro);
    PART2_QUESTIONS.forEach(function(q, idx) {
      var item = document.createElement("div");
      item.className = "sa-item";
      item.dataset.answered = saState.confirm[idx] !== null ? "1" : "0";
      var qEl = document.createElement("div");
      qEl.className = "sa-item-q";
      qEl.textContent = q;
      item.appendChild(qEl);
      var opts = document.createElement("div");
      opts.className = "sa-yn-opts";
      [{ v: "sim", l: "Sim" }, { v: "nao", l: "N\xE3o" }].forEach(function(opt) {
        var label = document.createElement("label");
        label.className = "sa-yn-opt";
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "sa-confirm-" + idx;
        input.value = opt.v;
        input.checked = saState.confirm[idx] === opt.v;
        input.addEventListener("change", function() {
          saState.confirm[idx] = opt.v;
          item.dataset.answered = "1";
          item.classList.remove("sa-item-unanswered");
          updateNextEnabled();
          saveProgress();
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt.l));
        opts.appendChild(label);
      });
      item.appendChild(opts);
      wrap.appendChild(item);
    });
    var note = document.createElement("p");
    note.className = "sa-note";
    note.textContent = 'Se voc\xEA respondeu "n\xE3o" a alguma dessas quatro perguntas, o quadro pode ser outra coisa (ansiedade, depress\xE3o, estresse, problema de tireoide, m\xE1 qualidade de sono) \u2014 desaten\xE7\xE3o n\xE3o \xE9 sin\xF4nimo de TDAH.';
    wrap.appendChild(note);
    var source = document.createElement("div");
    source.className = "sa-source";
    source.textContent = 'Fonte: "9 crit\xE9rios adaptados para adultos", Russell Barkley, "Vencendo o TDAH Adulto".';
    wrap.appendChild(source);
    return wrap;
  }
  function renderPart3() {
    var wrap = document.createElement("div");
    var intro = document.createElement("p");
    intro.className = "sa-intro";
    intro.textContent = "Marque as afirma\xE7\xF5es que descrevem voc\xEA bem.";
    wrap.appendChild(intro);
    PART3_AREAS.forEach(function(area, areaIdx) {
      var h = document.createElement("h3");
      h.className = "sa-subhead";
      h.textContent = area.title;
      wrap.appendChild(h);
      area.items.forEach(function(text, itemIdx) {
        var label = document.createElement("label");
        label.className = "sa-check-item";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!saState.barkley[areaIdx][itemIdx];
        input.addEventListener("change", function() {
          saState.barkley[areaIdx][itemIdx] = input.checked;
          saveProgress();
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(text));
        wrap.appendChild(label);
      });
    });
    var source = document.createElement("div");
    source.className = "sa-source";
    source.textContent = 'Fonte: 5 \xE1reas de funcionamento adaptadas de "Vencendo o TDAH Adulto", Russell Barkley.';
    wrap.appendChild(source);
    return wrap;
  }
  function countFrequent(arr) {
    return arr.filter(function(v) {
      return v !== null && Number(v) >= FREQUENT_MIN;
    }).length;
  }
  function computeResult() {
    var desatencaoCount = countFrequent(saState.desatencao);
    var hiperatividadeCount = countFrequent(saState.hiperatividade);
    var confirmYesCount = saState.confirm.filter(function(v) {
      return v === "sim";
    }).length;
    var barkleyCount = saState.barkley.reduce(function(total, area) {
      return total + area.filter(Boolean).length;
    }, 0);
    var barkleyAreasWithHits = saState.barkley.filter(function(area) {
      return area.some(Boolean);
    }).length;
    var meetsDsm5Threshold = desatencaoCount >= 5 || hiperatividadeCount >= 5;
    var meetsConfirmation = confirmYesCount === 4;
    var meetsBarkleyPattern = barkleyAreasWithHits >= 3;
    return {
      desatencaoCount,
      hiperatividadeCount,
      confirmYesCount,
      barkleyCount,
      barkleyAreasWithHits,
      meetsDsm5Threshold,
      meetsConfirmation,
      meetsBarkleyPattern
    };
  }
  function buildFeedback(r) {
    var P = r.meetsDsm5Threshold;
    var Q = r.meetsConfirmation;
    var R = r.meetsBarkleyPattern;
    var title, body, tone;
    if (!P && r.barkleyCount === 0) {
      tone = "sa-tone-calm";
      title = "Poucos sinais nesse retrato";
      body = [
        "Pelas suas respostas, voc\xEA marcou poucos sintomas frequentes nas duas listas do DSM-5 e poucas afirma\xE7\xF5es nas 5 \xE1reas de Barkley. Isso n\xE3o costuma ser o retrato t\xEDpico do TDAH em adultos.",
        "Se ainda assim algo te incomoda no dia a dia, vale conversar com um profissional sobre o que est\xE1 pesando \u2014 n\xE3o precisa ser TDAH para merecer aten\xE7\xE3o."
      ];
    } else if (!P && r.barkleyCount > 0) {
      tone = "sa-tone-calm";
      title = "Sinais pontuais, abaixo do padr\xE3o t\xEDpico do DSM-5";
      body = [
        'Voc\xEA marcou algumas afirma\xE7\xF5es das 5 \xE1reas de Barkley, mas n\xE3o chegou a 5 sintomas "frequentes" ou "muito frequentes" em nenhuma das listas do DSM-5 (desaten\xE7\xE3o ou hiperatividade/impulsividade) \u2014 que \xE9 o crit\xE9rio citado nas fontes para considerar o quadro compat\xEDvel com TDAH.',
        "Isso sugere que, se h\xE1 dificuldades reais, elas podem ter outra origem ou ser mais leves/pontuais. Mesmo assim, se algo te incomoda, vale conversar com um profissional."
      ];
    } else if (P && !Q) {
      tone = "sa-tone-warn";
      title = "Muitos sintomas, mas os crit\xE9rios de confirma\xE7\xE3o n\xE3o fecharam";
      body = [
        "Voc\xEA atingiu " + (r.desatencaoCount >= 5 ? "5 ou mais sintomas frequentes de desaten\xE7\xE3o" : "5 ou mais sintomas frequentes de hiperatividade/impulsividade") + ', que \xE9 o crit\xE9rio citado no DSM-5. Por\xE9m, nem todas as 4 perguntas de confirma\xE7\xE3o da Parte 2 tiveram resposta "sim".',
        "Segundo as fontes, sintomas isolados n\xE3o bastam: eles precisam existir desde antes dos 12 anos, aparecer em mais de um ambiente, causar preju\xEDzo real e persistir por pelo menos 6 meses sem liga\xE7\xE3o com um evento espec\xEDfico. Quando algum desses crit\xE9rios falta, o quadro pode ser outra coisa \u2014 ansiedade, depress\xE3o, estresse, problema de tireoide ou m\xE1 qualidade de sono s\xE3o causas comuns de sintomas parecidos.",
        "Vale conversar com um profissional para investigar a causa real desses sintomas."
      ];
    } else if (P && Q && !R) {
      tone = "sa-tone-warn";
      title = "Quadro parcialmente consistente \u2014 vale investigar melhor";
      body = [
        "Voc\xEA atingiu o crit\xE9rio do DSM-5 (5 ou mais sintomas frequentes numa das listas) e confirmou os 4 crit\xE9rios da Parte 2. Por\xE9m, marcou afirma\xE7\xF5es em poucas das 5 \xE1reas de funcionamento de Barkley.",
        "As fontes citam que 89-98% dos adultos com TDAH relatam problemas relevantes nas 5 \xE1reas de Barkley, contra 7-14% da popula\xE7\xE3o geral \u2014 ent\xE3o quanto mais \xE1reas afetadas, mais o quadro tende a ser consistente com TDAH. Como seu resultado ainda est\xE1 parcial nessa parte, uma avalia\xE7\xE3o profissional \xE9 o caminho mais seguro para entender o que est\xE1 acontecendo."
      ];
    } else {
      tone = "sa-tone-alert";
      title = "Quadro consistente com TDAH \u2014 avalia\xE7\xE3o profissional \xE9 o pr\xF3ximo passo";
      body = [
        'Voc\xEA se identificou fortemente nas tr\xEAs partes: sintomas do DSM-5 acima do crit\xE9rio (5 ou mais "frequentemente"/"muito frequentemente" numa das listas), os 4 crit\xE9rios de confirma\xE7\xE3o da Parte 2 e v\xE1rias das 5 \xE1reas de funcionamento de Barkley (que 89-98% dos adultos com TDAH relatam, contra 7-14% da popula\xE7\xE3o geral).',
        'Isso \xE9 um ind\xEDcio relevante \u2014 n\xE3o uma confirma\xE7\xE3o. O pr\xF3ximo passo leg\xEDtimo \xE9 procurar avalia\xE7\xE3o profissional (psiquiatra ou psic\xF3logo com experi\xEAncia em TDAH adulto), n\xE3o concluir sozinho que "tem TDAH" a partir deste question\xE1rio. A avalia\xE7\xE3o formal exige entrevista cl\xEDnica, hist\xF3rico de desenvolvimento e, idealmente, relato de algu\xE9m que te conhece bem \u2014 porque o autorrelato tende a subestimar preju\xEDzos.'
      ];
    }
    return { tone, title, body };
  }
  function renderResult() {
    var r = computeResult();
    var fb = buildFeedback(r);
    var wrap = document.createElement("div");
    var card = document.createElement("div");
    card.className = "sa-result-card " + fb.tone;
    var h = document.createElement("h3");
    h.textContent = fb.title;
    card.appendChild(h);
    fb.body.forEach(function(p) {
      var pEl = document.createElement("p");
      pEl.textContent = p;
      card.appendChild(pEl);
    });
    wrap.appendChild(card);
    var summary = document.createElement("div");
    summary.className = "sa-summary";
    summary.innerHTML = '<div class="sa-summary-row"><span>Sintomas de desaten\xE7\xE3o frequentes</span><strong>' + r.desatencaoCount + ' de 9</strong></div><div class="sa-summary-row"><span>Sintomas de hiperatividade/impulsividade frequentes</span><strong>' + r.hiperatividadeCount + ' de 9</strong></div><div class="sa-summary-row"><span>Crit\xE9rios de confirma\xE7\xE3o (Parte 2)</span><strong>' + r.confirmYesCount + ' de 4</strong></div><div class="sa-summary-row"><span>Afirma\xE7\xF5es marcadas nas 5 \xE1reas de Barkley (Parte 3)</span><strong>' + r.barkleyCount + " de 15</strong></div>";
    wrap.appendChild(summary);
    var next = document.createElement("div");
    next.className = "sa-next-steps";
    next.innerHTML = '<p><strong>Sobre este resultado:</strong> esta ferramenta \xE9 reflex\xE3o pessoal, n\xE3o diagn\xF3stico. S\xF3 um profissional habilitado, com entrevista, hist\xF3rico de vida e (idealmente) relato de terceiros, pode diagnosticar TDAH.</p><div class="sa-source">Fontes: crit\xE9rios do DSM-5 citados na Cartilha ABP/Alexa e no cap\xEDtulo IACAPAP; "9 crit\xE9rios adaptados para adultos" e 5 \xE1reas de funcionamento de Russell Barkley, "Vencendo o TDAH Adulto".</div>';
    wrap.appendChild(next);
    return wrap;
  }
  function render() {
    saBody.innerHTML = "";
    var stepEl;
    if (saStep === 0) stepEl = renderPart1Desatencao();
    else if (saStep === 1) stepEl = renderPart1Hiperatividade();
    else if (saStep === 2) stepEl = renderPart2();
    else if (saStep === 3) stepEl = renderPart3();
    else stepEl = renderResult();
    saBody.appendChild(stepEl);
    saBody.scrollTop = 0;
    var pct = Math.round((saStep + 1) / TOTAL_STEPS * 100);
    saProgressFill.style.width = pct + "%";
    var labels = [
      "Passo 1 de 4 \xB7 Desaten\xE7\xE3o (DSM-5)",
      "Passo 2 de 4 \xB7 Hiperatividade/Impulsividade (DSM-5)",
      "Passo 3 de 4 \xB7 Confirma\xE7\xE3o",
      "Passo 4 de 4 \xB7 \xC1reas de Barkley",
      "Resultado"
    ];
    saStepLabel.textContent = labels[saStep];
    saBackBtn.style.visibility = saStep === 0 ? "hidden" : "visible";
    if (saStep === TOTAL_STEPS - 1) {
      saNextBtn.style.display = "none";
      saRestartBtn.style.display = "";
      AppStorage.setSelfAssessmentProgress(null);
    } else {
      saNextBtn.style.display = "";
      saRestartBtn.style.display = "none";
      saNextBtn.textContent = saStep === TOTAL_STEPS - 2 ? "Ver resultado" : "Pr\xF3ximo";
    }
    updateNextEnabled();
  }
  function stepIsComplete() {
    if (saStep === 0) return saState.desatencao.every(function(v) {
      return v !== null;
    });
    if (saStep === 1) return saState.hiperatividade.every(function(v) {
      return v !== null;
    });
    if (saStep === 2) return saState.confirm.every(function(v) {
      return v !== null;
    });
    return true;
  }
  function updateNextEnabled() {
    if (saStep === TOTAL_STEPS - 1) return;
    saNextBtn.disabled = !stepIsComplete();
  }
  function focusFirstUnanswered() {
    var unanswered = saBody.querySelector('.sa-item[data-answered="0"]');
    if (!unanswered) return;
    unanswered.classList.add("sa-item-unanswered");
    unanswered.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function goNext() {
    if (saNextBtn.disabled) {
      focusFirstUnanswered();
      return;
    }
    if (saStep < TOTAL_STEPS - 1) {
      saStep += 1;
      saveProgress();
      render();
    }
  }
  function goBack() {
    if (saStep > 0) {
      saStep -= 1;
      render();
    }
  }
  function restart() {
    saState = freshState();
    saStep = 0;
    AppStorage.setSelfAssessmentProgress(null);
    render();
  }
  function initSelfAssessment() {
    saBtn.addEventListener("click", openSelfAssessment);
    saCloseBtn.addEventListener("click", closeSelfAssessment);
    saOverlay.addEventListener("click", function(ev) {
      if (ev.target === saOverlay) closeSelfAssessment();
    });
    saNextBtn.addEventListener("click", goNext);
    saBackBtn.addEventListener("click", goBack);
    saRestartBtn.addEventListener("click", restart);
  }

  // src/places-overlay.js
  var places_overlay_exports = {};
  __export(places_overlay_exports, {
    closePlacesOverlay: () => closePlacesOverlay,
    initPlacesOverlay: () => initPlacesOverlay,
    openPlacesOverlay: () => openPlacesOverlay,
    placesOverlay: () => placesOverlay,
    refreshPlacesDiscovery: () => refreshPlacesDiscovery
  });
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
  function refreshPlacesDiscovery() {
    return countPlacesInUse().then(function(info) {
      if (!info.count) {
        placesDiscoveryEmpty.style.display = "";
        placesDiscoveryCard.style.display = "none";
        return info;
      }
      placesDiscoveryEmpty.style.display = "none";
      placesDiscoveryCard.style.display = "";
      placesDiscoveryIco.innerHTML = pinIconLarge();
      return listPlacesInUse().then(function(places) {
        var names = places.map(function(p) {
          return p.location.label || p.taskLabel || "Local";
        }).slice(0, 3);
        var extra = places.length > names.length ? " e mais " + (places.length - names.length) : "";
        placesDiscoverySub.textContent = info.count + "/" + (info.limit || FREE_PLACES_LIMIT) + " locais usados \xB7 " + names.join(", ") + extra;
        return info;
      });
    }).catch(function() {
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
    Promise.all([countPlacesInUse(), listPlacesInUse()]).then(function(results) {
      var info = results[0];
      var places = results[1];
      placesCountEl.textContent = info.count + " de " + (info.limit || FREE_PLACES_LIMIT) + " locais usados";
      placesListEl.innerHTML = "";
      if (!places.length) {
        var empty = document.createElement("div");
        empty.className = "places-empty";
        empty.textContent = "Voc\xEA ainda n\xE3o tem lembretes por lugar. Toque em uma tarefa na edi\xE7\xE3o de rotina para configurar.";
        placesListEl.appendChild(empty);
        return;
      }
      places.forEach(function(p) {
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
        pEl.textContent = (p.taskLabel || "Tarefa") + " \xB7 " + (p.location.trigger === "exit" ? "ao sair" : "ao chegar");
        txt.appendChild(h4);
        txt.appendChild(pEl);
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-danger";
        removeBtn.textContent = "Remover";
        removeBtn.addEventListener("click", function() {
          if (!p.taskId) {
            showToast("N\xE3o foi poss\xEDvel remover este local.");
            return;
          }
          removePlaceForTask(p.taskId).then(function() {
            showToast("Local removido");
            renderPlacesList();
          }).catch(function() {
            showToast("N\xE3o foi poss\xEDvel remover o local. Tente novamente.");
          });
        });
        item.appendChild(ico);
        item.appendChild(txt);
        item.appendChild(removeBtn);
        placesListEl.appendChild(item);
      });
    }).catch(function() {
      placesCountEl.textContent = "";
      var errEl = document.createElement("div");
      errEl.className = "places-empty";
      errEl.textContent = "N\xE3o foi poss\xEDvel carregar seus locais agora.";
      placesListEl.appendChild(errEl);
    });
  }
  function initPlacesOverlay() {
    placesDiscoveryEmpty.addEventListener("click", openPlacesOverlay);
    placesDiscoveryCard.addEventListener("click", openPlacesOverlay);
    document.getElementById("placesOverlayCloseBtn").addEventListener("click", closePlacesOverlay);
    placesOverlay.addEventListener("click", function(ev) {
      if (ev.target === placesOverlay) closePlacesOverlay();
    });
    document.getElementById("placesAddBtn").addEventListener("click", function() {
      closePlacesOverlay();
      openEditor();
      showToast('Escolha a tarefa que vai receber esse lembrete e toque em "Lembrar por lugar"');
    });
    refreshPlacesDiscovery();
  }

  // src/principles.js
  var PRINCIPLES = [
    { text: 'O c\xE9rebro com TDAH n\xE3o sustenta bem informa\xE7\xE3o, tempo e motiva\xE7\xE3o internamente \u2014 a solu\xE7\xE3o n\xE3o \xE9 "tentar mais", \xE9 externalizar. Este checklist \xE9 isso aplicado \xE0 sua rotina real.', source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Prazo que s\xF3 existe na sua cabe\xE7a \xE9 prazo que n\xE3o existe. Coloque hora, alarme ou lembrete vis\xEDvel \u2014 o c\xE9rebro com TDAH reage muito mais ao que v\xEA do que ao que "sabe".', source: "Manual Barkley, cap. 7" },
    { text: "TDAH tem raiz gen\xE9tica forte, n\xE3o \xE9 resultado de falta de car\xE1ter ou de m\xE1 cria\xE7\xE3o. Cobrar mais for\xE7a de vontade de quem j\xE1 est\xE1 se esfor\xE7ando s\xF3 aumenta a frustra\xE7\xE3o sem mudar o resultado.", source: "Manual Barkley, cap. 5 \xB7 Cartilha ABP/Alexa" },
    { text: 'A dificuldade n\xE3o \xE9 "prestar aten\xE7\xE3o" em geral \u2014 \xE9 sustentar aten\xE7\xE3o quando a tarefa n\xE3o \xE9 interessante nem tem recompensa imediata. Torne a tarefa chata mais curta, mais vis\xEDvel ou com um pr\xEAmio pequeno no final.', source: "Manual Barkley, cap. 7 e cap. 12" },
    { text: 'Mem\xF3ria de trabalho fraca significa que a informa\xE7\xE3o "escorrega" antes de virar a\xE7\xE3o. Anotar n\xE3o \xE9 frescura nem falta de intelig\xEAncia \u2014 \xE9 a pr\xF3tese que substitui um sistema que naturalmente falha.', source: "Manual Barkley, cap. 3 e cap. 7" },
    { text: 'TDAH costuma vir com "miopia temporal": o futuro parece distante e pouco real, ent\xE3o o presente sempre ganha. Trazer a consequ\xEAncia futura para perto \u2014 visualiz\xE1-la, escrev\xEA-la, antecip\xE1-la \u2014 ajuda a competir com o impulso do agora.', source: "Manual Barkley, cap. 7" },
    { text: "Antes de reagir, existe uma fra\xE7\xE3o de segundo em que era poss\xEDvel pausar. Treinar essa pausa \u2014 contar at\xE9 tr\xEAs, respirar, sair da sala \u2014 \xE9 treinar o m\xFAsculo que o TDAH deixa mais fraco.", source: "Manual Barkley, cap. 7" },
    { text: 'Dificuldade para regular emo\xE7\xE3o faz parte do TDAH, n\xE3o \xE9 "drama" ou instabilidade de car\xE1ter. Nomear o que voc\xEA sente antes de agir j\xE1 reduz a intensidade da resposta.', source: "Manual Barkley, cap. 7" },
    { text: "Recompensa que demora n\xE3o segura a aten\xE7\xE3o de um c\xE9rebro com TDAH tanto quanto recompensa imediata. Quebrar uma meta grande em pequenas vit\xF3rias com retorno r\xE1pido n\xE3o \xE9 fraqueza, \xE9 estrat\xE9gia.", source: "Manual Barkley, cap. 7 e cap. 12" },
    { text: "Rotina fixa n\xE3o \xE9 sobre disciplina moral \u2014 \xE9 sobre reduzir decis\xF5es. Cada decis\xE3o nova gasta energia que o c\xE9rebro com TDAH j\xE1 tem em menor reserva.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: "Come\xE7ar uma tarefa costuma ser mais dif\xEDcil do que execut\xE1-la. Se travar antes de iniciar, tente negociar consigo mesmo s\xF3 os primeiros dois minutos \u2014 o resto costuma vir mais f\xE1cil depois.", source: "Manual Barkley, cap. 7" },
    { text: '"Hiperfoco" n\xE3o \xE9 um termo usado pelas fontes do projeto, mas o padr\xE3o \xE9 documentado: a mesma dificuldade de regular aten\xE7\xE3o que atrapalha em tarefas chatas pode prender voc\xEA por horas em algo que engancha (o oposto do problema de iniciar tarefas sem recompensa imediata). Use alarmes tamb\xE9m para sair de tarefas boas demais, n\xE3o s\xF3 para lembrar das chatas.', source: "Manual Barkley, cap. 7 (persist\xEAncia voltada a objetivos)" },
    { text: 'Trocar de atividade exige uma fun\xE7\xE3o executiva que o TDAH enfraquece: desligar de uma coisa para ligar em outra. Um aviso de "faltam 5 minutos" antes da transi\xE7\xE3o facilita esse desligamento.', source: "Manual Barkley, cap. 7" },
    { text: 'TDAH raramente vem sozinho \u2014 ansiedade, transtorno opositor, altera\xE7\xF5es de humor e uso de subst\xE2ncias s\xE3o comorbidades frequentes. Se algo al\xE9m da desaten\xE7\xE3o/impulsividade estiver pesando, vale investigar separadamente, n\xE3o s\xF3 rotular tudo como "TDAH".', source: "Cartilha ABP/Alexa \xB7 Manual Barkley, cap. 4 \xB7 IACAPAP" },
    { text: "Sono ruim piora sintomas de TDAH, e TDAH tamb\xE9m dificulta manter um sono regular \u2014 \xE9 uma via de m\xE3o dupla. Proteger hor\xE1rio fixo de dormir \xE9 t\xE3o parte do manejo quanto qualquer lista de tarefas.", source: "Manual Barkley, cap. 3" },
    { text: 'Adultos com TDAH costumam ter sido crian\xE7as com TDAH que aprenderam a mascarar sintomas, n\xE3o pessoas que "curaram" o transtorno. Estrat\xE9gias de organiza\xE7\xE3o continuam necess\xE1rias mesmo quando a hiperatividade vis\xEDvel diminuiu com a idade.', source: "Manual Barkley, cap. 6 \xB7 IACAPAP" },
    { text: "Muita gente com TDAH subestima o pr\xF3prio n\xEDvel de dificuldade \u2014 \xE9 um vi\xE9s conhecido, n\xE3o falta de autocr\xEDtica. Pedir feedback de algu\xE9m pr\xF3ximo sobre prazos e combinados pode revelar padr\xF5es que passam despercebidos por dentro.", source: "Manual Barkley, cap. 3" },
    { text: "Planejar um passo de cada vez \xE9 mais realista do que tentar visualizar o caminho inteiro de uma vez. Divida a tarefa em partes pequenas o suficiente para caber na mem\xF3ria de trabalho.", source: "Manual Barkley, cap. 7" },
    { text: "Custo de resposta \u2014 perder algo j\xE1 conquistado por n\xE3o cumprir um combinado \u2014 costuma funcionar melhor do que s\xF3 prometer recompensa por bom comportamento. Pequenas perdas imediatas comunicam mais do que promessas distantes.", source: "Manual Barkley, cap. 12" },
    { text: 'Impulsividade n\xE3o \xE9 "falta de educa\xE7\xE3o", \xE9 um freio que engata mais devagar. Ambientes com menos est\xEDmulo e menos tenta\xE7\xE3o por perto reduzem a necessidade de exercer esse freio o tempo todo.', source: "Manual Barkley, cap. 7" },
    { text: "Lista de tarefas na cabe\xE7a compete com tudo que est\xE1 acontecendo agora, e quase sempre perde. Colocar a lista fora da cabe\xE7a \u2014 papel, app, quadro \u2014 tira essa disputa e libera espa\xE7o mental.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'O tratamento eficaz do TDAH costuma combinar abordagem comportamental com acompanhamento profissional \u2014 n\xE3o \xE9 escolher entre "for\xE7a de vontade" ou "rem\xE9dio", \xE9 somar estrat\xE9gias que sustentam umas \xE0s outras.', source: "Cartilha ABP/Alexa \xB7 Manual Barkley, cap. 20 (estudo MTA)" },
    { text: "Um ambiente bagun\xE7ado ou barulhento pesa mais sobre um c\xE9rebro com TDAH do que sobre outros, porque ele j\xE1 gasta mais energia filtrando est\xEDmulos. Reduzir bagun\xE7a visual ao redor da tarefa \xE9 reduzir a carga que a aten\xE7\xE3o precisa carregar.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Autoinstru\xE7\xE3o verbal \u2014 "falar" o pr\xF3ximo passo em voz alta ou por escrito \u2014 supre uma fun\xE7\xE3o interna que no TDAH tende a ser mais fraca: a voz que guia o pr\xF3prio comportamento. Narrar a tarefa em voz alta pode parecer bobo, mas ajuda a manter o rumo.', source: "Manual Barkley, cap. 3 e cap. 7" },
    { text: "TDAH tem base neurobiol\xF3gica, n\xE3o \xE9 inven\xE7\xE3o recente nem efeito colateral de tela ou tecnologia moderna. Isso n\xE3o significa que telas n\xE3o atrapalhem foco \u2014 significa que o transtorno j\xE1 existia muito antes delas.", source: "Manual Barkley, cap. 5 \xB7 Cartilha ABP/Alexa" },
    { text: "Comemorar o progresso pequeno junto com o grande \xE9 importante: c\xE9rebros com TDAH respondem melhor a refor\xE7o frequente do que a uma \xFAnica recompensa distante no fim de um grande projeto. Marque as vit\xF3rias intermedi\xE1rias, n\xE3o s\xF3 a linha de chegada.", source: "Manual Barkley, cap. 7, 12 e 15" },
    { text: "Colocar objetos-chave sempre no mesmo lugar vis\xEDvel (chaves, carteira, rem\xE9dio) elimina uma decis\xE3o e uma busca que, de outra forma, consomem aten\xE7\xE3o todos os dias. Ambiente previs\xEDvel poupa fun\xE7\xE3o executiva para o que realmente importa.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Errar um prazo ou esquecer um compromisso n\xE3o \xE9 evid\xEAncia de "personalidade desorganizada" \u2014 \xE9 sintoma esperado de um transtorno reconhecido, com explica\xE7\xE3o neurobiol\xF3gica. Isso n\xE3o tira sua responsabilidade sobre buscar apoio, mas tira o peso da culpa moral.', source: "Manual Barkley, cap. 5 \xB7 Cartilha ABP/Alexa" },
    { text: "Em crian\xE7as, TDAH costuma aparecer mais como agita\xE7\xE3o vis\xEDvel; em adultos, mais como inquieta\xE7\xE3o interna, procrastina\xE7\xE3o e dificuldade de organiza\xE7\xE3o. O transtorno muda de forma ao longo da vida, n\xE3o desaparece sozinho.", source: "Manual Barkley, cap. 6 \xB7 IACAPAP" },
    { text: "Dividir uma tarefa grande em etapas com prazos parciais imita, de fora, a fun\xE7\xE3o de planejamento que o TDAH dificulta por dentro. Cada etapa pequena vira um novo ponto de checagem e de ajuste de rota.", source: "Manual Barkley, cap. 7" },
    { text: "TDAH \xE9 tratado melhor como uma condi\xE7\xE3o cont\xEDnua a manejar, n\xE3o como um problema a resolver de uma vez. Ajustar estrat\xE9gias com o tempo \u2014 n\xE3o desistir na primeira que falhou \u2014 \xE9 parte esperada do processo, n\xE3o sinal de fracasso.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'O modelo de Barkley descreve quatro fun\xE7\xF5es executivas que o TDAH enfraquece: a que visualiza passado e futuro ("olho da mente"), a que conversa consigo mesmo ("voz da mente"), a que regula emo\xE7\xE3o ("cora\xE7\xE3o da mente") e a que planeja e testa op\xE7\xF5es ("playground da mente"). Cada dificuldade pr\xE1tica do dia a dia pode ser rastreada at\xE9 uma dessas quatro.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'A mem\xF3ria de trabalho n\xE3o verbal \u2014 o "olho da mente" \u2014 \xE9 o que permite reviver mentalmente uma situa\xE7\xE3o parecida antes de agir de novo. Quando ela \xE9 fraca, cada decis\xE3o parece nova, mesmo que voc\xEA j\xE1 tenha vivido aquilo dez vezes antes.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'A "voz da mente" \xE9 a mem\xF3ria de trabalho verbal: a autoconversa interna que formula regras e mant\xE9m o fio da meada ao falar ou escrever. Quando ela falha, \xE9 comum perder o rumo no meio de uma explica\xE7\xE3o ou n\xE3o achar as palavras na hora certa.', source: "Vencendo o TDAH Adulto, Passo 2 \xB7 se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: 'O "cora\xE7\xE3o da mente" \xE9 a fun\xE7\xE3o executiva que regula a intensidade da emo\xE7\xE3o antes que ela vire a\xE7\xE3o. No TDAH, a emo\xE7\xE3o costuma chegar na mesma for\xE7a de sempre, mas o controle sobre express\xE1-la ou n\xE3o \xE9 que fica comprometido.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'O "playground da mente" \xE9 onde ideias e solu\xE7\xF5es seriam testadas mentalmente antes de agir. Quando essa fun\xE7\xE3o de planejamento \xE9 fraca, o caminho mais curto costuma ser agir primeiro e pensar depois \u2014 n\xE3o por impulsividade de personalidade, mas por um passo que simplesmente n\xE3o aconteceu por dentro.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'Barkley chama o TDAH de "cegueira temporal": n\xE3o \xE9 que a pessoa n\xE3o saiba o que precisa fazer no futuro, \xE9 que o futuro n\xE3o pesa o suficiente agora para competir com o presente. \xC9 um problema de desempenho no momento certo, n\xE3o de conhecimento.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: "O livro descreve cinco \xE1reas onde o TDAH adulto mais atrapalha: gerir tempo e metas, organizar e comunicar, manter autodisciplina diante de impulsos, se automotivar sem supervis\xE3o externa, e manter concentra\xE7\xE3o e prontid\xE3o. Reconhecer em qual dessas \xE1reas voc\xEA mais trope\xE7a ajuda a escolher a estrat\xE9gia certa em vez de tentar tudo ao mesmo tempo.", source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: "A primeira das oito regras de autogest\xE3o \xE9 simples de enunciar e dif\xEDcil de praticar: pare a a\xE7\xE3o. Respirar, repetir o que a outra pessoa acabou de dizer, ou apenas falar mais devagar cria a fra\xE7\xE3o de segundo que o TDAH costuma pular.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: "Antes de decidir algo, vale relembrar conscientemente uma situa\xE7\xE3o parecida do passado e s\xF3 depois imaginar o futuro decorrente da escolha atual. Essa \xE9 a segunda regra do livro: olhar para tr\xE1s para poder olhar para frente com mais realismo.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: "N\xE3o basta visualizar o passado e o futuro por dentro \u2014 colocar isso em palavras, mesmo em voz alta e sozinho, ajuda a extrair dali uma regra pr\xE1tica para agora. \xC9 a terceira regra: expressar o passado e o futuro em vez de s\xF3 senti-los vagamente.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: "A quarta regra de autogest\xE3o do livro \xE9 exteriorizar as informa\xE7\xF5es fundamentais: lembretes f\xEDsicos exatamente onde a a\xE7\xE3o vai acontecer, um caderno sempre \xE0 m\xE3o. A informa\xE7\xE3o precisa estar no ambiente, porque contar s\xF3 com a mente para guard\xE1-la tende a falhar.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: "Antecipar emocionalmente como vai ser a sensa\xE7\xE3o de ter terminado algo \u2014 n\xE3o s\xF3 pensar racionalmente sobre o prazo \u2014 \xE9 a quinta regra do livro: considerar o futuro como combust\xEDvel motivacional, n\xE3o s\xF3 como dado abstrato.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: "A sexta regra prop\xF5e decompor o futuro em blocos pequenos e torn\xE1-lo significativo com presta\xE7\xE3o de contas a outra pessoa e recompensa imediata a cada etapa conclu\xEDda. Tarefa grande sem essa fragmenta\xE7\xE3o tende a ficar abstrata demais para gerar a\xE7\xE3o.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: "A s\xE9tima regra \xE9 tornar os problemas externos, f\xEDsicos e manuais \u2014 post-its, quadros, fichas \u2014 em vez de tentar resolver tudo s\xF3 na cabe\xE7a. O que est\xE1 fora da mente compete melhor com as distra\xE7\xF5es do que o que fica s\xF3 pensado.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: "A oitava e \xFAltima regra do livro \xE9 ter senso de humor com os pr\xF3prios erros: reconhecer o que aconteceu, explicar, pedir desculpas e prometer melhora \u2014 sem nega\xE7\xE3o, mas tamb\xE9m sem culpa excessiva. Humor autodepreciativo saud\xE1vel \xE9 ferramenta de manejo, n\xE3o fraqueza de car\xE1ter.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: "No trabalho, o livro recomenda escolher, sempre que poss\xEDvel, uma carreira e um ambiente compat\xEDveis com o pr\xF3prio perfil, al\xE9m de reduzir distra\xE7\xF5es f\xEDsicas no espa\xE7o. Revelar o diagn\xF3stico ao empregador s\xF3 costuma valer a pena quando \xE9 necess\xE1rio para conseguir uma adapta\xE7\xE3o formal.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: "Em finan\xE7as, o livro sugere automatizar pagamentos, manter o or\xE7amento vis\xEDvel e, em casos mais graves, delegar a administra\xE7\xE3o do dinheiro a outra pessoa. Usar dinheiro f\xEDsico em vez de cart\xE3o tamb\xE9m ajuda porque torna o gasto concreto e vis\xEDvel no momento em que acontece.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: "Em relacionamentos, sintomas de TDAH \u2014 esquecer, interromper, se distrair no meio de uma conversa \u2014 costumam ser mal-interpretados pelo outro como desinteresse ou grosseria. Aplicar as oito regras de autogest\xE3o nas intera\xE7\xF5es e buscar tratamento tende a melhorar tamb\xE9m a qualidade do relacionamento, n\xE3o s\xF3 os sintomas isolados.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos" },
    { text: "Para quem tem TDAH e tamb\xE9m \xE9 pai ou m\xE3e, o livro recomenda tratar o pr\xF3prio TDAH primeiro, antes de tentar impor regras aos filhos. Regras familiares vis\xEDveis, combinadas com o parceiro, e um timer para checagens peri\xF3dicas ajudam a sustentar consist\xEAncia que a mem\xF3ria sozinha n\xE3o sustentaria.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Paternidade/Maternidade" },
    { text: "Ao volante, o livro \xE9 direto: nunca dirigir sem a medica\xE7\xE3o em efeito quando ela \xE9 parte do tratamento, zero \xE1lcool, celular bloqueado, e um lembrete f\xEDsico para o cinto de seguran\xE7a. Dire\xE7\xE3o exige exatamente as fun\xE7\xF5es executivas mais afetadas pelo TDAH \u2014 antecipa\xE7\xE3o, controle de impulso, aten\xE7\xE3o sustentada.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o" },
    { text: "Comorbidades como transtorno opositor, transtorno de conduta, ansiedade e depress\xE3o aparecem em mais de 80% dos casos de TDAH adulto segundo o livro, e cada uma precisa de tratamento pr\xF3prio al\xE9m do manejo do TDAH em si. Tratar s\xF3 a desaten\xE7\xE3o quando h\xE1 uma comorbidade n\xE3o resolvida deixa o quadro geral incompleto.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Comorbidades" },
    { text: "Os crit\xE9rios de avalia\xE7\xE3o propostos no livro s\xE3o mais rigorosos que os crit\xE9rios diagn\xF3sticos padr\xE3o: exigem sintomas em tr\xEAs \xE1reas (aten\xE7\xE3o/persist\xEAncia, controle de impulsos, atividade excessiva), in\xEDcio antes dos 12 anos e preju\xEDzo em m\xFAltiplos dom\xEDnios da vida \u2014 n\xE3o s\xF3 um inc\xF4modo pontual em um contexto espec\xEDfico.", source: "Vencendo o TDAH Adulto, Passo 1" },
    { text: "Cerca de 75% das pessoas respondem bem j\xE1 ao primeiro estimulante testado, segundo o livro, mas o ajuste de dose \xE9 um processo gradual e monitorado, n\xE3o algo definido de uma vez. N\xE3o estranhar se a primeira dose n\xE3o for a ideal faz parte de esperar realisticamente pelo processo.", source: "Vencendo o TDAH Adulto, Passo 3" },
    { text: "Repetir em voz alta o que a outra pessoa acabou de dizer, antes de responder, ganha o tempo que a mem\xF3ria de trabalho verbal fraca n\xE3o d\xE1 de gra\xE7a. \xC9 uma das estrat\xE9gias de comunica\xE7\xE3o mais simples descritas no livro, e serve tanto para n\xE3o perder o fio quanto para mostrar que voc\xEA escutou.", source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: "Diagnosticar TDAH em adultos \xE9 mais complexo do que em crian\xE7as, porque depende de mem\xF3ria retrospectiva de sintomas da inf\xE2ncia e se sobrep\xF5e a outros quadros. O protocolo do Manual Barkley passa por quatro perguntas centrais: os sintomas existiam antes dos 12 anos? h\xE1 preju\xEDzo em mais de um ambiente da vida atual? outra condi\xE7\xE3o explica melhor o quadro? existe comorbidade junto?", source: "Manual Barkley, cap. 11" },
    { text: "Um dos diagn\xF3sticos diferenciais mais importantes em adultos \xE9 distinguir TDAH de transtorno bipolar \u2014 os dois podem parecer parecidos de fora, mas pedem tratamentos diferentes. Por isso a avalia\xE7\xE3o de adultos costuma incluir triagem de humor e de uso de subst\xE2ncias, n\xE3o s\xF3 escalas de aten\xE7\xE3o.", source: "Manual Barkley, cap. 11" },
    { text: "Nenhum teste isolado \u2014 nem de computador, nem neuropsicol\xF3gico \u2014 confirma ou descarta TDAH sozinho, segundo o Manual Barkley. Testes servem para sustentar uma hip\xF3tese diagn\xF3stica j\xE1 levantada pela entrevista cl\xEDnica, buscar explica\xE7\xF5es alternativas, ou identificar comorbidades associadas.", source: "Manual Barkley, cap. 9" },
    { text: "A entrevista com quem convive de perto \xE9 considerada a fonte mais rica de informa\xE7\xE3o diagn\xF3stica, mais at\xE9 do que a entrevista direta sobre sintomas de desaten\xE7\xE3o e hiperatividade. Isso porque muita gente com TDAH tem dificuldade real de perceber e relatar o pr\xF3prio padr\xE3o de comportamento.", source: "Manual Barkley, cap. 8" },
    { text: "Estimulantes agem bloqueando a recapta\xE7\xE3o de dopamina e noradrenalina no c\xE9rebro, o que ajuda a explicar por que melhoram aten\xE7\xE3o sustentada e controle de impulso. Estudos citados no Manual Barkley refutam a ideia de que o uso correto de estimulantes aumente risco de abuso de subst\xE2ncias \u2014 o efeito, quando o tratamento \xE9 bem conduzido, tende a ser protetor.", source: "Manual Barkley, cap. 17" },
    { text: "Tiques n\xE3o s\xE3o mais considerados contraindica\xE7\xE3o absoluta para o uso de estimulantes, ao contr\xE1rio do que se pensava antes \u2014 a decis\xE3o passou a ser individualizada, pesando benef\xEDcio e efeito colateral caso a caso. Isso mostra como o entendimento sobre tratamento medicamentoso do TDAH segue sendo atualizado com novas evid\xEAncias.", source: "Manual Barkley, cap. 17" },
    { text: "Quando estimulantes n\xE3o s\xE3o indicados \u2014 por ansiedade importante, tiques ou hist\xF3rico de abuso de subst\xE2ncias \u2014 a atomoxetina \xE9 uma alternativa n\xE3o estimulante com efic\xE1cia comprovada em crian\xE7as, adolescentes e adultos, sem potencial de abuso.", source: "Manual Barkley, cap. 18" },
    { text: "O estudo MTA, um dos maiores j\xE1 feitos sobre tratamento de TDAH, mostrou que combinar medica\xE7\xE3o com interven\xE7\xE3o comportamental permite doses menores de rem\xE9dio para o mesmo efeito, com vantagem estatisticamente clara em pr\xE1ticas parentais negativas. Nos sintomas nucleares de aten\xE7\xE3o, por\xE9m, o combinado n\xE3o superou a medica\xE7\xE3o isolada \u2014 os dois ficaram equivalentes entre si, e ambos superiores ao tratamento comportamental isolado.", source: "Manual Barkley, cap. 20 \xB7 Estudo MTA" },
    { text: 'TDAH raramente aparece sozinho: no livro "Vencendo o TDAH Adulto", Barkley estima que mais de 80% dos casos v\xEAm acompanhados de outra condi\xE7\xE3o \u2014 TOD, ansiedade, depress\xE3o ou uso de subst\xE2ncias. Tratar s\xF3 o TDAH e ignorar o resto costuma deixar a pessoa sem entender por que ainda se sente mal.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 5 \u2014 Comorbidades" },
    { text: 'A "cegueira temporal" descrita por Barkley n\xE3o \xE9 falta de intelig\xEAncia sobre o futuro \u2014 \xE9 a dificuldade de fazer esse futuro pesar no momento da decis\xE3o. Saber que algo \xE9 importante e conseguir agir de acordo com isso s\xE3o coisas diferentes no c\xE9rebro com TDAH.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 2" },
    { text: 'Barkley organiza o TDAH em quatro fun\xE7\xF5es executivas enfraquecidas: a "voz da mente" (mem\xF3ria de trabalho verbal), o "olho da mente" (mem\xF3ria de trabalho n\xE3o verbal), o "cora\xE7\xE3o da mente" (autocontrole emocional) e o "playground da mente" (planejamento). Entender qual dessas falha mais no seu dia ajuda a escolher a estrat\xE9gia certa.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 2" },
    { text: "Antes de fechar um diagn\xF3stico de TDAH, vale perguntar: os sintomas j\xE1 apareciam antes dos 12 anos? Existe preju\xEDzo em mais de uma \xE1rea da vida? Alguma outra condi\xE7\xE3o explica melhor o quadro? Essas s\xE3o as perguntas centrais que o Manual Barkley recomenda para avalia\xE7\xE3o de adultos \u2014 n\xE3o \xE9 intui\xE7\xE3o, \xE9 protocolo.", source: "Manual Barkley, cap. 11 (Avalia\xE7\xE3o de Adultos)" },
    { text: "Distinguir TDAH de transtorno bipolar em adultos \xE9 um dos diagn\xF3sticos diferenciais mais delicados: oscila\xE7\xE3o de humor no TDAH costuma ser r\xE1pida e reativa a eventos, enquanto no bipolar tende a formar epis\xF3dios mais sustentados. Um profissional especializado \xE9 quem faz essa diferencia\xE7\xE3o com seguran\xE7a.", source: "Manual Barkley, cap. 11 (Avalia\xE7\xE3o de Adultos)" },
    { text: "TDAH combinado com transtorno de conduta na inf\xE2ncia indica, segundo os estudos longitudinais citados por Barkley, um subgrupo com maior risco de dificuldades persistentes na vida adulta \u2014 mas isso \xE9 estat\xEDstica de grupo, n\xE3o destino individual. Interven\xE7\xE3o precoce muda essa trajet\xF3ria.", source: "Manual Barkley, cap. 4 (Comorbidades) e cap. 6 (Curso evolutivo)" },
    { text: "Ansiedade associada ao TDAH tende a vir acompanhada de mais desaten\xE7\xE3o e, curiosamente, menos impulsividade \u2014 como se a preocupa\xE7\xE3o excessiva funcionasse como um freio parcial. Isso mostra por que tratar s\xF3 um sintoma isolado sem olhar o quadro completo pode confundir mais do que ajudar.", source: "Manual Barkley, cap. 4 (Comorbidades)" },
    { text: "O Projeto Milwaukee, um dos maiores estudos longitudinais sobre TDAH, acompanhou crian\xE7as at\xE9 a vida adulta e mostrou que a persist\xEAncia do transtorno varia bastante conforme o crit\xE9rio usado \u2014 mas os riscos em \xE1reas como tr\xE2nsito, trabalho e relacionamentos aparecem de forma consistente quando o TDAH n\xE3o \xE9 manejado.", source: "Manual Barkley, cap. 6 (Curso evolutivo)" },
    { text: 'A hiperatividade vis\xEDvel da inf\xE2ncia \u2014 correr, subir, n\xE3o parar quieto \u2014 tende a se transformar, na vida adulta, em inquieta\xE7\xE3o interna: uma sensa\xE7\xE3o constante de estar "a mil" por dentro, mesmo parado por fora. O transtorno muda de roupa, n\xE3o desaparece.', source: "Manual Barkley, cap. 6 (Curso evolutivo) \xB7 IACAPAP" },
    { text: "TDAH em adultos est\xE1 associado a maior risco de acidentes de tr\xE2nsito, segundo dados citados no cap\xEDtulo sobre curso evolutivo \u2014 n\xE3o por imprud\xEAncia de car\xE1ter, mas por falhas moment\xE2neas de aten\xE7\xE3o sustentada e de inibi\xE7\xE3o do impulso. Reconhecer esse risco \xE9 o primeiro passo para compens\xE1-lo, n\xE3o motivo de vergonha.", source: "Manual Barkley, cap. 6 (Curso evolutivo)" },
    { text: 'A Regra 8 de Barkley para adultos com TDAH \xE9 "tenha senso de humor": reconhecer o erro, explicar sem se justificar excessivamente, pedir desculpas e seguir em frente, evitando tanto a nega\xE7\xE3o quanto a culpa paralisante. \xC9 uma forma pr\xE1tica de proteger a autoestima sem deixar de assumir responsabilidade.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 4 \u2014 Regra 8" },
    { text: 'Muitos adultos com TDAH carregam anos de r\xF3tulos como "pregui\xE7oso", "relaxado" ou "sem compromisso" antes de qualquer diagn\xF3stico. Esse hist\xF3rico deixa marcas na autoestima que n\xE3o somem s\xF3 porque o diagn\xF3stico chegou \u2014 costuma exigir um trabalho \xE0 parte de reconstru\xE7\xE3o da autoimagem.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 1 \u2014 Avalia\xE7\xE3o" },
    { text: "Em relacionamentos, sintomas de TDAH \u2014 esquecer combinados, interromper, se distrair no meio de uma conversa \u2014 s\xE3o frequentemente interpretados pelo parceiro como desinteresse ou desrespeito. Nomear que \xE9 sintoma, n\xE3o inten\xE7\xE3o, \xE9 o primeiro passo para tirar a culpa moral da equa\xE7\xE3o sem tirar a responsabilidade de buscar tratamento.", source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 5 \u2014 Relacionamentos" },
    { text: "Adultos com TDAH n\xE3o tratado enfrentam mais risco em \xE1reas espec\xEDficas da vida: dinheiro, dire\xE7\xE3o, trabalho e relacionamentos aparecem repetidamente nos estudos como pontos de maior preju\xEDzo. Isso n\xE3o \xE9 acaso \u2014 s\xE3o exatamente as \xE1reas que mais exigem planejamento, mem\xF3ria de trabalho e controle de impulso sustentados no tempo.", source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 5" },
    { text: "TDAH tem base neurobiol\xF3gica identific\xE1vel: estudos de neuroimagem mostram matura\xE7\xE3o cortical cerca de tr\xEAs anos mais lenta e menor ativa\xE7\xE3o de redes cerebrais frontais respons\xE1veis por aten\xE7\xE3o e controle. N\xE3o \xE9 uma met\xE1fora \u2014 \xE9 um atraso mensur\xE1vel no desenvolvimento de circuitos espec\xEDficos.", source: "Tratado IACAPAP, cap. D.1 \u2014 Neurobiologia" },
    { text: "Os sistemas de dopamina e noradrenalina \u2014 neurotransmissores ligados a motiva\xE7\xE3o, recompensa e aten\xE7\xE3o \u2014 funcionam de forma diferente no c\xE9rebro com TDAH. \xC9 por isso que estimulantes, que atuam diretamente nesses sistemas, costumam ter efeito t\xE3o espec\xEDfico sobre os sintomas centrais.", source: "Tratado IACAPAP, cap. D.1 \u2014 Neurobiologia" },
    { text: "Nenhum exame de imagem ou biomarcador isolado confirma ou descarta TDAH \u2014 o diagn\xF3stico continua sendo cl\xEDnico, baseado em entrevista, hist\xF3rico e relatos de m\xFAltiplas fontes. Achados de neuroimagem ajudam a entender o transtorno, n\xE3o a diagnostic\xE1-lo individualmente.", source: "Tratado IACAPAP, cap. D.1 \u2014 Diagn\xF3stico" },
    { text: 'Antes de fechar um diagn\xF3stico de TDAH em crian\xE7a, vale considerar se ela n\xE3o \xE9 simplesmente uma das mais novas da turma: crian\xE7as relativamente mais imaturas por diferen\xE7a de idade dentro do mesmo ano escolar s\xE3o identificadas com TDAH com mais frequ\xEAncia \u2014 o chamado efeito de "imaturidade relativa".', source: "Tratado IACAPAP, cap. D.1 \u2014 Diagn\xF3stico diferencial" },
    { text: "Trauma e neglig\xEAncia podem produzir sintomas parecidos com os do TDAH \u2014 desaten\xE7\xE3o, agita\xE7\xE3o, dificuldade de regula\xE7\xE3o \u2014 sem que o transtorno esteja presente. Diferenciar exige olhar a hist\xF3ria de vida e o contexto, n\xE3o s\xF3 a lista de sintomas atuais.", source: "Tratado IACAPAP, cap. D.1 \u2014 Diagn\xF3stico diferencial" },
    { text: "TDAH n\xE3o tratado est\xE1 associado a maior risco de acidentes, uso de subst\xE2ncias e at\xE9 mortalidade precoce \u2014 mas o mesmo corpo de pesquisa mostra que tratamento adequado reduz esses riscos de forma mensur\xE1vel, incluindo menos acidentes de tr\xE2nsito e menor risco de suic\xEDdio.", source: "Tratado IACAPAP, cap. D.1 \u2014 Curso e progn\xF3stico" },
    { text: "Nem tudo no TDAH \xE9 d\xE9ficit: a literatura tamb\xE9m aponta tra\xE7os associados a maior toler\xE2ncia a risco, criatividade e perfil empreendedor em alguns adultos com o transtorno. Reconhecer isso n\xE3o substitui o tratamento das dificuldades, mas ajuda a formar uma imagem mais completa e menos s\xF3 negativa de si.", source: "Tratado IACAPAP, cap. D.1 \u2014 Curso e progn\xF3stico" },
    { text: "TDAH em idosos existe e \xE9 frequentemente subdiagnosticado: a preval\xEAncia estimada em pessoas com 50 anos ou mais gira em torno de 1,5%, e sintomas de mem\xF3ria e desorganiza\xE7\xE3o \xE0s vezes s\xE3o confundidos com outros quadros pr\xF3prios da idade. \xC9 um transtorno que atravessa toda a vida, n\xE3o uma condi\xE7\xE3o s\xF3 de inf\xE2ncia ou juventude.", source: "Cartilha ABP/Alexa \u2014 Epidemiologia" },
    { text: "A propor\xE7\xE3o de diagn\xF3stico entre homens e mulheres gira em torno de 2,5 para 1 na preval\xEAncia geral, mas essa diferen\xE7a fica bem maior nos consult\xF3rios \u2014 em amostras cl\xEDnicas a raz\xE3o sobe para uma m\xE9dia de 6 para 1. Isso sugere que meninas e mulheres com TDAH s\xE3o subidentificadas, provavelmente porque apresentam menos hiperatividade vis\xEDvel e mais sintomas internos, silenciosos.", source: "Cartilha ABP/Alexa \u2014 Diferen\xE7as de g\xEAnero \xB7 Manual Barkley, cap. 2" },
    { text: 'Meninas com TDAH tendem a mostrar menos comportamento de oposi\xE7\xE3o e agita\xE7\xE3o vis\xEDvel do que meninos, o que atrasa o encaminhamento para avalia\xE7\xE3o. O sintoma menos "barulhento" n\xE3o significa menos preju\xEDzo \u2014 s\xF3 significa que passa mais despercebido.', source: "Manual Barkley, cap. 2 \u2014 Diferen\xE7as de g\xEAnero" },
    { text: "\xC9 mito que TDAH seja causado por m\xE1 cria\xE7\xE3o, excesso de tela ou a\xE7\xFAcar \u2014 a herdabilidade gen\xE9tica do transtorno gira entre 70 e 90%, uma das mais altas entre os transtornos psiqui\xE1tricos. Fatores ambientais t\xEAm papel mediado e secund\xE1rio, n\xE3o causal isolado.", source: "Cartilha ABP/Alexa \u2014 Mitos desmontados \xB7 Tratado IACAPAP, cap. D.1 \u2014 Etiologia" },
    { text: "\xC9 mito que medica\xE7\xE3o para TDAH aumente o risco de uso de drogas no futuro \u2014 estudos mostram justamente o oposto: tratamento adequado com estimulantes est\xE1 associado a um efeito protetor contra abuso de subst\xE2ncias mais tarde na vida.", source: "Manual Barkley, cap. 17 (Estimulantes) \xB7 Cartilha ABP/Alexa \u2014 Mitos desmontados" },
    { text: "TDAH tamb\xE9m tem hist\xF3rico familiar frequente entre os pais: pesquisas mostram maior preval\xEAncia do pr\xF3prio transtorno e de outros quadros psiqui\xE1tricos nos pais de crian\xE7as com TDAH. Isso ajuda a explicar por que o manejo em casa \xE0s vezes precisa considerar as dificuldades executivas de mais de uma pessoa na fam\xEDlia ao mesmo tempo.", source: "Manual Barkley, cap. 4 (Comorbidades, Adapta\xE7\xE3o Familiar e Subtipos)" },
    { text: 'No livro "Vencendo o TDAH Adulto", tratar o pr\xF3prio TDAH \xE9 descrito como o primeiro passo antes de tentar aplicar qualquer estrat\xE9gia de parentalidade \u2014 um adulto com fun\xE7\xF5es executivas sobrecarregadas tem menos recursos dispon\xEDveis para sustentar regras e rotina com os filhos.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 5 \u2014 Paternidade/Maternidade" },
    { text: 'A Regra 5 das oito regras cotidianas de Barkley e Benton \xE9 "considere o futuro": antecipar concretamente, com detalhes sensoriais, a sensa\xE7\xE3o de j\xE1 ter terminado a tarefa. Esse exerc\xEDcio mental usa a emo\xE7\xE3o como combust\xEDvel motivacional, driblando a miopia temporal do TDAH.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 4 \u2014 Regra 5" },
    { text: 'A Regra 6 do mesmo livro prop\xF5e "decompor o futuro e torn\xE1-lo significativo": fragmentar tarefas grandes em blocos pequenos, com algu\xE9m acompanhando o progresso e recompensa logo ap\xF3s cada etapa conclu\xEDda \u2014 porque recompensa distante tem pouco poder de mover um c\xE9rebro com TDAH.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 4 \u2014 Regra 6" },
    { text: "Segundo Barkley e Benton, revelar o diagn\xF3stico de TDAH no ambiente de trabalho s\xF3 costuma valer a pena quando \xE9 necess\xE1rio para conseguir adapta\xE7\xF5es formais \u2014 a decis\xE3o de contar ou n\xE3o \xE9 estrat\xE9gica, n\xE3o uma obriga\xE7\xE3o moral.", source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 5 \u2014 Trabalho" },
    { text: 'Cerca de tr\xEAs em cada quatro pessoas respondem bem j\xE1 \xE0 primeira medica\xE7\xE3o estimulante testada, segundo o livro "Vencendo o TDAH Adulto" \u2014 mas o ajuste de dose \xE9 descrito como processo gradual e monitorado, n\xE3o algo que se acerta de uma vez.', source: "Vencendo o TDAH Adulto (Barkley & Benton), Passo 3 \u2014 Medica\xE7\xE3o" },
    { text: "TDAH em crian\xE7as e TDAH em adultos n\xE3o s\xE3o o mesmo quadro cl\xEDnico observado em espelho: o transtorno tem uma trajet\xF3ria pr\xF3pria, passando por fases distintas da pr\xE9-escola \xE0 idade adulta, com sintomas que mudam de forma sem necessariamente diminuir de impacto.", source: "Manual Barkley, cap. 6 (Curso evolutivo)" },
    { text: "O modelo do livro descreve o TDAH como um freio (inibi\xE7\xE3o comportamental) mais fraco, que compromete quatro fun\xE7\xF5es executivas \u2014 a mem\xF3ria visual do tempo, a voz interna, o controle emocional e a capacidade de planejar. Entender essas quatro pe\xE7as ajuda a enxergar o TDAH como um problema de desempenho no momento certo, n\xE3o de conhecimento.", source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'TDAH n\xE3o \xE9 falta de saber o que fazer \u2014 \xE9 "miopia temporal": dificuldade de organizar o presente em fun\xE7\xE3o de uma consequ\xEAncia que s\xF3 vai aparecer no futuro. Por isso instru\xE7\xE3o e bom senso raramente bastam sozinhos.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: "A Regra 1 do livro \xE9 simples de enunciar e dif\xEDcil de praticar: pare a a\xE7\xE3o antes de agir ou falar. Respirar, repetir o que o outro acabou de dizer ou desacelerar a pr\xF3pria fala j\xE1 cria a pausa que o freio natural n\xE3o oferece sozinho.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: "A Regra 2 prop\xF5e olhar para tr\xE1s antes de decidir: buscar na mem\xF3ria uma situa\xE7\xE3o parecida j\xE1 vivida serve de b\xFAssola para prever o que provavelmente vai acontecer agora. Sem esse olhar deliberado para o passado, cada decis\xE3o nasce do zero.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: "A Regra 3 pede para colocar em palavras \u2014 inclusive em voz alta, mesmo sozinho \u2014 o que foi visualizado sobre o passado e o futuro, extraindo dali uma regra pr\xE1tica para o momento. Verbalizar \xE9 o que transforma uma lembran\xE7a vaga em orienta\xE7\xE3o de a\xE7\xE3o.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: "A Regra 4 \xE9 exteriorizar as informa\xE7\xF5es fundamentais: lembretes f\xEDsicos exatamente onde ser\xE3o precisos, e um caderno ou di\xE1rio sempre \xE0 m\xE3o. A informa\xE7\xE3o que existe s\xF3 na cabe\xE7a \xE9 a que mais escapa em um c\xE9rebro com TDAH.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: "A Regra 5 sugere antecipar emocionalmente a sensa\xE7\xE3o de j\xE1 ter terminado a tarefa, usando essa sensa\xE7\xE3o como combust\xEDvel para come\xE7ar agora. Sentir o al\xEDvio da conclus\xE3o antes de fazer o trabalho ajuda a competir com a recompensa imediata de adiar.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: "A Regra 6 orienta fragmentar o futuro em blocos pequenos e significativos, com presta\xE7\xE3o de contas a outra pessoa e recompensa logo depois de cada etapa conclu\xEDda \u2014 n\xE3o s\xF3 ao final do projeto inteiro.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: "A Regra 7 defende tornar os problemas externos, f\xEDsicos e manuais: post-its, quadros, fichas \u2014 qualquer ferramenta que tire o problema de dentro da cabe\xE7a e o coloque em algo que se possa ver e manusear.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: "A Regra 8 \xE9 ter senso de humor: reconhecer o erro, explicar o que aconteceu, pedir desculpas quando cabe e seguir em frente, sem nega\xE7\xE3o nem culpa excessiva. Humor autodepreciativo saud\xE1vel \xE9 tratado como ferramenta de manejo, n\xE3o como fraqueza.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: "Na educa\xE7\xE3o, o livro recomenda t\xE9cnicas como a leitura SQ4R e gravar aulas \u2014 formas de exteriorizar e refor\xE7ar o que a mem\xF3ria de trabalho verbal sozinha n\xE3o sustenta. Um mentor com check-ins curtos e di\xE1rios tamb\xE9m substitui, de fora, a autorregula\xE7\xE3o que falta por dentro.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o" },
    { text: "No trabalho, escolher carreira e ambiente compat\xEDveis com o pr\xF3prio perfil pesa tanto quanto qualquer t\xE9cnica de organiza\xE7\xE3o. Reduzir distra\xE7\xF5es no espa\xE7o f\xEDsico e contar com um mentor no trabalho s\xE3o adapta\xE7\xF5es discretas que fazem diferen\xE7a real.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: "Revelar o diagn\xF3stico de TDAH no trabalho \xE9 uma escolha, n\xE3o uma obriga\xE7\xE3o \u2014 o livro recomenda fazer isso apenas quando for necess\xE1rio para conseguir uma adapta\xE7\xE3o formal, n\xE3o como exposi\xE7\xE3o autom\xE1tica.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: "Em dinheiro, a recomenda\xE7\xE3o central \xE9 automatizar o que puder \u2014 pagamentos autom\xE1ticos, or\xE7amento vis\xEDvel \u2014 e considerar usar dinheiro f\xEDsico em vez de cart\xE3o, porque o f\xEDsico torna o gasto mais concreto e mais f\xE1cil de sentir na hora.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: "Em casos financeiros mais graves, delegar a administra\xE7\xE3o do dinheiro a outra pessoa n\xE3o \xE9 fracasso \u2014 \xE9 reconhecer que algumas fun\xE7\xF5es executivas comprometidas pedem apoio externo permanente, assim como \xF3culos para quem n\xE3o enxerga bem de longe.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: "Em relacionamentos, sintomas de TDAH \u2014 esquecer, interromper, se distrair no meio de uma conversa \u2014 costumam ser mal-interpretados pelo outro como desinteresse ou grosseria. Nomear o que \xE9 sintoma ajuda o casal a discutir o problema real em vez de brigar por uma leitura errada de inten\xE7\xE3o.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos" },
    { text: 'Tratar o pr\xF3prio TDAH melhora o relacionamento n\xE3o por acaso: menos impulsividade e mais previsibilidade tiram do parceiro o papel de "lembrete ambulante" e devolvem espa\xE7o para a rela\xE7\xE3o em si.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos" },
    { text: "Na paternidade e maternidade, o primeiro passo recomendado pelo livro \xE9 tratar o pr\xF3prio TDAH \u2014 \xE9 dif\xEDcil sustentar rotina e regras para os filhos enquanto a autorregula\xE7\xE3o do adulto tamb\xE9m est\xE1 comprometida.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Paternidade/Maternidade" },
    { text: "Regras familiares vis\xEDveis, combinadas previamente entre os pais, e um timer para checagem peri\xF3dica dos filhos aplicam o mesmo princ\xEDpio das 8 Regras \xE0 vida em casa: externalizar o que a mem\xF3ria n\xE3o sustenta sozinha.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Paternidade/Maternidade" },
    { text: "Na dire\xE7\xE3o, o livro \xE9 categ\xF3rico: nunca dirigir sem a medica\xE7\xE3o em efeito e zero \xE1lcool, porque a combina\xE7\xE3o de impulsividade e menor controle do freio comportamental eleva diretamente o risco de acidente.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o" },
    { text: 'Bloquear o celular ao dirigir e usar um lembrete f\xEDsico para o cinto de seguran\xE7a s\xE3o exemplos de como transformar uma boa inten\xE7\xE3o ("vou prestar aten\xE7\xE3o") em uma barreira f\xEDsica que n\xE3o depende de lembrar na hora.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o" },
    { text: "Mais de 80% dos adultos com TDAH t\xEAm ao menos uma comorbidade \u2014 transtorno opositor, transtorno de conduta, ansiedade ou depress\xE3o. O livro \xE9 claro: tratar s\xF3 o TDAH e ignorar a comorbidade deixa parte do sofrimento sem resposta.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Comorbidades" },
    { text: "Cerca de 75% das pessoas respondem bem j\xE1 ao primeiro estimulante testado, mas o ajuste de dose \xE9 um processo gradual e monitorado, n\xE3o um resultado imediato. Esperar acerto de primeira tende a gerar frustra\xE7\xE3o desnecess\xE1ria.", source: "Vencendo o TDAH Adulto, Passo 3" },
    { text: "O livro usa crit\xE9rios de avalia\xE7\xE3o mais rigorosos que o DSM-IV para adultos: sintomas presentes em tr\xEAs \xE1reas (aten\xE7\xE3o/persist\xEAncia, controle de impulsos, atividade excessiva), in\xEDcio antes dos 12 anos, e preju\xEDzo em m\xFAltiplos dom\xEDnios da vida \u2014 n\xE3o bastam sintomas isolados em um \xFAnico contexto.", source: "Vencendo o TDAH Adulto, Passo 1" },
    { text: "As cinco \xE1reas problem\xE1ticas do dia a dia listadas no livro s\xE3o gest\xE3o de tempo/metas, organiza\xE7\xE3o e mem\xF3ria operacional, autodisciplina/impulsividade, automotiva\xE7\xE3o e concentra\xE7\xE3o/prontid\xE3o. Reconhecer em qual dessas \xE1reas a dificuldade pesa mais ajuda a escolher a regra certa para aplicar primeiro.", source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'A mem\xF3ria de trabalho verbal \u2014 a "voz da mente" \u2014 \xE9 o que permite formular regras pr\xF3prias e manter a autoconversa que guia o comportamento. Quando ela \xE9 fraca, falar em voz alta o que se pretende fazer supre, de fora, o que essa voz interna n\xE3o sustenta sozinha.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: 'A mem\xF3ria de trabalho n\xE3o verbal \u2014 o "olho da mente" \u2014 \xE9 a capacidade de visualizar mentalmente o passado e o futuro. Sem ela funcionando bem, prever consequ\xEAncias vira um exerc\xEDcio abstrato em vez de algo que se "v\xEA" antes de agir.', source: "Vencendo o TDAH Adulto, Passo 2" },
    { text: "Dificuldades de comunica\xE7\xE3o no TDAH t\xEAm raiz espec\xEDfica: mem\xF3ria de trabalho verbal fraca dificulta achar as palavras e manter uma sequ\xEAncia l\xF3gica ao explicar algo, enquanto planejamento fraco dificulta organizar ideias complexas na fala. N\xE3o \xE9 falta de intelig\xEAncia, \xE9 uma engrenagem executiva espec\xEDfica.", source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: "Repetir o que o interlocutor acabou de dizer antes de responder ganha tempo para organizar a resposta e ao mesmo tempo aplica a Regra 1 (pausa) e a Regra 3 (verbalizar) na pr\xE1tica de uma conversa real.", source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: "Tomar notas ativamente durante uma reuni\xE3o n\xE3o serve s\xF3 para lembrar depois \u2014 serve para manter o foco no momento presente, porque escrever exige um tipo de aten\xE7\xE3o que sustenta a aten\xE7\xE3o auditiva sozinha.", source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: "O livro trata as 8 Regras como um conjunto interligado, n\xE3o uma lista de escolha \xFAnica: pausar (Regra 1) sem depois visualizar o passado (Regra 2) e verbalizar uma conclus\xE3o (Regra 3) deixa a pausa sem dire\xE7\xE3o nenhuma para seguir.", source: "Vencendo o TDAH Adulto, Passo 4" },
    { text: "Antes de qualquer regra pr\xE1tica, o Passo 2 do livro insiste em conhecer e aceitar o pr\xF3prio TDAH como ele \xE9 \u2014 negar o diagn\xF3stico ou minimizar o impacto das fun\xE7\xF5es executivas comprometidas tende a atrasar a busca por estrat\xE9gias que realmente ajudam.", source: "Vencendo o TDAH Adulto, Passo 2" }
  ];
  function principleForDate(date) {
    var d = date || /* @__PURE__ */ new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    var dayOfYear = Math.floor(diff / 864e5);
    var index = (dayOfYear - 1) % PRINCIPLES.length;
    return PRINCIPLES[index];
  }

  // src/exercises.js
  var EXERCISES = [
    { text: 'Antes de abrir qualquer aplicativo hoje, escreva \xE0 m\xE3o em um papel vis\xEDvel as 3 tarefas mais importantes do dia \u2014 n\xE3o mais que 3. Externalizar a prioridade compensa a dificuldade de manter isso "na cabe\xE7a".', source: "Manual Barkley, cap. 7 (externaliza\xE7\xE3o)" },
    { text: 'Escolha uma tarefa que voc\xEA vem adiando e divida-a em pelo menos 4 passos bem pequenos, cada um com verbo de a\xE7\xE3o ("abrir o documento", "escrever o primeiro par\xE1grafo"). Passos pequenos e concretos s\xE3o mais f\xE1ceis de iniciar.', source: "Manual Barkley, cap. 7 (planejamento)" },
    { text: 'Configure um timer vis\xEDvel (celular, rel\xF3gio, ou at\xE9 um copo com \xE1gua) para uma tarefa que voc\xEA vai fazer agora. Ver o tempo passando substitui o "sentido de tempo" interno que costuma falhar no TDAH.', source: "Manual Barkley, cap. 7 (percep\xE7\xE3o de tempo)" },
    { text: "Quando sentir vontade de responder algo com raiva ou impulsividade hoje, conte at\xE9 10 antes de agir ou espere ler de novo depois de 5 minutos. A pausa \xE9 um substituto externo para a inibi\xE7\xE3o que n\xE3o vem automaticamente.", source: "Manual Barkley, cap. 7 (inibi\xE7\xE3o comportamental)" },
    { text: 'Escolha um objeto que voc\xEA usa todos os dias (chaves, carteira, \xF3culos) e defina um \xFAnico lugar fixo para ele. Deixe-o l\xE1 hoje mesmo. Um "lar" fixo reduz a carga de mem\xF3ria para lembrar onde as coisas est\xE3o.', source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: "Ao terminar uma tarefa hoje, d\xEA a si mesmo uma recompensa pequena e imediata (um caf\xE9, 5 minutos de algo que gosta) antes de passar para a pr\xF3xima. Recompensa atrasada tem pouco efeito \u2014 o refor\xE7o precisa ser r\xE1pido.", source: "Manual Barkley, cap. 12 (refor\xE7o imediato)" },
    { text: 'Escolha uma transi\xE7\xE3o do seu dia (sair de casa, come\xE7ar a trabalhar, ir dormir) e crie um alerta sonoro ou visual 10 minutos antes dela. Transi\xE7\xF5es s\xE3o pontos de risco de "travar"; um aviso externo ajuda a se preparar.', source: "Manual Barkley, cap. 7 (transi\xE7\xE3o de tarefas)" },
    { text: "Antes de come\xE7ar a trabalhar hoje, guarde fisicamente (numa gaveta, outro c\xF4modo) uma fonte de distra\xE7\xE3o espec\xEDfica. Reduzir est\xEDmulos concorrentes no ambiente \xE9 mais eficaz do que s\xF3 confiar na for\xE7a de vontade.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Escolha uma tarefa chata de hoje e diga em voz alta, para si mesmo, o pr\xF3ximo passo antes de faz\xEA-lo. Verbalizar o passo imita a "fala interna" que orienta o comportamento e que costuma ser menos eficaz no TDAH.', source: "Manual Barkley, cap. 3 (autoconversa/fala internalizada)" },
    { text: "Hoje, ao perceber que est\xE1 enrolando com uma tarefa, anote a hora em que come\xE7ou a enrolar e a hora em que efetivamente come\xE7ou. S\xF3 observar essa diferen\xE7a j\xE1 ajuda a construir no\xE7\xE3o real de tempo, sem se julgar.", source: "Manual Barkley, cap. 7 (percep\xE7\xE3o de tempo)" },
    { text: "Escolha um compromisso que costuma esquecer e cadastre agora um alarme ou lembrete com o texto exato do que fazer. Lembretes autom\xE1ticos substituem a mem\xF3ria prospectiva, um ponto fraco comum no TDAH.", source: "Cartilha ABP/Alexa (recursos tecnol\xF3gicos de suporte)" },
    { text: "Antes de dormir hoje, deixe vis\xEDvel, perto da porta, os itens que precisa levar amanh\xE3. Preparar \xE0 noite tira a decis\xE3o de cima da manh\xE3, quando a autorregula\xE7\xE3o costuma estar mais fragilizada.", source: "Manual Barkley, cap. 7 (externaliza\xE7\xE3o)" },
    { text: "Se hoje voc\xEA perceber que est\xE1 prestes a interromper algu\xE9m no meio da fala, tente segurar por 3 segundos antes de falar. Esse intervalo \xE9 treino direto de inibi\xE7\xE3o de resposta.", source: "Manual Barkley, cap. 7 (inibi\xE7\xE3o comportamental)" },
    { text: "Escolha uma tarefa longa e use um bloco curto de tempo (15\u201325 minutos) com um intervalo garantido depois. Blocos curtos com pausa reduzem a fadiga da aten\xE7\xE3o sustentada, que se esgota mais r\xE1pido no TDAH.", source: "Manual Barkley, cap. 7 (aten\xE7\xE3o sustentada)" },
    { text: 'Hoje, ao sentir uma emo\xE7\xE3o forte, nomeie-a em voz alta ou por escrito ("estou irritado porque isso demorou") antes de reagir. Nomear a emo\xE7\xE3o ativa uma pausa entre sentir e agir.', source: "Manual Barkley, cap. 7 (autorregula\xE7\xE3o emocional)" },
    { text: 'Escolha um c\xF4modo ou mesa de trabalho e remova, s\xF3 por hoje, tudo que n\xE3o \xE9 necess\xE1rio para a tarefa atual. Menos objetos no campo visual, menos "ganchos" para a aten\xE7\xE3o sair do lugar.', source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Antes de sair de casa hoje, fa\xE7a uma checagem verbal em voz alta dos itens essenciais ("chave, carteira, celular"). Rotinas verbais fixas reduzem esquecimentos recorrentes sem exigir mem\xF3ria perfeita.', source: "Manual Barkley, cap. 3 (autoconversa)" },
    { text: 'Escolha uma tarefa chata e negocie consigo mesmo um "custo" se n\xE3o a fizer at\xE9 um hor\xE1rio combinado (ex: n\xE3o checar redes sociais at\xE9 terminar). Perder algo de valor costuma motivar mais do que s\xF3 "tentar lembrar".', source: "Manual Barkley, cap. 12 (custo de resposta)" },
    { text: "Hoje, ao acordar, evite checar o celular nos primeiros 10 minutos e escreva uma frase sobre como quer que o dia comece. Adiar o est\xEDmulo mais absorvente do dia d\xE1 espa\xE7o para autorregula\xE7\xE3o antes da sobrecarga.", source: "Manual Barkley, cap. 7 (autorregula\xE7\xE3o)" },
    { text: 'Escolha uma tarefa que voc\xEA tende a fazer de forma impulsiva e escreva 2 linhas antes de come\xE7ar: "o que eu quero no final" e "primeiro passo". Isso \xE9 um exerc\xEDcio direto de planejamento.', source: "Manual Barkley, cap. 7 (planejamento)" },
    { text: 'Se hoje surgir um pensamento do tipo "eu devia conseguir fazer isso sem ajuda", anote-o e responda por escrito com um fato: TDAH tem base neurobiol\xF3gica, n\xE3o \xE9 falta de esfor\xE7o. Contestar o mito por escrito ajuda a lembrar que isso n\xE3o \xE9 uma falha pessoal.', source: "Manual Barkley, cap. 5 \xB7 Cartilha ABP/Alexa" },
    { text: 'Escolha um hor\xE1rio fixo para dormir hoje e configure um alarme "hora de desligar telas" 30 minutos antes. Sono irregular piora diretamente aten\xE7\xE3o e controle de impulsos no dia seguinte.', source: "Manual Barkley, cap. 3 (sono e TDAH)" },
    { text: "Hoje, ao iniciar uma tarefa, deixe vis\xEDvel s\xF3 o material daquela tarefa espec\xEDfica na mesa. Reduzir pistas de outras tarefas evita a troca constante de foco.", source: "Manual Barkley, cap. 7 (controle de est\xEDmulos)" },
    { text: "Escolha uma pessoa (parceiro, amigo, familiar, colega) e pe\xE7a a ela para te lembrar de um compromisso espec\xEDfico hoje. Apoio social como lembrete externo \xE9 uma forma leg\xEDtima de compensar d\xE9ficits de mem\xF3ria.", source: "Cartilha ABP/Alexa (apoio social no manejo)" },
    { text: 'Se hoje voc\xEA perceber que uma tarefa est\xE1 tomando muito mais tempo do que devia, pare e pergunte por escrito: "isso ainda \xE9 necess\xE1rio ou eu travei em detalhe?". Essa pausa quebra o padr\xE3o de aten\xE7\xE3o presa numa tarefa que engancha ("hiperfoco", termo n\xE3o usado literalmente pelas fontes, mas o padr\xE3o de aten\xE7\xE3o vari\xE1vel conforme motiva\xE7\xE3o \xE9 descrito no Cap. 7).', source: "Manual Barkley, cap. 7 (persist\xEAncia voltada a objetivos)" },
    { text: 'Escolha uma meta pequena de hoje e, assim que cumprir, marque com um "X" vis\xEDvel em um papel ou aplicativo. Ver o progresso registrado d\xE1 um refor\xE7o visual imediato que a mente por si s\xF3 n\xE3o ret\xE9m bem.', source: "Manual Barkley, cap. 12 (refor\xE7o visual)" },
    { text: 'Antes de uma reuni\xE3o, compromisso ou conversa importante hoje, escreva 2 ou 3 pontos que quer lembrar de dizer. Isso externaliza o "roteiro mental" que costuma se perder no meio da fala espont\xE2nea.', source: "Manual Barkley, cap. 3 (mem\xF3ria de trabalho verbal)" },
    { text: 'Hoje, ao sentir o impulso de come\xE7ar uma tarefa nova antes de terminar a atual, escreva a nova ideia numa lista de "depois" em vez de trocar de tarefa na hora. A lista captura o impulso sem exigir for\xE7a de vontade.', source: "Manual Barkley, cap. 7 (inibi\xE7\xE3o comportamental)" },
    { text: "Escolha um momento do dia para se mover fisicamente por 5 minutos (caminhar, alongar, subir escada) antes de uma tarefa que exige concentra\xE7\xE3o. Atividade f\xEDsica breve ajuda a regular o estado de alerta.", source: "Manual Barkley, cap. 7 (regula\xE7\xE3o do estado de alerta)" },
    { text: "Hoje, ao terminar o dia, escreva uma coisa que deu certo, mesmo pequena \u2014 n\xE3o o que faltou fazer. Fechar o dia notando progresso contraria o vi\xE9s de autocr\xEDtica comum em quem convive com TDAH h\xE1 anos.", source: "Manual Barkley, cap. 3 (autoestima e hist\xF3rico de vida)" },
    { text: "Escolha uma regra ou combinado que voc\xEA tem com algu\xE9m e, hoje, transforme-a em um lembrete visual f\xEDsico (post-it, cartaz, nota na porta) em vez de depender de lembrar sozinho. Regras vis\xEDveis no ambiente funcionam melhor.", source: "Manual Barkley, cap. 7 \xB7 Cartilha ABP/Alexa" },
    { text: 'Hoje, ao sentir vontade de responder no calor do momento (mensagem, e-mail, discuss\xE3o), pare fisicamente por 3 segundos antes de agir: respire fundo uma vez e s\xF3 depois decida. Regra 1 de "Vencendo o TDAH Adulto" (Passo 4) \u2014 criar uma pausa f\xEDsica \xE9 o substituto externo do freio que n\xE3o vem automaticamente.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Antes de responder a uma pergunta dif\xEDcil hoje, repita em voz baixa o que a outra pessoa disse antes de formular sua resposta. Repetir ganha tempo e ativa a Regra 1 (Pare a a\xE7\xE3o) de "Vencendo o TDAH Adulto" na comunica\xE7\xE3o.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Escolha uma situa\xE7\xE3o de hoje em que voc\xEA normalmente reagiria r\xE1pido demais (dirigir, discutir, decidir uma compra) e treine falar mais devagar de prop\xF3sito, mesmo que pare\xE7a estranho. "Vencendo o TDAH Adulto" descreve falar mais devagar como t\xE9cnica pr\xE1tica da Regra 1 para criar espa\xE7o de inibi\xE7\xE3o.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Hoje, antes de mandar aquela mensagem ou e-mail que voc\xEA escreveu com raiva, deixe o rascunho salvo e releia s\xF3 depois de 15 minutos. Regra 1 (Pare a a\xE7\xE3o) de "Vencendo o TDAH Adulto": o intervalo f\xEDsico entre impulso e a\xE7\xE3o \xE9 o que falta naturalmente no TDAH.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Escolha um momento hoje em que perceber tens\xE3o subindo numa conversa e proponha uma pausa de verdade ("posso te responder em 5 minutos?") em vez de continuar no autom\xE1tico. A Regra 1 trata a pausa como ferramenta ativa, n\xE3o como fraqueza.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Antes de tomar uma decis\xE3o de compra hoje (mesmo pequena), pare e conte at\xE9 10 olhando para o produto antes de decidir. Aplica\xE7\xE3o direta da Regra 1 de "Vencendo o TDAH Adulto" ao consumo impulsivo.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Hoje, ao dirigir, treine uma pausa deliberada de 1 segundo antes de acelerar em um sinal amarelo ou entrar numa vaga apertada. "Vencendo o TDAH Adulto" (Passo 5, Dire\xE7\xE3o) recomenda usar a Regra 1 especificamente no tr\xE2nsito, onde a impulsividade tem custo mais alto.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o (Regra 1)" },
    { text: 'Escolha uma tarefa nova que te chamou aten\xE7\xE3o hoje e, antes de come\xE7\xE1-la, pare e pergunte: "isso \xE9 mais importante que o que eu j\xE1 estava fazendo?". A Regra 1 existe para interromper o piloto autom\xE1tico antes que ele te desvie do plano.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 1" },
    { text: 'Antes de decidir algo hoje (uma resposta, uma compra, uma tarefa nova), pare 30 segundos e lembre de uma vez em que uma decis\xE3o parecida deu certo ou errado. Regra 2 de "Vencendo o TDAH Adulto" \u2014 olhar para o passado antes de agir compensa a fraqueza da mem\xF3ria de trabalho n\xE3o-verbal (o "olho da mente").', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: "Escolha uma situa\xE7\xE3o de hoje parecida com algo que voc\xEA j\xE1 viveu antes (uma reuni\xE3o, um conflito, uma tarefa complexa) e escreva 2 linhas lembrando como foi da \xFAltima vez, antes de agir de novo. Isso treina diretamente a fun\xE7\xE3o de mem\xF3ria de trabalho n\xE3o-verbal descrita no Cap. 7 do Manual Barkley.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: 'Antes de se comprometer com algo hoje, imagine concretamente como voc\xEA vai se sentir daqui a 1 hora fazendo aquilo. Regra 2 (olhar para o futuro) de "Vencendo o TDAH Adulto" usa visualiza\xE7\xE3o para compensar a "cegueira temporal" descrita no modelo de Barkley.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: 'Escolha uma tarefa chata de hoje e, antes de come\xE7ar, visualize por 30 segundos como vai se sentir quando ela estiver pronta. "Considere o futuro" (Regra 5) usa a sensa\xE7\xE3o antecipada de al\xEDvio como combust\xEDvel motivacional.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Hoje, antes de uma decis\xE3o importante, pergunte a si mesmo em voz alta: "da \xFAltima vez que fiz algo parecido, o que funcionou e o que n\xE3o funcionou?". Regra 2 de "Vencendo o TDAH Adulto" transforma a experi\xEAncia passada em crit\xE9rio ativo de decis\xE3o, j\xE1 que ela n\xE3o vem \xE0 mente sozinha.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: "Escolha algo que voc\xEA vai fazer amanh\xE3 e, hoje \xE0 noite, imagine em detalhe como ser\xE1 o momento de terminar essa tarefa amanh\xE3. Visualizar o futuro conclu\xEDdo (Regra 2/5) compensa a mem\xF3ria de trabalho n\xE3o-verbal fraca que dificulta prever consequ\xEAncias.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2 e 5" },
    { text: 'Antes de recusar ou aceitar um convite hoje, pare e lembre de uma ocasi\xE3o parecida no passado \u2014 funcionou bem ou mal? Regra 2 de "Vencendo o TDAH Adulto": usar o passado como refer\xEAncia expl\xEDcita, n\xE3o deixar a decis\xE3o s\xF3 no impulso do momento.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 2" },
    { text: 'Escolha uma tarefa que voc\xEA vem evitando e diga em voz alta, sozinho, o que vai fazer e por qu\xEA, como se estivesse explicando para outra pessoa. Regra 3 ("Expresse o passado e o futuro") de "Vencendo o TDAH Adulto" usa a fala verbalizada para compensar a fraqueza da mem\xF3ria de trabalho verbal (a "voz da mente").', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: "Hoje, antes de uma tarefa complexa, narre em voz alta os passos que voc\xEA vai seguir, como se fosse um tutorial falado para si mesmo. Verbalizar o plano \xE9 a aplica\xE7\xE3o pr\xE1tica da Regra 3, que substitui a autoconversa interna que costuma falhar no TDAH.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: 'Escolha uma regra que voc\xEA quer seguir hoje ("vou checar e-mail s\xF3 3 vezes") e diga essa regra em voz alta para si mesmo antes de come\xE7ar o dia. Regra 3 de "Vencendo o TDAH Adulto" trata formular regras em voz alta como mais eficaz do que s\xF3 pens\xE1-las.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: "Depois de terminar uma tarefa hoje, fale em voz alta (ou grave um \xE1udio curto) o que funcionou e o que voc\xEA faria diferente da pr\xF3xima vez. Regra 3 transforma a experi\xEAncia em uma regra verbalizada expl\xEDcita, j\xE1 que a reflex\xE3o silenciosa tende a se perder.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: 'Antes de uma liga\xE7\xE3o ou conversa dif\xEDcil hoje, ensaie em voz alta, sozinho, o que voc\xEA quer dizer. "Vencendo o TDAH Adulto" liga isso \xE0 mem\xF3ria de trabalho verbal fraca: verbalizar antes ajuda a manter a sequ\xEAncia l\xF3gica na hora de falar de verdade.', source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o (Regra 3)" },
    { text: 'Escolha uma tarefa que exige planejamento hoje e narre para si mesmo, em voz alta, cada etapa antes de faz\xEA-la ("agora eu abro o arquivo, depois reviso o t\xEDtulo..."). Regra 3 substitui a fala interna que orienta a a\xE7\xE3o, ponto fraco descrito no Cap. 7 do Manual Barkley.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 3" },
    { text: 'Escolha um compromisso de amanh\xE3 e escreva um lembrete f\xEDsico (post-it, cart\xE3o) e coloque-o exatamente no lugar onde voc\xEA vai precisar dele (na porta, no volante, na tela do notebook). Regra 4 ("Exteriorize as informa\xE7\xF5es fundamentais") de "Vencendo o TDAH Adulto" \u2014 o lembrete precisa estar no ponto de a\xE7\xE3o, n\xE3o s\xF3 guardado num app.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: "Hoje, comece (ou retome) um caderno ou bloco de notas f\xEDsico que fique sempre com voc\xEA, e anote nele qualquer compromisso ou ideia importante assim que surgir. Regra 4 recomenda um di\xE1rio sempre \xE0 m\xE3o como externaliza\xE7\xE3o cont\xEDnua da mem\xF3ria de trabalho.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: 'Escolha uma informa\xE7\xE3o que voc\xEA tende a esquecer (senha de um sistema, medida de uma receita, hor\xE1rio de um rem\xE9dio) e cole um lembrete f\xEDsico vis\xEDvel exatamente onde voc\xEA vai us\xE1-la. "Vencendo o TDAH Adulto" enfatiza que o lembrete s\xF3 funciona se estiver no local certo, n\xE3o em qualquer lugar.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: 'Hoje, transforme uma regra combinada (com parceiro, filho ou equipe) em um cartaz ou nota f\xEDsica vis\xEDvel no ambiente, em vez de confiar s\xF3 na mem\xF3ria de todos. Regra 4 de "Vencendo o TDAH Adulto" aplicada a combinados familiares ou de trabalho.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: "Antes de sair para uma tarefa fora de casa hoje, escreva num papel os 3 itens ou informa\xE7\xF5es que n\xE3o pode esquecer e leve o papel com voc\xEA, n\xE3o s\xF3 na cabe\xE7a. Exteriorizar as informa\xE7\xF5es fundamentais (Regra 4) reduz a depend\xEAncia da mem\xF3ria de trabalho.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: "Escolha uma tarefa grande de hoje ou da semana e escreva, num s\xF3 papel vis\xEDvel, apenas o pr\xF3ximo passo concreto \u2014 n\xE3o a lista toda. Regra 4 recomenda deixar vis\xEDvel s\xF3 a informa\xE7\xE3o necess\xE1ria no momento certo, para n\xE3o sobrecarregar.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 4" },
    { text: 'Hoje, se voc\xEA tem uma reuni\xE3o ou compromisso importante, escreva os pontos-chave num cart\xE3o pequeno e mantenha-o vis\xEDvel durante a conversa. "Vencendo o TDAH Adulto" recomenda essa exterioriza\xE7\xE3o para compensar a mem\xF3ria de trabalho verbal na comunica\xE7\xE3o.', source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o (Regra 4)" },
    { text: 'Escolha uma tarefa grande que voc\xEA vem adiando e, antes de come\xE7ar, imagine e escreva uma frase sobre como vai se sentir ao finalmente termin\xE1-la. Regra 5 ("Considere o futuro") de "Vencendo o TDAH Adulto" usa a antecipa\xE7\xE3o emocional da conclus\xE3o como motiva\xE7\xE3o, j\xE1 que a recompensa distante normalmente n\xE3o motiva no TDAH.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Hoje, antes de uma tarefa chata, escreva por escrito a resposta para: "o que eu ganho de verdade quando isso estiver pronto?". Regra 5 transforma um benef\xEDcio abstrato e distante em algo concreto e sentido agora.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Escolha algo que voc\xEA tem evitado fazer por semanas e descreva por escrito, em detalhe, a cena de voc\xEA tendo terminado \u2014 o que vai sentir, o que vai poder fazer depois. "Considere o futuro" (Regra 5) usa a imagina\xE7\xE3o v\xEDvida como substituto do planejamento natural que falha no TDAH.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Antes de decidir gastar ou economizar hoje, imagine concretamente uma cena futura de usar (ou n\xE3o ter) esse dinheiro depois. "Vencendo o TDAH Adulto" (Passo 5, Dinheiro) aplica a Regra 5 diretamente a decis\xF5es financeiras.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro (Regra 5)" },
    { text: "Hoje, escolha uma meta de m\xE9dio prazo (semana ou m\xEAs) e escreva uma frase descrevendo a cena de t\xEA-la alcan\xE7ado, com o m\xE1ximo de detalhe sensorial poss\xEDvel. Regra 5 recomenda tornar o futuro v\xEDvido o suficiente para competir com a gratifica\xE7\xE3o imediata.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Escolha uma tarefa grande que est\xE1 te paralisando hoje e divida-a em pelo menos 5 blocos pequenos, cada um com um prazo pr\xF3prio, ainda que informal. Regra 6 ("Decomponha o futuro e o torne significativo") de "Vencendo o TDAH Adulto" \u2014 tarefas grandes de prazo distante n\xE3o geram a\xE7\xE3o no TDAH, s\xF3 blocos pequenos com prazo pr\xF3ximo geram.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: "Hoje, escolha uma etapa de uma tarefa maior e combine com algu\xE9m (colega, amigo, parceiro) que voc\xEA vai mostrar o resultado at\xE9 um hor\xE1rio espec\xEDfico. Regra 6 usa presta\xE7\xE3o de contas a terceiros como refor\xE7o externo para cumprir prazos intermedi\xE1rios.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: "Escolha uma tarefa longa de hoje e, a cada etapa conclu\xEDda, d\xEA a si mesmo algo bom na hora \u2014 um lanche, uma pausa, uma mensagem de parab\xE9ns a si mesmo. Regra 6 recomenda recompensa imediata a cada bloco pequeno, n\xE3o s\xF3 ao final do projeto inteiro.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: 'Hoje, pegue uma meta grande da semana e escreva-a como uma sequ\xEAncia de passos com prazo de horas, n\xE3o de dias. "Decomponha o futuro" (Regra 6) torna prazos distantes significativos ao aproxim\xE1-los da percep\xE7\xE3o imediata de tempo.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: 'Escolha uma tarefa de estudo ou trabalho longa hoje e defina, antes de come\xE7ar, um ponto de checagem no meio do caminho onde algu\xE9m vai perguntar como est\xE1 indo. "Vencendo o TDAH Adulto" (Passo 5, Estudo) recomenda parceiros de estudo com checagens frequentes como aplica\xE7\xE3o da Regra 6.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o (Regra 6)" },
    { text: "Hoje, escolha um projeto pessoal parado h\xE1 tempo e quebre s\xF3 a primeira semana dele em passos di\xE1rios bem pequenos, sem se preocupar ainda com o resto. Regra 6 foca em tornar significativo o pr\xF3ximo passo, n\xE3o o projeto inteiro de uma vez.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: 'Escolha um problema real que est\xE1 te incomodando hoje e escreva-o fisicamente num papel, com uma caneta, em vez de s\xF3 remo\xEA-lo mentalmente. Regra 7 ("Torne os problemas externos, f\xEDsicos e manuais") de "Vencendo o TDAH Adulto" \u2014 resolver mentalmente \xE9 mais dif\xEDcil no TDAH; colocar no papel ajuda a manipular a informa\xE7\xE3o de fora para dentro.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: "Hoje, use um quadro, post-its coloridos ou cart\xF5es f\xEDsicos para organizar as tarefas do dia, em vez de manter tudo s\xF3 na cabe\xE7a ou num app que voc\xEA n\xE3o olha. Regra 7 recomenda ferramentas visuais e manuais como extens\xE3o f\xEDsica do planejamento.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: 'Escolha uma decis\xE3o dif\xEDcil de hoje (duas op\xE7\xF5es concorrentes) e escreva fisicamente os pr\xF3s e contras de cada lado em colunas separadas no papel. Regra 7 de "Vencendo o TDAH Adulto" transforma um dilema mental em algo manipul\xE1vel fora da cabe\xE7a.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: "Hoje, ao organizar seu espa\xE7o de trabalho, use etiquetas f\xEDsicas ou cores para categorizar documentos ou tarefas, em vez de confiar s\xF3 em memorizar onde cada coisa est\xE1. Aplica\xE7\xE3o pr\xE1tica da Regra 7 (tornar os problemas f\xEDsicos e manuais).", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: "Escolha um conflito ou mal-entendido de hoje e, antes de resolv\xEA-lo na conversa, escreva num papel o que voc\xEA quer dizer e em que ordem. Regra 7 recomenda usar ferramentas f\xEDsicas mesmo em situa\xE7\xF5es interpessoais, n\xE3o s\xF3 em tarefas de trabalho.", source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos (Regra 7)" },
    { text: 'Hoje, se cometer um erro (esquecer algo, chegar atrasado, perder um prazo), reconhe\xE7a em voz alta com leveza ("l\xE1 vou eu de novo") em vez de se punir ou negar o erro. Regra 8 ("Tenha senso de humor") de "Vencendo o TDAH Adulto" trata o humor autodepreciativo saud\xE1vel como parte do manejo, evitando tanto a nega\xE7\xE3o quanto a culpa excessiva.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: "Escolha um erro recente causado por um sintoma do TDAH e pratique hoje as 4 etapas da Regra 8: reconhecer o que houve, explicar (n\xE3o justificar), pedir desculpas se necess\xE1rio, e dizer o que vai tentar diferente da pr\xF3xima vez.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: 'Hoje, ao perceber que esqueceu algo pela en\xE9sima vez, ria da situa\xE7\xE3o por um segundo antes de corrigir o problema, sem transformar isso em autocr\xEDtica pesada. "Vencendo o TDAH Adulto" descreve o senso de humor como prote\xE7\xE3o contra a vergonha cr\xF4nica, sem minimizar o impacto real do sintoma.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: "Escolha uma situa\xE7\xE3o em que voc\xEA atrapalhou algo hoje (ou recentemente) por impulsividade e conte essa hist\xF3ria para algu\xE9m de confian\xE7a com leveza, sem se rebaixar. Regra 8 recomenda compartilhar os deslizes com humor como forma de aliviar a carga emocional acumulada.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: "Hoje, antes de dormir, escolha um erro do dia causado por esquecimento ou impulsividade e escreva uma vers\xE3o engra\xE7ada da cena, como se fosse contar para um amigo. Pr\xE1tica de humor autodepreciativo (Regra 8) que separa o erro da identidade da pessoa.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: 'No trabalho hoje, identifique uma fonte de distra\xE7\xE3o do seu espa\xE7o f\xEDsico (barulho, tela cheia de abas, pessoas passando) e mude sua posi\xE7\xE3o ou pe\xE7a para reduzir esse est\xEDmulo por 1 hora. "Vencendo o TDAH Adulto" (Passo 5, Trabalho) recomenda adaptar o ambiente f\xEDsico em vez de s\xF3 tentar se concentrar mais.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: 'Escolha uma tarefa de trabalho de hoje e, se poss\xEDvel, converse com um colega de confian\xE7a para que ele funcione como um "check-in" r\xE1pido no meio do dia, perguntando como est\xE1 indo. Aplica\xE7\xE3o da ideia de mentor/parceiro no trabalho descrita em "Vencendo o TDAH Adulto" (Passo 5).', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: 'Hoje, antes de aceitar uma nova tarefa no trabalho, pare e avalie por escrito se ela \xE9 compat\xEDvel com o tipo de ambiente/rotina em que voc\xEA funciona melhor (mais estrutura vs. mais autonomia). "Vencendo o TDAH Adulto" recomenda escolher tarefas e ambientes de trabalho compat\xEDveis com o pr\xF3prio perfil, em vez de for\xE7ar um encaixe que n\xE3o existe.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: 'Escolha uma tarefa de trabalho chata de hoje e fa\xE7a-a em um bloco de tempo, sem checar e-mail ou mensagens durante esse per\xEDodo combinado. Reduzir est\xEDmulos concorrentes no ambiente de trabalho \xE9 recomenda\xE7\xE3o central de "Vencendo o TDAH Adulto" (Passo 5, Trabalho).', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: 'Hoje, automatize (ou agende para automatizar essa semana) o pagamento de uma conta fixa que voc\xEA costuma esquecer ou atrasar. "Vencendo o TDAH Adulto" (Passo 5, Dinheiro) recomenda automatizar pagamentos para tirar a decis\xE3o financeira do momento presente, onde a impulsividade pesa mais.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: 'Escolha um gasto pequeno de hoje e pague em dinheiro f\xEDsico, em vez de cart\xE3o, sentindo o valor sair fisicamente da carteira. "Vencendo o TDAH Adulto" recomenda dinheiro f\xEDsico como forma de tornar o gasto mais concreto e vis\xEDvel do que um cart\xE3o.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: 'Hoje, deixe vis\xEDvel (num papel na geladeira, numa planilha aberta) quanto voc\xEA j\xE1 gastou essa semana, para acompanhar de forma concreta, n\xE3o s\xF3 mental. Or\xE7amento vis\xEDvel \xE9 recomenda\xE7\xE3o de "Vencendo o TDAH Adulto" (Passo 5, Dinheiro) para compensar a dificuldade de prever consequ\xEAncias financeiras futuras.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: 'Antes de fazer uma compra maior hoje, espere pelo menos algumas horas e reveja a decis\xE3o depois desse intervalo. Aplica\xE7\xE3o da Regra 1 (Pare a a\xE7\xE3o) especificamente a decis\xF5es financeiras, descrita em "Vencendo o TDAH Adulto" (Passo 5, Dinheiro).', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro (Regra 1)" },
    { text: 'Hoje, converse com seu parceiro ou parceira sobre um sintoma seu do TDAH que costuma ser mal-interpretado (esquecimento, interrup\xE7\xE3o na fala, atraso) e explique o mecanismo por tr\xE1s dele, sem se justificar excessivamente. "Vencendo o TDAH Adulto" (Passo 5, Relacionamentos) descreve que sintomas de TDAH s\xE3o frequentemente confundidos com desinteresse ou grosseria, e nomear isso ajuda o outro a reinterpretar o comportamento.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos" },
    { text: 'Escolha uma intera\xE7\xE3o dif\xEDcil de hoje com algu\xE9m pr\xF3ximo e aplique deliberadamente a Regra 1 (pare antes de reagir) e a Regra 3 (verbalize antes de responder) na conversa. "Vencendo o TDAH Adulto" recomenda usar as 8 Regras especificamente nas intera\xE7\xF5es mais pr\xF3ximas, onde a impulsividade tem mais custo emocional.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Relacionamentos" },
    { text: 'Hoje, se voc\xEA \xE9 pai/m\xE3e ou cuidador, escreva com seu parceiro uma regra familiar simples e coloque-a vis\xEDvel na cozinha ou sala. "Vencendo o TDAH Adulto" (Passo 5, Paternidade) recomenda regras familiares vis\xEDveis e combinadas com o parceiro, n\xE3o s\xF3 faladas.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Paternidade/Maternidade" },
    { text: 'Escolha um hor\xE1rio hoje para fazer uma checagem r\xE1pida e programada dos seus filhos (ou de uma responsabilidade de cuidado), usando um timer, em vez de depender de lembrar sozinho. "Vencendo o TDAH Adulto" recomenda uso de timer para checagem peri\xF3dica na paternidade, compensando falhas de mem\xF3ria prospectiva.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Paternidade/Maternidade" },
    { text: 'Antes de dirigir hoje, fa\xE7a uma checagem f\xEDsica do cinto de seguran\xE7a com um lembrete visual (adesivo, nota) se voc\xEA costuma esquecer. "Vencendo o TDAH Adulto" (Passo 5, Dire\xE7\xE3o) recomenda lembretes f\xEDsicos espec\xEDficos para seguran\xE7a no tr\xE2nsito.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o" },
    { text: 'Hoje, se for dirigir, guarde o celular fora de alcance (porta-luvas, bolsa no banco de tr\xE1s) antes de ligar o carro. "Vencendo o TDAH Adulto" recomenda bloquear o celular durante a dire\xE7\xE3o como forma de eliminar a distra\xE7\xE3o mais perigosa, em vez de confiar em resistir a ela.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dire\xE7\xE3o" },
    { text: 'Antes de uma sess\xE3o de estudo hoje, aplique a t\xE9cnica SQ4R: examine o material (Survey), formule perguntas (Question) antes de ler, e s\xF3 depois leia com aten\xE7\xE3o a essas perguntas. "Vencendo o TDAH Adulto" (Passo 5, Educa\xE7\xE3o) recomenda SQ4R como t\xE9cnica de leitura ativa que compensa a dificuldade de manter aten\xE7\xE3o sustentada em leitura passiva.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o" },
    { text: 'Hoje, antes de estudar algo importante, fa\xE7a 10-15 minutos de atividade f\xEDsica (caminhada r\xE1pida, alongamento intenso) e comece o estudo logo em seguida. "Vencendo o TDAH Adulto" recomenda exerc\xEDcio f\xEDsico antes de provas ou sess\xF5es de estudo para melhorar o estado de alerta.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o" },
    { text: 'Escolha uma mat\xE9ria ou conte\xFAdo que precisa estudar hoje e grave um \xE1udio de voc\xEA mesmo explicando o ponto principal, para ouvir depois. "Vencendo o TDAH Adulto" recomenda grava\xE7\xE3o como ferramenta de estudo, compensando a dificuldade de reter informa\xE7\xE3o s\xF3 lendo em sil\xEAncio.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o" },
    { text: 'Hoje, combine com um colega ou amigo um hor\xE1rio fixo de estudo em dupla, mesmo que cada um estude algo diferente, apenas para criar responsabilidade m\xFAtua. "Vencendo o TDAH Adulto" recomenda parceria de estudo como forma de presta\xE7\xE3o de contas externa (ligado \xE0 Regra 6).', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Educa\xE7\xE3o (Regra 6)" },
    { text: "Hoje, escolha uma tarefa que exige mem\xF3ria de trabalho verbal (explicar algo complexo, escrever um texto) e fa\xE7a um rascunho falado antes de escrever ou falar de verdade. Cap. 7 do Manual Barkley descreve a mem\xF3ria de trabalho verbal como respons\xE1vel por manter a fala internalizada organizada; ensaiar em voz alta compensa essa fragilidade.", source: "Manual Barkley, cap. 7 (mem\xF3ria de trabalho verbal)" },
    { text: 'Escolha uma tarefa hoje que dependa de prever passos futuros (planejar uma viagem, organizar um evento) e escreva por escrito, em ordem, cada etapa antes de agir. Isso treina diretamente a fun\xE7\xE3o de planejamento/resolu\xE7\xE3o de problemas (o "playground da mente") descrita no Cap. 7 do Manual Barkley.', source: "Manual Barkley, cap. 7 (planejamento)" },
    { text: "Hoje, ao sentir uma frustra\xE7\xE3o forte (algo deu errado, algu\xE9m te contrariou), escreva por escrito o que sente antes de decidir como vai reagir. O Cap. 7 do Manual Barkley descreve autorregula\xE7\xE3o do afeto como uma das 4 fun\xE7\xF5es executivas comprometidas no TDAH; escrever cria a pausa que a regula\xE7\xE3o natural n\xE3o oferece.", source: "Manual Barkley, cap. 7 (autorregula\xE7\xE3o emocional)" },
    { text: "Escolha uma tarefa que envolve m\xFAltiplas etapas simult\xE2neas hoje (cozinhar algo com v\xE1rios passos, organizar um evento) e use fichas f\xEDsicas numeradas para cada etapa, movendo-as conforme avan\xE7a. Exerc\xEDcio de planejamento/reconstitui\xE7\xE3o (Cap. 7, Manual Barkley), usando apoio f\xEDsico para compensar a fun\xE7\xE3o executiva mais fraca.", source: "Manual Barkley, cap. 7 (planejamento)" },
    { text: "Hoje, ao perceber uma emo\xE7\xE3o intensa subindo (raiva, ansiedade, frustra\xE7\xE3o), experimente uma t\xE9cnica de respira\xE7\xE3o de 4 tempos (inspirar 4s, segurar 4s, expirar 4s) antes de agir. A Cartilha ABP/Alexa descreve o TDAH como transtorno de autorregula\xE7\xE3o (n\xE3o s\xF3 de aten\xE7\xE3o); t\xE9cnicas de regula\xE7\xE3o fisiol\xF3gica ajudam diretamente nesse ponto.", source: "Cartilha ABP/Alexa (autorregula\xE7\xE3o)" },
    { text: "Escolha uma situa\xE7\xE3o hoje em que voc\xEA tende a se irritar r\xE1pido e, antes de reagir, escreva uma frase nomeando a emo\xE7\xE3o e sua intensidade de 0 a 10. Autorregula\xE7\xE3o emocional \xE9 uma das 4 fun\xE7\xF5es executivas do modelo de Barkley (Cap. 7); medir a intensidade cria dist\xE2ncia entre sentir e agir.", source: "Manual Barkley, cap. 7 (autorregula\xE7\xE3o emocional)" },
    { text: "Hoje, escolha uma tarefa e fa\xE7a-a durante um bloco de tempo sem nenhuma notifica\xE7\xE3o do celular ativa (modo avi\xE3o ou n\xE3o perturbe). A Cartilha ABP/Alexa descreve o uso de recursos tecnol\xF3gicos como suporte externo \xE0s fun\xE7\xF5es executivas \u2014 desligar notifica\xE7\xF5es \xE9 a vers\xE3o inversa: remover o est\xEDmulo que compete com o foco.", source: "Cartilha ABP/Alexa (recursos tecnol\xF3gicos de suporte)" },
    { text: "Escolha uma rotina que voc\xEA tem dificuldade de manter (hor\xE1rio de dormir, exerc\xEDcio, refei\xE7\xF5es) e configure um lembrete por assistente de voz ou app para hoje. A Cartilha ABP/Alexa recomenda especificamente assistentes de voz como suporte externo \xE0s fun\xE7\xF5es executivas para rotinas.", source: "Cartilha ABP/Alexa (recursos tecnol\xF3gicos de suporte)" },
    { text: "Hoje, se voc\xEA usa medica\xE7\xE3o para TDAH, confira se tomou no hor\xE1rio certo e anote o hor\xE1rio num papel ou app, para ter esse dado se precisar ajustar com seu m\xE9dico. Cap. 17 do Manual Barkley descreve efeitos dose-dependentes dos estimulantes; registrar hor\xE1rios ajuda no acompanhamento cl\xEDnico, sem substituir orienta\xE7\xE3o m\xE9dica.", source: "Manual Barkley, cap. 17 (estimulantes)" },
    { text: 'Escolha uma cren\xE7a que voc\xEA tem sobre si mesmo relacionada ao TDAH ("sou pregui\xE7oso", "n\xE3o me esfor\xE7o o suficiente") e escreva ao lado um fato da Cartilha ABP/Alexa que contesta isso: TDAH tem herdabilidade de at\xE9 90% e n\xE3o \xE9 causado por falta de esfor\xE7o ou m\xE1 cria\xE7\xE3o.', source: "Cartilha ABP/Alexa (mitos desmontados)" },
    { text: "Hoje, se voc\xEA tem TDAH e tamb\xE9m sintomas de ansiedade, escolha uma tarefa e fa\xE7a-a em passos menores que o habitual, j\xE1 que ansiedade combinada a TDAH tende a aumentar a desaten\xE7\xE3o. O Cap. 4 do Manual Barkley descreve que ansiedade com\xF3rbida est\xE1 associada a mais desaten\xE7\xE3o; passos menores reduzem a sobrecarga cognitiva.", source: "Manual Barkley, cap. 4 (comorbidades)" },
    { text: 'Escolha uma situa\xE7\xE3o social de hoje em que voc\xEA tende a interpretar um coment\xE1rio como hostil e, antes de reagir, pergunte por escrito: "existe outra explica\xE7\xE3o poss\xEDvel para isso?". O Cap. 16 do Manual Barkley descreve que pessoas com TDAH tendem a interpretar comportamento alheio como mais hostil do que \xE9; essa pausa reduz rea\xE7\xE3o desproporcional.', source: "Manual Barkley, cap. 16 (resolu\xE7\xE3o de conflitos)" },
    { text: 'Hoje, se voc\xEA lida com irritabilidade ou baixa toler\xE2ncia \xE0 frustra\xE7\xE3o, escolha um momento do dia para uma atividade f\xEDsica curta (caminhada, alongamento) como forma de regular o estado de alerta antes de uma tarefa que exige paci\xEAncia. Conecta-se \xE0 autorregula\xE7\xE3o emocional (Cap. 7, Manual Barkley) e \xE0 recomenda\xE7\xE3o de exerc\xEDcio f\xEDsico presente em "Vencendo o TDAH Adulto".', source: "Manual Barkley, cap. 7 \xB7 Vencendo o TDAH Adulto, Passo 5 (Educa\xE7\xE3o)" },
    { text: 'Escolha uma tarefa hoje que voc\xEA tende a deixar para o fim do prazo e pergunte por escrito: "o que essa procrastina\xE7\xE3o est\xE1 me protegendo de sentir?" antes de come\xE7ar mesmo assim. Relacionado \xE0 miopia temporal do modelo de Barkley \u2014 nomear o motivo emocional ajuda a agir apesar dele.', source: "Vencendo o TDAH Adulto, Passo 2 (miopia temporal)" },
    { text: 'Hoje, ao lidar com uma tarefa dom\xE9stica ou familiar repetitiva (lou\xE7a, contas, rem\xE9dios), crie um sistema de fichas simples: cada vez que concluir, mova um cart\xE3o de "a fazer" para "feito". Cap. 12 do Manual Barkley descreve o sistema de fichas como t\xE9cnica comportamental eficaz para refor\xE7ar comportamento e torn\xE1-lo vis\xEDvel.', source: "Manual Barkley, cap. 12 (sistema de fichas)" },
    { text: 'Escolha um comportamento que voc\xEA quer reduzir hoje (procrastinar, checar celular em excesso) e defina um "custo" claro se ele acontecer (ex: perder um privil\xE9gio combinado). Cap. 12 do Manual Barkley descreve custo de resposta como t\xE9cnica comportamental que funciona melhor com consequ\xEAncia imediata e clara, n\xE3o vaga.', source: "Manual Barkley, cap. 12 (custo de resposta)" },
    { text: "Hoje, se voc\xEA trabalha ou estuda com outras pessoas, negocie um sinal combinado (palavra, gesto) para avisar quando perceber que est\xE1 se dispersando numa conversa ou reuni\xE3o. Ajuda externa consciente, coerente com a recomenda\xE7\xE3o da Cartilha ABP/Alexa de que apoio social \xE9 parte leg\xEDtima do manejo, n\xE3o uma muleta a evitar.", source: "Cartilha ABP/Alexa (apoio social no manejo)" },
    { text: 'Escolha uma tarefa hoje que voc\xEA tende a fazer de forma desorganizada e use cores diferentes (canetas, etiquetas, post-its) para categorizar as partes dela antes de come\xE7ar. Aplica\xE7\xE3o da Regra 7 de "Vencendo o TDAH Adulto" (tornar problemas f\xEDsicos e manuais) a uma tarefa de organiza\xE7\xE3o cotidiana.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 7" },
    { text: 'Hoje, ao perceber que est\xE1 prestes a evitar uma tarefa desconfort\xE1vel (uma liga\xE7\xE3o, um formul\xE1rio, uma conversa dif\xEDcil), escreva por escrito: "o que vai acontecer se eu n\xE3o fizer isso hoje?" antes de decidir adiar de novo. Usa a Regra 5 (Considere o futuro) de "Vencendo o TDAH Adulto" de forma negativa \u2014 antecipar a consequ\xEAncia de n\xE3o agir, n\xE3o s\xF3 o benef\xEDcio de agir.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 5" },
    { text: 'Escolha uma meta que voc\xEA tem para os pr\xF3ximos 3 meses e, hoje, escreva apenas o passo desta semana, ignorando o resto por enquanto. Regra 6 de "Vencendo o TDAH Adulto" \u2014 tornar o futuro significativo aproximando-o do presente, sem se perder no tamanho da meta inteira.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: 'Hoje, se puder, pe\xE7a a algu\xE9m de confian\xE7a para revisar com voc\xEA uma decis\xE3o financeira ou de trabalho importante antes de fech\xE1-la. "Vencendo o TDAH Adulto" (Passo 5, Dinheiro) menciona delegar ou compartilhar decis\xF5es financeiras como estrat\xE9gia v\xE1lida em casos de maior impulsividade, n\xE3o como fraqueza.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Dinheiro" },
    { text: 'Escolha uma instru\xE7\xE3o complexa que voc\xEA recebeu hoje (de um chefe, professor, m\xE9dico) e pe\xE7a para repetirem ou anote na hora, mesmo que pare\xE7a \xF3bvio. "Vencendo o TDAH Adulto" recomenda pedir para repetir instru\xE7\xF5es complexas como forma de compensar a mem\xF3ria de trabalho verbal, n\xE3o como falha de aten\xE7\xE3o.', source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: 'Hoje, se voc\xEA est\xE1 numa reuni\xE3o ou aula, tome notas ativamente \xE0 m\xE3o, mesmo que depois n\xE3o as releia. "Vencendo o TDAH Adulto" descreve que tomar notas ativamente ajuda a manter o foco no momento, n\xE3o s\xF3 a lembrar depois \u2014 o ato de escrever j\xE1 \xE9 a ferramenta.', source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o" },
    { text: 'Escolha uma tarefa dom\xE9stica ou de trabalho que voc\xEA tende a fazer sozinho e sem prazo definido, e hoje combine com algu\xE9m um hor\xE1rio espec\xEDfico para mostrar o resultado. Regra 6 de "Vencendo o TDAH Adulto" \u2014 presta\xE7\xE3o de contas a terceiros transforma um prazo vago em um prazo real.', source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 6" },
    { text: 'Hoje, antes de decidir se vai revelar seu diagn\xF3stico de TDAH em algum contexto (trabalho, escola, relacionamento), escreva os pr\xF3s e contras espec\xEDficos dessa situa\xE7\xE3o, sem regra geral. "Vencendo o TDAH Adulto" (Passo 5, Trabalho) recomenda revelar o diagn\xF3stico apenas quando necess\xE1rio para adapta\xE7\xF5es formais, avaliando caso a caso.', source: "Vencendo o TDAH Adulto, Passo 5 \xB7 Trabalho" },
    { text: 'Escolha uma tarefa hoje em que voc\xEA costuma se perder em detalhes sem terminar, e defina antes de come\xE7ar um crit\xE9rio simples de "pronto o suficiente". Relacionado \xE0 fun\xE7\xE3o de planejamento (Cap. 7, Manual Barkley) \u2014 travar em detalhe \xE9 falha de reconstitui\xE7\xE3o, n\xE3o falta de esfor\xE7o.', source: "Manual Barkley, cap. 7 (planejamento)" },
    { text: "Hoje, ao sentir que uma tarefa est\xE1 demorando muito mais do que o esperado, escreva o hor\xE1rio de in\xEDcio e fa\xE7a uma estimativa por escrito de quanto falta, comparando com a estimativa inicial. Treina diretamente a percep\xE7\xE3o de tempo, ligada \xE0 mem\xF3ria de trabalho n\xE3o-verbal (Cap. 7, Manual Barkley).", source: "Manual Barkley, cap. 7 (percep\xE7\xE3o de tempo)" },
    { text: 'Escolha um compromisso social de hoje (jantar, encontro, reuni\xE3o informal) e prepare com anteced\xEAncia 2 ou 3 t\xF3picos de conversa por escrito, se costuma travar ao puxar assunto. Aplica\xE7\xE3o da Regra 4 (exteriorizar informa\xE7\xF5es fundamentais) de "Vencendo o TDAH Adulto" \xE0 comunica\xE7\xE3o social.', source: "Vencendo o TDAH Adulto, se\xE7\xE3o sobre comunica\xE7\xE3o (Regra 4)" },
    { text: "Hoje, se algo te irritou e voc\xEA j\xE1 reagiu mal, pratique a Regra 8 (senso de humor) em etapas: reconhe\xE7a o que houve para a pessoa envolvida, explique o motivo sem se justificar demais, pe\xE7a desculpas se cab\xEDvel, e diga o que vai tentar diferente da pr\xF3xima vez.", source: "Vencendo o TDAH Adulto, Passo 4 \xB7 Regra 8" },
    { text: 'Escolha uma \xE1rea da sua vida (trabalho, estudo, relacionamento, dinheiro) onde os sintomas de TDAH mais te atrapalham hoje e aplique deliberadamente 2 das 8 Regras de "Vencendo o TDAH Adulto" nela ao longo do dia, anotando o que percebeu \xE0 noite.', source: "Vencendo o TDAH Adulto, Passo 4 (As 8 Regras)" }
  ];
  function exerciseForDate(date) {
    var d = date || /* @__PURE__ */ new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    var dayOfYear = Math.floor(diff / 864e5);
    var index = (dayOfYear - 1) % EXERCISES.length;
    return EXERCISES[index];
  }

  // src/sync.js
  var Sync = (function() {
    var WD_TO_NUM = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };
    var NUM_TO_WD = { 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab", 7: "dom" };
    var statusEl = document.getElementById("syncStatus");
    var flushTimer = null;
    var routineDirtyTimer = null;
    var flushing = false;
    var periodicStarted = false;
    function loadOutbox() {
      return AppStorage.getOutbox();
    }
    function saveOutbox(arr) {
      AppStorage.setOutbox(arr);
    }
    function outboxCount() {
      return loadOutbox().length;
    }
    function enqueueMutation(entity, op, data) {
      var box = loadOutbox();
      var k = mutationKey(entity, data);
      box = box.filter(function(m) {
        return mutationKey(m.entity, m.data) !== k;
      });
      box.push({
        id: "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
        entity,
        op,
        data,
        clientUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      saveOutbox(box);
      updateStatus();
    }
    function mutationKey(entity, data) {
      if (entity === "completion") return "completion|" + data.taskId + "|" + data.date;
      if (entity === "reminder") return "reminder|" + data.taskId + "|" + data.weekday;
      if (entity === "task") return "task|" + (data.id || "");
      return entity + "|?";
    }
    function isOnline() {
      return navigator.onLine !== false;
    }
    function updateStatus() {
      if (!statusEl) return;
      if (!Api.isLoggedIn()) {
        statusEl.hidden = true;
        return;
      }
      statusEl.hidden = false;
      var pending = outboxCount();
      statusEl.classList.remove("synced", "pending", "offline", "syncing");
      if (!isOnline()) {
        statusEl.classList.add("offline");
        statusEl.textContent = "offline";
        statusEl.title = "Sem conex\xE3o \u2014 " + pending + " altera\xE7\xE3o(\xF5es) na fila";
      } else if (flushing && pending) {
        statusEl.classList.add("syncing");
        statusEl.textContent = "sincronizando";
        statusEl.title = "Enviando altera\xE7\xF5es\u2026";
      } else if (pending) {
        statusEl.classList.add("pending");
        statusEl.textContent = "pendente";
        statusEl.title = pending + " altera\xE7\xE3o(\xF5es) aguardando envio";
      } else {
        statusEl.classList.add("synced");
        statusEl.textContent = "sincronizado";
        statusEl.title = "Tudo sincronizado";
      }
    }
    function flushOutbox() {
      if (flushing) return Promise.resolve();
      if (!Api.isLoggedIn() || !isOnline()) {
        updateStatus();
        return Promise.resolve();
      }
      var box = loadOutbox();
      if (!box.length) {
        updateStatus();
        return Promise.resolve();
      }
      flushing = true;
      updateStatus();
      var mutations = box.map(function(m) {
        return { entity: m.entity, op: m.op, data: m.data, clientUpdatedAt: m.clientUpdatedAt };
      });
      var sentIds = box.map(function(m) {
        return m.id;
      });
      return Api.fetch("/sync/push", { method: "POST", body: { mutations } }).then(function() {
        var current = loadOutbox();
        var sentSet = {};
        sentIds.forEach(function(id) {
          sentSet[id] = true;
        });
        saveOutbox(current.filter(function(m) {
          return !sentSet[m.id];
        }));
      }).catch(function(err) {
        if (err && err.isNetworkError) return;
      }).then(function() {
        flushing = false;
        updateStatus();
      });
    }
    function onCompletionChanged(taskId, dateISO, done) {
      if (!Api.isLoggedIn()) return;
      enqueueMutation("completion", "upsert", { taskId, date: dateISO, done: !!done });
      scheduleFlush();
    }
    function onAlarmChanged(alarmKey, time, label, enabled) {
      if (!Api.isLoggedIn()) return;
      var parts = alarmKey.split(":");
      var dayKey = parts[0];
      var taskId = parts.slice(1).join(":");
      var weekday = WD_TO_NUM[dayKey];
      if (!weekday) return;
      enqueueMutation("reminder", "upsert", {
        taskId,
        weekday,
        time,
        label,
        enabled: !!enabled
      });
      scheduleFlush();
    }
    function onRoutineChanged() {
      if (!Api.isLoggedIn() || !migrationDone()) return;
      clearTimeout(routineDirtyTimer);
      routineDirtyTimer = setTimeout(function() {
        pushRoutine().catch(function() {
        });
      }, 1200);
    }
    function scheduleFlush() {
      clearTimeout(flushTimer);
      flushTimer = setTimeout(function() {
        flushOutbox();
      }, 800);
    }
    function localTasksToPayload() {
      var tasksByDay2 = getTasksByDay();
      var out = [];
      Object.keys(tasksByDay2).forEach(function(dayKey) {
        var wd = WD_TO_NUM[dayKey];
        if (!wd) return;
        (tasksByDay2[dayKey] || []).forEach(function(t, idx) {
          out.push({
            id: t.id,
            weekday: wd,
            time: t.time,
            label: t.label,
            block: t.block,
            detail: t.detail || "",
            rule: t.rule || "",
            sortOrder: idx
          });
        });
      });
      return out;
    }
    function taskSig(weekday, time, label, block) {
      return weekday + "|" + time + "|" + label + "|" + (block || "");
    }
    function reconcileIds(idMap) {
      var changed = false;
      var tasksByDay2 = getTasksByDay();
      var state2 = getStateObj();
      var alarms2 = getAlarmsObj();
      Object.keys(tasksByDay2).forEach(function(dayKey) {
        (tasksByDay2[dayKey] || []).forEach(function(t) {
          if (idMap[t.id] && idMap[t.id] !== t.id) {
            t.id = idMap[t.id];
            changed = true;
          }
        });
      });
      Object.keys(state2).forEach(function(dateKey) {
        var ds = state2[dateKey];
        if (!ds || typeof ds !== "object") return;
        Object.keys(ds).forEach(function(oldTaskId) {
          var newId = idMap[oldTaskId];
          if (newId && newId !== oldTaskId) {
            ds[newId] = ds[oldTaskId];
            delete ds[oldTaskId];
            changed = true;
          }
        });
      });
      Object.keys(alarms2).forEach(function(alarmKey) {
        var idx = alarmKey.indexOf(":");
        if (idx < 0) return;
        var dayKey = alarmKey.slice(0, idx);
        var oldTaskId = alarmKey.slice(idx + 1);
        var newId = idMap[oldTaskId];
        if (newId && newId !== oldTaskId) {
          var newKey = dayKey + ":" + newId;
          alarms2[newKey] = alarms2[alarmKey];
          delete alarms2[alarmKey];
          changed = true;
        }
      });
      if (changed) {
        saveTasksByDay(tasksByDay2);
        saveState(state2);
        saveAlarms(alarms2);
      }
      return changed;
    }
    function buildIdMap(sentPayload, serverTasks) {
      var idMap = {};
      var bySig = {};
      (serverTasks || []).forEach(function(st) {
        var sig = taskSig(st.weekday, st.time, st.label, st.block);
        if (!bySig[sig]) bySig[sig] = [];
        bySig[sig].push(st);
      });
      Object.keys(bySig).forEach(function(sig) {
        bySig[sig].sort(function(a, b) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
      });
      sentPayload.forEach(function(local) {
        var sig = taskSig(local.weekday, local.time, local.label, local.block);
        var queue = bySig[sig];
        if (queue && queue.length) {
          var st = queue.shift();
          if (st && st.id) idMap[local.id] = st.id;
        }
      });
      return idMap;
    }
    function pushRoutine() {
      if (!Api.isLoggedIn()) return Promise.resolve();
      var payload = localTasksToPayload();
      return Api.fetch("/routine/tasks", { method: "PUT", body: { tasks: payload } }).then(function(resp) {
        var serverTasks = resp && resp.tasks;
        if (serverTasks && serverTasks.length) {
          var idMap = buildIdMap(payload, serverTasks);
          reconcileIds(idMap);
        }
        return resp;
      });
    }
    function migratedUserId() {
      return AppStorage.getMigratedUserId();
    }
    function currentUserId() {
      var s = Api.getSession();
      return s && s.user && (s.user.id || s.user.userId || s.user.email) || null;
    }
    function migrationDone() {
      var uid = currentUserId();
      return !!uid && migratedUserId() === String(uid);
    }
    function markMigrated() {
      var uid = currentUserId();
      if (uid) {
        AppStorage.setMigratedUserId(uid);
      }
    }
    function localCompletions() {
      var state2 = getStateObj();
      var out = [];
      Object.keys(state2).forEach(function(dateKey) {
        if (dateKey.indexOf("template-") === 0) return;
        var ds = state2[dateKey];
        if (!ds || typeof ds !== "object") return;
        Object.keys(ds).forEach(function(taskId) {
          if (ds[taskId]) out.push({ taskId, date: dateKey });
        });
      });
      return out;
    }
    function localReminders() {
      var alarms2 = getAlarmsObj();
      var out = [];
      Object.keys(alarms2).forEach(function(alarmKey) {
        var idx = alarmKey.indexOf(":");
        if (idx < 0) return;
        var dayKey = alarmKey.slice(0, idx);
        var taskId = alarmKey.slice(idx + 1);
        var wd = WD_TO_NUM[dayKey];
        if (!wd) return;
        var a = alarms2[alarmKey];
        out.push({ taskId, weekday: wd, time: a.time, label: a.label });
      });
      return out;
    }
    function uploadCompletionsAndReminders() {
      var comps = localCompletions();
      var rems = localReminders();
      var chain = Promise.resolve();
      comps.forEach(function(c) {
        chain = chain.then(function() {
          return Api.fetch("/completions", { method: "PUT", body: { taskId: c.taskId, date: c.date, done: true } });
        });
      });
      rems.forEach(function(r) {
        chain = chain.then(function() {
          return Api.fetch("/reminders", { method: "PUT", body: {
            taskId: r.taskId,
            enabled: true,
            time: r.time,
            weekday: r.weekday,
            label: r.label
          } });
        });
      });
      return chain;
    }
    function adoptServerData(pull) {
      var newTasks = {};
      var seen = {};
      DAYS.forEach(function(d) {
        newTasks[d.key] = [];
      });
      (pull.tasks || []).forEach(function(st) {
        var dayKey = NUM_TO_WD[st.weekday];
        if (!dayKey) return;
        var sig = dayKey + "|" + st.time + "|" + st.label;
        if (seen[sig]) return;
        seen[sig] = true;
        if (!newTasks[dayKey]) newTasks[dayKey] = [];
        newTasks[dayKey].push({
          id: st.id,
          time: st.time,
          label: st.label,
          block: st.block,
          detail: st.detail || "",
          rule: st.rule || ""
        });
      });
      setTasksByDay(newTasks);
      saveTasksByDay(newTasks);
      var state2 = getStateObj();
      var newState = {};
      (pull.completions || []).forEach(function(c) {
        if (!c.done) return;
        if (!newState[c.date]) newState[c.date] = {};
        newState[c.date][c.taskId] = true;
      });
      Object.keys(state2).forEach(function(k) {
        if (k.indexOf("template-") === 0) newState[k] = state2[k];
      });
      setStateObj(newState);
      saveState(newState);
      var newAlarms = {};
      (pull.reminders || []).forEach(function(r) {
        if (r.enabled === false) return;
        var dayKey = NUM_TO_WD[r.weekday];
        if (!dayKey) return;
        newAlarms[dayKey + ":" + r.taskId] = { time: r.time, label: r.label };
      });
      setAlarmsObj(newAlarms);
      saveAlarms(newAlarms);
      if (isNative) {
        try {
          rescheduleAllNativeAlarms();
        } catch (e) {
        }
      }
    }
    function runDedupeFixIfNeeded() {
      if (!Api.isLoggedIn() || AppStorage.getDedupeFixApplied()) return Promise.resolve();
      return Api.fetch("/sync/pull", { method: "POST", body: {} }).then(function(pull) {
        if (pull && pull.tasks && pull.tasks.length > 0) {
          adoptServerData(pull);
          setCurrentDay(todayKeyBR());
          renderDayTabs();
          renderBlocks();
        }
        AppStorage.setDedupeFixApplied();
      }).catch(function() {
      });
    }
    function runMigration() {
      if (!Api.isLoggedIn() || migrationDone()) {
        updateStatus();
        runDedupeFixIfNeeded();
        return;
      }
      Api.fetch("/sync/pull", { method: "POST", body: {} }).then(function(pull) {
        var remoteHasTasks = pull && pull.tasks && pull.tasks.length > 0;
        if (!remoteHasTasks) {
          return pushRoutine().then(function() {
            return uploadCompletionsAndReminders();
          }).then(function() {
            markMigrated();
            showToast("Rotina enviada para sua conta.");
          });
        }
        adoptServerData(pull);
        markMigrated();
        setCurrentDay(todayKeyBR());
        renderDayTabs();
        renderBlocks();
        showToast("Rotina da sua conta carregada.");
      }).catch(function(err) {
        if (!(err && err.isNetworkError)) {
        }
      }).then(function() {
        updateStatus();
      });
    }
    function onSessionChange(session) {
      if (session && session.user) {
        runMigration();
        scheduleFlush();
      }
      updateStatus();
    }
    function startPeriodic() {
      if (periodicStarted) return;
      periodicStarted = true;
      setInterval(function() {
        if (Api.isLoggedIn() && isOnline() && outboxCount()) flushOutbox();
      }, 3e4);
      window.addEventListener("online", function() {
        updateStatus();
        if (Api.isLoggedIn()) {
          runMigration();
          flushOutbox();
        }
      });
      window.addEventListener("offline", updateStatus);
    }
    function init() {
      Api.onChange(onSessionChange);
      startPeriodic();
      updateStatus();
      if (Api.isLoggedIn()) {
        runMigration();
        scheduleFlush();
      }
    }
    return {
      init,
      onCompletionChanged,
      onAlarmChanged,
      onRoutineChanged,
      flushOutbox,
      enqueueMutation
    };
  })();

  // src/main.js
  (function() {
    "use strict";
    setSyncHook(Sync);
    setSyncHook3(Sync);
    setSyncHook2(Sync);
    setSyncHook4(Sync);
    setApiHook2(Api);
    setPlacesOverlayHook(places_overlay_exports);
    setPomodoroHook(openPomodoro);
    setApiHook(Api);
    renderDayTabs();
    renderBlocks();
    var today = /* @__PURE__ */ new Date();
    var dateLabel = today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\bde\s/g, "").replace(/\./g, "");
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
    var manifest = {
      name: "Rotina Di\xE1ria \u2014 Apoio TDAH",
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
    window.addEventListener("beforeinstallprompt", function(e) {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.classList.add("show");
    });
    installBtn.addEventListener("click", function() {
      if (!deferredPrompt) {
        showToast('Use o menu do navegador \u2192 "Adicionar \xE0 tela inicial".');
        return;
      }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function() {
        deferredPrompt = null;
        installBtn.classList.remove("show");
      });
    });
    window.addEventListener("appinstalled", function() {
      installBtn.classList.remove("show");
      showToast("Instalado com sucesso.");
    });
    if ("serviceWorker" in navigator) {
      try {
        var swCode = "self.addEventListener('install', e => self.skipWaiting());self.addEventListener('activate', e => self.clients.claim());";
        var swBlob = new Blob([swCode], { type: "application/javascript" });
        var swUrl = URL.createObjectURL(swBlob);
        navigator.serviceWorker.register(swUrl).catch(function() {
        });
      } catch (e) {
      }
    }
    initNotifications();
    initEditor();
    initAuth();
    initEducation();
    initFaq();
    initSelfAssessment();
    initPomodoro();
    initSocial();
    initGeofencing();
    initPlacesOverlay();
    document.addEventListener("keydown", function(ev) {
      if (ev.key !== "Escape") return;
      var tdahInfoOverlay2 = document.getElementById("tdahInfoOverlay");
      var authOverlay2 = document.getElementById("authOverlay");
      var editOverlay2 = document.getElementById("editOverlay");
      var placesPrivacyOverlay2 = document.getElementById("placesPrivacyOverlay");
      if (placesPrivacyOverlay2.classList.contains("show")) closePlacesPrivacy();
      else if (placesOverlay.classList.contains("show")) closePlacesOverlay();
      else if (pomodoroOverlay.classList.contains("show")) closePomodoro();
      else if (socialOverlay.classList.contains("show")) closeSocial();
      else if (saOverlay.classList.contains("show")) closeSelfAssessment();
      else if (faqOverlay.classList.contains("show")) closeFaq();
      else if (tdahInfoOverlay2.classList.contains("show")) closeTdahInfo();
      else if (authOverlay2.classList.contains("show")) closeAuth();
      else if (editOverlay2.classList.contains("show")) closeEditor();
    });
    Sync.init();
  })();
})();
