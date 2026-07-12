import { AppStorage } from "./storage.js";

/* ---------- Modal: Autoavaliação · TDAH em adultos ---------- */
// Roteiro fiel a _extracted/autoavaliacao_triagem_tdah.md — 18 sintomas do
// DSM-5 (Parte 1), 4 critérios de confirmação (Parte 2) e 15 itens das 5
// áreas de Barkley (Parte 3). Fonte: Cartilha ABP/Alexa, capítulo IACAPAP
// (DSM-5) e "Vencendo o TDAH Adulto" de Russell Barkley (critérios adaptados
// para adultos / 5 áreas de funcionamento). Ferramenta de reflexão pessoal,
// NÃO diagnostica — ver aviso fixo no topo do modal.

var FREQ_OPTIONS = [
  { value: "0", label: "Nunca" },
  { value: "1", label: "Às vezes" },
  { value: "2", label: "Frequentemente" },
  { value: "3", label: "Muito frequentemente" }
];

var PART1_DESATENCAO = [
  "Não presta atenção em detalhes ou comete erros por descuido",
  "Dificuldade de manter atenção em tarefas ou atividades",
  "Parece não escutar quando falam diretamente com você",
  "Não termina tarefas, perde o foco no meio do caminho",
  "Dificuldade de organizar tarefas e atividades",
  "Evita ou reluta em tarefas que exigem esforço mental prolongado",
  "Perde objetos necessários (chaves, celular, documentos)",
  "Distrai-se facilmente com estímulos externos (ou pensamentos)",
  "Esquecimento em atividades cotidianas (contas, compromissos, retornar ligações)"
];

var PART1_HIPERATIVIDADE = [
  "Mexe as mãos/pés ou se remexe na cadeira",
  "Levanta-se em situações em que deveria ficar sentado",
  "Sente inquietação interna (em adultos, mais sensação subjetiva que correr/subir)",
  "Dificuldade de ter lazer/atividades tranquilas em silêncio",
  "Sente-se \"com o motor ligado\", incapaz de ficar parado",
  "Fala em excesso",
  "Responde antes da pergunta terminar",
  "Dificuldade de esperar a vez (filas, trânsito, conversas)",
  "Interrompe ou se intromete em conversas/atividades alheias"
];

var PART2_QUESTIONS = [
  "Os sintomas acima já existiam antes dos 12 anos (mesmo que não diagnosticado na época)?",
  "Os sintomas aparecem em mais de um ambiente (trabalho E casa E relacionamentos, não só um)?",
  "Os sintomas causam prejuízo real e mensurável (perda de emprego, dívidas, brigas, notas baixas, multas de trânsito) — não apenas desconforto ou autocrítica?",
  "Isso persiste há pelo menos 6 meses, não é uma fase ligada a um evento específico (luto, crise aguda, mudança recente)?"
];

var PART3_AREAS = [
  {
    title: "Gestão de tempo e metas",
    items: [
      "Procrastino sistematicamente, mesmo em coisas importantes",
      "Tenho péssima noção de quanto tempo uma tarefa vai levar",
      "Cumprir prazos é uma luta constante"
    ]
  },
  {
    title: "Organização, memória e comunicação",
    items: [
      "Perco o fio da meada ao explicar algo para alguém",
      "Tenho dificuldade de manter uma sequência lógica ao falar ou escrever",
      "Esqueço instruções complexas rapidamente"
    ]
  },
  {
    title: "Autodisciplina / impulsividade",
    items: [
      "Tomo decisões por impulso e me arrependo depois",
      "Interrompo conversas ou digo coisas sem filtrar antes",
      "Tenho reações emocionais desproporcionais ao que gerou elas"
    ]
  },
  {
    title: "Automotivação",
    items: [
      "Só consigo fazer algo chato se o prazo está em cima",
      "Preciso de supervisão ou cobrança externa para manter constância",
      "Abandono tarefas no meio quando a novidade passa"
    ]
  },
  {
    title: "Concentração / prontidão",
    items: [
      "Devaneio com frequência mesmo em conversas importantes",
      "Entedio-me rápido com tarefas repetitivas/administrativas",
      "Tenho dificuldade de manter atenção em leituras longas"
    ]
  }
];

