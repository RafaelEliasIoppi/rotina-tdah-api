import { Api } from "./api.js";
import { AppStorage } from "./storage.js";
import { showToast } from "./notifications.js";
import { openAuth } from "./auth.js";

/* ---------- Premium / Planos UI ---------- */
var premiumBadge = document.getElementById("premiumBadge");
var plansOverlay = document.getElementById("plansOverlay");
var plansCloseBtn = document.getElementById("plansCloseBtn");
var planSubscribeBtn = document.getElementById("planSubscribeBtn");
var planManageBtn = document.getElementById("planManageBtn");
var planLoading = document.getElementById("planLoading");
var planCurrentFree = document.getElementById("planCurrentFree");
var planFreeCard = document.getElementById("planFreeCard");
var planPremiumCard = document.getElementById("planPremiumCard");

function getCachedSubscription() {
  return AppStorage.getSubscription();
}

function cacheSubscription(sub) {
  AppStorage.setSubscription(sub);
}

function updatePremiumBadge(sub) {
  if (!premiumBadge) return;
  var plan = sub && sub.plan === "premium" ? "Premium" : "Free";
  premiumBadge.textContent = plan;
  premiumBadge.classList.toggle("is-premium", plan === "Premium");
}

function updateSubscribeButtonAvailability() {
  var hasPriceId = !!(window.stripeConfig && window.stripeConfig.priceId);
  planSubscribeBtn.disabled = !hasPriceId;
  planSubscribeBtn.title = hasPriceId ? "" : "Stripe não configurado";
}

function openPlans() {
  plansOverlay.classList.add("show");
  planSubscribeBtn.style.display = "";
  planManageBtn.style.display = "none";
  planLoading.style.display = "none";

  if (Api.isLoggedIn()) {
    Api.fetch("/subscriptions/me").then(function (sub) {
      cacheSubscription(sub);
      updatePremiumBadge(sub);
      if (sub && sub.plan === "premium") {
        planCurrentFree.textContent = "Faça upgrade ou gerencie";
        planSubscribeBtn.textContent = "Mudar para Premium";
        planSubscribeBtn.style.display = "none"; // já é premium
        planManageBtn.style.display = "";
      } else {
        planCurrentFree.textContent = "Seu plano atual";
        planSubscribeBtn.textContent = "Assinar Premium";
        planSubscribeBtn.style.display = "";
        planManageBtn.style.display = "none";
      }
    }).catch(function () {
      // Se falhar, usa cache
      var cached = getCachedSubscription();
      if (cached) updatePremiumBadge(cached);
    });
  } else {
    planCurrentFree.textContent = "Faça login para assinar";
    planSubscribeBtn.textContent = "Fazer login";
  }
}

function closePlans() {
  plansOverlay.classList.remove("show");
}

function initSubscriptions() {
  updateSubscribeButtonAvailability();

  premiumBadge.addEventListener("click", openPlans);
  plansCloseBtn.addEventListener("click", closePlans);
  plansOverlay.addEventListener("click", function (ev) {
    if (ev.target === plansOverlay) closePlans();
  });

  planSubscribeBtn.addEventListener("click", function () {
    if (!Api.isLoggedIn()) {
      closePlans();
      openAuth();
      return;
    }

    var stripePriceId = window.stripeConfig && window.stripeConfig.priceId;
    if (!stripePriceId) {
      showToast("Stripe não configurado");
      return;
    }

    planSubscribeBtn.style.display = "none";
    planManageBtn.style.display = "none";
    planLoading.style.display = "";
    planLoading.textContent = "Preparando pagamento...";

    Api.fetch("/subscriptions/checkout", {
      method: "POST",
      body: {
        priceId: stripePriceId,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      }
    }).then(function (data) {
      if (data && data.url) {
        planLoading.textContent = "Redirecionando...";
        // Em WebView/Capacitor, abrir no navegador
        window.location.href = data.url;
      } else {
        throw new Error("Resposta invalida");
      }
    }).catch(function (err) {
      planLoading.style.display = "none";
      planSubscribeBtn.style.display = "";
      showToast("Erro ao iniciar pagamento. Tente novamente.");
    });
  });

  planManageBtn.addEventListener("click", function () {
    planManageBtn.style.display = "none";
    planLoading.style.display = "";
    planLoading.textContent = "Abrindo gerenciamento...";

    Api.fetch("/subscriptions/portal", {
      method: "POST",
      body: { returnUrl: window.location.href }
    }).then(function (data) {
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Resposta invalida");
      }
    }).catch(function (err) {
      planLoading.style.display = "none";
      planManageBtn.style.display = "";
      showToast("Erro ao abrir gerenciamento.");
    });
  });

  // Carrega subscription ao iniciar
  if (Api.isLoggedIn()) {
    Api.fetch("/subscriptions/me").then(function (sub) {
      cacheSubscription(sub);
      updatePremiumBadge(sub);
    }).catch(function () {
      var cached = getCachedSubscription();
      if (cached) updatePremiumBadge(cached);
    });
  }
}

export { openPlans, closePlans, updateSubscribeButtonAvailability, initSubscriptions };
