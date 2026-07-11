# Rotina TDAH — Backend (API)

Backend Node.js (Express, ESM) + PostgreSQL para o app de rotina TDAH.
Autenticação por e-mail/senha + Google OAuth, isolamento por usuário, sync
offline-first (pull/push). Fonte da verdade dos dados do cliente.

- **Runtime:** Node >= 20
- **Banco:** PostgreSQL (local via Docker, ou gerenciado como **Neon**)
- **Testes:** 62 testes de integração (vitest + supertest), todos verdes

---

## 1. Configurar o ambiente (`.env`)

O `.env` real **nunca é commitado** (está no `.gitignore`). Use o `.env.example`
como base:

```bash
cp .env.example .env
```

Edite o `.env`:

### Gerar segredos JWT fortes e ÚNICOS

Cada segredo deve ser único e ter no mínimo 16 caracteres. Gere assim:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Rode o comando **duas vezes** e cole os valores em `JWT_SECRET` e
`JWT_REFRESH_SECRET` (valores diferentes).

### Apontar `DATABASE_URL` para o Neon

No painel do Neon, copie a connection string e ative SSL:

```env
DATABASE_URL=postgres://<user>:<password>@<host>.neon.tech/<db>?sslmode=require
DB_SSL=true
```

> `DB_SSL=true` é **obrigatório** para o Neon (e para a maioria dos Postgres
> gerenciados). Para o Postgres local do Docker, use `DB_SSL=false`.

### Variáveis principais

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | String de conexão do Postgres |
| `DB_SSL` | sim (Neon) | `true` para Neon; `false` para local |
| `JWT_SECRET` | sim | Assina o access token (mín. 16 chars) |
| `JWT_REFRESH_SECRET` | sim | Segredo do refresh token (mín. 16 chars) |
| `PORT` | não | Porta HTTP (default 3000) |
| `NODE_ENV` | não | `development` / `production` |
| `JWT_ACCESS_TTL` | não | TTL do access token (default `15m`) |
| `REFRESH_TTL_DAYS` | não | Dias do refresh token (default `30`) |
| `CORS_ORIGIN` | não* | Origens permitidas (lista por vírgula). Ver abaixo |
| `GOOGLE_CLIENT_ID` | não | Client ID do Google OAuth; se ausente, `/auth/google` responde 501 |

\* Sem `CORS_ORIGIN`, o CORS é **permissivo** (reflete qualquer origem) — ok em
dev. **Em produção, sempre defina** `CORS_ORIGIN` com a(s) origem(ns) do cliente.

---

## 2. Rodar localmente

```bash
npm install          # instala dependências
npm run migrate      # cria/atualiza as tabelas no banco de DATABASE_URL
npm run dev          # sobe a API com --watch (recarrega ao editar)
```

Verifique a saúde: `GET http://localhost:3000/health` → `{ "status": "ok", "db": true }`.

Postgres local opcional (sem sujar o sistema), via Docker:

```bash
docker compose up -d     # sobe um Postgres local (usuário/senha do .env.example)
```

### Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | API local com auto-reload |
| `npm start` | API sem watch (produção) |
| `npm run migrate` | Aplica as migrations (idempotente) |
| `npm test` | Roda os 62 testes de integração (não toca banco real — usa mocks) |
| `npm run smoke` | Fluxo feliz ponta a ponta contra o Postgres **real** |
| `npm run e2e` | Teste multiusuário de **isolamento** contra o Postgres **real** |

> `smoke` e `e2e` exigem `.env` com `DATABASE_URL` real e migrations aplicadas.
> Ambos criam usuários com e-mail aleatório e os **removem ao final** (não deixam lixo).

---

## 3. Testes

```bash
npm test          # 62 testes, sem dependência de banco (pool mockado)
```

Cobrem: auth (register/login/refresh/rota protegida), CRUD de rotina/tasks,
completions, reminders, sync (pull/push com last-write-wins) e **isolamento
entre usuários** (usuário A nunca lê/escreve dados de B) em todas as rotas.

Contra o banco real:

```bash
npm run smoke     # register → routine → tasks → completions → reminders → sync/pull
npm run e2e       # dois usuários; prova que A não acessa dados de B em nenhuma rota
```

---

## 4. Deploy no Render

O Render tem free tier e faz deploy direto do repositório Git. Este repo já
inclui um **Blueprint** (`render.yaml` na raiz do repositório) com a
configuração do serviço pronta — o Render lê esse arquivo automaticamente e
monta o serviço, faltando só colar os valores das env vars sensíveis.

### Passo a passo

1. **Suba o repositório** para o GitHub, se ainda não estiver (o `.env` não
   vai junto — está no `.gitignore`; só o `.env.example` é versionado).

