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
vi.mock('../src/modules/reminders/reminders.repo.js', () => {
  const store = {
    ownership: new Set(), // `${userId}:${taskId}`
    reminders: [], // { user_id, task_id, weekday, time, label, enabled, updated_at }
  };

  return {
    __store: store,
    __reset: () => {
      store.ownership = new Set();
      store.reminders = [];
    },
    __own: (userId, taskId) => store.ownership.add(`${userId}:${taskId}`),
    taskBelongsToUser: vi.fn(async (userId, taskId) =>
      store.ownership.has(`${userId}:${taskId}`),
    ),
    listReminders: vi.fn(async (userId) =>
      store.reminders
        .filter((r) => r.user_id === userId)
        .map((r) => ({
          task_id: r.task_id,
          weekday: r.weekday,
          time: r.time,
          label: r.label,
          enabled: r.enabled,
        })),
    ),
    upsertReminder: vi.fn(async (userId, { taskId, enabled, time, weekday, label = null }) => {
      let rec = store.reminders.find((r) => r.user_id === userId && r.task_id === taskId);
      if (rec) {
        Object.assign(rec, { weekday, time, label, enabled, updated_at: new Date().toISOString() });
      } else {
        rec = {
          user_id: userId,
          task_id: taskId,
          weekday,
          time,
          label,
          enabled,
          updated_at: new Date().toISOString(),
        };
        store.reminders.push(rec);
      }
      return { task_id: taskId, weekday, time, label, enabled };
    }),
  };
});

const repo = await import('../src/modules/reminders/reminders.repo.js');
const { createRemindersRouter } = await import('../src/modules/reminders/reminders.router.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

const app = express();
app.use(express.json());
app.use('/reminders', createRemindersRouter());
app.use(errorHandler);

const USER_A = crypto.randomUUID();
const USER_B = crypto.randomUUID();
const tokenA = signAccessToken({ id: USER_A, email: 'a@example.com' });

const TASK_A = crypto.randomUUID();
const TASK_B = crypto.randomUUID();

beforeEach(() => {
  repo.__reset();
  repo.__own(USER_A, TASK_A);
  repo.__own(USER_B, TASK_B);
});

describe('PUT /reminders', () => {
  it('cria o reminder e retorna camelCase', async () => {
    const res = await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: true, time: '08:30', weekday: 1, label: 'Acordar' });
    expect(res.status).toBe(200);
    expect(res.body.reminder).toEqual({
      taskId: TASK_A,
      weekday: 1,
      time: '08:30',
      label: 'Acordar',
      enabled: true,
    });
    expect(repo.__store.reminders).toHaveLength(1);
  });

  it('atualiza o reminder existente (upsert por task) sem duplicar', async () => {
    await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: true, time: '08:30', weekday: 1 });

    const res = await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: false, time: '09:00', weekday: 2 });
    expect(res.status).toBe(200);
    expect(res.body.reminder).toMatchObject({ time: '09:00', weekday: 2, enabled: false });
    expect(repo.__store.reminders).toHaveLength(1);
  });

  it('task de OUTRO usuário → 404 (não 403) e não escreve', async () => {
    const res = await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_B, enabled: true, time: '08:30', weekday: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    expect(repo.__store.reminders).toHaveLength(0);
  });

  it('time inválido → 400', async () => {
    const res = await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: true, time: '25:99', weekday: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('weekday inválido (fora de 1-7) → 400', async () => {
    const res = await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: true, time: '08:30', weekday: 8 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sem token → 401', async () => {
    const res = await request(app)
      .put('/reminders')
      .send({ taskId: TASK_A, enabled: true, time: '08:30', weekday: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /reminders', () => {
  it('lista apenas os reminders do usuário (isolamento)', async () => {
    await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taskId: TASK_A, enabled: true, time: '08:30', weekday: 1 });

    const tokenB = signAccessToken({ id: USER_B, email: 'b@example.com' });
    await request(app)
      .put('/reminders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ taskId: TASK_B, enabled: true, time: '10:00', weekday: 3 });

    const res = await request(app)
      .get('/reminders')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.reminders).toEqual([
      { taskId: TASK_A, weekday: 1, time: '08:30', label: null, enabled: true },
    ]);
  });

  it('sem token → 401', async () => {
    const res = await request(app).get('/reminders');
    expect(res.status).toBe(401);
  });
});
