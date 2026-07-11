/**
 * Teste E2E multiusuário contra um Postgres REAL (ex.: Neon), com FOCO EM ISOLAMENTO.
 *
 * Prova, ponta a ponta e contra o banco de verdade, que o usuário A NUNCA acessa
 * nem altera dados do usuário B em nenhuma rota (routine/tasks, completions,
 * reminders e sync). Complementa os testes vitest (que já cobrem isolamento com
 * mock) exercitando o SQL real e as constraints do Postgres.
 *
 * Pré-requisitos:
 *   - .env preenchido com DATABASE_URL real e DB_SSL=true (para Neon).
 *   - Migrations já aplicadas: `npm run migrate`.
 *
 * Uso:  node scripts/e2e.js   (ou: npm run e2e)
 * Não deixa lixo: cria dois usuários com email aleatório e os remove ao final.
 */
import 'dotenv/config';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
const suffix = Date.now();
const users = {
  A: { email: `e2e_A_${suffix}@example.com`, password: 'senha-super-secreta-A-123', token: null, taskId: null },
  B: { email: `e2e_B_${suffix}@example.com`, password: 'senha-super-secreta-B-123', token: null, taskId: null },
};

let passed = 0;
function ok(cond, msg) {
  if (!cond) throw new Error('FALHOU: ' + msg);
  passed += 1;
  console.log('  ok —', msg);
}
const bearer = (u) => (r) => r.set('Authorization', `Bearer ${users[u].token}`);

async function registerAndSeed(key) {
  const u = users[key];
  const reg = await request(app).post('/auth/register').send({ email: u.email, password: u.password, displayName: `E2E ${key}` });
  ok(reg.status === 201, `[${key}] register 201 (recebido ${reg.status})`);
  u.token = reg.body.tokens.accessToken;

  // Cada usuário monta 1 tarefa própria.
  const put = await bearer(key)(request(app).put('/routine/tasks')).send({
    tasks: [{ weekday: 1, time: '08:00', label: `Tarefa de ${key}`, block: 'Manhã', detail: '', rule: '', sortOrder: 0 }],
  });
  ok(put.status === 200, `[${key}] PUT /routine/tasks 200 (recebido ${put.status})`);
  u.taskId = put.body.tasks[0].id;

  // Completion e reminder próprios.
  const today = new Date().toISOString().slice(0, 10);
  const comp = await bearer(key)(request(app).put('/completions')).send({ taskId: u.taskId, date: today, done: true });
  ok(comp.status === 200, `[${key}] PUT /completions 200 (recebido ${comp.status})`);
  const rem = await bearer(key)(request(app).put('/reminders')).send({ taskId: u.taskId, enabled: true, time: '08:00', weekday: 1, label: `R ${key}` });
  ok(rem.status === 200, `[${key}] PUT /reminders 200 (recebido ${rem.status})`);
}

