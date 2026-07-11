import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mocka a camada de banco: o healthcheck degrada para db:false sem Postgres real,
// e não abrimos um pool pg de verdade durante o teste.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

const { createApp } = await import('../src/app.js');

describe('GET /health', () => {
  const app = createApp();

  it('responde 200 com o shape esperado', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.db).toBe('boolean');
    // Sem Postgres o db deve degradar graciosamente para false.
    expect(res.body.db).toBe(false);
  });
});
