import { showToast } from "./notifications.js";

// Timer Pomodoro adaptativo: começa curto (10 min) para reduzir a fricção
// de início de tarefa — um dos maiores obstáculos citados no Manual Barkley
// — e permite estender em blocos de 10 min se o usuário ainda estiver
// produtivo, em vez de cortar o fluxo/hiperfoco no meio como um Pomodoro
// fixo de 25 min faria. Duração inicial curta + extensão opcional é a
// recomendação clínica citada na literatura (ver memória de pesquisa
// "novas funcionalidades" — Pomodoro adaptativo, prioridade alta).

var START_MINUTES = 10;
var EXTEND_MINUTES = 10;
var RING_CIRC = 2 * Math.PI * 54; // r=54 no SVG do modal

var pomodoroOverlay = document.getElementById("pomodoroOverlay");
var pomodoroCloseBtn = document.getElementById("pomodoroCloseBtn");
var pomodoroTaskLabel = document.getElementById("pomodoroTaskLabel");
var pomodoroRingFill = document.getElementById("pomodoroRingFill");
var pomodoroTimeEl = document.getElementById("pomodoroTime");
var pomodoroPhaseEl = document.getElementById("pomodoroPhase");
var pomodoroStartBtn = document.getElementById("pomodoroStartBtn");
var pomodoroPauseBtn = document.getElementById("pomodoroPauseBtn");
var pomodoroExtendBtn = document.getElementById("pomodoroExtendBtn");

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
  pomodoroRingFill.style.strokeDasharray = String(RING_CIRC);
  pomodoroRingFill.style.strokeDashoffset = String(RING_CIRC * (1 - pct));
  pomodoroPhaseEl.textContent = extensions === 0
    ? "Bloco curto para começar"
    : "Estendido " + extensions + "x — ainda no ritmo";
}

function tick() {
  remainingSeconds -= 1;
  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    renderPomodoroState();
    stopTicking();
    pomodoroPhaseEl.textContent = "Tempo esgotado — ainda produtivo?";
    pomodoroStartBtn.style.display = "none";
    pomodoroPauseBtn.style.display = "none";
    pomodoroExtendBtn.style.display = "";
    showToast("⏱️ Bloco de foco encerrado. Continuar? Estenda +10 min ou feche.");
    if (navigator.vibrate) { try { navigator.vibrate([120, 60, 120]); } catch (e) {} }
    return;
  }
  renderPomodoroState();
}

function startTicking() {
  if (tickHandle) return;
  running = true;
  tickHandle = setInterval(tick, 1000);
  pomodoroStartBtn.style.display = "none";
  pomodoroPauseBtn.style.display = "";
  pomodoroExtendBtn.style.display = "none";
}
function stopTicking() {
  running = false;
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}

pomodoroStartBtn.addEventListener("click", function () {
  startTicking();
});
pomodoroPauseBtn.addEventListener("click", function () {
  stopTicking();
  pomodoroStartBtn.style.display = "";
  pomodoroPauseBtn.style.display = "none";
});
pomodoroExtendBtn.addEventListener("click", function () {
  extensions += 1;
  remainingSeconds = EXTEND_MINUTES * 60;
  totalSeconds = EXTEND_MINUTES * 60;
  renderPomodoroState();
  startTicking();
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
  pomodoroOverlay.classList.add("show");
}

function closePomodoro() {
  stopTicking();
  pomodoroOverlay.classList.remove("show");
}

function initPomodoro() {
  pomodoroCloseBtn.addEventListener("click", closePomodoro);
  pomodoroOverlay.addEventListener("click", function (ev) {
    if (ev.target === pomodoroOverlay) closePomodoro();
  });
}

export { initPomodoro, openPomodoro, closePomodoro, pomodoroOverlay };
