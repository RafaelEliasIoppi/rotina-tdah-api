import {
  DAYS, BLOCK_ORDER,
  defaultTasksByDay, saveTasksByDay, uniqueId, isoDate,
  getCurrentDay, getTasksByDay, setTasksByDay
} from "./tasks.js";
import { renderDayTabs, renderBlocks } from "./render.js";
import { showToast } from "./notifications.js";
import { AppStorage } from "./storage.js";
import {
  registerPlaceForTask, removePlaceForTask, geocodeAddress,
  requestLocationPermissions, countPlacesInUse, FREE_PLACES_LIMIT
} from "./geofencing.js";

// Hook para o módulo places-overlay.js (evita import circular: places-overlay.js
// já importa editor.js para poder abrir o editor a partir do botão "+ Adicionar
// lembrete por lugar" — ver PLANO da descoberta central de locais).
var _PlacesOverlay = null;
function setPlacesOverlayHook(placesOverlayModule) {
  _PlacesOverlay = placesOverlayModule;
}

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
  list.push({ id: newId, time: task.time, block: task.block, label: task.label, detail: task.detail, rule: task.rule, ifThen: task.ifThen });
  saveTasksByDay(tasksByDay);
  showToast('Copiada para ' + target.label);
}

/* ---------- Lembretes por lugar (Fase G3) ---------- */
var placesPrivacyOverlay = document.getElementById("placesPrivacyOverlay");
var pendingPlacesAction = null; // callback a rodar após decisão na tela de disclosure

function pinIconSmall() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2a7 7 0 017 7.5C19 14.8 12 21 12 21z" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3"/></svg>';
}

function openPlacesPrivacy(onAllow, onSkip) {
  pendingPlacesAction = { onAllow: onAllow, onSkip: onSkip };
  placesPrivacyOverlay.classList.add("show");
}
function closePlacesPrivacy() {
  placesPrivacyOverlay.classList.remove("show");
  pendingPlacesAction = null;
}

// Garante que a disclosure de privacidade já foi vista antes de pedir
// permissão de localização pela 1ª vez (obrigatório — seção 6 do plano).
// Se já foi vista, segue direto para requestLocationPermissions().
function ensureLocationPermission() {
  if (AppStorage.getPlacesDisclosureSeen()) {
    return requestLocationPermissions();
  }
  return new Promise(function (resolve, reject) {
    openPlacesPrivacy(
      function () {
        AppStorage.setPlacesDisclosureSeen();
        closePlacesPrivacy();
        requestLocationPermissions().then(resolve, reject);
      },
      function () {
        closePlacesPrivacy();
        reject(new Error("Usuário optou por não permitir localização agora"));
      }
    );
  });
}

// Constrói a seção "Lembrar por lugar" de uma linha de tarefa: botão de
// alternância, e quando expandido, busca de endereço + "minha localização
// atual" + chegar/sair + confirmar/remover.
// "Se-Então" (implementation intentions): pré-compromisso com um gatilho
// situacional específico automatiza a ação, compensando o déficit de
// inibição/memória de trabalho do TDAH (Gollwitzer & Sheeran, meta-análise
// de 94 estudos). Guardado como texto único (t.ifThen) para manter
// compatível com o formato de tarefa já existente (mesmo padrão de
// t.detail/t.rule — string simples, sem objeto aninhado).
function buildIfThenSection(task, onChanged) {
  var wrap = document.createElement("div");
  wrap.className = "if-then-section";

  var label = document.createElement("div");
  label.className = "if-then-label";
  label.textContent = "Se-Então (opcional)";
  wrap.appendChild(label);

  var row = document.createElement("div");
  row.className = "if-then-row";

  var current = parseIfThen(task.ifThen);

  var triggerInput = document.createElement("input");
  triggerInput.type = "text";
  triggerInput.placeholder = "Se... (gatilho: \"eu chegar em casa\")";
  triggerInput.value = current.trigger;
  triggerInput.className = "if-then-input";

  var actionInput = document.createElement("input");
  actionInput.type = "text";
  actionInput.placeholder = "então... (ação: \"guardo as chaves no gancho\")";
  actionInput.value = current.action;
  actionInput.className = "if-then-input";

  function sync() {
    var trigger = triggerInput.value.trim();
    var action = actionInput.value.trim();
    task.ifThen = (trigger || action) ? ("Se " + trigger + ", então " + action) : "";
    onChanged();
  }
  triggerInput.addEventListener("input", sync);
  actionInput.addEventListener("input", sync);

  row.appendChild(triggerInput);
  row.appendChild(actionInput);
  wrap.appendChild(row);

  var hint = document.createElement("div");
  hint.className = "if-then-hint";
  hint.textContent = "Pré-planejar um gatilho situacional específico (\"se X, então Y\") ajuda o cérebro a agir quase no automático, sem depender de lembrar por conta própria.";
  wrap.appendChild(hint);

  return wrap;
}

