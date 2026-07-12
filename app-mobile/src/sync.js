import { AppStorage } from "./storage.js";
import { Api } from "./api.js";
import {
  DAYS,
  saveTasksByDay, saveState, saveAlarms,
  getTasksByDay, setTasksByDay, getStateObj, setStateObj, getAlarmsObj, setAlarmsObj,
  todayKeyBR, setCurrentDay
} from "./tasks.js";
import { renderDayTabs, renderBlocks } from "./render.js";
import { showToast, isNative, rescheduleAllNativeAlarms } from "./notifications.js";

/* ========================================================================
 * FASE 6 — Sincronização cliente: migração one-time + outbox + status.
 *
 * Princípios rígidos:
 *  - Offline-first: sem rede/sem login o app funciona 100% igual a antes.
 *    Nada aqui bloqueia a UI; todas as escritas locais continuam instantâneas.
 *  - Migração ADITIVA e segura: NUNCA descarta dado local antes de confirmar
 *    o upload remoto com sucesso. Em qualquer erro de rede, aborta sem tocar
 *    no estado local e tenta de novo no próximo login.
 *  - Idempotência: a outbox usa upsert/delete (o backend protege via
 *    UNIQUE/upsert), então reenvio não duplica.
 *
 * Decisão para o caso "local TEM dados E remoto TEM dados":
 *    NÃO fazemos merge automático (arriscado — poderia duplicar/embaralhar a
 *    rotina que o usuário já montou nos dois lados). O servidor é a fonte de
 *    verdade: baixamos (pull) e só DEPOIS de baixar com sucesso substituímos
 *    o estado local pelos dados da conta, avisando o usuário por toast. O
 *    dado local anterior nunca é apagado antes do download remoto estar OK.
 * ====================================================================== */