2. No [dashboard do Render](https://dashboard.render.com/):
   - Opção A (recomendada, usa o `render.yaml`): **New → Blueprint** → conecte
     o repositório `RafaelEliasIoppi/rotina-tdah-api` → o Render detecta o
     `render.yaml` e propõe o serviço `rotina-tdah-api` automaticamente.
   - Opção B (manual, sem Blueprint): **New → Web Service** → conecte o
     repositório e configure:
     - **Root Directory:** `server`
     - **Runtime:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Health Check Path:** `/health`

3. **Preencha as Environment Variables** (aba Environment do serviço) com os
   valores de produção — ver a tabela completa abaixo para a origem de cada
   um:

   | Chave | Obrigatória | De onde vem o valor |
   |---|---|---|
   | `NODE_ENV` | sim | Fixo: `production` (já vem preenchido pelo `render.yaml`) |
   | `DATABASE_URL` | sim | Painel do **Neon** → Connection string do banco de produção (inclua `?sslmode=require`) |
   | `DB_SSL` | sim | Fixo: `true` (já vem preenchido pelo `render.yaml`) |
   | `JWT_SECRET` | sim | Gerar **novo e único** para produção — nunca reaproveitar o de dev. Ver comando abaixo |
   | `JWT_REFRESH_SECRET` | sim | Gerar **outro** segredo novo e único (diferente do `JWT_SECRET`) |
   | `JWT_ACCESS_TTL` | não | Fixo: `15m` (já vem preenchido; ajuste se quiser outro TTL) |
   | `REFRESH_TTL_DAYS` | não | Fixo: `30` (já vem preenchido; ajuste se quiser outro prazo) |
   | `CORS_ORIGIN` | recomendada | Domínio(s) público(s) do cliente/app, ex.: `https://meu-app.com`. Deixar vazio só em teste |
   | `GOOGLE_CLIENT_ID` | opcional | Painel do **Google Cloud Console** (OAuth Client ID web). Se ausente, `/auth/google` responde 501 sem quebrar o boot |
   | `GOOGLE_ANDROID_CLIENT_ID` | opcional | Painel do **Google Cloud Console** (OAuth Client ID Android) |
   | `STRIPE_SECRET_KEY` | opcional* | Painel da **Stripe** → Developers → API keys (chave `sk_live_...` em produção) |
   | `STRIPE_WEBHOOK_SECRET` | opcional* | Painel da **Stripe** → Developers → Webhooks → endpoint criado para esta API (`whsec_...`) |
   | `STRIPE_PREMIUM_PRICE_ID` | opcional* | Painel da **Stripe** → Product catalog → Price ID do plano Premium (`price_...`) |

   \* As três variáveis do Stripe são opcionais para o boot da API (o schema
   de env aceita ausência), mas **obrigatórias** para o módulo de pagamentos
   funcionar. Preencha assim que as credenciais Stripe de produção estiverem
   disponíveis.

   Gerar os segredos JWT (rode duas vezes, um valor para cada variável):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   > `PORT` é injetada pelo Render automaticamente — não precisa setar.

4. **Rodar as migrations** uma vez contra o banco de produção, após o primeiro
   deploy. Opções:
   - No Render, abra o **Shell** do serviço (aba Shell) e rode `npm run migrate`; **ou**
   - Localmente, com um `.env` temporário apontando para o Neon de produção: `npm run migrate`.

5. **Testar** a API em produção:

   ```bash
   curl https://rotina-tdah-api.onrender.com/health
   # esperado: {"status":"ok","db":true}
   ```

6. O Render fornece uma **URL pública HTTPS**
   (ex.: `https://rotina-tdah-api.onrender.com`). O TLS já vem pronto.

> **Railway** funciona de forma equivalente: crie o serviço a partir do repo,
> Root Directory `server`, Start Command `npm start`, e configure as mesmas
> variáveis de ambiente (o `render.yaml` é específico do Render e não se aplica
> ao Railway).

### Apontar o cliente para a API pública

No `app-mobile/www/index.html`, troque a constante `API_BASE` de
`http://localhost:3000` para a URL pública HTTPS do backend:

```js
var API_BASE = "https://rotina-tdah-api.onrender.com";
```

Sem isso, o app funciona só apontando para o seu PC (localhost). Ver
`app-mobile/README.md`.

---

## 5. Checklist de produção

- [ ] **Segredos únicos:** `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados só para
      produção (não reaproveitar os do dev nem os placeholders do `.env.example`).
- [ ] **CORS restrito:** `CORS_ORIGIN` definido com a(s) origem(ns) reais do
      cliente (nunca deixar permissivo em produção).
- [ ] **HTTPS:** a API só deve ser exposta por HTTPS (Render/Railway já fornecem).
- [ ] **`NODE_ENV=production`:** garante que stack traces de erro **não vazam** na
      resposta (o `errorHandler` já esconde detalhes de erros 500 em produção).
- [ ] **Resetar a senha do Neon:** se a credencial do banco já foi exposta em
      algum momento (ex.: colada em chat/log), **rode o reset da senha** no painel
      do Neon e atualize `DATABASE_URL`.
- [ ] **Backups:** habilitar/checar os backups e o point-in-time recovery do Neon.
- [ ] **Rate limit:** já ativo — global (300 req/15min) e estrito em `/auth/*`
      (10 req/min por IP). Ajuste se necessário.
- [ ] **Body size limit:** já ativo — `express.json({ limit: '100kb' })`.
- [ ] **Helmet:** headers de segurança já aplicados via `helmet()`.
- [ ] **Migrations aplicadas** no banco de produção antes do primeiro uso.

---

## 6. Segurança já implementada

| Item | Onde |
|---|---|
| Headers de segurança (Helmet) | `src/app.js` |
| CORS restrito por env (`CORS_ORIGIN`) | `src/app.js` |
| Limite de corpo (100kb) | `src/app.js` |
| Rate limit global + `/auth/*` | `src/app.js`, `src/middleware/rateLimit.js` |
| Erros sem stack em produção | `src/middleware/errorHandler.js` |
| Hash de senha (bcrypt) | `src/utils/hash.js` |
| JWT access curto + refresh rotativo | `src/utils/tokens.js`, módulo `auth` |
| Isolamento por `user_id` em toda query | módulos `routines`/`completions`/`reminders`/`sync` |
| Validação de entrada (zod) em toda rota | `*.schema.js` de cada módulo |
