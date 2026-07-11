import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mocka a camada de banco: esta rota não depende do Postgres, mas createApp()
// importa o pool no boot, então mockamos como nos demais testes.
vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn(), connect: vi.fn() },
  checkDbHealth: vi.fn(async () => false),
}));

const { createApp } = await import('../src/app.js');

describe('GET /privacy', () => {
  const app = createApp();

  it('responde 200 com HTML contendo a política de privacidade', async () => {
    const res = await request(app).get('/privacy');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Política de Privacidade');
    expect(res.text).toContain('Rafael Elias Ioppi');
    expect(res.text).toContain('Stripe');
    expect(res.text).toContain('Google');
  });
});
