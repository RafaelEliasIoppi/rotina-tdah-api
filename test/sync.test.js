import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import express from 'express';

// Env obrigatória (não editamos test/setup.js).
process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';

// Nunca abrimos um pool pg real nos testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

/**
 * Mocka a camada de repositório de SYNC com um store em memória.
 * O service (isolamento, LWW, projeções, transação lógica) roda de verdade; o
 * SQL é substituído por operações que RESPEITAM o mesmo contrato de isolamento
 * por user_id (JOIN routines) e mantêm updated_at.
 */
vi.mock('../src/modules/sync/sync.repo.js', () => {
  const store = {
    routines: [], // { id, user_id, name, created_at, updated_at }
    tasks: [], // { id, routine_id, weekday, time, label, block, detail, rule, sort_order, created_at, updated_at }
    completions: [], // { user_id, task_id, done_date, created_at }
    reminders: [], // { user_id, task_id, weekday, time, label, enabled, updated_at }
  };
  const clone = (o) => (o ? { ...o } : o);
  const iso = (d = new Date()) => d.toISOString();
  const routineOwner = (routineId) => store.routines.find((r) => r.id === routineId)?.user_id;

  const ensureRoutineSync = (userId) => {
    let r = store.routines.find((x) => x.user_id === userId);
    if (!r) {
      r = { id: crypto.randomUUID(), user_id: userId, name: 'Minha rotina', created_at: iso(), updated_at: iso() };
      store.routines.push(r);
    }
    return r;
  };

  // Fachada transacional equivalente à real (makeTx).
  const tx = {
    async getTaskForUser(userId, taskId) {
      const t = store.tasks.find((x) => x.id === taskId);
      if (!t || routineOwner(t.routine_id) !== userId) return null;
      return clone(t);
    },
    async taskIdExists(taskId) {
      return store.tasks.some((x) => x.id === taskId);
    },
    async ensureRoutine(userId) {
      return clone(ensureRoutineSync(userId));
    },
    async upsertTask(routineId, data) {
      let t = store.tasks.find((x) => x.id === data.id);
      if (t) {
        // ON CONFLICT (id): atualiza a linha existente (seja de quem for — o
        // service é quem garante o isolamento antes de chamar).
        Object.assign(t, {
          weekday: data.weekday, time: data.time, label: data.label, block: data.block,
          detail: data.detail ?? '', rule: data.rule ?? '', sort_order: data.sortOrder ?? 0,
          updated_at: iso(),
        });
      } else {
        t = {
          id: data.id, routine_id: routineId, weekday: data.weekday, time: data.time,
          label: data.label, block: data.block, detail: data.detail ?? '', rule: data.rule ?? '',
          sort_order: data.sortOrder ?? 0, created_at: iso(), updated_at: iso(),
        };
        store.tasks.push(t);
      }
      return clone(t);
    },
    async deleteTaskForUser(userId, taskId) {
      const t = store.tasks.find((x) => x.id === taskId);
      if (!t || routineOwner(t.routine_id) !== userId) return false;
      store.tasks = store.tasks.filter((x) => x.id !== taskId);
      return true;
    },
    async taskBelongsToUser(userId, taskId) {
      const t = store.tasks.find((x) => x.id === taskId);
      return !!t && routineOwner(t.routine_id) === userId;
    },
    async upsertCompletion(userId, taskId, date) {
      let c = store.completions.find((x) => x.user_id === userId && x.task_id === taskId && x.done_date === date);
      if (!c) {
        c = { user_id: userId, task_id: taskId, done_date: date, created_at: iso() };
        store.completions.push(c);
      }
      return { task_id: c.task_id, done_date: c.done_date };
    },
    async deleteCompletion(userId, taskId, date) {
      const before = store.completions.length;
      store.completions = store.completions.filter(
        (x) => !(x.user_id === userId && x.task_id === taskId && x.done_date === date),
      );
      return store.completions.length < before;
    },
    async getReminderForUser(userId, taskId) {
      const r = store.reminders.find((x) => x.user_id === userId && x.task_id === taskId);
      return r ? clone(r) : null;
    },
    async upsertReminder(userId, { taskId, weekday, time, label = null, enabled }) {
      let r = store.reminders.find((x) => x.user_id === userId && x.task_id === taskId);
      if (r) {
        Object.assign(r, { weekday, time, label, enabled, updated_at: iso() });
      } else {
        r = { user_id: userId, task_id: taskId, weekday, time, label, enabled, updated_at: iso() };
        store.reminders.push(r);
      }
      return { task_id: r.task_id, weekday: r.weekday, time: r.time, label: r.label, enabled: r.enabled };
    },
    async deleteReminder(userId, taskId) {
      const before = store.reminders.length;
      store.reminders = store.reminders.filter((x) => !(x.user_id === userId && x.task_id === taskId));
      return store.reminders.length < before;
    },
  };

  return {
    __store: store,
    __reset: () => {
      store.routines = [];
      store.tasks = [];
      store.completions = [];
      store.reminders = [];
    },
    __seedRoutine: (userId) => clone(ensureRoutineSync(userId)),

    findRoutineByUserId: vi.fn(async (userId) => clone(store.routines.find((r) => r.user_id === userId)) || null),
    createRoutine: vi.fn(async (userId) => clone(ensureRoutineSync(userId))),
    findTasksDelta: vi.fn(async (userId, since) =>
      store.tasks
        .filter((t) => routineOwner(t.routine_id) === userId)
        .filter((t) => !since || new Date(t.updated_at) > new Date(since))
        .map(clone),
    ),
    findCompletionsDelta: vi.fn(async (userId, since) =>
      store.completions
        .filter((c) => c.user_id === userId)
        .filter((c) => !since || new Date(c.created_at) > new Date(since))
        .map(clone),
    ),
    findRemindersDelta: vi.fn(async (userId, since) =>
      store.reminders
        .filter((r) => r.user_id === userId)
        .filter((r) => !since || new Date(r.updated_at) > new Date(since))
        .map(clone),
    ),
    serverNow: vi.fn(async () => iso()),
    withTransaction: vi.fn(async (fn) => fn(tx)),
  };
});