// 5 passos: Desatenção, Hiperatividade/Impulsividade, Confirmação, Áreas de
// Barkley, Resultado. A Parte 1 original (18 itens seguidos) foi dividida em
// dois sub-passos de 9 itens cada — uma sequência longa sem pausa é o tipo
// de tarefa que o público do app tem mais dificuldade de sustentar.
var TOTAL_STEPS = 5;
var FREQUENT_MIN = 2; // índice de FREQ_OPTIONS a partir do qual conta como "frequentemente" ou "muito frequentemente"

var saState = null; // { desatencao: [], hiperatividade: [], confirm: [], barkley: [] }
var saStep = 0; // 0 = Desatenção, 1 = Hiperatividade, 2 = Parte 2, 3 = Parte 3, 4 = Resultado

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
    desatencao: PART1_DESATENCAO.map(function () { return null; }),
    hiperatividade: PART1_HIPERATIVIDADE.map(function () { return null; }),
    confirm: PART2_QUESTIONS.map(function () { return null; }),
    barkley: PART3_AREAS.map(function (area) { return area.items.map(function () { return false; }); })
  };
}

// Persistência de progresso: perder o modal (fechar sem querer, trocar de
// app, ser interrompido) não deve custar recomeçar um questionário de 32
// itens do zero — esse tipo de perda é desmotivador especificamente para
// quem tem dificuldade de retomar tarefas longas interrompidas.
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