// Extrai {trigger, action} de uma string "Se X, então Y" já salva, para
// popular os dois campos de edição separadamente.
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
  subtitle.textContent = "Além do horário, seja avisado ao entrar ou sair de um lugar (ex: casa, farmácia, trabalho)";

  function renderToggle() {
    if (task.location) {
      toggleBtn.innerHTML = pinIconSmall() + " Lembrete por lugar: " + escapeHtmlLocal(task.location.label || "Local") +
        " (" + (task.location.trigger === "exit" ? "ao sair" : "ao chegar") + ")";
      toggleBtn.classList.add("active");
      subtitle.style.display = "none";
    } else {
      toggleBtn.innerHTML = pinIconSmall() + " Lembrar por lugar";
      toggleBtn.classList.remove("active");
      subtitle.style.display = "";
    }
  }
  renderToggle();

  // Reforço leve de descoberta: na primeira vez que o usuário abre o editor
  // de qualquer tarefa (flag por dispositivo), destaca visualmente o botão
  // "Lembrar por lugar" para chamar atenção pra feature. Some assim que o
  // usuário abre o painel pela 1a vez (não fica destacado para sempre).
  if (!task.location && !AppStorage.getPlaceFeatureDiscoverySeen()) {
    toggleBtn.classList.add("discovery-highlight");
  }

  toggleBtn.addEventListener("click", function () {
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
      current.textContent = "Local atual: " + (task.location.label || "Local") +
        " · " + (task.location.trigger === "exit" ? "ao sair" : "ao chegar");
      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-danger";
      removeBtn.textContent = "Remover local desta tarefa";
      removeBtn.addEventListener("click", function () {
        removePlaceForTask(task.id).then(function () {
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
    explainer.innerHTML = "<strong>Exemplo:</strong> busque \"Casa\", escolha \"Ao sair\" — " +
      "você recebe este lembrete toda vez que sair de casa, em qualquer horário.";
    panel.appendChild(explainer);

    var searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Buscar endereço (ex: Rua X, 123, Cidade)";
    panel.appendChild(searchInput);

    var resultsEl = document.createElement("div");
    resultsEl.className = "place-results";
    panel.appendChild(resultsEl);

    var currentLocBtn = document.createElement("button");
    currentLocBtn.type = "button";
    currentLocBtn.className = "btn";
    currentLocBtn.textContent = "Usar minha localização atual";
    panel.appendChild(currentLocBtn);

    var selected = null; // {label, lat, lng}
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
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      var q = searchInput.value;
      searchTimer = setTimeout(function () {
        if (!q.trim()) { resultsEl.innerHTML = ""; return; }
        resultsEl.textContent = "Buscando...";
        geocodeAddress(q).then(function (results) {
          resultsEl.innerHTML = "";
          if (!results.length) { resultsEl.textContent = "Nenhum endereço encontrado."; return; }
          results.forEach(function (r) {
            var item = document.createElement("button");
            item.type = "button";
            item.className = "place-result-item";
            item.textContent = r.label;
            item.addEventListener("click", function () {
              selectPlace(r);
              resultsEl.innerHTML = "";
              searchInput.value = r.label;
            });
            resultsEl.appendChild(item);
          });
        }).catch(function () {
          resultsEl.textContent = "Falha na busca de endereço. Tente novamente.";
        });
      }, 500);
    });

    currentLocBtn.addEventListener("click", function () {
      if (!navigator.geolocation) { showToast("Localização não disponível neste dispositivo"); return; }
      currentLocBtn.disabled = true;
      currentLocBtn.textContent = "Obtendo localização...";
      navigator.geolocation.getCurrentPosition(function (pos) {
        currentLocBtn.disabled = false;
        currentLocBtn.textContent = "Usar minha localização atual";
        selectPlace({
          label: task.label || "Meu local",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      }, function () {
        currentLocBtn.disabled = false;
        currentLocBtn.textContent = "Usar minha localização atual";
        showToast("Não foi possível obter sua localização");
      }, { enableHighAccuracy: true, timeout: 10000 });
    });

    confirmBtn.addEventListener("click", function () {
      if (!selected) return;
      countPlacesInUse().then(function (info) {
        if (!task.location && info.count >= (info.limit || FREE_PLACES_LIMIT)) {
          showToast("Limite de 3 locais no plano gratuito atingido.");
          return;
        }
        var trigger = exitRadio.checked ? "exit" : "enter";
        ensureLocationPermission().then(function () {
          return registerPlaceForTask(task.id, selected, trigger);
        }, function () {
          // Usuário recusou na tela de disclosure ou negou a permissão do SO:
          // ainda assim salvamos o local (web/dev fallback já trata isso;
          // em Android nativo sem permissão, addGeofence falha e cai no catch).
          return registerPlaceForTask(task.id, selected, trigger);
        }).then(function () {
          renderToggle();
          panel.classList.remove("show");
          showToast("Lembrete por lugar salvo");
          if (onChanged) onChanged();
          if (_PlacesOverlay) _PlacesOverlay.refreshPlacesDiscovery();
        }).catch(function () {
          showToast("Não foi possível salvar o local. Tente novamente.");
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
  return String(s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
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
    fields.appendChild(buildIfThenSection(t, function () { persistTasks(true); }));
    fields.appendChild(buildPlaceSection(t, function () { persistTasks(); }));

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
      var ifThen = String(item.ifThen || "").slice(0, 220);
      var id = String(item.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || ("tarefa-" + idx);
      if (seenIds[id]) id = id + "-" + idx;
      seenIds[id] = true;
      return { id: id, time: time, block: block, label: label, detail: detail, rule: rule, ifThen: ifThen };
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

  document.getElementById("placesPrivacyCloseBtn").addEventListener("click", function () {
    if (pendingPlacesAction && pendingPlacesAction.onSkip) pendingPlacesAction.onSkip();
    else closePlacesPrivacy();
  });
  document.getElementById("placesPrivacySkipBtn").addEventListener("click", function () {
    if (pendingPlacesAction && pendingPlacesAction.onSkip) pendingPlacesAction.onSkip();
  });
  document.getElementById("placesPrivacyAllowBtn").addEventListener("click", function () {
    if (pendingPlacesAction && pendingPlacesAction.onAllow) pendingPlacesAction.onAllow();
  });
  placesPrivacyOverlay.addEventListener("click", function (ev) {
    if (ev.target === placesPrivacyOverlay && pendingPlacesAction && pendingPlacesAction.onSkip) {
      pendingPlacesAction.onSkip();
    }
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

export { openEditor, closeEditor, initEditor, closePlacesPrivacy, setPlacesOverlayHook };
