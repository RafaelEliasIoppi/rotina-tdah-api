import { Api, API_BASE } from "./api.js";
import { showToast } from "./notifications.js";
import { closeEditor } from "./editor.js";

/* ---------- Auth UI (Fase 5): topbar chip + modal login/cadastro ---------- */
var GOOGLE_CLIENT_ID = null;
var GOOGLE_ANDROID_CLIENT_ID = null;
var SocialLogin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin;
var socialLoginInitPromise = null;

// Inicializa o plugin nativo de login social (Google via Credential Manager).
// Login com Google via WebView/GSI é bloqueado pelo Google em apps Android nativos
// (erro disallowed_useragent), por isso usamos o SDK nativo aqui.
function ensureSocialLoginInit() {
  if (!SocialLogin) return Promise.reject(new Error("SocialLogin indisponivel"));
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error("Google Client ID nao configurado"));
  if (!socialLoginInitPromise) {
    socialLoginInitPromise = SocialLogin.initialize({
      google: { webClientId: GOOGLE_CLIENT_ID }
    });
  }
  return socialLoginInitPromise;
}

var sessionChip = document.getElementById("sessionChip");

function renderSessionChip() {
  // Preserva o indicador de sync existente; apenas adiciona/remove os controles de sessão.
  Array.prototype.slice.call(sessionChip.querySelectorAll("[data-session]")).forEach(function (el) {
    sessionChip.removeChild(el);
  });
  var s = Api.getSession();
  if (s && s.user) {
    var fullLabel = s.user.displayName || s.user.email || "Conta";
    var name = document.createElement("span");
    name.className = "session-name";
    name.setAttribute("data-session", "");
    name.textContent = fullLabel;
    name.title = fullLabel;
    var out = document.createElement("button");
    out.className = "session-logout";
    out.type = "button";
    out.setAttribute("data-session", "");
    out.textContent = "Sair";
    out.addEventListener("click", handleLogout);
    sessionChip.appendChild(name);
    sessionChip.appendChild(out);
  } else {
    var btn = document.createElement("button");
    btn.className = "session-btn";
    btn.type = "button";
    btn.setAttribute("data-session", "");
    btn.textContent = "Entrar";
    btn.addEventListener("click", openAuth);
    sessionChip.appendChild(btn);
  }
}

function handleLogout() {
  Api.logout().then(function () {
    showToast("Você saiu da conta.");
  });
}

var authOverlay = document.getElementById("authOverlay");
var authForm = document.getElementById("authForm");
var authTitle = document.getElementById("authTitle");
var authNameField = document.getElementById("authNameField");
var authNameInput = document.getElementById("authName");
var authEmailInput = document.getElementById("authEmail");
var authPasswordInput = document.getElementById("authPassword");
var authSubmit = document.getElementById("authSubmit");
var authError = document.getElementById("authError");
var authToggleBtn = document.getElementById("authToggleBtn");
var authToggleText = document.getElementById("authToggleText");
var authGoogleBtn = document.getElementById("authGoogleBtn");
var authMode = "login"; // "login" | "register"

function setAuthError(msg) {
  if (!msg) { authError.classList.remove("show"); authError.textContent = ""; return; }
  authError.textContent = msg;
  authError.classList.add("show");
}

function applyAuthMode() {
  var isReg = authMode === "register";
  authTitle.textContent = isReg ? "Criar conta" : "Entrar";
  authSubmit.textContent = isReg ? "Criar conta" : "Entrar";
  authNameField.style.display = isReg ? "block" : "none";
  authPasswordInput.setAttribute("autocomplete", isReg ? "new-password" : "current-password");
  authToggleText.textContent = isReg ? "Já tem conta?" : "Não tem conta?";
  authToggleBtn.textContent = isReg ? "Entrar" : "Criar conta";
  setAuthError("");
}

