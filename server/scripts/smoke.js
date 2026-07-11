/**
 * Smoke test de ponta a ponta contra um Postgres REAL (ex.: Neon).
 * Sobe o app em memória (createApp) e exercita o fluxo completo:
 *   register → login → GET /routine → PUT /routine/tasks → PUT /completions →
 *   PUT /reminders → POST /sync/pull.
 *
 * Pré-requisitos:
 *   - .env preenchido com DATABASE_URL real e DB_SSL=true (para Neon).
 *   - Migrations já aplicadas: `npm run migrate`.
 *
 * Uso:  node scripts/smoke.js
 * Não deixa lixo permanente: cria um usuário com email aleatório e o remove ao final.
 */
import 'dotenv/config';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
const email = `smoke_${Date.now()}@example.com`;
const password = 'senha-super-secreta-123';

function assert(cond, msg) {
  if (!cond) throw new Error('FALHOU: ' + msg);
  console.log('  ok —', msg);
}

async function main() {
  console.log('Smoke test contra Postgres real\n');

  // 1. Cadastro
  const reg = await request(app)
    .post('/auth/register')
    .send({ email, password, displayName: 'Smoke' });
  assert(reg.status === 201, `register 201 (recebido ${reg.status})`);
  assert(reg.body.tokens?.accessToken, 'register devolve accessToken');
  const token = reg.body.tokens.accessToken;
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);

  // 2. Login
  const login = await request(app).post('/auth/login').send({ email, password });
  assert(login.status === 200, `login 200 (recebido ${login.status})`);

  // 3. GET /routine (rotina default criada no register)
  const routine = await auth(request(app).get('/routine'));
  assert(routine.status === 200, `GET /routine 200 (recebido ${routine.status})`);
  assert(routine.body.routine?.id, 'rotina default existe');

  // 4. PUT /routine/tasks — substitui o conjunto por 1 tarefa
  const putTasks = await auth(request(app).put('/routine/tasks')).send({
    tasks: [
      { weekday: 1, time: '05:45', label: 'Acordar', block: 'Manhã', detail: '', rule: '', sortOrder: 0 },
    ],
  });
  assert(putTasks.status === 200, `PUT /routine/tasks 200 (recebido ${putTasks.status})`);
  assert(putTasks.body.tasks?.length === 1, 'conjunto de tasks tem 1 item');
  const taskId = putTasks.body.tasks[0].id;

  // 5. PUT /completions — marca a tarefa como feita hoje
  const today = new Date().toISOString().slice(0, 10);
  const comp = await auth(request(app).put('/completions')).send({ taskId, date: today, done: true });
  assert(comp.status === 200, `PUT /completions 200 (recebido ${comp.status})`);

  // 6. PUT /reminders — arma um lembrete para a tarefa
  const rem = await auth(request(app).put('/reminders')).send({
    taskId, enabled: true, time: '05:45', weekday: 1, label: 'Acordar',
  });
  assert(rem.status === 200, `PUT /reminders 200 (recebido ${rem.status})`);

  // 7. POST /sync/pull — estado completo deve refletir tudo acima
  const pull = await auth(request(app).post('/sync/pull')).send({});
  assert(pull.status === 200, `POST /sync/pull 200 (recebido ${pull.status})`);
  assert(pull.body.tasks?.length === 1, 'sync pull traz a task');
  assert(pull.body.completions?.length === 1, 'sync pull traz a completion');
  assert(pull.body.reminders?.length === 1, 'sync pull traz o reminder');
  assert(pull.body.serverTime, 'sync pull traz serverTime');

  // Limpeza: remove o usuário de teste (cascata apaga rotina/tasks/etc).
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  console.log('\nLimpeza: usuário de teste removido.');
  console.log('\n✅ SMOKE TEST PASSOU — backend conversa com Postgres real de ponta a ponta.');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('\n❌', err.message);
    try { await pool.query('DELETE FROM users WHERE email = $1', [email]); } catch {}
    await pool.end();
    process.exit(1);
  });
