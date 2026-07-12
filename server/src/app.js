import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { checkDbHealth } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAuthRouter, createMeRouter } from './modules/auth/auth.router.js';
import { createRoutinesRouter } from './modules/routines/routines.router.js';
import { createCompletionsRouter } from './modules/completions/completions.router.js';
import { createRemindersRouter } from './modules/reminders/reminders.router.js';
import { createPlacesRouter } from './modules/places/places.router.js';
import { createSocialRouter } from './modules/social/social.router.js';
import { createSyncRouter } from './modules/sync/sync.router.js';
import subscriptionsRouter from './modules/subscriptions/subscriptions.router.js';
import subscriptionsWebhookRouter from './modules/subscriptions/subscriptions.webhook.router.js';
import { renderPrivacyPolicyHtml } from './privacyPolicy.js';

/**
 * Cria e configura a instância do Express (sem escutar em porta).
 * Separado de index.js para permitir testes com supertest sem subir o servidor.
 */
export function createApp() {
  const app = express();

  app.use(helmet());

  // CORS: restrito por env quando CORS_ORIGIN está setado; permissivo caso contrário.
  // Sem CORS_ORIGIN o comportamento é idêntico ao anterior (reflete qualquer origem),
  // preservando o boot atual em dev. Em produção, defina CORS_ORIGIN com a(s)
  // origem(ns) do cliente (lista separada por vírgula) para travar quem pode chamar a API.
  const allowedOrigins = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors(
      allowedOrigins.length === 0
        ? undefined // permissivo (default do middleware): reflete a origem da requisição
        : {
            origin(origin, callback) {
              // Requisições sem Origin (curl, health checks, apps nativos) são permitidas.
              if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
              const err = new Error('Origem não permitida pelo CORS');
              err.status = 403;
              err.code = 'CORS_FORBIDDEN';
              return callback(err);
            },
          },
    ),
  );

  // Webhook do Stripe: precisa do body CRU (raw) para verificar assinatura.
  // Deve vir ANTES do express.json().
  app.use('/subscriptions/webhook', express.raw({ type: 'application/json' }), subscriptionsWebhookRouter);

  // Limite de tamanho do corpo: evita payloads gigantes (DoS de memória).
  app.use(express.json({ limit: '100kb' }));

  // Rate limit global brando (as rotas de /auth ganharão limites mais estritos na Fase 1).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 min
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Serve as ferramentas HTML (rotina_tdah.html, triagem_tdah.html) via HTTP
  // para que notificações funcionem (file:// não suporta Notification API).
  const __dirname = dirname(fileURLToPath(import.meta.url));
  app.use('/ferramentas', express.static(join(__dirname, '..', '..', 'ferramentas')));

  // Config pública (expoe Google Client IDs para o frontend, sem segredos)
  app.get('/config', (req, res) => {
    res.json({
      googleClientId: env.GOOGLE_CLIENT_ID || null,
      googleAndroidClientId: env.GOOGLE_ANDROID_CLIENT_ID || null,
    });
  });

  // Política de Privacidade: página pública em HTML, exigida pela Google Play
  // (o app coleta dados via login por email/senha e Google OAuth).
  app.get('/privacy', (req, res) => {
    res.type('html').send(renderPrivacyPolicyHtml());
  });

  // Healthcheck: status do app + booleano da conexão com o banco.
  app.get('/health', async (req, res, next) => {
    try {
      const db = await checkDbHealth();
      res.json({ status: 'ok', db });
    } catch (err) {
      next(err);
    }
  });

  // Rotas de autenticação (Fase 1).
  app.use('/auth', createAuthRouter());
  app.use('/', createMeRouter());

  // Rotas de negócio (Fases 2 e 3), todas protegidas por auth internamente.
  app.use('/', createRoutinesRouter());          // /routine, /routine/tasks
  app.use('/completions', createCompletionsRouter());
  app.use('/reminders', createRemindersRouter());
  app.use('/places', createPlacesRouter());      // /places (locais salvos, Fase G4)
  app.use('/social', createSocialRouter());      // /social (accountability partner + body doubling)
  app.use('/sync', createSyncRouter());          // /sync/pull, /sync/push

  // Assinaturas (Stripe).
  app.use('/subscriptions', subscriptionsRouter); // /subscriptions/checkout, /subscriptions/me, /subscriptions/portal

  // errorHandler por último.
  app.use(errorHandler);

  return app;
}

export default createApp;