function openAuth() {
  authMode = "login";
  applyAuthMode();
  authForm.reset();
  setAuthError("");
  authOverlay.classList.add("show");
  setTimeout(function () { authEmailInput.focus(); }, 30);
}
function closeAuth() {
  authOverlay.classList.remove("show");
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function setAuthLoading(loading) {
  authSubmit.disabled = loading;
  authSubmit.textContent = loading
    ? (authMode === "register" ? "Criando…" : "Entrando…")
    : (authMode === "register" ? "Criar conta" : "Entrar");
}

function friendlyAuthError(err) {
  if (err && err.isNetworkError) {
    return "Sem conexão com o servidor. Você pode usar o app offline; tente entrar mais tarde.";
  }
  if (err && err.name === "ApiError") {
    if (err.status === 401) return "Credenciais inválidas.";
    if (err.status === 409) return err.message || "Email já cadastrado.";
    return err.message || "Não foi possível concluir. Tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

function doGoogleLogin(onDone) {
  if (!SocialLogin) {
    showToast("Login com Google indisponivel neste app.");
    if (onDone) onDone(false);
    return;
  }
  if (!GOOGLE_CLIENT_ID) {
    showToast("Google Client ID nao configurado.");
    if (onDone) onDone(false);
    return;
  }
  setAuthLoading(true);
  ensureSocialLoginInit().then(function () {
    return SocialLogin.login({
      provider: "google",
      options: {}
    });
  }).then(function (res) {
    var idToken = res && res.result && res.result.idToken;
    if (!idToken) {
      setAuthLoading(false);
      setAuthError("Falha na autenticacao com Google.");
      if (onDone) onDone(false);
      return;
    }
    return Api.googleLogin(idToken).then(function () {
      return Api.me().catch(function () { return null; });
    }).then(function () {
      setAuthLoading(false);
      closeAuth();
      var s = Api.getSession();
      var who = s && s.user ? (s.user.displayName || s.user.email) : "";
      showToast("Conectado com Google" + (who ? " como " + who : ""));
      if (onDone) onDone(true);
    });
  }).catch(function (err) {
    setAuthLoading(false);
    if (err && err.message === "Google Client ID nao configurado") {
      showToast("Google Client ID nao configurado.");
    } else {
      setAuthError(friendlyAuthError(err));
    }
    if (onDone) onDone(false);
  });
}

/* ---------- Tela de boas-vindas (splash, exibida sempre ao abrir o app) ---------- */
var splashScreen = document.getElementById("splashScreen");
var splashGoogleBtn = document.getElementById("splashGoogleBtn");
var splashGoogleLabel = document.getElementById("splashGoogleLabel");
var splashGoogleIcon = document.getElementById("splashGoogleIcon");
var splashSkipBtn = document.getElementById("splashSkipBtn");

function dismissSplash() {
  splashScreen.setAttribute("hidden", "");
}

function showSplash() {
  splashScreen.removeAttribute("hidden");
  applySplashSessionState();
}

// Reexibe a splash automaticamente se o app ficar um tempo em segundo plano
// (usuário minimizou e voltou depois), sem exigir nenhuma ação manual (ex:
// botão "Sair"). Isso cobre o caso de uso real: a splash deve aparecer "ao
// abrir o app", e reabrir depois de alguns minutos fora conta como abrir de
// novo, mesmo que o processo Android não tenha sido encerrado.
var SPLASH_REAPPEAR_AFTER_MS = 5 * 60 * 1000; // 5 minutos
var backgroundedAt = null;

function initSplashReappearOnResume() {
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      backgroundedAt = Date.now();
      return;
    }
    // visibilityState === "visible"
    if (backgroundedAt === null) return;
    var elapsed = Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (elapsed >= SPLASH_REAPPEAR_AFTER_MS) {
      showSplash();
    }
  });
}

function applySplashSessionState() {
  var s = Api.getSession();
  if (s && s.user) {
    var who = s.user.displayName || s.user.email || "";
    splashGoogleLabel.textContent = who ? "Continuar como " + who : "Continuar";
    splashGoogleIcon.style.display = "none";
  } else {
    splashGoogleLabel.textContent = "Continuar com Google";
    splashGoogleIcon.style.display = "";
  }
}

function initAuth() {
  document.getElementById("authCloseBtn").addEventListener("click", closeAuth);
  authOverlay.addEventListener("click", function (ev) {
    if (ev.target === authOverlay) closeAuth();
  });
  authToggleBtn.addEventListener("click", function () {
    authMode = authMode === "login" ? "register" : "login";
    applyAuthMode();
  });

  // Esc fecha os modais abertos.
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (authOverlay.classList.contains("show")) closeAuth();
    else if (document.getElementById("editOverlay").classList.contains("show")) closeEditor();
  });

  authForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    setAuthError("");
    var email = authEmailInput.value.trim();
    var password = authPasswordInput.value;
    var displayName = authNameInput.value.trim();

    if (!validEmail(email)) { setAuthError("Informe um email válido."); authEmailInput.focus(); return; }
    if (password.length < 8) { setAuthError("A senha precisa ter ao menos 8 caracteres."); authPasswordInput.focus(); return; }
    if (authMode === "register" && !displayName) { setAuthError("Informe seu nome."); authNameInput.focus(); return; }

    setAuthLoading(true);
    var op = authMode === "register"
      ? Api.register(email, password, displayName)
      : Api.login(email, password);

    op.then(function () {
      // Valida o token e atualiza o usuário exibido.
      return Api.me().catch(function () { return null; });
    }).then(function () {
      setAuthLoading(false);
      closeAuth();
      var s = Api.getSession();
      var who = s && s.user ? (s.user.displayName || s.user.email) : "";
      showToast(authMode === "register" ? "Conta criada. Bem-vindo(a)!" : ("Conectado como " + who));
    }).catch(function (err) {
      setAuthLoading(false);
      setAuthError(friendlyAuthError(err));
    });
  });

  authGoogleBtn.addEventListener("click", function () { doGoogleLogin(); });

  applySplashSessionState();

  // A splash NUNCA deve travar o acesso ao app: se o login Google falhar por
  // qualquer motivo (sem internet, popup cancelado, config nao carregada),
  // o usuario ainda assim entra no app normalmente, apenas sem conta.
  splashSkipBtn.addEventListener("click", dismissSplash);
  splashGoogleBtn.addEventListener("click", function () {
    if (Api.isLoggedIn()) {
      // Sessao ja existe: so entra no app, sem pedir login de novo.
      dismissSplash();
      return;
    }
    doGoogleLogin(function () {
      // Sucesso ou falha: sempre libera a entrada no app.
      dismissSplash();
    });
  });

  // Busca config do servidor (GOOGLE_CLIENT_ID, etc.)
  fetch(API_BASE + "/config").then(function (r) { return r.json(); }).then(function (cfg) {
    if (cfg && cfg.googleClientId) GOOGLE_CLIENT_ID = cfg.googleClientId;
  }).catch(function () { /* servidor offline, Google login nao disponivel */ });

  Api.onChange(renderSessionChip);
  renderSessionChip();

  // Se já havia sessão salva, valida o token silenciosamente (não bloqueia a UI).
  if (Api.isLoggedIn()) {
    Api.me().catch(function () { /* offline ou token inválido: refresh/limpeza já tratados no Api */ });
  }

  initSplashReappearOnResume();
}

export { openAuth, closeAuth, doGoogleLogin, initAuth };
