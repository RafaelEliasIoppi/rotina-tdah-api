import {
  todayKeyBR, isoDate, saveAlarms, getAlarmsObj,
  getCurrentDay, setCurrentDay, getCurrentDateISO, setCurrentDateISO
} from "./tasks.js";
import { renderDayTabs, renderBlocks } from "./render.js";

// Hook para o módulo Sync (mesmo padrão de tasks.js/render.js).
var _Sync = null;
function setSyncHook(syncModule) {
  _Sync = syncModule;
}

var clockEl = document.getElementById("clock");
var toastEl = document.getElementById("toast");

/* ---------- Clock ---------- */
function tickClock() {
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, "0");
  var mm = String(now.getMinutes()).padStart(2, "0");
  clockEl.textContent = hh + ":" + mm;

  // Detect day rollover
  var iso = isoDate();
  if (iso !== getCurrentDateISO()) {
    setCurrentDateISO(iso);
    setCurrentDay(todayKeyBR());
    renderDayTabs();
    renderBlocks();
  }
  checkDueAlarms(now);
}

/* ---------- Notifications / Alarms ---------- */
var notifyBanner = document.getElementById("notifyBanner");
var notifyBtn = document.getElementById("notifyBtn");
var firedToday = {}; // avoid repeat fires within same minute window (web fallback only)

var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
var LocalNotifications = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;

function notifSupported() {
  if (isNative) return !!LocalNotifications;
  return "Notification" in window;
}

function updateNotifyBanner() {
  if (!notifSupported()) { notifyBanner.classList.remove("show"); return; }
  if (isNative) {
    LocalNotifications.checkPermissions().then(function (res) {
      notifyBanner.classList.toggle("show", res.display !== "granted");
    });
    var bannerText = notifyBanner.querySelector("span");
    if (bannerText) bannerText.textContent = "Ative notificações para receber lembretes garantidos, mesmo com o app fechado.";
    return;
  }
  notifyBanner.classList.toggle("show", Notification.permission === "default");
}

notifyBtn.addEventListener("click", function () {
  if (!notifSupported()) return;
  if (isNative) {
    LocalNotifications.requestPermissions().then(function (res) {
      updateNotifyBanner();
      showToast(res.display === "granted" ? "Notificações ativadas." : "Permissão não concedida.");
      if (res.display === "granted") rescheduleAllNativeAlarms();
    });
    return;
  }
  Notification.requestPermission().then(function () {
    updateNotifyBanner();
    showToast(Notification.permission === "granted" ? "Notificações ativadas." : "Permissão não concedida.");
  });
});

// Stable 32-bit int id for native scheduling, derived from the "dia:tarefa" key.
function alarmNativeId(key) {
  var h = 0;
  for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) | 0; }
  return Math.abs(h) % 2147483647;
}

var WEEKDAY_NUM = { seg: 2, ter: 3, qua: 4, qui: 5, sex: 6 }; // JS-ish: 1=Sun..7=Sat (Capacitor "on.weekday" 1-7, Sun=1)

function scheduleNativeAlarm(key, time, label) {
  if (!LocalNotifications) return;
  var parts = key.split(":");
  var dayKey = parts[0];
  var hh = parseInt(time.split(":")[0], 10);
  var mm = parseInt(time.split(":")[1], 10);
  LocalNotifications.schedule({
    notifications: [{
      id: alarmNativeId(key),
      title: "Rotina TDAH — " + time,
      body: label,
      schedule: { on: { weekday: WEEKDAY_NUM[dayKey], hour: hh, minute: mm }, allowWhileIdle: true },
      sound: null
    }]
  }).catch(function () {});
}
function cancelNativeAlarm(key) {
  if (!LocalNotifications) return;
  LocalNotifications.cancel({ notifications: [{ id: alarmNativeId(key) }] }).catch(function () {});
}
function rescheduleAllNativeAlarms() {
  if (!LocalNotifications) return;
  var alarms = getAlarmsObj();
  Object.keys(alarms).forEach(function (key) {
    scheduleNativeAlarm(key, alarms[key].time, alarms[key].label);
  });
}

function toggleAlarm(key, time, label) {
  var alarms = getAlarmsObj();
  if (alarms[key]) {
    delete alarms[key];
    if (isNative) cancelNativeAlarm(key);
  } else {
    alarms[key] = { time: time, label: label };
    if (isNative) {
      LocalNotifications.checkPermissions().then(function (res) {
        if (res.display === "granted") { scheduleNativeAlarm(key, time, label); return; }
        LocalNotifications.requestPermissions().then(function (r2) {
          if (r2.display === "granted") scheduleNativeAlarm(key, time, label);
          updateNotifyBanner();
        });
      });
    } else if (notifSupported() && Notification.permission === "default") {
      Notification.requestPermission().then(updateNotifyBanner);
    }
  }
  saveAlarms(alarms);
  // Sync (Fase 6): reflete o lembrete no servidor (upsert enabled / delete).
  if (_Sync) {
    _Sync.onAlarmChanged(key, time, label, !!alarms[key]);
  }
  renderBlocks();
  showToast(alarms[key] ? "Lembrete ativado para " + time : "Lembrete removido");
}

function checkDueAlarms(now) {
  // Native alarms are scheduled with the OS and fire independently — nothing to poll here.
  if (isNative) return;
  var alarms = getAlarmsObj();
  var realDay = todayKeyBR();
  var hh = String(now.getHours()).padStart(2, "0");
  var mm = String(now.getMinutes()).padStart(2, "0");
  var nowHM = hh + ":" + mm;

  Object.keys(alarms).forEach(function (key) {
    var parts = key.split(":");
    var dayKey = parts[0];
    if (dayKey !== realDay) return;
    var a = alarms[key];
    if (a.time !== nowHM) return;
    var fireFlag = key + "@" + getCurrentDateISO();
    if (firedToday[fireFlag]) return;
    firedToday[fireFlag] = true;
    fireReminder(a.label, a.time);
  });
}

function fireReminder(label, time) {
  showToast("⏰ " + time + " — " + label);
  if (notifSupported() && Notification.permission === "granted") {
    try {
      var n = new Notification("Rotina TDAH — " + time, { body: label, tag: "rotina-" + time });
    } catch (e) { /* some browsers require SW-based notifications; toast covers fallback */ }
  }
  if (navigator.vibrate) { try { navigator.vibrate([120, 60, 120]); } catch (e) {} }
}

var toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
}

function initNotifications() {
  updateNotifyBanner();
  setInterval(tickClock, 15000);
  tickClock();
  if (isNative && LocalNotifications) {
    LocalNotifications.checkPermissions().then(function (res) {
      if (res.display === "granted") rescheduleAllNativeAlarms();
    });
  }
}

export {
  tickClock, toggleAlarm, checkDueAlarms, fireReminder, showToast,
  notifSupported, updateNotifyBanner, rescheduleAllNativeAlarms,
  isNative, LocalNotifications, initNotifications, setSyncHook
};
