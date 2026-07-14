import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '..', 'state');
const NOTIFIED_FILE = join(STATE_DIR, 'notified.json');

// Intl.DateTimeFormat só aceita 'long'/'short'/'narrow' para weekday — não
// 'numeric' (isso lança RangeError). Pegamos o nome curto em inglês (estável,
// não depende de locale) e convertemos pro número 1=segunda..7=domingo, igual
// ao resto do projeto (ver reminders.schema.js).
const WEEKDAY_MAP = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function getSaoPauloNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);

  let weekday = 0;
  let hour = '00';
  let minute = '00';

  for (const p of parts) {
    if (p.type === 'weekday') weekday = WEEKDAY_MAP[p.value] ?? 0;
    if (p.type === 'hour') hour = p.value.padStart(2, '0');
    if (p.type === 'minute') minute = p.value.padStart(2, '0');
  }

  // Alguns runtimes ICU retornam "24" (com hour12:false) para meia-noite
  // em vez de "00" — normaliza pra não quebrar a comparação de horário.
  if (hour === '24') hour = '00';

  const time = `${hour}:${minute}`;
  return { weekday, time, now };
}

function getDateKey() {
  const { now } = getSaoPauloNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadNotified() {
  try {
    if (existsSync(NOTIFIED_FILE)) {
      return JSON.parse(readFileSync(NOTIFIED_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveNotified(notified) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(NOTIFIED_FILE, JSON.stringify(notified, null, 2), 'utf-8');
}

function cleanNotified() {
  const today = getDateKey();
  const notified = loadNotified();
  let changed = false;

  for (const key of Object.keys(notified)) {
    const date = key.split(':')[1];
    if (date !== today) {
      delete notified[key];
      changed = true;
    }
  }

  if (changed) {
    saveNotified(notified);
  }
}

export function createScheduler(remindersSync, sendReminder) {
  let tickInterval = null;

  function tick() {
    const { weekday, time } = getSaoPauloNow();
    const today = getDateKey();
    const reminders = remindersSync.getReminders();

    const due = reminders.filter(
      (r) => r.weekday === weekday && r.time === time,
    );

    if (due.length === 0) return;

    const notified = loadNotified();

    for (const reminder of due) {
      const key = `${reminder.taskId}:${today}`;

      if (notified[key]) {
        continue;
      }

      const label = reminder.label || `Tarefa`;
      try {
        sendReminder(label, reminder.time);
        notified[key] = true;
        console.log(
          `[scheduler] Lembrete disparado: "${label}" às ${reminder.time}`,
        );
      } catch (err) {
        console.error(
          `[scheduler] Erro ao enviar lembrete "${label}": ${err.message}`,
        );
      }
    }

    saveNotified(notified);
  }

  function start(tickIntervalMs = 30 * 1000) {
    cleanNotified();
    tick();
    tickInterval = setInterval(tick, tickIntervalMs);
    console.log(
      `[scheduler] Ticker a cada ${tickIntervalMs / 1000}s`,
    );
  }

  function stop() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  return { start, stop };
}
