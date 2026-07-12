import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import express from 'express';

process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';

vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

// Mocka a camada de repositório social com stores em memória, respeitando
// o mesmo contrato de isolamento por user_id do repo real.
vi.mock('../src/modules/social/social.repo.js', () => {
  const store = {
    invites: [], // { id, code, from_user, used_at, expires_at }
    pairs: [], // { id, user_a, user_b }
    completions: new Map(), // `${userId}:${date}` -> count
    totalTasks: new Map(), // `${userId}:${weekday}` -> count
    focus: new Map(), // userId -> updatedAt (ms)
  };
  const users = new Map(); // userId -> { display_name, email }

  return {
    __store: store,
    __reset: () => {
      store.invites = [];
      store.pairs = [];
      store.completions.clear();
      store.totalTasks.clear();
      store.focus.clear();
    },
    __setUser: (id, displayName, email) => users.set(id, { display_name: displayName, email }),
    __setTodayCompletions: (userId, date, count) => store.completions.set(`${userId}:${date}`, count),
    __setTotalTasks: (userId, weekday, count) => store.totalTasks.set(`${userId}:${weekday}`, count),

    generateInviteCode: vi.fn(() => 'ABC123'),

    createInvite: vi.fn(async (userId, code) => {
      const row = { id: crypto.randomUUID(), code, from_user: userId, used_at: null, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() };
      store.invites.push(row);
      return row;
    }),
    findValidInvite: vi.fn(async (code) =>
      store.invites.find((i) => i.code === code && !i.used_at && new Date(i.expires_at) > new Date()) || null,
    ),
    markInviteUsed: vi.fn(async (inviteId) => {
      const inv = store.invites.find((i) => i.id === inviteId);
      if (inv) inv.used_at = new Date().toISOString();
    }),
    createPair: vi.fn(async (u1, u2) => {
      const [a, b] = u1 < u2 ? [u1, u2] : [u2, u1];
      let pair = store.pairs.find((p) => p.user_a === a && p.user_b === b);
      if (!pair) {
        pair = { id: crypto.randomUUID(), user_a: a, user_b: b };
        store.pairs.push(pair);
      }
      return pair;
    }),
    findPartner: vi.fn(async (userId) => {
      const pair = store.pairs.find((p) => p.user_a === userId || p.user_b === userId);
      if (!pair) return null;
      const otherId = pair.user_a === userId ? pair.user_b : pair.user_a;
      const u = users.get(otherId) || { display_name: null, email: 'unknown@example.com' };
      return { id: otherId, display_name: u.display_name, email: u.email };
    }),
    deletePair: vi.fn(async (userId) => {
      const before = store.pairs.length;
      store.pairs = store.pairs.filter((p) => p.user_a !== userId && p.user_b !== userId);
      return store.pairs.length < before;
    }),
    countTodayCompletions: vi.fn(async (userId, date) => store.completions.get(`${userId}:${date}`) || 0),
    countTodayTotalTasks: vi.fn(async (userId, weekday) => store.totalTasks.get(`${userId}:${weekday}`) || 0),

    upsertFocusHeartbeat: vi.fn(async (userId) => {
      store.focus.set(userId, Date.now());
    }),
    deleteFocusHeartbeat: vi.fn(async (userId) => {
      store.focus.delete(userId);
    }),
    countActiveFocusSessions: vi.fn(async (windowSeconds) => {
      const cutoff = Date.now() - windowSeconds * 1000;
      let count = 0;
      for (const t of store.focus.values()) if (t > cutoff) count += 1;
      return count;
    }),
  };
});

const repo = await import('../src/modules/social/social.repo.js');
const { createSocialRouter } = await import('../src/modules/social/social.router.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/social', createSocialRouter());
  app.use(errorHandler);
  return app;
}

const app = buildApp();

const userA = { id: crypto.randomUUID(), email: 'a@example.com' };
const userB = { id: crypto.randomUUID(), email: 'b@example.com' };
const userC = { id: crypto.randomUUID(), email: 'c@example.com' };
const tokenA = signAccessToken(userA);
const tokenB = signAccessToken(userB);
const tokenC = signAccessToken(userC);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeEach(() => {
  repo.__reset();
  repo.__setUser(userA.id, 'Ana', userA.email);
  repo.__setUser(userB.id, 'Beto', userB.email);
  repo.__setUser(userC.id, null, userC.email);
});

