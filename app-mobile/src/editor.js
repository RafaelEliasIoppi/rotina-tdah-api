import {
  DAYS, BLOCK_ORDER,
  defaultTasksByDay, saveTasksByDay, uniqueId, isoDate,
  getCurrentDay, getTasksByDay, setTasksByDay
} from "./tasks.js";
import { renderDayTabs, renderBlocks } from "./render.js";
import { showToast } from "./notifications.js";

/* ---------- Editor: cada pessoa monta seus próprios horários ---------- */
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
  DAYS.forEach(function (d) {
    var btn = document.createElement("button");
    btn.className = "edit-daytab";
    btn.type = "button";
    btn.setAttribute("aria-selected", String(d.key === editDay));
    btn.textContent = d.label;
    btn.addEventListener("click", function () {
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
  var others = DAYS.filter(function (d) { return d.key !== editDay; });
  var choice = prompt(
    "Duplicar \"" + task.label + "\" para qual dia? (" + others.map(function (d) { return d.label; }).join(", ") + ")\nDigite o nome do dia:"
  );
  if (!choice) return;
  var norm = choice.trim().toLowerCase();
  var target = others.find(function (d) { return d.label.toLowerCase().indexOf(norm) === 0; });
  if (!target) { showToast("Dia não reconhecido"); return; }
  var tasksByDay = getTasksByDay();
  var list = tasksByDay[target.key] || (tasksByDay[target.key] = []);
  var newId = uniqueId(target.key, task.id);
  list.push({ id: newId, time: task.time, block: task.block, label: task.label, detail: task.detail, rule: task.rule });
  saveTasksByDay(tasksByDay);
  showToast('Copiada para ' + target.label);
}

function renderEditRows() {
  var tasksByDay = getTasksByDay();
  var list = (tasksByDay[editDay] || []).slice().sort(function (a, b) { return a.time.localeCompare(b.time); });
  editRowsEl.innerHTML = "";
  list.forEach(function (t) {
    var row = document.createElement("div");
    row.className = "edit-row";

    var timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = t.time;
    timeInput.addEventListener("change", function () {
      t.time = timeInput.value;
      persistTasks();
    });

    var fields = document.createElement("div");
    fields.className = "fields";

    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Nome da tarefa";
    labelInput.value = t.label;
    labelInput.addEventListener("input", function () { t.label = labelInput.value; persistTasks(true); });

    var fieldsRow = document.createElement("div");
    fieldsRow.className = "fields-row";

    var blockSelect = document.createElement("select");
    BLOCK_ORDER.forEach(function (b) {
      var opt = document.createElement("option");
      opt.value = b; opt.textContent = b;
      if (b === t.block) opt.selected = true;
      blockSelect.appendChild(opt);
    });
    blockSelect.addEventListener("change", function () { t.block = blockSelect.value; persistTasks(); });

    fieldsRow.appendChild(blockSelect);

    var detailInput = document.createElement("textarea");
    detailInput.placeholder = "Detalhe (opcional)";
    detailInput.value = t.detail || "";
    detailInput.addEventListener("input", function () { t.detail = detailInput.value; persistTasks(true); });

    fields.appendChild(labelInput);
    fields.appendChild(fieldsRow);
    fields.appendChild(detailInput);

    var dupBtn = document.createElement("button");
    dupBtn.className = "del-btn";
    dupBtn.type = "button";
    dupBtn.setAttribute("aria-label", "Duplicar tarefa para outro dia");
    dupBtn.innerHTML = dupIcon();
    dupBtn.addEventListener("click", function () { openDuplicateMenu(dupBtn, t); });

    var delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Excluir tarefa");
    delBtn.innerHTML = trashIcon();
    delBtn.addEventListener("click", function () {
      if (!confirm('Excluir a tarefa "' + t.label + '"?')) return;
      var tasksByDay = getTasksByDay();
      tasksByDay[editDay] = (tasksByDay[editDay] || []).filter(function (x) { return x.id !== t.id; });
      saveTasksByDay(tasksByDay);
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
  var tasksByDay = getTasksByDay();
  if (debounced) {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () { saveTasksByDay(tasksByDay); }, 300);
    return;
  }
  saveTasksByDay(tasksByDay);
}

var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var DAY_KEYS = DAYS.map(function (d) { return d.key; });

function sanitizeImportedTasksByDay(raw) {
  if (!raw || typeof raw !== "object") throw new Error("formato inválido");
  var clean = {};
  DAY_KEYS.forEach(function (dayKey) {
    var list = Array.isArray(raw[dayKey]) ? raw[dayKey] : [];
    var seenIds = {};
    clean[dayKey] = list.map(function (item, idx) {
      if (!item || typeof item !== "object") return null;
      var time = TIME_RE.test(item.time) ? item.time : "12:00";
      var block = BLOCK_ORDER.indexOf(item.block) !== -1 ? item.block : "Trabalho";
      var label = String(item.label || "Tarefa").slice(0, 140);
      var detail = String(item.detail || "").slice(0, 500);
      var rule = String(item.rule || "").slice(0, 80);
      var id = String(item.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || ("tarefa-" + idx);
      if (seenIds[id]) id = id + "-" + idx;
      seenIds[id] = true;
      return { id: id, time: time, block: block, label: label, detail: detail, rule: rule };
    }).filter(Boolean);
  });
  return clean;
}

function initEditor() {
  document.getElementById("editFab").addEventListener("click", openEditor);
  document.getElementById("editCloseBtn").addEventListener("click", closeEditor);
  document.getElementById("editDoneBtn").addEventListener("click", closeEditor);
  editOverlay.addEventListener("click", function (ev) {
    if (ev.target === editOverlay) closeEditor();
  });

  document.getElementById("addTaskBtn").addEventListener("click", function () {
    var tasksByDay = getTasksByDay();
    var list = tasksByDay[editDay] || (tasksByDay[editDay] = []);
    var id = uniqueId(editDay, "nova-tarefa");
    list.push({ id: id, time: "12:00", label: "Nova tarefa", block: "Trabalho", detail: "", rule: "" });
    saveTasksByDay(tasksByDay);
    renderEditRows();
  });

  document.getElementById("restoreDefaultBtn").addEventListener("click", function () {
    if (!confirm("Restaurar a rotina padrão? Suas edições de horários/tarefas serão substituídas (o progresso marcado nos dias não é afetado).")) return;
    var tasksByDay = defaultTasksByDay();
    setTasksByDay(tasksByDay);
    saveTasksByDay(tasksByDay);
    renderEditRows();
    showToast("Rotina padrão restaurada");
  });

  document.getElementById("exportBtn").addEventListener("click", function () {
    var tasksByDay = getTasksByDay();
    var blob = new Blob([JSON.stringify({ tasksByDay: tasksByDay }, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rotina-tdah-" + isoDate() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.getElementById("importFile").addEventListener("change", function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!confirm("Importar substitui a rotina atual (horários e tarefas) neste dispositivo. Continuar?")) {
      ev.target.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || !data.tasksByDay) throw new Error("formato inválido");
        var tasksByDay = sanitizeImportedTasksByDay(data.tasksByDay);
        setTasksByDay(tasksByDay);
        saveTasksByDay(tasksByDay);
        renderEditRows();
        showToast("Rotina importada");
      } catch (e) {
        showToast("Arquivo inválido");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });
}

export { openEditor, closeEditor, initEditor };
