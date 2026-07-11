import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'node:crypto';

// Nunca abrimos um pool pg real nos testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

// Mocka a camada de repositório com um store em memória.
// O service (regras de intervalo, isolamento, projeção camelCase) roda de verdade.
vi.mock('../src/modules/completions/completions.repo.js', () => {
  const store = {
    // posse: `${userId}:${taskId}` -> true
    ownership: new Set(),
    completions: [], // { user_id, task_id, done_date }
  };

  return {
    __store: store,
    __reset: () => {
      store.ownership = new Set();
      store.completions = [];
    },
    __own: (userId, taskId) => store.ownership.add(`${userId}:${taskId}`),
    taskBelongsToUser: vi.fn(async (userId, taskId) =>
      store.ownership.has(`${userId}:${taskId}`),
    ),
    listCompletions: vi.fn(async (userId, from, to) =>
      store.completions
        .filter((c) => c.user_id === userId && c.done_date >= from && c.done_date <= to)
        .map((c) => ({ task_id: c.task_id, done_date: c.done_date })),
    ),
    upsertCompletion: vi.fn(async (userId, taskId, date) => {
      const exists = store.completions.find(
        (c) => c.user_id === userId && c.task_id === taskId && c.done_date === date,
      );
      if (!exists) store.completions.push({ user_id: userId, task_id: taskId, done_date: date });
      return { task_id: taskId, done_date: date };
    }),
    deleteCompletion: vi.fn(async (userId, taskId, date) => {
      const before = store.completions.length;
      store.completions = store.completions.filter(
        (c) => !(c.user_id === userId && c.task_id === taskId && c.done_date === date),
      );
      return store.completions.length < before;
    }),
  };
});

const repo = await import('../src/modules/completions/completions.repo.js');
const { createCompletionsRouter } = await import(
  '../src/modules/completions/completions.router.js'
);
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

const app = express();
app.use(express.json());
app.use('/completions', createCompletionsRouter());
app.use(errorHandler);

const USER_A = crypto.randomUUID();
const USER_B = crypto.randomUUID();
const tokenA = signAccessToken({ id: USER_A, email: 'a@example.com' });

const TASK_A = crypto.randomUUID(); // pertence a A
const TASK_B = crypto.randomUUID(); // pertence a B

beforeEach(() => {
  repo.__reset();
  repo.__own(USER_A, TASK_A);
  repo.__own(USER_B, TASK_B);
});

describe('PUT /completions', () => {
  it('done=true cria a completion e retorna camelCase', async () => {
    const res = await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, date: '2026-07-10', done: true });
    expect(res.status).toBe(200);
    expect(res.body.completion).toEqual({ taskId: TASK_A, date: '2026-07-10', done: true });
    expect(repo.__store.completions).toHaveLength(1);
  });

  it('done=false remove a completion e retorna completion:null', async () => {
    await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, date: '2026-07-10', done: true });

    const res = await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, date: '2026-07-10', done: false });
    expect(res.status).toBe(200);
    expect(res.body.completion).toBeNull();
    expect(repo.__store.completions).toHaveLength(0);
  });

  it('task de OUTRO usuário → 404 (não 403) e não escreve', async () => {
    const res = await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_B, date: '2026-07-10', done: true });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    expect(repo.__store.completions).toHaveLength(0);
  });

  it('date inválida → 400', async () => {
    const res = await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, date: '2026-13-40', done: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sem token → 401', async () => {
    const res = await request(app)
      .put('/completions')
      .send({ taskId: TASK_A, date: '2026-07-10', done: true });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /completions', () => {
  it('filtra por intervalo from/to', async () => {
    const dates = ['2026-07-01', '2026-07-10', '2026-07-20'];
    for (const date of dates) {
      await request(app)
        .put('/completions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ taskId: TASK_A, date, done: true });
    }

    const res = await request(app)
      .get('/completions?from=2026-07-05&to=2026-07-15')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.completions).toEqual([
      { taskId: TASK_A, date: '2026-07-10', done: true },
    ]);
  });

  it('isolamento: A não vê completions de B', async () => {
    // B marca a sua própria task.
    const tokenB = signAccessToken({ id: USER_B, email: 'b@example.com' });
    await request(app)
      .put('/completions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ taskId: TASK_B, date: '2026-07-10', done: true });

    const res = await request(app)
      .get('/completions?from=2026-07-01&to=2026-07-31')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.completions).toHaveLength(0);
  });

  it('sem from/to usa default (últimos 30 dias) e responde 200', async () => {
    const res = await request(app)
      .get('/completions')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.completions)).toBe(true);
  });

  it('sem token → 401', async () => {
    const res = await request(app).get('/completions');
    expect(res.status).toBe(401);
  });
});
