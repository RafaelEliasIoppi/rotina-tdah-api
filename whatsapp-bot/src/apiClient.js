import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '..', 'state');
const SESSION_FILE = join(STATE_DIR, 'session.json');

function ensureStateDir() {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

export function createApiClient({ apiBase, email, password }) {
  let session = loadSession();

  function loadSession() {
    try {
      if (existsSync(SESSION_FILE)) {
        return JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
      }
    } catch {}
    return null;
  }

  function persistSession() {
    ensureStateDir();
    const tmp = SESSION_FILE + '.tmp';
    writeFileSync(tmp, JSON.stringify(session, null, 2), 'utf-8');
    renameSync(tmp, SESSION_FILE);
  }

  function clearSession() {
    session = null;
    try { writeFileSync(SESSION_FILE, '{}', 'utf-8'); } catch {}
  }

  async function rawJson(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    const init = { method: opts.method || 'GET', headers };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetch(apiBase + path, init);
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch {}
    }
    return { status: res.status, data, ok: res.ok };
  }

  async function login() {
    console.log('[apiClient] Efetuando login na API...');
    const result = await rawJson('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (!result.ok || !result.data?.tokens) {
      const msg = result.data?.error?.message || `HTTP ${result.status}`;
      throw new Error(`Falha no login: ${msg}`);
    }

    const { user, tokens } = result.data;
    session = {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    persistSession();
    console.log('[apiClient] Login OK — usuário:', user.email);
    return session;
  }

  async function refresh() {
    if (!session?.refreshToken) {
      throw new Error('Sem refresh token disponível');
    }

    console.log('[apiClient] Renovando access token...');
    const result = await rawJson('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });

    if (!result.ok || !result.data?.tokens) {
      throw new Error('Falha ao renovar token');
    }

    session.accessToken = result.data.tokens.accessToken;
    session.refreshToken = result.data.tokens.refreshToken;
    persistSession();
    console.log('[apiClient] Token renovado com sucesso');
  }

  async function authedFetch(path, opts = {}, _retried = false) {
    if (!session) {
      await login();
    }

    const headers = {
      ...opts.headers,
      Authorization: `Bearer ${session.accessToken}`,
    };

    const result = await rawJson(path, { ...opts, headers });

    if (result.status === 401 && !_retried) {
      try {
        await refresh();
        return authedFetch(path, opts, true);
      } catch (refreshErr) {
        console.log('[apiClient] Refresh falhou, tentando re-login...');
        clearSession();
        await login();
        return authedFetch(path, opts, true);
      }
    }

    if (!result.ok) {
      const err = new Error(result.data?.error?.message || `Erro HTTP ${result.status}`);
      err.status = result.status;
      err.code = result.data?.error?.code || 'API_ERROR';
      throw err;
    }

    return result.data;
  }

  async function ensureAuthenticated() {
    if (!session) {
      await login();
    }
    return session;
  }

  async function getReminders() {
    return authedFetch('/reminders');
  }

  return { ensureAuthenticated, getReminders };
}
