import {
  DAYS, BLOCK_ORDER,
  buildTasks, todayKeyBR, dayState, effectiveDateForDay,
  saveState, getCurrentDay, setCurrentDay, getStateObj, getAlarmsObj
} from "./tasks.js";
import { toggleAlarm } from "./notifications.js";

// Hook para o módulo Sync (mesmo padrão de tasks.js: evita import circular
// entre render.js e sync.js). Setado por main.js na inicialização.
var _Sync = null;
function setSyncHook(syncModule) {
  _Sync = syncModule;
}

// Hook para o módulo pomodoro.js (mesmo padrão: evita import circular, já
// que pomodoro.js não precisa importar nada de render.js de volta).
var _openPomodoro = null;
function setPomodoroHook(openFn) {
  _openPomodoro = openFn;
}

/* ---------- Rendering ---------- */
var dayTabsEl = document.getElementById("dayTabs");
var blocksEl = document.getElementById("blocksContainer");
var ringFill = document.getElementById("ringFill");
var ringLabel = document.getElementById("ringLabel");
var progressHeadline = document.getElementById("progressHeadline");
var progressSub = document.getElementById("progressSub");

var RING_CIRC = 169.6;

function renderDayTabs() {
  dayTabsEl.innerHTML = "";
  DAYS.forEach(function (d) {
    var btn = document.createElement("button");
    btn.className = "daytab";
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(d.key === getCurrentDay()));
    var isReal = d.key === todayKeyBR();
    btn.innerHTML = (isReal ? '<span class="dot"></span>' : "") + d.label;
    btn.addEventListener("click", function () {
      setCurrentDay(d.key);
      renderDayTabs();
      renderBlocks();
    });
    dayTabsEl.appendChild(btn);
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  var currentDay = getCurrentDay();
  var tasks = buildTasks(currentDay);
  var ds = dayState(effectiveDateForDay(currentDay));
  var alarms = getAlarmsObj();

  blocksEl.innerHTML = "";
  var byBlock = {};
  tasks.forEach(function (t) {
    if (!byBlock[t.block]) byBlock[t.block] = [];
    byBlock[t.block].push(t);
  });

  BLOCK_ORDER.forEach(function (blockName) {
    var items = byBlock[blockName];
    if (!items || !items.length) return;
    var section = document.createElement("div");
    section.className = "block";
    var title = document.createElement("div");
    title.className = "block-title";
    title.innerHTML = escapeHtml(blockName) + '<span class="tag">' + items.length + " itens</span>";
    section.appendChild(title);

    items.forEach(function (t) {
      var alarmKey = currentDay + ":" + t.id;
      var card = document.createElement("div");
      card.className = "task" + (ds[t.id] ? " done" : "");
      card.setAttribute("role", "checkbox");
      card.setAttribute("aria-checked", String(!!ds[t.id]));
      card.tabIndex = 0;

      var detailHtml = t.detail ? '<div class="task-detail">' + escapeHtml(t.detail) + "</div>" : "";
      var ruleHtml = t.rule ? '<span class="task-rule">' + escapeHtml(t.rule) + "</span>" : "";
      var ifThenHtml = t.ifThen ? '<div class="task-if-then">' + escapeHtml(t.ifThen) + "</div>" : "";

      var timeHtml = t.time ? '<span class="task-time">' + escapeHtml(t.time) + '</span>' : "";
      var locationHtml = t.location
        ? '<span class="task-time task-place" title="Lembrete por local: ' + escapeHtml(t.location.label || "") + '">' + pinIcon() + escapeHtml(t.location.label || "Local") + '</span>'
        : "";

      card.innerHTML =
        '<div class="check">' + checkIcon() + '</div>' +
        '<div class="task-body">' +
          '<div class="task-top">' + timeHtml + locationHtml + '<span class="task-label">' + escapeHtml(t.label) + '</span></div>' +
          detailHtml + ifThenHtml + ruleHtml +
        '</div>' +
        '<button class="alarm-btn pomodoro-trigger" type="button" aria-label="Bloco de foco" data-task-label="' + escapeHtml(t.label) + '">' + timerIcon() + '</button>' +
        '<button class="alarm-btn' + (alarms[alarmKey] ? " armed" : "") + '" type="button" aria-label="Lembrete" data-alarm="' + escapeHtml(alarmKey) + '" data-time="' + escapeHtml(t.time) + '" data-label="' + escapeHtml(t.label) + '">' + bellIcon(!!alarms[alarmKey]) + '</button>';

      card.addEventListener("click", function (ev) {
        if (ev.target.closest(".alarm-btn")) return;
        toggleTask(t.id);
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggleTask(t.id); }
      });

      section.appendChild(card);
    });
    blocksEl.appendChild(section);
  });

  blocksEl.querySelectorAll(".alarm-btn:not(.pomodoro-trigger)").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleAlarm(btn.dataset.alarm, btn.dataset.time, btn.dataset.label);
    });
  });
  blocksEl.querySelectorAll(".pomodoro-trigger").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (_openPomodoro) _openPomodoro(btn.dataset.taskLabel);
    });
  });

  updateProgress();
}

