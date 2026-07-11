import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'node:crypto';

// Nunca abrimos um pool pg real nos testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

// Mocka a camada de repositório de subscriptions com um store em memória.
vi.mock('../src/modules/subscriptions/subscriptions.repo.js', () => {
  const store = {
    subscriptions: new Map(), // userId -> { plan, status, ... }
  };

  return {
    __store: store,
    __reset: () => store.subscriptions.clear(),
    __setPlan: (userId, plan) => store.subscriptions.set(userId, { plan, status: 'active' }),
    findByUserId: vi.fn(async (userId) => store.subscriptions.get(userId) || null),
    upsert: vi.fn(async (userId, data) => {
      const existing = store.subscriptions.get(userId) || {};
      const merged = { ...existing, ...data, user_id: userId };
      store.subscriptions.set(userId, merged);
      return merged;
    }),
  };
});

const repo = await import('../src/modules/subscriptions/subscriptions.repo.js');
const { requirePremium } = await import('../src/middleware/requirePremium.js');
const { requireAuth } = await import('../src/middleware/auth.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');
const subscriptionsRouter = (await import('../src/modules/subscriptions/subscriptions.router.js')).default;

const app = express();
app.use(express.json());
app.use('/subscriptions', subscriptionsRouter);
// Rota de teste protegida por requirePremium, para validar o middleware isoladamente.
app.get('/premium-only', requireAuth, requirePremium, (req, res) => {
  res.json({ ok: true });
});
app.use(errorHandler);

const USER_FREE = crypto.randomUUID();
const USER_PREMIUM = crypto.randomUUID();
const tokenFree = signAccessToken({ id: USER_FREE, email: 'free@example.com' });
const tokenPremium = signAccessToken({ id: USER_PREMIUM, email: 'premium@example.com' });

beforeEach(() => {
  repo.__reset();
  repo.__setPlan(USER_PREMIUM, 'premium');
});

describe('requirePremium', () => {
  it('sem token → 401', async () => {
    const res = await request(app).get('/premium-only');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('usuário free (sem subscription) → 403', async () => {
    const res = await request(app)
      .get('/premium-only')
      .set('Authorization', `Bearer ${tokenFree}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PREMIUM_REQUIRED');
  });

  it('usuário premium → 200', async () => {
    const res = await request(app)
      .get('/premium-only')
      .set('Authorization', `Bearer ${tokenPremium}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /subscriptions/config', () => {
  it('retorna priceId (sem exigir auth)', async () => {
    const res = await request(app).get('/subscriptions/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('priceId');
    expect(typeof res.body.priceId).toBe('string');
  });
});