const repo = await import('../src/modules/sync/sync.repo.js');
const { createSyncRouter } = await import('../src/modules/sync/sync.router.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/sync', createSyncRouter());
  app.use(errorHandler);
  return app;
}

const app = buildApp();

const userA = { id: crypto.randomUUID(), email: 'a@example.com' };
const userB = { id: crypto.randomUUID(), email: 'b@example.com' };
const tokenA = signAccessToken(userA);
const tokenB = signAccessToken(userB);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const iso = (d) => new Date(d).toISOString();
const uuid = () => crypto.randomUUID();

// Helpers para semear diretamente no store.
function seedTask(userId, over = {}) {
  const r = repo.__seedRoutine(userId);
  const id = over.id ?? uuid();
  const t = {
    id, routine_id: r.id, weekday: 1, time: '08:00', label: 'T', block: 'Manhã',
    detail: '', rule: '', sort_order: 0,
    created_at: iso(Date.now()), updated_at: iso(Date.now()), ...over, routine_id: r.id, id,
  };
  repo.__store.tasks.push(t);
  return t;
}

beforeEach(() => {
  repo.__reset();
});

describe('auth', () => {
  it('POST /sync/pull sem token → 401', async () => {
    const res = await request(app).post('/sync/pull').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /sync/push sem token → 401', async () => {
    const res = await request(app).post('/sync/push').send({ mutations: [] });
    expect(res.status).toBe(401);
  });
});

