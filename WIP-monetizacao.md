# WIP — Monetização (Stripe + Play Store)

## O que está pronto

### Backend (`server/`)
- [x] Stripe instalado (`npm install stripe`)
- [x] Módulo `src/modules/subscriptions/` criado:
  - `subscriptions.service.js` — checkout, webhook, portal, consulta
  - `subscriptions.router.js` — rotas `POST /checkout`, `GET /me`, `POST /portal`
  - `subscriptions.webhook.router.js` — `POST /webhook/stripe` (body raw)
  - `subscriptions.repo.js` — queries (upsert, findByUserId)
  - `subscriptions.schema.js` — validação Zod
- [x] Migration `src/db/migrations/0003_subscriptions_stripe.sql`
  - Colunas: `stripe_customer_id`, `stripe_subscription_id`, `plan_id`, `cancel_at_period_end`
- [x] Rotas montadas em `src/app.js`
  - Webhook montado ANTES do `express.json()` (raw body necessário)
  - `/subscriptions/*` montado após as demais rotas
- [x] Variáveis Stripe em `src/config/env.js` (opcionais — não quebram boot)
- [x] `.env` com campos `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` (vazios)

### Frontend (`app-mobile/www/index.html`)
- [x] Badge "Free"/"Premium" na topbar (ao lado do relógio)
- [x] Modal de planos com cards Free e Premium
- [x] Botão "Assinar Premium" → `POST /subscriptions/checkout`
- [x] Botão "Gerenciar assinatura" → `POST /subscriptions/portal`
- [x] Cache da subscription no `localStorage`
- [x] Busca `/subscriptions/me` ao iniciar
- [x] Escape fecha modal de planos

## O que falta

### Pendências do código
- [ ] **Middleware de bloqueio**: criar `server/src/middleware/requirePremium.js` para proteger features premium (ex: sincronia multi-dispositivo)
- [ ] **Ajustar priceId**: no frontend, o `priceId` está hardcoded como `"price_premium"` — precisa ler do servidor (via `/config` ou env)
- [ ] **Testar server**: rodar server pra ver se compila sem erros
- [ ] **Webhook listener**: rodar `stripe listen --forward-to localhost:3000/subscriptions/webhook/stripe` em dev
- [ ] **Build APK**: rodar `.\gradlew.bat bundleRelease` para gerar AAB

### Fora do código (Stripe)
- [ ] Criar conta em https://stripe.com/br
- [ ] Pegar `STRIPE_SECRET_KEY` (Dashboard > Developers > API keys)
- [ ] Criar produto "Premium" (R$ 9,90/mês) e copiar `price_xxx` → `STRIPE_PREMIUM_PRICE_ID`
- [ ] Configurar webhook: https://dashboard.stripe.com/webhooks
  - Endpoint: `https://SEU-DOMINIO/subscriptions/webhook/stripe`
  - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
  - Copiar `whsec_xxx` → `STRIPE_WEBHOOK_SECRET`

### Fora do código (Play Store)
- [ ] Gerar keystore de release
- [ ] Build AAB assinado
- [ ] Criar conta de desenvolvedor (US$ 25)
- [ ] Publicar

## Arquivos relevantes
- `server/src/modules/subscriptions/` — todo o backend de pagamentos
- `server/src/app.js:100` — montagem do webhook (raw body)
- `server/src/app.js:113` — montagem das rotas de subscriptions
- `server/src/config/env.js:41` — vars Stripe
- `server/.env` — valores reais (preencher)
- `app-mobile/www/index.html` — badge Premium (topbar) + modal de planos + JS
