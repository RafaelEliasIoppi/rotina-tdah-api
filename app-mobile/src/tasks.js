import { AppStorage } from "./storage.js";

/* ---------- Data model ---------- */
// Days: seg..sex share the same weekday template; each has its own emphasis line.
var DAYS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" }
];

var EMPHASIS = {
  seg: "Planejamento da semana inteira nos primeiros 10 min de trabalho — metas grandes fragmentadas em passos diários.",
  ter: "Rotina padrão dos blocos de foco.",
  qua: "Rotina padrão dos blocos de foco.",
  qui: "Rotina padrão dos blocos de foco.",
  sex: "Revisão da semana: o que funcionou, o que não funcionou nas estratégias. Ajuste é parte do processo, não fracasso."
};

var BLOCK_ORDER = ["Manhã", "Trabalho", "Meio-dia", "Tarde", "Noite"];

// Hook para o módulo Sync (evita import circular: sync.js importa tasks.js;
// tasks.js chama de volta via este hook, setado por main.js na inicialização).
// Reproduz o antigo `typeof Sync !== "undefined"` do arquivo único.
var _Sync = null;
function setSyncHook(syncModule) {
  _Sync = syncModule;
}

// Default plan (from plano_rotina_semanal.md), used to seed local storage on first visit
// and to restore when the user hits "Restaurar padrão".
function defaultTasksByDay() {
  var base = [
    { id: "acordar", time: "05:45", label: "Acordar", block: "Manhã", detail: "Alarme físico, não celular na mão. Levante imediatamente.", rule: "Regra 1 — Pare a ação" },
    { id: "espiritual-manha", time: "05:50", label: "Momento espiritual (15 min)", block: "Manhã", detail: "Oração + leitura bíblica breve, antes de qualquer tela. \"Buscai primeiro o Reino de Deus\" (Mt 6:33).", rule: "Regra 5 — Considere o futuro" },
    { id: "preparo-saida", time: "06:05", label: "Preparação para sair (10 min)", block: "Manhã", detail: "Lista fixa perto da porta: carteira, chave, celular, carregador. Não confie na memória.", rule: "Exteriorizar" },
    { id: "sair-casa", time: "06:15", label: "Sair de casa", block: "Manhã", detail: "", rule: "" },
    { id: "comer-trajeto", time: "06:20", label: "Comer algo leve no trajeto/chegada", block: "Manhã", detail: "Sem café em casa — hipoglicemia piora desatenção e irritabilidade. Não é opcional.", rule: "Manejo de energia" },

    { id: "prioridades", time: "07:30", label: "Escrever as 3 prioridades do dia", block: "Trabalho", detail: "Papel ou app, antes de mergulhar em tarefas. A lista existe fora da sua cabeça, não dentro dela.", rule: "Regra 4 — Exteriorize" },
    { id: "bloco-foco-1", time: "08:00", label: "Bloco de foco 1 (25–45 min + timer visível)", block: "Trabalho", detail: "Pausa de 5 min ao final, com pequena recompensa (café, alongamento).", rule: "Regra 6 — Recompensa imediata" },
    { id: "janela-livre-1", time: "09:30", label: "Janela livre: leitura/estudo (20–30 min)", block: "Trabalho", detail: "Não ultrapasse 30 min sem pausa. Pode alternar entre 2 atividades se uma ficar entediante.", rule: "" },
    { id: "revisar-lista-manha", time: "10:15", label: "Revisar lista de prioridades e riscar o que já foi feito", block: "Trabalho", detail: "Reforço visual de progresso.", rule: "" },
    { id: "bloco-foco-2", time: "10:30", label: "Bloco de foco 2 (25–45 min + timer visível)", block: "Trabalho", detail: "Tarefas mais exigentes de concentração, se essa costuma ser sua janela de mais energia.", rule: "" },

    { id: "almoco", time: "12:00", label: "Almoço — pausa real, sem tela se possível", block: "Meio-dia", detail: "30 segundos de gratidão antes de comer já contam.", rule: "" },

    { id: "janela-livre-2", time: "13:30", label: "Janela livre: leitura/estudo ou outra atividade", block: "Tarde", detail: "Tarefas administrativas/repetitivas nos períodos de menor energia.", rule: "" },
    { id: "bloco-foco-3", time: "14:00", label: "Bloco de foco 3 (25–45 min + timer visível)", block: "Tarde", detail: "", rule: "" },
    { id: "antes-reuniao", time: "15:00", label: "Antes de reunião/conversa importante: anotar 2–3 pontos-chave", block: "Tarde", detail: "Se perceber que está divagando, pause e repita mentalmente o ponto principal.", rule: "Comunicação" },
    { id: "bloco-foco-4", time: "16:00", label: "Bloco de foco 4 (25–45 min + timer visível)", block: "Tarde", detail: "", rule: "" },
    { id: "revisar-fim-dia", time: "17:30", label: "Revisar prioridades: pendências viram 1ª prioridade de amanhã", block: "Tarde", detail: "Evita começar o dia seguinte sem rumo.", rule: "" },

    { id: "transicao", time: "18:00", label: "Transição mental no trajeto de volta (5 min sem celular)", block: "Noite", detail: "Ajuda a \"desligar\" do trabalho antes de entrar em outro contexto.", rule: "Regulação emocional" },
    { id: "espiritual-noite", time: "20:30", label: "Momento espiritual de encerramento (10 min)", block: "Noite", detail: "Oração de gratidão e entrega do dia. Reconhecer o erro sem se punir.", rule: "Regra 8 — Senso de humor" },
    { id: "preparar-amanha", time: "21:30", label: "Preparar o dia seguinte (10 min)", block: "Noite", detail: "Separar roupa, mochila. Definir 1–2 prioridades para amanhã.", rule: "" },
    { id: "dormir", time: "22:30", label: "Horário fixo para dormir", block: "Noite", detail: "Sono ruim piora desatenção e impulsividade no dia seguinte.", rule: "" }
  ];
  var out = {};
  DAYS.forEach(function (d) {
    var list = base.map(function (t) { return Object.assign({}, t); });
    if (d.key === "seg") {
      list.splice(5, 0, { id: "planejar-semana", time: "07:35", label: "Planejar a semana inteira (10 min)", block: "Trabalho", detail: "Fragmente metas grandes em passos diários.", rule: "Regra 6 — Decomponha o futuro" });
    }
    if (d.key === "sex") {
      list.push({ id: "revisao-semana", time: "17:45", label: "Revisão da semana: o que funcionou, o que não", block: "Tarde", detail: "Ajuste de estratégia é parte do processo.", rule: "" });
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
  // Sync (Fase 6): qualquer edição de rotina (add/edit/excluir/duplicar/import/restaurar)
  // marca a rotina como "suja" para reenvio ao servidor. Debounced e best-effort.
  if (_Sync) _Sync.onRoutineChanged();
}

var tasksByDay = loadTasksByDay();

function buildTasks(dayKey) {
  return (tasksByDay[dayKey] || []).slice().sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });
}

function slugify(s) {
  return (s || "tarefa").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tarefa";
}
function uniqueId(dayKey, base) {
  var list = tasksByDay[dayKey] || [];
  var id = base, n = 2;
  while (list.some(function (t) { return t.id === id; })) { id = base + "-" + n; n++; }
  return id;
}

/* ---------- State (localStorage) ---------- */

function todayKeyBR() {
  var idx = new Date().getDay(); // 0 sun .. 6 sat
  var map = { 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex" };
  return map[idx] || "seg";
}
function isoDate(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function loadState() {
  return AppStorage.getState();
}
function saveState(state) {
  AppStorage.setState(state);
}
function loadAlarms() {
  return AppStorage.getAlarms();
}
function saveAlarms(a) {
  AppStorage.setAlarms(a);
}

var state = loadState();     // { "2026-07-11": { "acordar": true, ... } }
var alarms = loadAlarms();   // { "seg:acordar": true, ... } armed reminders (per weekday+task)

var currentDay = todayKeyBR();
var currentDateISO = isoDate();

function dayState(dateISO) {
  if (!state[dateISO]) state[dateISO] = {};
  return state[dateISO];
}

function effectiveDateForDay(dayKey) {
  // If viewing today's weekday, use real date so persistence is daily.
  // If viewing a different weekday tab, use a stable pseudo-date key per weekday
  // (lets user preview/check other days without corrupting today's real log).
  if (dayKey === todayKeyBR()) return currentDateISO;
  return "template-" + dayKey;
}

// Getters/setters para currentDay e currentDateISO (mutáveis, compartilhados
// entre render.js, notifications.js e sync.js).
function getCurrentDay() { return currentDay; }
function setCurrentDay(v) { currentDay = v; }
function getCurrentDateISO() { return currentDateISO; }
function setCurrentDateISO(v) { currentDateISO = v; }

// tasksByDay/state/alarms precisam ser reatribuíveis por inteiro (ex.: import,
// restaurar padrão, adoção de dados do servidor no Sync) — por isso getters
// retornam a referência viva e setters trocam a referência do módulo.
function getTasksByDay() { return tasksByDay; }
function setTasksByDay(obj) { tasksByDay = obj; }
function getStateObj() { return state; }
function setStateObj(obj) { state = obj; }
function getAlarmsObj() { return alarms; }
function setAlarmsObj(obj) { alarms = obj; }

export {
  DAYS, EMPHASIS, BLOCK_ORDER,
  setSyncHook,
  defaultTasksByDay, loadTasksByDay, saveTasksByDay,
  buildTasks, slugify, uniqueId,
  todayKeyBR, isoDate,
  loadState, saveState, loadAlarms, saveAlarms,
  dayState, effectiveDateForDay,
  getCurrentDay, setCurrentDay, getCurrentDateISO, setCurrentDateISO,
  getTasksByDay, setTasksByDay, getStateObj, setStateObj, getAlarmsObj, setAlarmsObj
};