var Sync = (function () {
  // Mapa bidirecional weekday: cliente 'seg'..'dom' <-> servidor 1..7.
  var WD_TO_NUM = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };
  var NUM_TO_WD = { 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab", 7: "dom" };

  var statusEl = document.getElementById("syncStatus");
  var flushTimer = null;
  var routineDirtyTimer = null;
  var flushing = false;
  var periodicStarted = false;

  /* ---------- Outbox (localStorage) ---------- */
  function loadOutbox() {
    return AppStorage.getOutbox();
  }
  function saveOutbox(arr) {
    AppStorage.setOutbox(arr);
  }
  function outboxCount() { return loadOutbox().length; }

  // Enfileira uma mutação. Faz "coalescing" por chave lógica (entity+identidade)
  // para não acumular mutações redundantes da mesma entidade.
  function enqueueMutation(entity, op, data) {
    var box = loadOutbox();
    var k = mutationKey(entity, data);
    box = box.filter(function (m) { return mutationKey(m.entity, m.data) !== k; });
    box.push({
      id: "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
      entity: entity,
      op: op,
      data: data,
      clientUpdatedAt: new Date().toISOString()
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

  /* ---------- Status indicator ---------- */
  function isOnline() { return navigator.onLine !== false; }

  function updateStatus() {
    if (!statusEl) return;
    if (!Api.isLoggedIn()) { statusEl.hidden = true; return; }
    statusEl.hidden = false;
    var pending = outboxCount();
    statusEl.classList.remove("synced", "pending", "offline", "syncing");
    if (!isOnline()) {
      statusEl.classList.add("offline");
      statusEl.textContent = "offline";
      statusEl.title = "Sem conexão — " + pending + " alteração(ões) na fila";
    } else if (flushing && pending) {
      statusEl.classList.add("syncing");
      statusEl.textContent = "sincronizando";
      statusEl.title = "Enviando alterações…";
    } else if (pending) {
      statusEl.classList.add("pending");
      statusEl.textContent = "pendente";
      statusEl.title = pending + " alteração(ões) aguardando envio";
    } else {
      statusEl.classList.add("synced");
      statusEl.textContent = "sincronizado";
      statusEl.title = "Tudo sincronizado";
    }
  }

  /* ---------- Push da outbox (best-effort, com retry) ---------- */
  function flushOutbox() {
    if (flushing) return Promise.resolve();
    if (!Api.isLoggedIn() || !isOnline()) { updateStatus(); return Promise.resolve(); }
    var box = loadOutbox();
    if (!box.length) { updateStatus(); return Promise.resolve(); }

    flushing = true;
    updateStatus();

    var mutations = box.map(function (m) {
      return { entity: m.entity, op: m.op, data: m.data, clientUpdatedAt: m.clientUpdatedAt };
    });
    var sentIds = box.map(function (m) { return m.id; });

    return Api.fetch("/sync/push", { method: "POST", body: { mutations: mutations } })
      .then(function () {
        // Sucesso: remove exatamente as mutações que enviamos (preserva as que
        // possam ter sido enfileiradas durante o envio).
        var current = loadOutbox();
        var sentSet = {};
        sentIds.forEach(function (id) { sentSet[id] = true; });
        saveOutbox(current.filter(function (m) { return !sentSet[m.id]; }));
      })
      .catch(function (err) {
        // NetworkError / offline / servidor fora: mantém a outbox intacta e
        // tenta de novo depois. Erros de sessão são tratados pelo Api.
        if (err && err.isNetworkError) return;
        // ApiError não-rede (ex.: 400 numa mutação malformada): registra e
        // segue — não trava a fila para sempre. Como usamos apenas op/data
        // bem-formados, isso não deve acontecer no fluxo normal.
      })
      .then(function () {
        flushing = false;
        updateStatus();
      });
  }

  /* ---------- Hooks vindos dos pontos de escrita ---------- */
  function onCompletionChanged(taskId, dateISO, done) {
    if (!Api.isLoggedIn()) return; // deslogado: outbox inativa, só local.
    enqueueMutation("completion", "upsert", { taskId: taskId, date: dateISO, done: !!done });
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
      taskId: taskId, weekday: weekday, time: time, label: label, enabled: !!enabled
    });
    scheduleFlush();
  }

  // Edição de rotina: como PUT /routine/tasks substitui o conjunto inteiro e
  // envolve reconciliação de ids uuid, empurramos a rotina inteira via REST
  // (não via outbox de mutações granulares) de forma debounced.
  function onRoutineChanged() {
    if (!Api.isLoggedIn() || !migrationDone()) return;
    clearTimeout(routineDirtyTimer);
    routineDirtyTimer = setTimeout(function () {
      pushRoutine().catch(function () {});
    }, 1200);
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(function () { flushOutbox(); }, 800);
  }

  /* ---------- Envio da rotina inteira + reconciliação de ids ---------- */
  // Converte tasksByDay local -> payload do servidor (com weekday numérico).
  function localTasksToPayload() {
    var tasksByDay = getTasksByDay();
    var out = [];
    Object.keys(tasksByDay).forEach(function (dayKey) {
      var wd = WD_TO_NUM[dayKey];
      if (!wd) return;
      (tasksByDay[dayKey] || []).forEach(function (t, idx) {
        out.push({
          id: t.id, weekday: wd, time: t.time, label: t.label,
          block: t.block, detail: t.detail || "", rule: t.rule || "", sortOrder: idx
        });
      });
    });
    return out;
  }

  // Assinatura estável para casar task local <-> task retornada pelo servidor.
  function taskSig(weekday, time, label, block) {
    return weekday + "|" + time + "|" + label + "|" + (block || "");
  }

  // Aplica o mapeamento de ids antigos->novos em tasksByDay, state e alarms.
  // Exemplo: "acordar" -> uuid  =>  state["2026-07-11"]["acordar"] vira
  // state["2026-07-11"][uuid]; alarms["seg:acordar"] vira alarms["seg:uuid"].
  function reconcileIds(idMap) {
    var changed = false;
    var tasksByDay = getTasksByDay();
    var state = getStateObj();
    var alarms = getAlarmsObj();
    // 1) tasksByDay
    Object.keys(tasksByDay).forEach(function (dayKey) {
      (tasksByDay[dayKey] || []).forEach(function (t) {
        if (idMap[t.id] && idMap[t.id] !== t.id) { t.id = idMap[t.id]; changed = true; }
      });
    });
    // 2) state (progresso por data) — reindexar chaves de taskId.
    Object.keys(state).forEach(function (dateKey) {
      var ds = state[dateKey];
      if (!ds || typeof ds !== "object") return;
      Object.keys(ds).forEach(function (oldTaskId) {
        var newId = idMap[oldTaskId];
        if (newId && newId !== oldTaskId) {
          ds[newId] = ds[oldTaskId];
          delete ds[oldTaskId];
          changed = true;
        }
      });
    });
    // 3) alarms ("day:taskId") — reconstruir a chave com o novo id.
    Object.keys(alarms).forEach(function (alarmKey) {
      var idx = alarmKey.indexOf(":");
      if (idx < 0) return;
      var dayKey = alarmKey.slice(0, idx);
      var oldTaskId = alarmKey.slice(idx + 1);
      var newId = idMap[oldTaskId];
      if (newId && newId !== oldTaskId) {
        var newKey = dayKey + ":" + newId;
        alarms[newKey] = alarms[alarmKey];
        delete alarms[alarmKey];
        changed = true;
      }
    });
    if (changed) {
      saveTasksByDay(tasksByDay);
      saveState(state);
      saveAlarms(alarms);
    }
    return changed;
  }

  // Constrói o idMap a partir das tasks locais enviadas e das tasks retornadas
  // pelo servidor (com uuid). Casa por assinatura; empata por ordem (sortOrder).
  function buildIdMap(sentPayload, serverTasks) {
    var idMap = {};
    // Agrupa tasks do servidor por assinatura -> fila de uuids disponíveis.
    var bySig = {};
    (serverTasks || []).forEach(function (st) {
      var sig = taskSig(st.weekday, st.time, st.label, st.block);
      if (!bySig[sig]) bySig[sig] = [];
      bySig[sig].push(st);
    });
    Object.keys(bySig).forEach(function (sig) {
      bySig[sig].sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    });
    sentPayload.forEach(function (local) {
      var sig = taskSig(local.weekday, local.time, local.label, local.block);
      var queue = bySig[sig];
      if (queue && queue.length) {
        var st = queue.shift();
        if (st && st.id) idMap[local.id] = st.id;
      }
    });
    return idMap;
  }

  // PUT /routine/tasks com as tasks locais; adota os ids uuid retornados.
  function pushRoutine() {
    if (!Api.isLoggedIn()) return Promise.resolve();
    var payload = localTasksToPayload();
    return Api.fetch("/routine/tasks", { method: "PUT", body: { tasks: payload } })
      .then(function (resp) {
        var serverTasks = resp && resp.tasks;
        if (serverTasks && serverTasks.length) {
          var idMap = buildIdMap(payload, serverTasks);
          reconcileIds(idMap);
        }
        return resp;
      });
  }

  /* ---------- Migração one-time por conta ---------- */
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
    if (uid) { AppStorage.setMigratedUserId(uid); }
  }

  // Coleta as completions locais que devem ir ao servidor (apenas datas reais
  // marcadas como true; pseudo-dias "template-*" ficam só locais).
  function localCompletions() {
    var state = getStateObj();
    var out = [];
    Object.keys(state).forEach(function (dateKey) {
      if (dateKey.indexOf("template-") === 0) return;
      var ds = state[dateKey];
      if (!ds || typeof ds !== "object") return;
      Object.keys(ds).forEach(function (taskId) {
        if (ds[taskId]) out.push({ taskId: taskId, date: dateKey });
      });
    });
    return out;
  }
  // Coleta os alarmes locais como reminders para o servidor.
  function localReminders() {
    var alarms = getAlarmsObj();
    var out = [];
    Object.keys(alarms).forEach(function (alarmKey) {
      var idx = alarmKey.indexOf(":");
      if (idx < 0) return;
      var dayKey = alarmKey.slice(0, idx);
      var taskId = alarmKey.slice(idx + 1);
      var wd = WD_TO_NUM[dayKey];
      if (!wd) return;
      var a = alarms[alarmKey];
      out.push({ taskId: taskId, weekday: wd, time: a.time, label: a.label });
    });
    return out;
  }

  // Sobe completions e reminders um a um. Se algum falhar por rede, propaga o
  // erro (o chamador aborta a migração sem marcar como concluída).
  function uploadCompletionsAndReminders() {
    var comps = localCompletions();
    var rems = localReminders();
    var chain = Promise.resolve();
    comps.forEach(function (c) {
      chain = chain.then(function () {
        return Api.fetch("/completions", { method: "PUT", body: { taskId: c.taskId, date: c.date, done: true } });
      });
    });
    rems.forEach(function (r) {
      chain = chain.then(function () {
        return Api.fetch("/reminders", { method: "PUT", body: {
          taskId: r.taskId, enabled: true, time: r.time, weekday: r.weekday, label: r.label
        } });
      });
    });
    return chain;
  }

  // Substitui o estado local pelos dados baixados do servidor (usado quando a
  // conta remota já tem rotina). Só é chamado APÓS um pull bem-sucedido.
  function adoptServerData(pull) {
    // Rotina/tasks -> tasksByDay. Dedup defensiva por (weekday, time, label):
    // mesmo com a constraint única no banco (migration 0006), o cliente não
    // deve confiar cegamente — se algum dado antigo/duplicado ainda chegar
    // por qualquer via, a UI nunca deve mostrar horários repetidos.
    var newTasks = {};
    var seen = {};
    DAYS.forEach(function (d) { newTasks[d.key] = []; });
    (pull.tasks || []).forEach(function (st) {
      var dayKey = NUM_TO_WD[st.weekday];
      if (!dayKey) return;
      var sig = dayKey + "|" + st.time + "|" + st.label;
      if (seen[sig]) return;
      seen[sig] = true;
      if (!newTasks[dayKey]) newTasks[dayKey] = [];
      newTasks[dayKey].push({
        id: st.id, time: st.time, label: st.label,
        block: st.block, detail: st.detail || "", rule: st.rule || ""
      });
    });
    setTasksByDay(newTasks);
    saveTasksByDay(newTasks);

    // Completions -> state (por data real).
    var state = getStateObj();
    var newState = {};
    (pull.completions || []).forEach(function (c) {
      if (!c.done) return;
      if (!newState[c.date]) newState[c.date] = {};
      newState[c.date][c.taskId] = true;
    });
    // Preserva progresso local dos pseudo-dias "template-*" (só visual local).
    Object.keys(state).forEach(function (k) {
      if (k.indexOf("template-") === 0) newState[k] = state[k];
    });
    setStateObj(newState);
    saveState(newState);

    // Reminders -> alarms.
    var newAlarms = {};
    (pull.reminders || []).forEach(function (r) {
      if (r.enabled === false) return;
      var dayKey = NUM_TO_WD[r.weekday];
      if (!dayKey) return;
      newAlarms[dayKey + ":" + r.taskId] = { time: r.time, label: r.label };
    });
    setAlarmsObj(newAlarms);
    saveAlarms(newAlarms);

    if (isNative) { try { rescheduleAllNativeAlarms(); } catch (e) {} }
  }

  // Correção one-time (2026-07-12): dispositivos que já concluíram a migração
  // normal antes da correção de duplicação de tarefas (ver bug documentado —
  // migration 0006_dedupe_tasks.sql) podem ter tarefas 2x salvas localmente.
  // migrationDone() bloquearia um novo pull nesse caso; esta checagem
  // separada força exatamente UM re-pull do servidor (já limpo) por
  // dispositivo, sem reabrir o fluxo normal de sync depois disso.
  function runDedupeFixIfNeeded() {
    if (!Api.isLoggedIn() || AppStorage.getDedupeFixApplied()) return Promise.resolve();
    return Api.fetch("/sync/pull", { method: "POST", body: {} }).then(function (pull) {
      if (pull && pull.tasks && pull.tasks.length > 0) {
        adoptServerData(pull);
        setCurrentDay(todayKeyBR());
        renderDayTabs();
        renderBlocks();
      }
      AppStorage.setDedupeFixApplied();
    }).catch(function () {
      // Falha de rede: tenta de novo no próximo boot (chave só é marcada em caso de sucesso).
    });
  }

  // Executa a migração one-time. Resiliente: qualquer falha de rede aborta sem
  // corromper o estado local, e tentará de novo no próximo login/flush.
  function runMigration() {
    if (!Api.isLoggedIn() || migrationDone()) { updateStatus(); runDedupeFixIfNeeded(); return; }

    Api.fetch("/sync/pull", { method: "POST", body: {} }).then(function (pull) {
      var remoteHasTasks = pull && pull.tasks && pull.tasks.length > 0;

      if (!remoteHasTasks) {
        // Conta remota VAZIA: sobe os dados locais (upload aditivo).
        // 1) tasks -> recebe uuids -> reconcilia ids em state/alarms
        // 2) só então sobe completions/reminders (já com os ids novos).
        return pushRoutine().then(function () {
          return uploadCompletionsAndReminders();
        }).then(function () {
          markMigrated();
          showToast("Rotina enviada para sua conta.");
        });
      }

      // Conta remota JÁ TEM dados: servidor é a fonte de verdade.
      // NÃO fazemos merge automático. Adotamos o remoto (após pull OK).
      adoptServerData(pull);
      markMigrated();
      setCurrentDay(todayKeyBR());
      renderDayTabs();
      renderBlocks();
      showToast("Rotina da sua conta carregada.");
    }).catch(function (err) {
      // Falha de rede / servidor: aborta silenciosamente. Estado local intacto.
      // Migração será re-tentada no próximo login ou ao voltar a ficar online.
      if (!(err && err.isNetworkError)) {
        // Erro não-rede (ex.: sessão): também mantém local intacto.
      }
    }).then(function () {
      updateStatus();
    });
  }

  /* ---------- Reações a login/logout e conectividade ---------- */
  function onSessionChange(session) {
    if (session && session.user) {
      // Login: tenta migração one-time (segura) e depois esvazia a outbox.
      runMigration();
      scheduleFlush();
    }
    updateStatus();
  }

  function startPeriodic() {
    if (periodicStarted) return;
    periodicStarted = true;
    // Retry periódico enquanto o app está aberto (best-effort).
    setInterval(function () {
      if (Api.isLoggedIn() && isOnline() && outboxCount()) flushOutbox();
    }, 30000);
    // Retry ao voltar a ficar online.
    window.addEventListener("online", function () {
      updateStatus();
      if (Api.isLoggedIn()) { runMigration(); flushOutbox(); }
    });
    window.addEventListener("offline", updateStatus);
  }

  function init() {
    /* ---------- Bootstrap ---------- */
    Api.onChange(onSessionChange);
    startPeriodic();
    updateStatus();
    // Se já estava logado ao abrir (sessão persistida), tenta migração + flush.
    if (Api.isLoggedIn()) {
      runMigration();
      scheduleFlush();
    }
  }

  return {
    init: init,
    onCompletionChanged: onCompletionChanged,
    onAlarmChanged: onAlarmChanged,
    onRoutineChanged: onRoutineChanged,
    flushOutbox: flushOutbox,
    enqueueMutation: enqueueMutation
  };
})();

export { Sync };
