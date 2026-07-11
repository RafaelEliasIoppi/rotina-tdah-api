/* ---------- Modal: Entenda o TDAH ---------- */
var tdahInfoOverlay = document.getElementById("tdahInfoOverlay");
var tdahInfoBtn = document.getElementById("tdahInfoBtn");
var tdahInfoCloseBtn = document.getElementById("tdahInfoCloseBtn");

function openTdahInfo() { tdahInfoOverlay.classList.add("show"); }
function closeTdahInfo() { tdahInfoOverlay.classList.remove("show"); }

function initEducation() {
  tdahInfoBtn.addEventListener("click", openTdahInfo);
  tdahInfoCloseBtn.addEventListener("click", closeTdahInfo);
  tdahInfoOverlay.addEventListener("click", function (ev) {
    if (ev.target === tdahInfoOverlay) closeTdahInfo();
  });
}

export { openTdahInfo, closeTdahInfo, tdahInfoOverlay, initEducation };