describe('validação zod', () => {
  it('push com envelope malformado (mutations não-array) → 400', async () => {
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({ mutations: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('push com mutation sem clientUpdatedAt → 400', async () => {
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [{ entity: 'task', op: 'upsert', data: { id: uuid(), weekday: 1, time: '08:00', label: 'x', block: 'y' } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('push com entity desconhecida → 400', async () => {
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [{ entity: 'ghost', op: 'upsert', data: {}, clientUpdatedAt: iso(Date.now()) }],
    });
    expect(res.status).toBe(400);
  });

  it('pull com since não-ISO → 400', async () => {
    const res = await request(app).post('/sync/pull').set(auth(tokenA)).send({ since: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /sync/pull', () => {
  it('sem since retorna estado completo do usuário', async () => {
    const t = seedTask(userA.id, { label: 'Café' });
    repo.__store.completions.push({ user_id: userA.id, task_id: t.id, done_date: '2026-07-01', created_at: iso(Date.now()) });
    repo.__store.reminders.push({ user_id: userA.id, task_id: t.id, weekday: 1, time: '08:00', label: null, enabled: true, updated_at: iso(Date.now()) });

    const res = await request(app).post('/sync/pull').set(auth(tokenA)).send({});
    expect(res.status).toBe(200);
    expect(res.body.routine).toBeTruthy();
    expect(res.body.routine.user_id).toBeUndefined();
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].label).toBe('Café');
    expect(res.body.tasks[0].sortOrder).toBe(0);
    expect(res.body.completions).toEqual([{ taskId: t.id, date: '2026-07-01', done: true }]);
    expect(res.body.reminders).toHaveLength(1);
    expect(res.body.serverTime).toBeTruthy();
  });

  it('com since retorna só o delta (o que mudou depois)', async () => {
    const past = '2026-01-01T00:00:00.000Z';
    const since = '2026-06-01T00:00:00.000Z';
    // Task antiga (antes do since) e task nova (depois).
    seedTask(userA.id, { label: 'Antiga', updated_at: past });
    seedTask(userA.id, { label: 'Nova', updated_at: '2026-07-01T00:00:00.000Z' });

    const res = await request(app).post('/sync/pull').set(auth(tokenA)).send({ since });
    expect(res.status).toBe(200);
    expect(res.body.tasks.map((t) => t.label)).toEqual(['Nova']);
  });

  it('isolamento: pull de A não traz dados de B', async () => {
    seedTask(userB.id, { label: 'Só do B' });
    const res = await request(app).post('/sync/pull').set(auth(tokenA)).send({});
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
});

describe('POST /sync/push — upsert de entidades novas → applied', () => {
  it('aplica task, completion e reminder novos', async () => {
    // task nova (id do cliente)
    const taskId = uuid();
    const now = iso(Date.now());
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        { entity: 'task', op: 'upsert', clientUpdatedAt: now, data: { id: taskId, weekday: 2, time: '09:00', label: 'Novo', block: 'Manhã' } },
        { entity: 'completion', op: 'upsert', clientUpdatedAt: now, data: { taskId, date: '2026-07-05' } },
        { entity: 'reminder', op: 'upsert', clientUpdatedAt: now, data: { taskId, weekday: 2, time: '09:00', enabled: true } },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toEqual([]);
    expect(res.body.applied).toHaveLength(3);
    // Persistiu no store.
    expect(repo.__store.tasks.find((t) => t.id === taskId)).toBeTruthy();
    expect(repo.__store.completions).toHaveLength(1);
    expect(repo.__store.reminders).toHaveLength(1);
  });
});

describe('POST /sync/push — conflito determinístico (LWW)', () => {
  it('clientUpdatedAt mais ANTIGO que updated_at do servidor → conflito, sem sobrescrever, devolve versão do servidor', async () => {
    // Servidor tem versão de 2026-07-10.
    const serverTs = '2026-07-10T12:00:00.000Z';
    const t = seedTask(userA.id, { label: 'ServidorVence', updated_at: serverTs, time: '08:00' });
    // Cliente edita com timestamp mais antigo.
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        {
          entity: 'task', op: 'upsert', clientUpdatedAt: '2026-07-01T00:00:00.000Z',
          data: { id: t.id, weekday: 1, time: '23:00', label: 'ClientePerde', block: 'Manhã' },
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toEqual([]);
    expect(res.body.conflicts).toHaveLength(1);
    const c = res.body.conflicts[0];
    expect(c.reason).toBe('stale');
    expect(c.entity).toBe('task');
    expect(c.id).toBe(t.id);
    // Devolve a versão vigente do servidor.
    expect(c.server.label).toBe('ServidorVence');
    expect(c.server.time).toBe('08:00');
    // Servidor NÃO foi sobrescrito.
    expect(repo.__store.tasks.find((x) => x.id === t.id).label).toBe('ServidorVence');
    expect(repo.__store.tasks.find((x) => x.id === t.id).time).toBe('08:00');
  });

  it('clientUpdatedAt mais NOVO que o servidor → aplica (applied) e sobrescreve', async () => {
    const t = seedTask(userA.id, { label: 'Antigo', updated_at: '2026-07-01T00:00:00.000Z' });
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        {
          entity: 'task', op: 'upsert', clientUpdatedAt: '2026-07-10T00:00:00.000Z',
          data: { id: t.id, weekday: 1, time: '08:00', label: 'Atualizado', block: 'Manhã' },
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toEqual([]);
    expect(res.body.applied).toHaveLength(1);
    expect(repo.__store.tasks.find((x) => x.id === t.id).label).toBe('Atualizado');
  });
});

describe('POST /sync/push — isolamento por usuário', () => {
  it('mutação para task de OUTRO usuário → conflicts forbidden, nada escrito', async () => {
    const tB = seedTask(userB.id, { label: 'Do B', updated_at: '2026-01-01T00:00:00.000Z' });
    // A tenta editar a task de B (upsert por id existente de B).
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        {
          entity: 'task', op: 'upsert', clientUpdatedAt: iso(Date.now()),
          data: { id: tB.id, weekday: 1, time: '08:00', label: 'Invadida', block: 'Manhã' },
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toEqual([]);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toBe('forbidden');
    // A task de B permanece intacta.
    expect(repo.__store.tasks.find((x) => x.id === tB.id).label).toBe('Do B');
  });

  it('delete de completion para task de outro usuário → forbidden, nada removido', async () => {
    const tB = seedTask(userB.id);
    repo.__store.completions.push({ user_id: userB.id, task_id: tB.id, done_date: '2026-07-01', created_at: iso(Date.now()) });
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        { entity: 'completion', op: 'delete', clientUpdatedAt: iso(Date.now()), data: { taskId: tB.id, date: '2026-07-01' } },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.conflicts[0].reason).toBe('forbidden');
    expect(repo.__store.completions).toHaveLength(1);
  });

  it('reminder para task de outro usuário → forbidden', async () => {
    const tB = seedTask(userB.id);
    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        { entity: 'reminder', op: 'upsert', clientUpdatedAt: iso(Date.now()), data: { taskId: tB.id, weekday: 1, time: '08:00', enabled: true } },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.conflicts[0].reason).toBe('forbidden');
    expect(repo.__store.reminders).toHaveLength(0);
  });
});

describe('POST /sync/push — lote misto (conflito não aborta o resto)', () => {
  it('aplica válidas e reporta conflitos no mesmo lote', async () => {
    const own = seedTask(userA.id, { label: 'Minha', updated_at: '2026-07-10T00:00:00.000Z' });
    const foreign = seedTask(userB.id, { label: 'Alheia', updated_at: '2026-01-01T00:00:00.000Z' });
    const newId = uuid();

    const res = await request(app).post('/sync/push').set(auth(tokenA)).send({
      mutations: [
        // válida: task nova
        { entity: 'task', op: 'upsert', clientUpdatedAt: iso(Date.now()), data: { id: newId, weekday: 3, time: '10:00', label: 'Nova', block: 'Tarde' } },
        // conflito stale: editar a própria com timestamp antigo
        { entity: 'task', op: 'upsert', clientUpdatedAt: '2026-01-01T00:00:00.000Z', data: { id: own.id, weekday: 1, time: '08:00', label: 'X', block: 'Manhã' } },
        // conflito forbidden: task de B
        { entity: 'task', op: 'delete', clientUpdatedAt: iso(Date.now()), data: { id: foreign.id } },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toHaveLength(1);
    expect(res.body.conflicts).toHaveLength(2);
    // A task nova foi persistida apesar dos conflitos no mesmo lote.
    expect(repo.__store.tasks.find((t) => t.id === newId)).toBeTruthy();
    // A task de B não foi removida.
    expect(repo.__store.tasks.find((t) => t.id === foreign.id)).toBeTruthy();
  });
});
