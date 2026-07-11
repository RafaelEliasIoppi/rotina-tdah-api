import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import express from 'express';

// Env obrigatória (não editamos test/setup.js): garante segredos de JWT em teste.
process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';

// Nunca abrimos um pool pg real nos testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

// Mocka a camada de repositório de rotinas com um store em memória.
// O service (isolamento, projeções) roda de verdade; o SQL é substituído
// por operações no store que RESPEITAM o mesmo contrato de isolamento por user_id.
vi.mock('../src/modules/routines/routines.repo.js', () => {
  const store = {
    routines: [], // { id, user_id, name, created_at, updated_at }
    tasks: [], // { id, routine_id, weekday, time, label, block, detail, rule, sort_order, ... }
  };
  const clone = (o) => (o ? { ...o } : o);
  const now = () => new Date().toISOString();

  const mkTask = (routineId, t) => ({
    id: crypto.randomUUID(),
    routine_id: routineId,
    weekday: t.weekday,
    time: t.time,
    label: t.label,
    block: t.block,
    detail: t.detail ?? '',
    rule: t.rule ?? '',
    sort_order: t.sortOrder ?? 0,
    created_at: now(),
    updated_at: now(),
  });

  // Resolve a rotina de um usuário a partir de um routine_id (para isolamento).
  const routineOwner = (routineId) => store.routines.find((r) => r.id === routineId)?.user_id;

  return {
    __store: store,
    __reset: () => {
      store.routines = [];
      store.tasks = [];
    },
    // Helper de teste: cria rotina para um usuário.
    __seedRoutine: (userId) => {
      const r = { id: crypto.randomUUID(), user_id: userId, name: 'Minha rotina', created_at: now(), updated_at: now() };
      store.routines.push(r);
      return clone(r);
    },

    findRoutineByUserId: vi.fn(async (userId) =>
      clone(store.routines.find((r) => r.user_id === userId)) || null,
    ),
    createRoutine: vi.fn(async (userId) => {
      const r = { id: crypto.randomUUID(), user_id: userId, name: 'Minha rotina', created_at: now(), updated_at: now() };
      store.routines.push(r);
      return clone(r);
    }),
    findTasksByRoutineId: vi.fn(async (routineId) =>
      store.tasks.filter((t) => t.routine_id === routineId).map(clone),
    ),
    replaceTasks: vi.fn(async (routineId, tasks) => {
      store.tasks = store.tasks.filter((t) => t.routine_id !== routineId);
      const inserted = tasks.map((t) => mkTask(routineId, t));
      store.tasks.push(...inserted);
      const r = store.routines.find((x) => x.id === routineId);
      if (r) r.updated_at = now();
      return inserted.map(clone);
    }),
    insertTask: vi.fn(async (routineId, t) => {
      const row = mkTask(routineId, t);
      store.tasks.push(row);
      const r = store.routines.find((x) => x.id === routineId);
      if (r) r.updated_at = now();
      return clone(row);
    }),
    updateTaskForUser: vi.fn(async (taskId, userId, fields) => {
      const task = store.tasks.find((t) => t.id === taskId);
      // ISOLAMENTO: só atualiza se a task existe E sua rotina é do usuário.
      if (!task || routineOwner(task.routine_id) !== userId) return null;
      Object.assign(task, fields);
      task.updated_at = now();
      return clone(task);
    }),
    deleteTaskForUser: vi.fn(async (taskId, userId) => {
      const task = store.tasks.find((t) => t.id === taskId);
      // ISOLAMENTO: só remove se a task existe E sua rotina é do usuário.
      if (!task || routineOwner(task.routine_id) !== userId) return false;
      store.tasks = store.tasks.filter((t) => t.id !== taskId);
      return true;
    }),
  };
});

const repo = await import('../src/modules/routines/routines.repo.js');
const { createRoutinesRouter } = await import('../src/modules/routines/routines.router.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

// Monta um app de teste equivalente ao que app.js montará (não editamos app.js).
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', createRoutinesRouter());
  app.use(errorHandler);
  return app;
}

const app = buildApp();

// Dois usuários distintos para provar isolamento.
const userA = { id: crypto.randomUUID(), email: 'a@example.com' };
const userB = { id: crypto.randomUUID(), email: 'b@example.com' };
const tokenA = signAccessToken(userA);
const tokenB = signAccessToken(userB);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const validTask = (over = {}) => ({
  weekday: 1,
  time: '08:30',
  label: 'Tomar remédio',
  block: 'Manhã',
  ...over,
});

beforeEach(() => {
  repo.__reset();
});