describe('POST /social/invite', () => {
  it('sem token → 401', async () => {
    const res = await request(app).post('/social/invite');
    expect(res.status).toBe(401);
  });

  it('gera um código de convite', async () => {
    const res = await request(app).post('/social/invite').set(auth(tokenA));
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('ABC123');
    expect(res.body.expiresAt).toBeTruthy();
  });

  it('usuário já pareado não pode gerar novo convite → 409', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    await request(app).post('/social/invite/accept').set(auth(tokenB)).send({ code: 'ABC123' });
    const res = await request(app).post('/social/invite').set(auth(tokenA));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PAIRED');
  });
});

describe('POST /social/invite/accept', () => {
  it('código inválido → 404', async () => {
    const res = await request(app).post('/social/invite/accept').set(auth(tokenA)).send({ code: 'ZZZZZZ' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVITE_NOT_FOUND');
  });

  it('aceitar o próprio convite → 400', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    const res = await request(app).post('/social/invite/accept').set(auth(tokenA)).send({ code: 'ABC123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_INVITE');
  });

  it('forma o par com sucesso e retorna o nome do parceiro', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    const res = await request(app).post('/social/invite/accept').set(auth(tokenB)).send({ code: 'ABC123' });
    expect(res.status).toBe(200);
    expect(res.body.partner).toMatchObject({ id: userA.id, displayName: 'Ana' });
  });

  it('convite já usado não pode ser reaceito → 404', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    await request(app).post('/social/invite/accept').set(auth(tokenB)).send({ code: 'ABC123' });
    const res = await request(app).post('/social/invite/accept').set(auth(tokenC)).send({ code: 'ABC123' });
    expect(res.status).toBe(404);
  });
});

describe('GET /social/partner', () => {
  it('sem par → partner null', async () => {
    const res = await request(app).get('/social/partner').set(auth(tokenC));
    expect(res.status).toBe(200);
    expect(res.body.partner).toBeNull();
  });

  it('ISOLAMENTO: retorna o progresso do dia de cada lado sem expor tarefas', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    await request(app).post('/social/invite/accept').set(auth(tokenB)).send({ code: 'ABC123' });

    const today = new Date().toISOString().slice(0, 10);
    const weekday = ((new Date().getDay() + 6) % 7) + 1; // 1=seg..7=dom
    repo.__setTodayCompletions(userA.id, today, 3);
    repo.__setTotalTasks(userA.id, weekday, 5);
    repo.__setTodayCompletions(userB.id, today, 1);
    repo.__setTotalTasks(userB.id, weekday, 4);

    const resA = await request(app).get('/social/partner').set(auth(tokenA));
    expect(resA.status).toBe(200);
    expect(resA.body.partner.displayName).toBe('Beto');
    expect(resA.body.me).toEqual({ done: 3, total: 5 });
    expect(resA.body.partnerProgress).toEqual({ done: 1, total: 4 });
    // Nunca expõe tarefas em si, só contagens.
    expect(resA.body.partnerProgress.tasks).toBeUndefined();
  });
});

describe('DELETE /social/partner', () => {
  it('sem par → 404', async () => {
    const res = await request(app).delete('/social/partner').set(auth(tokenC));
    expect(res.status).toBe(404);
  });

  it('desfaz o par para ambos os lados', async () => {
    await request(app).post('/social/invite').set(auth(tokenA));
    await request(app).post('/social/invite/accept').set(auth(tokenB)).send({ code: 'ABC123' });

    const del = await request(app).delete('/social/partner').set(auth(tokenA));
    expect(del.status).toBe(204);

    const statusB = await request(app).get('/social/partner').set(auth(tokenB));
    expect(statusB.body.partner).toBeNull();
  });
});

describe('Body doubling — /social/focus', () => {
  it('heartbeat aumenta a contagem agregada', async () => {
    const before = await request(app).get('/social/focus/count').set(auth(tokenA));
    expect(before.body.activeCount).toBe(0);

    await request(app).post('/social/focus/heartbeat').set(auth(tokenA));
    await request(app).post('/social/focus/heartbeat').set(auth(tokenB));

    const after = await request(app).get('/social/focus/count').set(auth(tokenC));
    expect(after.body.activeCount).toBe(2);
  });

  it('encerrar heartbeat reduz a contagem', async () => {
    await request(app).post('/social/focus/heartbeat').set(auth(tokenA));
    await request(app).delete('/social/focus/heartbeat').set(auth(tokenA));

    const res = await request(app).get('/social/focus/count').set(auth(tokenB));
    expect(res.body.activeCount).toBe(0);
  });

  it('contagem nunca identifica quem está em foco (só número agregado)', async () => {
    await request(app).post('/social/focus/heartbeat').set(auth(tokenA));
    const res = await request(app).get('/social/focus/count').set(auth(tokenB));
    expect(Object.keys(res.body)).toEqual(['activeCount']);
  });
});
