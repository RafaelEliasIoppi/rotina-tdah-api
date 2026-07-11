import { AppStorage } from "./storage.js";

/* ---------- API layer (Fase 5) ----------
 * Base da API. Em produção troque por sua URL HTTPS pública, ex:
 *   var API_BASE = "https://api.seu-dominio.com";
 * (uma linha só). Mantém-se 100% offline-first: se a rede/servidor
 * estiver indisponível, o app continua funcionando com localStorage. */
var API_BASE = "https://rotina-tdah-api.onrender.com";

// Erro identificável de rede (backend offline / sem conexão).
function NetworkError(message) {
  this.name = "NetworkError";
  this.message = message || "Sem conexão com o servidor";
  this.isNetworkError = true;
}
NetworkError.prototype = Object.create(Error.prototype);

// Erro de API com mensagem amigável e código vindos do backend.
function ApiError(message, status, code) {
  this.name = "ApiError";
  this.message = message || "Erro inesperado";
  this.status = status || 0;
  this.code = code || null;
}
ApiError.prototype = Object.create(Error.prototype);

var Api = (function () {
  var session = loadSession(); // { user, accessToken, refreshToken } | null
  var listeners = [];

  function loadSession() {
    return AppStorage.getAuth();
  }
  function persist() {
    AppStorage.setAuth(session);
  }
  function setSession(user, tokens) {
    session = { user: user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    persist();
    emit();
  }
  function clearSession() {
    session = null;
    persist();
    emit();
  }
  function emit() {
    listeners.forEach(function (fn) { try { fn(session); } catch (e) {} });
  }

  // fetch com JSON, mapeando falha de rede -> NetworkError e erro HTTP -> ApiError.
  function rawJson(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var init = { method: opts.method || "GET", headers: headers };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    return fetch(API_BASE + path, init).then(function (res) {
      if (res.status === 204) return { status: 204, data: null };
      return res.text().then(function (txt) {
        var data = null;
        if (txt) { try { data = JSON.parse(txt); } catch (e) { data = null; } }
        return { status: res.status, data: data, ok: res.ok };
      });
    }, function () {
      // Falha de rede (servidor offline, DNS, CORS de conexão): não trava a UI.
      throw new NetworkError();
    });
  }

  function toApiError(result) {
    var msg = result.data && result.data.error && result.data.error.message;
    var code = result.data && result.data.error && result.data.error.code;
    return new ApiError(msg || ("Erro " + result.status), result.status, code);
  }

  // Wrapper autenticado: injeta Bearer; em 401 tenta UM refresh e repete.
  function authedFetch(path, opts, _retried) {
    opts = opts || {};
    if (!session) return Promise.reject(new ApiError("Não autenticado", 401, "NO_SESSION"));
    var headers = Object.assign({}, opts.headers || {}, { Authorization: "Bearer " + session.accessToken });
    return rawJson(path, Object.assign({}, opts, { headers: headers })).then(function (result) {
      if (result.status === 401 && !_retried) {
        return refresh().then(function () {
          return authedFetch(path, opts, true);
        }, function () {
          // Refresh falhou: limpa a sessão e dispara logout local.
          clearSession();
          throw new ApiError("Sessão expirada", 401, "SESSION_EXPIRED");
        });
      }
      if (!result.ok) throw toApiError(result);
      return result.data;
    });
  }

  function refresh() {
    if (!session || !session.refreshToken) return Promise.reject(new ApiError("Sem refresh token", 401));
    return rawJson("/auth/refresh", { method: "POST", body: { refreshToken: session.refreshToken } }).then(function (result) {
      if (!result.ok || !result.data || !result.data.tokens) throw toApiError(result);
      session.accessToken = result.data.tokens.accessToken;
      session.refreshToken = result.data.tokens.refreshToken;
      persist();
      return session;
    });
  }

  return {
    NetworkError: NetworkError,
    ApiError: ApiError,
    getSession: function () { return session; },
    isLoggedIn: function () { return !!session; },
    onChange: function (fn) { listeners.push(fn); },
    fetch: authedFetch,

    register: function (email, password, displayName) {
      return rawJson("/auth/register", { method: "POST", body: { email: email, password: password, displayName: displayName } })
        .then(function (result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
    },
    login: function (email, password) {
      return rawJson("/auth/login", { method: "POST", body: { email: email, password: password } })
        .then(function (result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
    },
    logout: function () {
      var token = session && session.refreshToken;
      // Best-effort no servidor; local sempre limpa.
      var done = token
        ? rawJson("/auth/logout", { method: "POST", body: { refreshToken: token } }).catch(function () {})
        : Promise.resolve();
      return done.then(function () { clearSession(); });
    },
    me: function () {
      return authedFetch("/me", { method: "GET" }).then(function (data) {
        if (data && data.user && session) { session.user = data.user; persist(); emit(); }
        return data && data.user;
      });
    },
    googleLogin: function (idToken) {
      return rawJson("/auth/google", { method: "POST", body: { idToken: idToken } })
        .then(function (result) {
          if (!result.ok || !result.data) throw toApiError(result);
          setSession(result.data.user, result.data.tokens);
          return result.data.user;
        });
    }
  };
})();

export { Api, API_BASE, NetworkError, ApiError };
