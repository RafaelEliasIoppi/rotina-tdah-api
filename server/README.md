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

## 4. Deploy (Render)

O Render tem free tier e faz deploy direto do repositório Git. Passos:

1. **Suba o repositório** para GitHub (o `.env` não vai junto — está no
   `.gitignore`; só o `.env.example` é versionado).

2. No [dashboard do Render](https://dashboard.render.com/) → **New → Web Service**
   → conecte o repositório.

3. Configure o serviço:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`

4. **Environment Variables** (aba Environment) — replique o `.env`, com valores
   de produção:

   | Chave | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | string do Neon com `?sslmode=require` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | segredo único gerado (novo, só de produção) |
   | `JWT_REFRESH_SECRET` | outro segredo único gerado |
   | `CORS_ORIGIN` | origem(ns) do cliente, ex.: `https://meu-app.com` |
   | `GOOGLE_CLIENT_ID` | (opcional) client id do Google |

   > `PORT` é injetada pelo Render automaticamente — não precisa setar.

5. **Rodar as migrations** uma vez contra o banco de produção. Opções:
   - Localmente, com o `.env` apontando para o Neon de produção: `npm run migrate`; **ou**
   - No Render, use o **Shell** do serviço e rode `npm run migrate`.

6. Após o deploy, o Render fornece uma **URL pública HTTPS**
   (ex.: `https://rotina-tdah-api.onrender.com`). O TLS já vem pronto.

> **Railway** funciona de forma equivalente: crie o serviço a partir do repo,
> Root Directory `server`, Start Command `npm start`, e configure as mesmas
> variáveis de ambiente.

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