function toggleTask(id) {
  var currentDay = getCurrentDay();
  var dateISO = effectiveDateForDay(currentDay);
  var ds = dayState(dateISO);
  ds[id] = !ds[id];
  saveState(getStateObj());
  // Sync (Fase 6): só sincroniza datas reais (não os pseudo-dias "template-*").
  if (_Sync && dateISO.indexOf("template-") !== 0) {
    _Sync.onCompletionChanged(id, dateISO, !!ds[id]);
  }
  renderBlocks();
}

function updateProgress() {
  var currentDay = getCurrentDay();
  var tasks = buildTasks(currentDay);
  var ds = dayState(effectiveDateForDay(currentDay));
  var total = tasks.length;
  var done = tasks.filter(function (t) { return ds[t.id]; }).length;
  var pct = total ? Math.round((done / total) * 100) : 0;
  var offset = RING_CIRC - (RING_CIRC * pct) / 100;
  ringFill.style.strokeDashoffset = String(offset);
  ringLabel.textContent = pct + "%";
  progressSub.textContent = done + " de " + total + " concluídas";
  progressSub.textContent += currentDay === todayKeyBR() ? " hoje" : " (" + DAYS.find(function (d) { return d.key === currentDay; }).label + ")";

  var headline;
  if (pct === 0) headline = "Vamos começar";
  else if (pct < 50) headline = "Em andamento";
  else if (pct < 100) headline = "Bom progresso";
  else headline = "Dia concluído";
  progressHeadline.textContent = headline;

  renderStreak();
}

var streakRowEl = document.getElementById("streakRow");
function renderStreak() {
  streakRowEl.innerHTML = "";
  var weekdayKeys = ["seg", "ter", "qua", "qui", "sex"];
  var todayKey = todayKeyBR();
  var state = getStateObj();
  weekdayKeys.forEach(function (dayKey) {
    // Usa a mesma resolucao de chave do resto do app: dia real (data ISO) só
    // para "hoje"; os demais dias da semana usam o pseudo-dia "template-*"
    // onde as marcacoes de preview/edicao desses dias sao de fato gravadas.
    var dateISO = effectiveDateForDay(dayKey);
    var ds = state[dateISO] || {};
    var tasks = buildTasks(dayKey);
    var total = tasks.length;
    var done = tasks.filter(function (t) { return ds[t.id]; }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    var cell = document.createElement("div");
    cell.className = "streak-day" + (pct === 100 ? " full" : pct > 0 ? " partial" : "") + (dayKey === todayKey ? " today" : "");
    cell.innerHTML = '<div class="d-label">' + DAYS.find(function (x) { return x.key === dayKey; }).label.slice(0, 3) + '</div><div class="d-pct">' + pct + '%</div>';
    streakRowEl.appendChild(cell);
  });
}

document.getElementById("resetBtn").addEventListener("click", function () {
  var currentDay = getCurrentDay();
  var dateISO = effectiveDateForDay(currentDay);
  if (!confirm("Reiniciar o checklist de " + (currentDay === todayKeyBR() ? "hoje" : DAYS.find(function (d) { return d.key === currentDay; }).label) + "?")) return;
  var state = getStateObj();
  state[dateISO] = {};
  saveState(state);
  renderBlocks();
});

export { renderDayTabs, renderBlocks, updateProgress, renderStreak, toggleTask, escapeHtml, checkIcon, bellIcon, pinIcon, timerIcon, setSyncHook, setPomodoroHook };
