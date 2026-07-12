import { FAQ_ITEMS } from "./faq-data.js";

/* ---------- Modal: Perguntas e respostas (30 FAQ sobre TDAH) ---------- */
var faqOverlay = document.getElementById("faqOverlay");
var faqBtn = document.getElementById("faqBtn");
var faqCloseBtn = document.getElementById("faqCloseBtn");
var faqTopics = document.getElementById("faqTopics");
var faqSearchInput = document.getElementById("faqSearchInput");
var faqEmptyMsg = document.getElementById("faqEmptyMsg");

function renderFaqList(items) {
  faqTopics.innerHTML = items.map(function (item, i) {
    return (
      '<details class="tdah-topic" data-faq-index="' + i + '">' +
        "<summary>" + item.q + '<span class="plus">+</span></summary>' +
        '<div class="tdah-body">' + item.a + '<div class="tdah-source">Fonte: ' + item.source + "</div></div>" +
      "</details>"
    );
  }).join("");
  faqEmptyMsg.style.display = items.length ? "none" : "";
}

function normalize(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function filterFaq(term) {
  var t = normalize(term);
  if (!t) return FAQ_ITEMS;
  return FAQ_ITEMS.filter(function (item) {
    return normalize(item.q).indexOf(t) !== -1 || normalize(item.a).indexOf(t) !== -1;
  });
}

function openFaq() {
  faqOverlay.classList.add("show");
  faqSearchInput.value = "";
  renderFaqList(FAQ_ITEMS);
}
function closeFaq() {
  faqOverlay.classList.remove("show");
}

function initFaq() {
  faqBtn.addEventListener("click", openFaq);
  faqCloseBtn.addEventListener("click", closeFaq);
  faqOverlay.addEventListener("click", function (ev) {
    if (ev.target === faqOverlay) closeFaq();
  });
  faqSearchInput.addEventListener("input", function () {
    renderFaqList(filterFaq(faqSearchInput.value));
  });
}

export { initFaq, openFaq, closeFaq, faqOverlay };
