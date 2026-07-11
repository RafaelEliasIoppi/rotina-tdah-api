import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';

// Nunca abrimos um pool pg real nos testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

// Mocka a camada de repositório com um store em memória.
// Assim o service (hashing, JWT, rotação) roda de verdade, sem Postgres.
vi.mock('../src/modules/auth/auth.repo.js', () => {
  const store = {
    users: [],
    routines: [],
    refreshTokens: [],
  };
  const clone = (o) => (o ? { ...o } : o);

  return {
    __store: store,
    __reset: () => {
      store.users = [];
      store.routines = [];
      store.refreshTokens = [];
    },
    findUserByEmail: vi.fn(async (email) =>
      clone(store.users.find((u) => u.email === String(email).toLowerCase())) || null,
    ),
    findUserById: vi.fn(async (id) => clone(store.users.find((u) => u.id === id)) || null),
    findUserByGoogleSub: vi.fn(
      async (sub) => clone(store.users.find((u) => u.google_sub === sub)) || null,
    ),
    createUser: vi.fn(async ({ email, passwordHash = null, googleSub = null, displayName = null }) => {
      const user = {
        id: crypto.randomUUID(),
        email: String(email).toLowerCase(),
        password_hash: passwordHash,
        google_sub: googleSub,
        display_name: displayName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.users.push(user);
      return clone(user);
    }),
    setUserGoogleSub: vi.fn(async (userId, googleSub) => {
      const u = store.users.find((x) => x.id === userId);
      if (u) u.google_sub = googleSub;
      return clone(u);
    }),
    createDefaultRoutine: vi.fn(async (userId) => {
      const r = { id: crypto.randomUUID(), user_id: userId, name: 'Minha rotina' };
      store.routines.push(r);
      return clone(r);
    }),
    insertRefreshToken: vi.fn(async ({ userId, tokenHash, expiresAt }) => {
      const rec = {
        id: crypto.randomUUID(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
      };
      store.refreshTokens.push(rec);
      return clone(rec);
    }),
    findRefreshTokenByHash: vi.fn(
      async (hash) => clone(store.refreshTokens.find((t) => t.token_hash === hash)) || null,
    ),
    revokeRefreshTokenById: vi.fn(async (id) => {
      const t = store.refreshTokens.find((x) => x.id === id);
      if (t && !t.revoked_at) t.revoked_at = new Date().toISOString();
    }),
    revokeRefreshTokenByHash: vi.fn(async (hash) => {
      const t = store.refreshTokens.find((x) => x.token_hash === hash);
      if (t && !t.revoked_at) {
        t.revoked_at = new Date().toISOString();
        return true;
      }
      return false;
    }),
  };
});

const repo = await import('../src/modules/auth/auth.repo.js');
const { createApp } = await import('../src/app.js');

const app = createApp();

beforeEach(() => {
  repo.__reset();
});

async function registerUser(overrides = {}) {
  return request(app)
    .post('/auth/register')
    .send({ email: 'user@example.com', password: 'senha12345', displayName: 'Fulano', ...overrides });
}

describe('POST /auth/register', () => {
  it('cria usuário, rotina default e retorna user + tokens', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'user@example.com', displayName: 'Fulano' });
    expect(res.body.user.id).toBeTruthy();
    // Nunca expõe segredos.
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.google_sub).toBeUndefined();
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
    // Rotina default criada.
    expect(repo.__store.routines).toHaveLength(1);
  });

  it('rejeita email duplicado com 409', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejeita senha curta com 400', async () => {
    const res = await registerUser({ password: 'curta' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  it('loga com credenciais corretas', async () => {
    await registerUser();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'senha12345' });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeTruthy();
  });

  it('rejeita senha errada com 401', async () => {
    await registerUser();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'senhaERRADA' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /me', () => {
  it('sem token → 401', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('com token válido → 200 e retorna user', async () => {
    const reg = await registerUser();
    const token = reg.body.tokens.accessToken;
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

describe('POST /auth/refresh', () => {
  it('token inválido → 401', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'nao-existe' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rotaciona: o token velho deixa de valer após uso', async () => {
    const reg = await registerUser();
    const oldRefresh = reg.body.tokens.refreshToken;

    const first = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(first.status).toBe(200);
    expect(first.body.tokens.refreshToken).toBeTruthy();
    expect(first.body.tokens.refreshToken).not.toBe(oldRefresh);

    // Reusar o token velho falha (foi revogado na rotação).
    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);

    // O novo token funciona.
    const withNew = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: first.body.tokens.refreshToken });
    expect(withNew.status).toBe(200);
  });
});

describe('POST /auth/logout', () => {
  it('revoga o refresh token e responde 204', async () => {
    const reg = await registerUser();
    const refreshToken = reg.body.tokens.refreshToken;
    const res = await request(app).post('/auth/logout').send({ refreshToken });
    expect(res.status).toBe(204);

    // Após logout o refresh não vale mais.
    const after = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(after.status).toBe(401);
  });
});

describe('POST /auth/google', () => {
  it('sem GOOGLE_CLIENT_ID configurado → 501', async () => {
    const res = await request(app).post('/auth/google').send({ idToken: 'qualquer' });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('GOOGLE_NOT_CONFIGURED');
  });
});
