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

// Mocka a camada de repositório de places com um store em memória.
// O service (isolamento, limite do plano grátis, projeções) roda de verdade;
// o SQL é substituído por operações no store que RESPEITAM o mesmo contrato
// de isolamento por user_id.
vi.mock('../src/modules/places/places.repo.js', () => {
  const store = {
    places: [], // { id, user_id, label, lat, lng, radius, created_at, updated_at }
  };
  const clone = (o) => (o ? { ...o } : o);
  const now = () => new Date().toISOString();

  return {
    __store: store,
    __reset: () => {
      store.places = [];
    },

    countByUserId: vi.fn(async (userId) =>
      store.places.filter((p) => p.user_id === userId).length,
    ),
    listByUserId: vi.fn(async (userId) =>
      store.places.filter((p) => p.user_id === userId).map(clone),
    ),
    insert: vi.fn(async (userId, { label, lat, lng, radius }) => {
      const row = {
        id: crypto.randomUUID(),
        user_id: userId,
        label,
        lat,
        lng,
        radius,
        created_at: now(),
        updated_at: now(),
      };
      store.places.push(row);
      return clone(row);
    }),
    updateForUser: vi.fn(async (placeId, userId, fields) => {
      const place = store.places.find((p) => p.id === placeId);
      // ISOLAMENTO: só atualiza se o local existe E é do usuário.
      if (!place || place.user_id !== userId) return null;
      Object.assign(place, fields);
      place.updated_at = now();
      return clone(place);
    }),
    deleteForUser: vi.fn(async (placeId, userId) => {
      const place = store.places.find((p) => p.id === placeId);
      // ISOLAMENTO: só remove se o local existe E é do usuário.
      if (!place || place.user_id !== userId) return false;
      store.places = store.places.filter((p) => p.id !== placeId);
      return true;
    }),
  };
});

// Mocka subscriptions.repo (usado pelo service para checar premium),
// mesmo padrão de subscriptions.middleware.test.js.
vi.mock('../src/modules/subscriptions/subscriptions.repo.js', () => {
  const store = {
    subscriptions: new Map(), // userId -> { plan, status }
  };
  return {
    __store: store,
    __reset: () => store.subscriptions.clear(),
    __setPlan: (userId, plan) => store.subscriptions.set(userId, { plan, status: 'active' }),
    findByUserId: vi.fn(async (userId) => store.subscriptions.get(userId) || null),
  };
});