/* ---------- Renderização por passo ---------- */

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
  FREQ_OPTIONS.forEach(function (opt) {
    var label = document.createElement("label");
    label.className = "sa-freq-opt";
    var input = document.createElement("input");
    input.type = "radio";
    input.name = "sa-freq-" + listRef.name + "-" + idx;
    input.value = opt.value;
    input.checked = listRef.arr[idx] === opt.value;
    input.addEventListener("change", function () {
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

// Sub-passo com 9 itens (Desatenção ou Hiperatividade/Impulsividade) em vez
// dos 18 originais seguidos — reduz a sensação de "não tem fim" e dá um
// ponto de conclusão intermediário.
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
  questions.forEach(function (q, idx) {
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
    "Desatenção",
    PART1_DESATENCAO,
    "desatencao",
    saState.desatencao,
    "Para cada item, marque com que frequência isso acontece com você nos últimos 6 meses. (1 de 2 — Desatenção)",
    "Fonte: critérios do DSM-5, conforme citados na Cartilha ABP/Alexa e no capítulo IACAPAP."
  );
}

function renderPart1Hiperatividade() {
  return renderFrequencyStep(
    "Hiperatividade / Impulsividade",
    PART1_HIPERATIVIDADE,
    "hiperatividade",
    saState.hiperatividade,
    "Continue marcando a frequência de cada item nos últimos 6 meses. (2 de 2 — Hiperatividade/Impulsividade)",
    "Fonte: critérios do DSM-5, conforme citados na Cartilha ABP/Alexa e no capítulo IACAPAP."
  );
}

function renderPart2() {
  var wrap = document.createElement("div");

  var intro = document.createElement("p");
  intro.className = "sa-intro";
  intro.textContent = "Sintomas isolados não bastam. Responda sim ou não:";
  wrap.appendChild(intro);

  PART2_QUESTIONS.forEach(function (q, idx) {
    var item = document.createElement("div");
    item.className = "sa-item";
    item.dataset.answered = saState.confirm[idx] !== null ? "1" : "0";
    var qEl = document.createElement("div");
    qEl.className = "sa-item-q";
    qEl.textContent = q;
    item.appendChild(qEl);

    var opts = document.createElement("div");
    opts.className = "sa-yn-opts";
    [{ v: "sim", l: "Sim" }, { v: "nao", l: "Não" }].forEach(function (opt) {
      var label = document.createElement("label");
      label.className = "sa-yn-opt";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "sa-confirm-" + idx;
      input.value = opt.v;
      input.checked = saState.confirm[idx] === opt.v;
      input.addEventListener("change", function () {
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
  note.textContent = "Se você respondeu \"não\" a alguma dessas quatro perguntas, o quadro pode ser outra coisa (ansiedade, depressão, estresse, problema de tireoide, má qualidade de sono) — desatenção não é sinônimo de TDAH.";
  wrap.appendChild(note);

  var source = document.createElement("div");
  source.className = "sa-source";
  source.textContent = "Fonte: \"9 critérios adaptados para adultos\", Russell Barkley, \"Vencendo o TDAH Adulto\".";
  wrap.appendChild(source);

  return wrap;
}

function renderPart3() {
  var wrap = document.createElement("div");

  var intro = document.createElement("p");
  intro.className = "sa-intro";
  intro.textContent = "Marque as afirmações que descrevem você bem.";
  wrap.appendChild(intro);

  PART3_AREAS.forEach(function (area, areaIdx) {
    var h = document.createElement("h3");
    h.className = "sa-subhead";
    h.textContent = area.title;
    wrap.appendChild(h);

    area.items.forEach(function (text, itemIdx) {
      var label = document.createElement("label");
      label.className = "sa-check-item";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!saState.barkley[areaIdx][itemIdx];
      input.addEventListener("change", function () {
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
  source.textContent = "Fonte: 5 áreas de funcionamento adaptadas de \"Vencendo o TDAH Adulto\", Russell Barkley.";
  wrap.appendChild(source);

  return wrap;
}

/* ---------- Cálculo e devolutiva ---------- */

function countFrequent(arr) {
  return arr.filter(function (v) { return v !== null && Number(v) >= FREQUENT_MIN; }).length;
}

// ---------------------------------------------------------------------
// Modelo lógico do resultado, em proposições booleanas explícitas.
// Cada faixa de devolutiva (buildFeedback) é a avaliação de uma expressão
// de álgebra booleana sobre estas 3 proposições atômicas:
//
//   P = meetsDsm5Threshold  ⟺ (desatencaoCount ≥ 5) ∨ (hiperatividadeCount ≥ 5)
//   Q = meetsConfirmation   ⟺ (confirmYesCount = 4)
//   R = meetsBarkleyPattern ⟺ (barkleyAreasWithHits ≥ 3)
//
// As 5 faixas de buildFeedback correspondem às seguintes combinações,
// que juntas cobrem todo o espaço de 2^3 = 8 valorações possíveis de
// (P, Q, R) sem sobreposição (partição exaustiva e mutuamente exclusiva):
//
//   ¬P ∧ (barkleyCount = 0)        → calm-1  "poucos sinais"
//   ¬P ∧ (barkleyCount > 0)        → calm-2  "sinais pontuais"
//   P ∧ ¬Q                         → warn-1  "confirmação não fechou"
//   P ∧ Q ∧ ¬R                     → warn-2  "parcialmente consistente"
//   P ∧ Q ∧ R                      → alert   "consistente com TDAH"
//
// (Q e R só têm efeito na faixa se P for verdadeiro — refletindo a regra
// clínica das fontes de que sintomas isolados, sem P, não bastam.)
// ---------------------------------------------------------------------

function computeResult() {
  var desatencaoCount = countFrequent(saState.desatencao);
  var hiperatividadeCount = countFrequent(saState.hiperatividade);
  var confirmYesCount = saState.confirm.filter(function (v) { return v === "sim"; }).length;
  var barkleyCount = saState.barkley.reduce(function (total, area) {
    return total + area.filter(Boolean).length;
  }, 0);
  var barkleyAreasWithHits = saState.barkley.filter(function (area) {
    return area.some(Boolean);
  }).length;

  // P: critério de frequência do DSM-5 (5+ sintomas "frequentes" numa lista)
  var meetsDsm5Threshold = (desatencaoCount >= 5) || (hiperatividadeCount >= 5);
  // Q: as 4 perguntas de confirmação da Parte 2 fecharam "sim"
  var meetsConfirmation = confirmYesCount === 4;
  // R: pelo menos 3 das 5 áreas de Barkley têm alguma afirmação marcada
  var meetsBarkleyPattern = barkleyAreasWithHits >= 3;

  return {
    desatencaoCount: desatencaoCount,
    hiperatividadeCount: hiperatividadeCount,
    confirmYesCount: confirmYesCount,
    barkleyCount: barkleyCount,
    barkleyAreasWithHits: barkleyAreasWithHits,
    meetsDsm5Threshold: meetsDsm5Threshold,
    meetsConfirmation: meetsConfirmation,
    meetsBarkleyPattern: meetsBarkleyPattern
  };
}

// Devolutivas: múltiplas faixas, fiéis ao "Como interpretar" e "O que fazer
// com o resultado" do material-fonte. Nenhum limiar numérico novo é
// inventado além do "5 ou mais" (DSM-5) e do "3 ou mais áreas" (Barkley,
// majoritário dentro do range de 5) já citados nas fontes.
function buildFeedback(r) {
  var P = r.meetsDsm5Threshold;
  var Q = r.meetsConfirmation;
  var R = r.meetsBarkleyPattern;
  var title, body, tone;

  if (!P && r.barkleyCount === 0) {
    // ¬P ∧ (barkleyCount = 0)
    tone = "sa-tone-calm";
    title = "Poucos sinais nesse retrato";
    body = [
      "Pelas suas respostas, você marcou poucos sintomas frequentes nas duas listas do DSM-5 e poucas afirmações nas 5 áreas de Barkley. Isso não costuma ser o retrato típico do TDAH em adultos.",
      "Se ainda assim algo te incomoda no dia a dia, vale conversar com um profissional sobre o que está pesando — não precisa ser TDAH para merecer atenção."
    ];
  } else if (!P && r.barkleyCount > 0) {
    // ¬P ∧ (barkleyCount > 0)
    tone = "sa-tone-calm";
    title = "Sinais pontuais, abaixo do padrão típico do DSM-5";
    body = [
      "Você marcou algumas afirmações das 5 áreas de Barkley, mas não chegou a 5 sintomas \"frequentes\" ou \"muito frequentes\" em nenhuma das listas do DSM-5 (desatenção ou hiperatividade/impulsividade) — que é o critério citado nas fontes para considerar o quadro compatível com TDAH.",
      "Isso sugere que, se há dificuldades reais, elas podem ter outra origem ou ser mais leves/pontuais. Mesmo assim, se algo te incomoda, vale conversar com um profissional."
    ];
  } else if (P && !Q) {
    // P ∧ ¬Q
    tone = "sa-tone-warn";
    title = "Muitos sintomas, mas os critérios de confirmação não fecharam";
    body = [
      "Você atingiu " + (r.desatencaoCount >= 5 ? "5 ou mais sintomas frequentes de desatenção" : "5 ou mais sintomas frequentes de hiperatividade/impulsividade") + ", que é o critério citado no DSM-5. Porém, nem todas as 4 perguntas de confirmação da Parte 2 tiveram resposta \"sim\".",
      "Segundo as fontes, sintomas isolados não bastam: eles precisam existir desde antes dos 12 anos, aparecer em mais de um ambiente, causar prejuízo real e persistir por pelo menos 6 meses sem ligação com um evento específico. Quando algum desses critérios falta, o quadro pode ser outra coisa — ansiedade, depressão, estresse, problema de tireoide ou má qualidade de sono são causas comuns de sintomas parecidos.",
      "Vale conversar com um profissional para investigar a causa real desses sintomas."
    ];
  } else if (P && Q && !R) {
    // P ∧ Q ∧ ¬R
    tone = "sa-tone-warn";
    title = "Quadro parcialmente consistente — vale investigar melhor";
    body = [
      "Você atingiu o critério do DSM-5 (5 ou mais sintomas frequentes numa das listas) e confirmou os 4 critérios da Parte 2. Porém, marcou afirmações em poucas das 5 áreas de funcionamento de Barkley.",
      "As fontes citam que 89-98% dos adultos com TDAH relatam problemas relevantes nas 5 áreas de Barkley, contra 7-14% da população geral — então quanto mais áreas afetadas, mais o quadro tende a ser consistente com TDAH. Como seu resultado ainda está parcial nessa parte, uma avaliação profissional é o caminho mais seguro para entender o que está acontecendo."
    ];
  } else {
    // P ∧ Q ∧ R (única combinação restante da partição)
    tone = "sa-tone-alert";
    title = "Quadro consistente com TDAH — avaliação profissional é o próximo passo";
    body = [
      "Você se identificou fortemente nas três partes: sintomas do DSM-5 acima do critério (5 ou mais \"frequentemente\"/\"muito frequentemente\" numa das listas), os 4 critérios de confirmação da Parte 2 e várias das 5 áreas de funcionamento de Barkley (que 89-98% dos adultos com TDAH relatam, contra 7-14% da população geral).",
      "Isso é um indício relevante — não uma confirmação. O próximo passo legítimo é procurar avaliação profissional (psiquiatra ou psicólogo com experiência em TDAH adulto), não concluir sozinho que \"tem TDAH\" a partir deste questionário. A avaliação formal exige entrevista clínica, histórico de desenvolvimento e, idealmente, relato de alguém que te conhece bem — porque o autorrelato tende a subestimar prejuízos."
    ];
  }

  return { tone: tone, title: title, body: body };
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
  fb.body.forEach(function (p) {
    var pEl = document.createElement("p");
    pEl.textContent = p;
    card.appendChild(pEl);
  });
  wrap.appendChild(card);

  var summary = document.createElement("div");
  summary.className = "sa-summary";
  summary.innerHTML =
    "<div class=\"sa-summary-row\"><span>Sintomas de desatenção frequentes</span><strong>" + r.desatencaoCount + " de 9</strong></div>" +
    "<div class=\"sa-summary-row\"><span>Sintomas de hiperatividade/impulsividade frequentes</span><strong>" + r.hiperatividadeCount + " de 9</strong></div>" +
    "<div class=\"sa-summary-row\"><span>Critérios de confirmação (Parte 2)</span><strong>" + r.confirmYesCount + " de 4</strong></div>" +
    "<div class=\"sa-summary-row\"><span>Afirmações marcadas nas 5 áreas de Barkley (Parte 3)</span><strong>" + r.barkleyCount + " de 15</strong></div>";
  wrap.appendChild(summary);

  var next = document.createElement("div");
  next.className = "sa-next-steps";
  next.innerHTML = "<p><strong>Sobre este resultado:</strong> esta ferramenta é reflexão pessoal, não diagnóstico. " +
    "Só um profissional habilitado, com entrevista, histórico de vida e (idealmente) relato de terceiros, pode diagnosticar TDAH.</p>" +
    "<div class=\"sa-source\">Fontes: critérios do DSM-5 citados na Cartilha ABP/Alexa e no capítulo IACAPAP; " +
    "\"9 critérios adaptados para adultos\" e 5 áreas de funcionamento de Russell Barkley, \"Vencendo o TDAH Adulto\".</div>";
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

  var pct = Math.round(((saStep + 1) / TOTAL_STEPS) * 100);
  saProgressFill.style.width = pct + "%";

  var labels = [
    "Passo 1 de 4 · Desatenção (DSM-5)",
    "Passo 2 de 4 · Hiperatividade/Impulsividade (DSM-5)",
    "Passo 3 de 4 · Confirmação",
    "Passo 4 de 4 · Áreas de Barkley",
    "Resultado"
  ];
  saStepLabel.textContent = labels[saStep];

  saBackBtn.style.visibility = saStep === 0 ? "hidden" : "visible";

  if (saStep === TOTAL_STEPS - 1) {
    saNextBtn.style.display = "none";
    saRestartBtn.style.display = "";
    AppStorage.setSelfAssessmentProgress(null); // concluído: não há mais o que retomar
  } else {
    saNextBtn.style.display = "";
    saRestartBtn.style.display = "none";
    saNextBtn.textContent = saStep === TOTAL_STEPS - 2 ? "Ver resultado" : "Próximo";
  }

  updateNextEnabled();
}

// Exige que todos os itens do passo atual estejam respondidos antes de
// avançar (Parte 3 é opcional item a item, então não bloqueia).
function stepIsComplete() {
  if (saStep === 0) return saState.desatencao.every(function (v) { return v !== null; });
  if (saStep === 1) return saState.hiperatividade.every(function (v) { return v !== null; });
  if (saStep === 2) return saState.confirm.every(function (v) { return v !== null; });
  return true;
}

function updateNextEnabled() {
  if (saStep === TOTAL_STEPS - 1) return;
  saNextBtn.disabled = !stepIsComplete();
}

// Ao tentar avançar com itens pendentes, rola até o primeiro não respondido
// e destaca-o brevemente — em vez de deixar o botão simplesmente inerte sem
// explicar por que não avança (frustrante em uma lista de 9 itens em scroll).
function focusFirstUnanswered() {
  var unanswered = saBody.querySelector(".sa-item[data-answered=\"0\"]");
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
  saOverlay.addEventListener("click", function (ev) {
    if (ev.target === saOverlay) closeSelfAssessment();
  });
  saNextBtn.addEventListener("click", goNext);
  saBackBtn.addEventListener("click", goBack);
  saRestartBtn.addEventListener("click", restart);
}

export { initSelfAssessment, openSelfAssessment, closeSelfAssessment, saOverlay };
