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
      PLACES_DISCLOSURE_SEEN: "rotina_tdah_places_disclosure_seen_v1",
      PLACE_FEATURE_DISCOVERY_SEEN: "rotina_tdah_place_feature_discovery_seen_v1"
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
        var timeHtml = t.time ? '<span class="task-time">' + escapeHtml(t.time) + "</span>" : "";
        var locationHtml = t.location ? '<span class="task-time task-place" title="Lembrete por local: ' + escapeHtml(t.location.label || "") + '">' + pinIcon() + escapeHtml(t.location.label || "Local") + "</span>" : "";
        card.innerHTML = '<div class="check">' + checkIcon() + '</div><div class="task-body"><div class="task-top">' + timeHtml + locationHtml + '<span class="task-label">' + escapeHtml(t.label) + "</span></div>" + detailHtml + ruleHtml + '</div><button class="alarm-btn' + (alarms2[alarmKey] ? " armed" : "") + '" type="button" aria-label="Lembrete" data-alarm="' + escapeHtml(alarmKey) + '" data-time="' + escapeHtml(t.time) + '" data-label="' + escapeHtml(t.label) + '">' + bellIcon(!!alarms2[alarmKey]) + "</button>";
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
    blocksEl.querySelectorAll(".alarm-btn").forEach(function(btn) {
      btn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        toggleAlarm(btn.dataset.alarm, btn.dataset.time, btn.dataset.label);
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

  // src/geofencing.js
  var _Sync4 = null;
  function setSyncHook4(syncModule) {
    _Sync4 = syncModule;
  }
  var _Api = null;
  function setApiHook(apiModule) {
    _Api = apiModule;
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
    if (_Api && _Api.isLoggedIn && _Api.isLoggedIn()) {
      return _Api.fetch("/places", { method: "GET" }).then(function(data) {
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
    if (_Api && _Api.isLoggedIn && _Api.isLoggedIn()) {
      return _Api.fetch("/places", { method: "GET" }).then(function(data) {
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
    list.push({ id: newId, time: task.time, block: task.block, label: task.label, detail: task.detail, rule: task.rule });
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
        var id = String(item.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "tarefa-" + idx;
        if (seenIds[id]) id = id + "-" + idx;
        seenIds[id] = true;
        return { id, time, block, label, detail, rule };
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
    'O c\xE9rebro com TDAH n\xE3o sustenta bem informa\xE7\xE3o, tempo e motiva\xE7\xE3o internamente \u2014 a solu\xE7\xE3o n\xE3o \xE9 "tentar mais", \xE9 externalizar. Este checklist \xE9 isso aplicado \xE0 sua rotina real.',
    'Prazo que s\xF3 existe na sua cabe\xE7a \xE9 prazo que n\xE3o existe. Coloque hora, alarme ou lembrete vis\xEDvel \u2014 o c\xE9rebro com TDAH reage muito mais ao que v\xEA do que ao que "sabe".',
    "TDAH tem raiz gen\xE9tica forte, n\xE3o \xE9 resultado de falta de car\xE1ter ou de m\xE1 cria\xE7\xE3o. Cobrar mais for\xE7a de vontade de quem j\xE1 est\xE1 se esfor\xE7ando s\xF3 aumenta a frustra\xE7\xE3o sem mudar o resultado.",
    'A dificuldade n\xE3o \xE9 "prestar aten\xE7\xE3o" em geral \u2014 \xE9 sustentar aten\xE7\xE3o quando a tarefa n\xE3o \xE9 interessante nem tem recompensa imediata. Torne a tarefa chata mais curta, mais vis\xEDvel ou com um pr\xEAmio pequeno no final.',
    'Mem\xF3ria de trabalho fraca significa que a informa\xE7\xE3o "escorrega" antes de virar a\xE7\xE3o. Anotar n\xE3o \xE9 frescura nem falta de intelig\xEAncia \u2014 \xE9 a pr\xF3tese que substitui um sistema que naturalmente falha.',
    'TDAH costuma vir com "miopia temporal": o futuro parece distante e pouco real, ent\xE3o o presente sempre ganha. Trazer a consequ\xEAncia futura para perto \u2014 visualiz\xE1-la, escrev\xEA-la, antecip\xE1-la \u2014 ajuda a competir com o impulso do agora.',
    "Antes de reagir, existe uma fra\xE7\xE3o de segundo em que era poss\xEDvel pausar. Treinar essa pausa \u2014 contar at\xE9 tr\xEAs, respirar, sair da sala \u2014 \xE9 treinar o m\xFAsculo que o TDAH deixa mais fraco.",
    'Dificuldade para regular emo\xE7\xE3o faz parte do TDAH, n\xE3o \xE9 "drama" ou instabilidade de car\xE1ter. Nomear o que voc\xEA sente antes de agir j\xE1 reduz a intensidade da resposta.',
    "Recompensa que demora n\xE3o segura a aten\xE7\xE3o de um c\xE9rebro com TDAH tanto quanto recompensa imediata. Quebrar uma meta grande em pequenas vit\xF3rias com retorno r\xE1pido n\xE3o \xE9 fraqueza, \xE9 estrat\xE9gia.",
    "Rotina fixa n\xE3o \xE9 sobre disciplina moral \u2014 \xE9 sobre reduzir decis\xF5es. Cada decis\xE3o nova gasta energia que o c\xE9rebro com TDAH j\xE1 tem em menor reserva.",
    "Come\xE7ar uma tarefa costuma ser mais dif\xEDcil do que execut\xE1-la. Se travar antes de iniciar, tente negociar consigo mesmo s\xF3 os primeiros dois minutos \u2014 o resto costuma vir mais f\xE1cil depois.",
    "Hiperfoco \xE9 a outra face do TDAH: a mesma dificuldade de regular aten\xE7\xE3o que atrapalha em tarefas chatas pode prender voc\xEA por horas em algo que engancha. Use alarmes tamb\xE9m para sair de tarefas boas demais, n\xE3o s\xF3 para lembrar das chatas.",
    'Trocar de atividade exige uma fun\xE7\xE3o executiva que o TDAH enfraquece: desligar de uma coisa para ligar em outra. Um aviso de "faltam 5 minutos" antes da transi\xE7\xE3o facilita esse desligamento.',
    'TDAH raramente vem sozinho \u2014 ansiedade, transtorno opositor, altera\xE7\xF5es de humor e uso de subst\xE2ncias s\xE3o comorbidades frequentes. Se algo al\xE9m da desaten\xE7\xE3o/impulsividade estiver pesando, vale investigar separadamente, n\xE3o s\xF3 rotular tudo como "TDAH".',
    "Sono ruim piora sintomas de TDAH, e TDAH tamb\xE9m dificulta manter um sono regular \u2014 \xE9 uma via de m\xE3o dupla. Proteger hor\xE1rio fixo de dormir \xE9 t\xE3o parte do manejo quanto qualquer lista de tarefas.",
    'Adultos com TDAH costumam ter sido crian\xE7as com TDAH que aprenderam a mascarar sintomas, n\xE3o pessoas que "curaram" o transtorno. Estrat\xE9gias de organiza\xE7\xE3o continuam necess\xE1rias mesmo quando a hiperatividade vis\xEDvel diminuiu com a idade.',
    "Muita gente com TDAH subestima o pr\xF3prio n\xEDvel de dificuldade \u2014 \xE9 um vi\xE9s conhecido, n\xE3o falta de autocr\xEDtica. Pedir feedback de algu\xE9m pr\xF3ximo sobre prazos e combinados pode revelar padr\xF5es que passam despercebidos por dentro.",
    "Planejar um passo de cada vez \xE9 mais realista do que tentar visualizar o caminho inteiro de uma vez. Divida a tarefa em partes pequenas o suficiente para caber na mem\xF3ria de trabalho.",
    "Custo de resposta \u2014 perder algo j\xE1 conquistado por n\xE3o cumprir um combinado \u2014 costuma funcionar melhor do que s\xF3 prometer recompensa por bom comportamento. Pequenas perdas imediatas comunicam mais do que promessas distantes.",
    'Impulsividade n\xE3o \xE9 "falta de educa\xE7\xE3o", \xE9 um freio que engata mais devagar. Ambientes com menos est\xEDmulo e menos tenta\xE7\xE3o por perto reduzem a necessidade de exercer esse freio o tempo todo.',
    "Lista de tarefas na cabe\xE7a compete com tudo que est\xE1 acontecendo agora, e quase sempre perde. Colocar a lista fora da cabe\xE7a \u2014 papel, app, quadro \u2014 tira essa disputa e libera espa\xE7o mental.",
    'O tratamento eficaz do TDAH costuma combinar abordagem comportamental com acompanhamento profissional \u2014 n\xE3o \xE9 escolher entre "for\xE7a de vontade" ou "rem\xE9dio", \xE9 somar estrat\xE9gias que sustentam umas \xE0s outras.',
    "Um ambiente bagun\xE7ado ou barulhento pesa mais sobre um c\xE9rebro com TDAH do que sobre outros, porque ele j\xE1 gasta mais energia filtrando est\xEDmulos. Reduzir bagun\xE7a visual ao redor da tarefa \xE9 reduzir a carga que a aten\xE7\xE3o precisa carregar.",
    'Autoinstru\xE7\xE3o verbal \u2014 "falar" o pr\xF3ximo passo em voz alta ou por escrito \u2014 supre uma fun\xE7\xE3o interna que no TDAH tende a ser mais fraca: a voz que guia o pr\xF3prio comportamento. Narrar a tarefa em voz alta pode parecer bobo, mas ajuda a manter o rumo.',
    "TDAH tem base neurobiol\xF3gica, n\xE3o \xE9 inven\xE7\xE3o recente nem efeito colateral de tela ou tecnologia moderna. Isso n\xE3o significa que telas n\xE3o atrapalhem foco \u2014 significa que o transtorno j\xE1 existia muito antes delas.",
    "Comemorar o progresso pequeno junto com o grande \xE9 importante: c\xE9rebros com TDAH respondem melhor a refor\xE7o frequente do que a uma \xFAnica recompensa distante no fim de um grande projeto. Marque as vit\xF3rias intermedi\xE1rias, n\xE3o s\xF3 a linha de chegada.",
    "Colocar objetos-chave sempre no mesmo lugar vis\xEDvel (chaves, carteira, rem\xE9dio) elimina uma decis\xE3o e uma busca que, de outra forma, consomem aten\xE7\xE3o todos os dias. Ambiente previs\xEDvel poupa fun\xE7\xE3o executiva para o que realmente importa.",
    'Errar um prazo ou esquecer um compromisso n\xE3o \xE9 evid\xEAncia de "personalidade desorganizada" \u2014 \xE9 sintoma esperado de um transtorno reconhecido, com explica\xE7\xE3o neurobiol\xF3gica. Isso n\xE3o tira sua responsabilidade sobre buscar apoio, mas tira o peso da culpa moral.',
    "Em crian\xE7as, TDAH costuma aparecer mais como agita\xE7\xE3o vis\xEDvel; em adultos, mais como inquieta\xE7\xE3o interna, procrastina\xE7\xE3o e dificuldade de organiza\xE7\xE3o. O transtorno muda de forma ao longo da vida, n\xE3o desaparece sozinho.",
    "Dividir uma tarefa grande em etapas com prazos parciais imita, de fora, a fun\xE7\xE3o de planejamento que o TDAH dificulta por dentro. Cada etapa pequena vira um novo ponto de checagem e de ajuste de rota.",
    "TDAH \xE9 tratado melhor como uma condi\xE7\xE3o cont\xEDnua a manejar, n\xE3o como um problema a resolver de uma vez. Ajustar estrat\xE9gias com o tempo \u2014 n\xE3o desistir na primeira que falhou \u2014 \xE9 parte esperada do processo, n\xE3o sinal de fracasso."
  ];
  function principleForDate(date) {
    var d = date || /* @__PURE__ */ new Date();
    var dayOfMonth = d.getDate();
    var index = (dayOfMonth - 1) % PRINCIPLES.length;
    return PRINCIPLES[index];
  }

  // src/exercises.js
  var EXERCISES = [
    'Antes de abrir qualquer aplicativo hoje, escreva \xE0 m\xE3o em um papel vis\xEDvel as 3 tarefas mais importantes do dia \u2014 n\xE3o mais que 3. Externalizar a prioridade compensa a dificuldade de manter isso "na cabe\xE7a".',
    'Escolha uma tarefa que voc\xEA vem adiando e divida-a em pelo menos 4 passos bem pequenos, cada um com verbo de a\xE7\xE3o ("abrir o documento", "escrever o primeiro par\xE1grafo"). Passos pequenos e concretos s\xE3o mais f\xE1ceis de iniciar.',
    'Configure um timer vis\xEDvel (celular, rel\xF3gio, ou at\xE9 um copo com \xE1gua) para uma tarefa que voc\xEA vai fazer agora. Ver o tempo passando substitui o "sentido de tempo" interno que costuma falhar no TDAH.',
    "Quando sentir vontade de responder algo com raiva ou impulsividade hoje, conte at\xE9 10 antes de agir ou espere ler de novo depois de 5 minutos. A pausa \xE9 um substituto externo para a inibi\xE7\xE3o que n\xE3o vem automaticamente.",
    'Escolha um objeto que voc\xEA usa todos os dias (chaves, carteira, \xF3culos) e defina um \xFAnico lugar fixo para ele. Deixe-o l\xE1 hoje mesmo. Um "lar" fixo reduz a carga de mem\xF3ria para lembrar onde as coisas est\xE3o.',
    "Ao terminar uma tarefa hoje, d\xEA a si mesmo uma recompensa pequena e imediata (um caf\xE9, 5 minutos de algo que gosta) antes de passar para a pr\xF3xima. Recompensa atrasada tem pouco efeito \u2014 o refor\xE7o precisa ser r\xE1pido.",
    'Escolha uma transi\xE7\xE3o do seu dia (sair de casa, come\xE7ar a trabalhar, ir dormir) e crie um alerta sonoro ou visual 10 minutos antes dela. Transi\xE7\xF5es s\xE3o pontos de risco de "travar"; um aviso externo ajuda a se preparar.',
    "Antes de come\xE7ar a trabalhar hoje, guarde fisicamente (numa gaveta, outro c\xF4modo) uma fonte de distra\xE7\xE3o espec\xEDfica. Reduzir est\xEDmulos concorrentes no ambiente \xE9 mais eficaz do que s\xF3 confiar na for\xE7a de vontade.",
    'Escolha uma tarefa chata de hoje e diga em voz alta, para si mesmo, o pr\xF3ximo passo antes de faz\xEA-lo. Verbalizar o passo imita a "fala interna" que orienta o comportamento e que costuma ser menos eficaz no TDAH.',
    "Hoje, ao perceber que est\xE1 enrolando com uma tarefa, anote a hora em que come\xE7ou a enrolar e a hora em que efetivamente come\xE7ou. S\xF3 observar essa diferen\xE7a j\xE1 ajuda a construir no\xE7\xE3o real de tempo, sem se julgar.",
    "Escolha um compromisso que costuma esquecer e cadastre agora um alarme ou lembrete com o texto exato do que fazer. Lembretes autom\xE1ticos substituem a mem\xF3ria prospectiva, um ponto fraco comum no TDAH.",
    "Antes de dormir hoje, deixe vis\xEDvel, perto da porta, os itens que precisa levar amanh\xE3. Preparar \xE0 noite tira a decis\xE3o de cima da manh\xE3, quando a autorregula\xE7\xE3o costuma estar mais fragilizada.",
    "Se hoje voc\xEA perceber que est\xE1 prestes a interromper algu\xE9m no meio da fala, tente segurar por 3 segundos antes de falar. Esse intervalo \xE9 treino direto de inibi\xE7\xE3o de resposta.",
    "Escolha uma tarefa longa e use um bloco curto de tempo (15\u201325 minutos) com um intervalo garantido depois. Blocos curtos com pausa reduzem a fadiga da aten\xE7\xE3o sustentada, que se esgota mais r\xE1pido no TDAH.",
    'Hoje, ao sentir uma emo\xE7\xE3o forte, nomeie-a em voz alta ou por escrito ("estou irritado porque isso demorou") antes de reagir. Nomear a emo\xE7\xE3o ativa uma pausa entre sentir e agir.',
    'Escolha um c\xF4modo ou mesa de trabalho e remova, s\xF3 por hoje, tudo que n\xE3o \xE9 necess\xE1rio para a tarefa atual. Menos objetos no campo visual, menos "ganchos" para a aten\xE7\xE3o sair do lugar.',
    'Antes de sair de casa hoje, fa\xE7a uma checagem verbal em voz alta dos itens essenciais ("chave, carteira, celular"). Rotinas verbais fixas reduzem esquecimentos recorrentes sem exigir mem\xF3ria perfeita.',
    'Escolha uma tarefa chata e negocie consigo mesmo um "custo" se n\xE3o a fizer at\xE9 um hor\xE1rio combinado (ex: n\xE3o checar redes sociais at\xE9 terminar). Perder algo de valor costuma motivar mais do que s\xF3 "tentar lembrar".',
    "Hoje, ao acordar, evite checar o celular nos primeiros 10 minutos e escreva uma frase sobre como quer que o dia comece. Adiar o est\xEDmulo mais absorvente do dia d\xE1 espa\xE7o para autorregula\xE7\xE3o antes da sobrecarga.",
    'Escolha uma tarefa que voc\xEA tende a fazer de forma impulsiva e escreva 2 linhas antes de come\xE7ar: "o que eu quero no final" e "primeiro passo". Isso \xE9 um exerc\xEDcio direto de planejamento.',
    'Se hoje surgir um pensamento do tipo "eu devia conseguir fazer isso sem ajuda", anote-o e responda por escrito com um fato: TDAH tem base neurobiol\xF3gica, n\xE3o \xE9 falta de esfor\xE7o. Contestar o mito por escrito ajuda a lembrar que isso n\xE3o \xE9 uma falha pessoal.',
    'Escolha um hor\xE1rio fixo para dormir hoje e configure um alarme "hora de desligar telas" 30 minutos antes. Sono irregular piora diretamente aten\xE7\xE3o e controle de impulsos no dia seguinte.',
    "Hoje, ao iniciar uma tarefa, deixe vis\xEDvel s\xF3 o material daquela tarefa espec\xEDfica na mesa. Reduzir pistas de outras tarefas evita a troca constante de foco.",
    "Escolha uma pessoa (parceiro, amigo, familiar, colega) e pe\xE7a a ela para te lembrar de um compromisso espec\xEDfico hoje. Apoio social como lembrete externo \xE9 uma forma leg\xEDtima de compensar d\xE9ficits de mem\xF3ria.",
    'Se hoje voc\xEA perceber que uma tarefa est\xE1 tomando muito mais tempo do que devia, pare e pergunte por escrito: "isso ainda \xE9 necess\xE1rio ou eu travei em detalhe?". Essa pausa quebra o padr\xE3o de hiperfoco improdutivo.',
    'Escolha uma meta pequena de hoje e, assim que cumprir, marque com um "X" vis\xEDvel em um papel ou aplicativo. Ver o progresso registrado d\xE1 um refor\xE7o visual imediato que a mente por si s\xF3 n\xE3o ret\xE9m bem.',
    'Antes de uma reuni\xE3o, compromisso ou conversa importante hoje, escreva 2 ou 3 pontos que quer lembrar de dizer. Isso externaliza o "roteiro mental" que costuma se perder no meio da fala espont\xE2nea.',
    'Hoje, ao sentir o impulso de come\xE7ar uma tarefa nova antes de terminar a atual, escreva a nova ideia numa lista de "depois" em vez de trocar de tarefa na hora. A lista captura o impulso sem exigir for\xE7a de vontade.',
    "Escolha um momento do dia para se mover fisicamente por 5 minutos (caminhar, alongar, subir escada) antes de uma tarefa que exige concentra\xE7\xE3o. Atividade f\xEDsica breve ajuda a regular o estado de alerta.",
    "Hoje, ao terminar o dia, escreva uma coisa que deu certo, mesmo pequena \u2014 n\xE3o o que faltou fazer. Fechar o dia notando progresso contraria o vi\xE9s de autocr\xEDtica comum em quem convive com TDAH h\xE1 anos.",
    "Escolha uma regra ou combinado que voc\xEA tem com algu\xE9m e, hoje, transforme-a em um lembrete visual f\xEDsico (post-it, cartaz, nota na porta) em vez de depender de lembrar sozinho. Regras vis\xEDveis no ambiente funcionam melhor."
  ];
  function exerciseForDate(date) {
    var d = date || /* @__PURE__ */ new Date();
    var dayOfMonth = d.getDate();
    var index = (dayOfMonth - 1) % EXERCISES.length;
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
      DAYS.forEach(function(d) {
        newTasks[d.key] = [];
      });
      (pull.tasks || []).forEach(function(st) {
        var dayKey = NUM_TO_WD[st.weekday];
        if (!dayKey) return;
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
    function runMigration() {
      if (!Api.isLoggedIn() || migrationDone()) {
        updateStatus();
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
    setApiHook(Api);
    setPlacesOverlayHook(places_overlay_exports);
    renderDayTabs();
    renderBlocks();
    var principleTextEl = document.getElementById("principleText");
    if (principleTextEl) principleTextEl.textContent = principleForDate();
    var exerciseTextEl = document.getElementById("exerciseText");
    if (exerciseTextEl) exerciseTextEl.textContent = exerciseForDate();
    var manifest = {
      name: "Rotina Di\xE1ria \u2014 Apoio TDAH",
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
      else if (tdahInfoOverlay2.classList.contains("show")) closeTdahInfo();
      else if (authOverlay2.classList.contains("show")) closeAuth();
      else if (editOverlay2.classList.contains("show")) closeEditor();
    });
    Sync.init();
  })();
})();
