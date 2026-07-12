import { env } from './config/env.js';
import { createApp } from './app.js';
import runMigrations from './db/migrate.js';

// Migrations rodam automaticamente no boot — depender de alguém lembrar de
// rodar `npm run migrate` manualmente no Shell do Render após cada deploy
// já causou tabelas ausentes em produção silenciosamente (rotas retornavam
// 500 sem ninguém perceber até um usuário real bater no bug). O runner é
// idempotente (CREATE TABLE IF NOT EXISTS + registro em schema_migrations),
// então rodar em todo boot é seguro.
runMigrations()
  .then(() => {
    const app = createApp();
    app.listen(env.PORT, () => {
      console.log(`[server] ouvindo na porta ${env.PORT} (${env.NODE_ENV})`);
    });
  })
  .catch((err) => {
    console.error('[migrate] falha ao aplicar migrations no boot:', err.message);
    process.exit(1);
  });