const repo = await import('../src/modules/places/places.repo.js');
const subscriptionsRepo = await import('../src/modules/subscriptions/subscriptions.repo.js');
const { createPlacesRouter } = await import('../src/modules/places/places.router.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

// Monta um app de teste equivalente ao que app.js montará (não editamos app.js).
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/places', createPlacesRouter());
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

const validPlace = (over = {}) => ({
  label: 'Casa',
  lat: -23.5505,
  lng: -46.6333,
  radius: 150,
  ...over,
});

beforeEach(() => {
  repo.__reset();
  subscriptionsRepo.__reset();
});

describe('GET /places', () => {
  it('sem token → 401', async () => {
    const res = await request(app).get('/places');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('lista vazia para usuário sem locais', async () => {
    const res = await request(app).get('/places').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([]);
  });

  it('ISOLAMENTO: usuário A não vê locais de B', async () => {
    await request(app).post('/places').set(auth(tokenB)).send(validPlace({ label: 'Local de B' }));
    const res = await request(app).get('/places').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([]);
  });

  it('retorna os locais do usuário no formato do cliente', async () => {
    await request(app).post('/places').set(auth(tokenA)).send(validPlace());
    const res = await request(app).get('/places').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.places).toHaveLength(1);
    expect(res.body.places[0]).toMatchObject({
      label: 'Casa',
      lat: -23.5505,
      lng: -46.6333,
      radius: 150,
    });
    // Nunca expõe user_id.
    expect(res.body.places[0].user_id).toBeUndefined();
  });
});

describe('POST /places', () => {
  it('cria um local com sucesso', async () => {
    const res = await request(app).post('/places').set(auth(tokenA)).send(validPlace());
    expect(res.status).toBe(201);
    expect(res.body.place.id).toBeTruthy();
    expect(res.body.place.label).toBe('Casa');
    expect(repo.__store.places).toHaveLength(1);
    expect(repo.__store.places[0].user_id).toBe(userA.id);
  });

  it('rejeita label ausente → 400', async () => {
    const res = await request(app).post('/places').set(auth(tokenA)).send({
      lat: -23.5505, lng: -46.6333, radius: 150,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita lat fora do intervalo → 400', async () => {
    const res = await request(app).post('/places').set(auth(tokenA)).send(validPlace({ lat: 999 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('BLOQUEIA o 4º local para usuário free → 403', async () => {
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Casa' }));
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Farmácia' }));
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Trabalho' }));

    const res = await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Academia' }));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PLACES_LIMIT_REACHED');
    expect(res.body.error.message).toMatch(/limite de 3 locais/i);
    // Confirma que o 4º local não foi criado.
    expect(repo.__store.places.filter((p) => p.user_id === userA.id)).toHaveLength(3);
  });

  it('usuário PREMIUM pode passar de 3 locais', async () => {
    subscriptionsRepo.__setPlan(userA.id, 'premium');
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Casa' }));
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Farmácia' }));
    await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Trabalho' }));

    const res = await request(app).post('/places').set(auth(tokenA)).send(validPlace({ label: 'Academia' }));
    expect(res.status).toBe(201);
    expect(repo.__store.places.filter((p) => p.user_id === userA.id)).toHaveLength(4);
  });
});

describe('PATCH /places/:id', () => {
  it('atualiza o próprio local', async () => {
    const created = await request(app).post('/places').set(auth(tokenA)).send(validPlace());
    const id = created.body.place.id;

    const res = await request(app).patch(`/places/${id}`).set(auth(tokenA)).send({ label: 'Casa nova' });
    expect(res.status).toBe(200);
    expect(res.body.place.label).toBe('Casa nova');
  });

  it('ISOLAMENTO: local de OUTRO usuário → 404 e não altera', async () => {
    const created = await request(app).post('/places').set(auth(tokenB)).send(validPlace({ label: 'Do B' }));
    const id = created.body.place.id;

    const res = await request(app).patch(`/places/${id}`).set(auth(tokenA)).send({ label: 'Invadido' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PLACE_NOT_FOUND');
    expect(repo.__store.places.find((p) => p.id === id).label).toBe('Do B');
  });

  it('local inexistente → 404', async () => {
    const res = await request(app).patch(`/places/${crypto.randomUUID()}`).set(auth(tokenA)).send({ label: 'x' });
    expect(res.status).toBe(404);
  });

  it('payload vazio → 400', async () => {
    const res = await request(app).patch(`/places/${crypto.randomUUID()}`).set(auth(tokenA)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /places/:id', () => {
  it('remove o próprio local → 204', async () => {
    const created = await request(app).post('/places').set(auth(tokenA)).send(validPlace());
    const id = created.body.place.id;

    const res = await request(app).delete(`/places/${id}`).set(auth(tokenA));
    expect(res.status).toBe(204);
    expect(repo.__store.places.find((p) => p.id === id)).toBeUndefined();
  });

  it('ISOLAMENTO: local de OUTRO usuário → 404 e não remove', async () => {
    const created = await request(app).post('/places').set(auth(tokenB)).send(validPlace({ label: 'Do B' }));
    const id = created.body.place.id;

    const res = await request(app).delete(`/places/${id}`).set(auth(tokenA));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PLACE_NOT_FOUND');
    expect(repo.__store.places.find((p) => p.id === id)).toBeTruthy();
  });

  it('sem token → 401', async () => {
    const res = await request(app).delete(`/places/${crypto.randomUUID()}`);
    expect(res.status).toBe(401);
  });
});