async function main() {
  console.log('E2E multiusuário (isolamento) contra Postgres real\n');

  console.log('# Setup: dois usuários com dados próprios');
  await registerAndSeed('A');
  await registerAndSeed('B');

  const today = new Date().toISOString().slice(0, 10);

  console.log('\n# GET /routine — cada um só vê a própria rotina');
  const routineA = await bearer('A')(request(app).get('/routine'));
  ok(routineA.status === 200, 'A: GET /routine 200');
  ok(routineA.body.tasks.length === 1 && routineA.body.tasks[0].label === 'Tarefa de A', 'A vê só a própria tarefa');
  ok(!routineA.body.tasks.some((t) => t.id === users.B.taskId), 'A NÃO vê a tarefa de B na sua rotina');

  console.log('\n# PATCH /routine/tasks/:id — A não edita task de B → 404');
  const patch = await bearer('A')(request(app).patch(`/routine/tasks/${users.B.taskId}`)).send({ label: 'Invadida por A' });
  ok(patch.status === 404, `A tentando editar task de B → 404 (recebido ${patch.status})`);

  console.log('\n# DELETE /routine/tasks/:id — A não apaga task de B → 404');
  const del = await bearer('A')(request(app).delete(`/routine/tasks/${users.B.taskId}`));
  ok(del.status === 404, `A tentando deletar task de B → 404 (recebido ${del.status})`);

  console.log('\n# GET /completions — A não vê completions de B');
  const compsA = await bearer('A')(request(app).get('/completions').query({ from: today, to: today }));
  ok(compsA.status === 200, 'A: GET /completions 200');
  ok(compsA.body.completions.every((c) => c.taskId === users.A.taskId), 'A só vê completions das próprias tasks');

  console.log('\n# PUT /completions — A não marca completion na task de B');
  const compHijack = await bearer('A')(request(app).put('/completions')).send({ taskId: users.B.taskId, date: today, done: true });
  ok(compHijack.status >= 400, `A marcando completion na task de B → erro (recebido ${compHijack.status})`);

  console.log('\n# GET /reminders — A não vê reminders de B');
  const remsA = await bearer('A')(request(app).get('/reminders'));
  ok(remsA.status === 200, 'A: GET /reminders 200');
  ok(remsA.body.reminders.every((r) => r.taskId === users.A.taskId), 'A só vê reminders das próprias tasks');

  console.log('\n# PUT /reminders — A não arma reminder na task de B');
  const remHijack = await bearer('A')(request(app).put('/reminders')).send({ taskId: users.B.taskId, enabled: true, time: '09:00', weekday: 1, label: 'X' });
  ok(remHijack.status >= 400, `A armando reminder na task de B → erro (recebido ${remHijack.status})`);

  console.log('\n# POST /sync/pull — A só sincroniza os próprios dados');
  const pullA = await bearer('A')(request(app).post('/sync/pull')).send({});
  ok(pullA.status === 200, 'A: POST /sync/pull 200');
  ok(pullA.body.tasks.every((t) => t.id === users.A.taskId), 'sync/pull de A só traz tasks de A');
  ok(pullA.body.completions.every((c) => c.taskId === users.A.taskId), 'sync/pull de A só traz completions de A');
  ok(pullA.body.reminders.every((r) => r.taskId === users.A.taskId), 'sync/pull de A só traz reminders de A');

  console.log('\n# POST /sync/push — A tenta sobrescrever a task de B → forbidden, nada muda');
  const pushA = await bearer('A')(request(app).post('/sync/push')).send({
    mutations: [{ entity: 'task', op: 'upsert', clientUpdatedAt: new Date().toISOString(), data: { id: users.B.taskId, weekday: 1, time: '08:00', label: 'Invadida via sync', block: 'Manhã' } }],
  });
  ok(pushA.status === 200, 'A: POST /sync/push 200');
  ok(pushA.body.applied.length === 0, 'nenhuma mutação de A sobre task de B foi aplicada');
  ok(pushA.body.conflicts.some((c) => c.reason === 'forbidden'), 'push reporta conflito forbidden ao mirar task de B');

  console.log('\n# Confirmação no lado de B: seus dados permanecem intactos');
  const pullB = await bearer('B')(request(app).post('/sync/pull')).send({});
  ok(pullB.body.tasks.length === 1 && pullB.body.tasks[0].label === 'Tarefa de B', 'task de B intacta (label preservado)');

  // Limpeza.
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [[users.A.email, users.B.email]]);
  console.log('\nLimpeza: usuários de teste removidos.');
  console.log(`\n✅ E2E PASSOU — ${passed} asserções. Isolamento entre usuários garantido em todas as rotas contra Postgres real.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('\n❌', err.message);
    try { await pool.query('DELETE FROM users WHERE email = ANY($1)', [[users.A.email, users.B.email]]); } catch {}
    await pool.end();
    process.exit(1);
  });