describe('GET /routine', () => {
  it('sem token → 401', async () => {
    const res = await request(app).get('/routine');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('cria rotina sob demanda e retorna { routine, tasks[] }', async () => {
    const res = await request(app).get('/routine').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.routine).toBeTruthy();
    expect(res.body.routine.id).toBeTruthy();
    expect(res.body.tasks).toEqual([]);
    // Não vaza user_id.
    expect(res.body.routine.user_id).toBeUndefined();
  });

  it('retorna as tarefas da rotina do usuário no formato do cliente', async () => {
    const r = repo.__seedRoutine(userA.id);
    repo.__store.tasks.push({
      id: crypto.randomUUID(),
      routine_id: r.id,
      weekday: 2,
      time: '09:00',
      label: 'Café',
      block: 'Manhã',
      detail: 'com leite',
      rule: '',
      sort_order: 3,
    });
    const res = await request(app).get('/routine').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0]).toEqual({
      id: expect.any(String),
      weekday: 2,
      time: '09:00',
      label: 'Café',
      block: 'Manhã',
      detail: 'com leite',
      rule: '',
      sortOrder: 3,
    });
    // Nunca expõe routine_id/user_id na task.
    expect(res.body.tasks[0].routine_id).toBeUndefined();
  });

  it('isolamento: usuário A não vê tarefas de B', async () => {
    const rB = repo.__seedRoutine(userB.id);
    repo.__store.tasks.push({
      id: crypto.randomUUID(), routine_id: rB.id, weekday: 1, time: '07:00',
      label: 'Só do B', block: 'Manhã', detail: '', rule: '', sort_order: 0,
    });
    const res = await request(app).get('/routine').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
});

describe('PUT /routine/tasks', () => {
  it('substitui todo o conjunto de tarefas', async () => {
    repo.__seedRoutine(userA.id);
    // Primeiro conjunto.
    await request(app).put('/routine/tasks').set(auth(tokenA)).send({
      tasks: [validTask({ label: 'Antiga' })],
    });
    // Substitui.
    const res = await request(app).put('/routine/tasks').set(auth(tokenA)).send({
      tasks: [validTask({ label: 'Nova 1' }), validTask({ weekday: 3, label: 'Nova 2' })],
    });
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks.map((t) => t.label)).toEqual(['Nova 1', 'Nova 2']);
    // Confirma que só existem as novas no store da rotina.
    expect(repo.__store.tasks.map((t) => t.label).sort()).toEqual(['Nova 1', 'Nova 2']);
  });

  it('rejeita weekday inválido → 400', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).put('/routine/tasks').set(auth(tokenA)).send({
      tasks: [validTask({ weekday: 9 })],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita time inválido → 400', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).put('/routine/tasks').set(auth(tokenA)).send({
      tasks: [validTask({ time: '25:99' })],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita label ausente → 400', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).put('/routine/tasks').set(auth(tokenA)).send({
      tasks: [{ weekday: 1, time: '08:00', block: 'Manhã' }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /routine/tasks', () => {
  it('cria uma tarefa e retorna { task }', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).post('/routine/tasks').set(auth(tokenA)).send({
      task: validTask(),
    });
    expect(res.status).toBe(201);
    expect(res.body.task.id).toBeTruthy();
    expect(res.body.task.label).toBe('Tomar remédio');
    expect(res.body.task.sortOrder).toBe(0);
    expect(repo.__store.tasks).toHaveLength(1);
  });

  it('cria rotina sob demanda se não existir', async () => {
    const res = await request(app).post('/routine/tasks').set(auth(tokenA)).send({
      task: validTask(),
    });
    expect(res.status).toBe(201);
    expect(repo.__store.routines).toHaveLength(1);
    expect(repo.__store.routines[0].user_id).toBe(userA.id);
  });
});

describe('PATCH /routine/tasks/:id', () => {
  it('atualiza a própria tarefa', async () => {
    const r = repo.__seedRoutine(userA.id);
    const id = crypto.randomUUID();
    repo.__store.tasks.push({
      id, routine_id: r.id, weekday: 1, time: '08:00',
      label: 'Original', block: 'Manhã', detail: '', rule: '', sort_order: 0,
    });
    const res = await request(app).patch(`/routine/tasks/${id}`).set(auth(tokenA)).send({
      label: 'Editada', time: '10:15',
    });
    expect(res.status).toBe(200);
    expect(res.body.task.label).toBe('Editada');
    expect(res.body.task.time).toBe('10:15');
  });

  it('ISOLAMENTO: tarefa de OUTRO usuário → 404', async () => {
    const rB = repo.__seedRoutine(userB.id);
    const id = crypto.randomUUID();
    repo.__store.tasks.push({
      id, routine_id: rB.id, weekday: 1, time: '08:00',
      label: 'Do B', block: 'Manhã', detail: '', rule: '', sort_order: 0,
    });
    // Usuário A tenta editar task de B.
    const res = await request(app).patch(`/routine/tasks/${id}`).set(auth(tokenA)).send({
      label: 'Invadida',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    // Garante que a task de B não foi alterada.
    expect(repo.__store.tasks.find((t) => t.id === id).label).toBe('Do B');
  });

  it('tarefa inexistente → 404', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).patch(`/routine/tasks/${crypto.randomUUID()}`).set(auth(tokenA)).send({
      label: 'x',
    });
    expect(res.status).toBe(404);
  });

  it('payload vazio → 400', async () => {
    repo.__seedRoutine(userA.id);
    const res = await request(app).patch(`/routine/tasks/${crypto.randomUUID()}`).set(auth(tokenA)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /routine/tasks/:id', () => {
  it('remove a própria tarefa → 204', async () => {
    const r = repo.__seedRoutine(userA.id);
    const id = crypto.randomUUID();
    repo.__store.tasks.push({
      id, routine_id: r.id, weekday: 1, time: '08:00',
      label: 'X', block: 'Manhã', detail: '', rule: '', sort_order: 0,
    });
    const res = await request(app).delete(`/routine/tasks/${id}`).set(auth(tokenA));
    expect(res.status).toBe(204);
    expect(repo.__store.tasks.find((t) => t.id === id)).toBeUndefined();
  });

  it('ISOLAMENTO: tarefa de OUTRO usuário → 404 e não remove', async () => {
    const rB = repo.__seedRoutine(userB.id);
    const id = crypto.randomUUID();
    repo.__store.tasks.push({
      id, routine_id: rB.id, weekday: 1, time: '08:00',
      label: 'Do B', block: 'Manhã', detail: '', rule: '', sort_order: 0,
    });
    const res = await request(app).delete(`/routine/tasks/${id}`).set(auth(tokenA));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    // A task de B continua lá.
    expect(repo.__store.tasks.find((t) => t.id === id)).toBeTruthy();
  });

  it('sem token → 401', async () => {
    const res = await request(app).delete(`/routine/tasks/${crypto.randomUUID()}`);
    expect(res.status).toBe(401);
  });
});
