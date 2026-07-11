# Plano de reestruturação — Rotina TDAH para multiusuário/comercial

**Papel:** planejamento por eng. de software sênior. **Implementação:** executada exclusivamente por **agentes Sonnet**, em fases sequenciais, cada uma com critérios de aceite verificáveis.

**Decisões travadas com o cliente:**
- Backend próprio: **Node.js + PostgreSQL** (sem lock-in, controle total)
- Autenticação: **e-mail/senha + Google OAuth**
- Monetização: **MVP grátis primeiro**, arquitetura já preparada para cobrança futura
- Ambiente atual: Node 24 e npm presentes; **Postgres e Docker NÃO instalados** → subir Postgres via Docker Compose (sem sujar o sistema)

---

## 1. Visão geral da arquitetura-alvo

```
┌─────────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│  Cliente (mesmo código) │  ────────────────────▶   │  API Node (Express)      │
│  - Web (navegador)      │   Bearer JWT (access)    │  - Auth (email+Google)   │
│  - App Android (Capacitor)│ ◀──────────────────── │  - CRUD rotina/progresso │
│  localStorage = cache   │      refresh token        │  - Sync (pull/push)      │
└─────────────────────────┘                          └───────────┬──────────────┘
                                                                  │ SQL (pool)
                                                      ┌───────────▼──────────────┐
                                                      │  PostgreSQL              │
                                                      │  users, routines,        │
                                                      │  tasks, completions,     │
                                                      │  reminders, ...          │
                                                      └──────────────────────────┘
```

**Princípio-chave (offline-first):** o cliente continua funcionando 100% offline via `localStorage`; a API é a fonte da verdade e o localStorage vira **cache + fila de sincronização**. Isso preserva a experiência atual e resolve o requisito de "permanente" mesmo sem rede — nada do que já foi construído é jogado fora.

---

## 2. Estrutura de pastas alvo

```
app-mobile/                 (já existe — cliente Capacitor/web)
  www/index.html            → migra de localStorage puro p/ camada de sync
  android/                  (já existe)

server/                     (NOVO — backend)
  src/
    index.js                bootstrap Express
    config/env.js           validação de variáveis de ambiente
    db/
      pool.js               pool pg
      migrations/           SQL versionado (0001_init.sql, ...)
      migrate.js            runner de migrations
    middleware/
      auth.js               verificação de JWT
      errorHandler.js
      rateLimit.js
    modules/
      auth/                 register, login, google, refresh, logout
      routines/            CRUD de rotina + tarefas
      completions/         marcar/desmarcar progresso por data
      reminders/           alarmes por usuário
      sync/                endpoint pull/push (delta)
    utils/                  hashing, jwt, validação (zod)
  test/                     testes de integração (supertest)
  docker-compose.yml        Postgres local
  .env.example
  package.json

shared/
  schema.md                contrato de dados cliente↔servidor (fonte única)
```

---

## 3. Modelo de dados (PostgreSQL)

Migração do formato atual do localStorage para tabelas relacionais.

**Mapa localStorage → tabelas:**
| localStorage hoje | vira tabela |
|---|---|
| `rotina_tdah_tasks_v1` (`{seg:[...],...}`) | `routines` (1 por usuário) + `tasks` (N por rotina, com `weekday`) |
| `rotina_tdah_v1` (`{data:{taskId:true}}`) | `completions` (usuário + task + data) |
| `rotina_tdah_alarms_v1` (`{dia:taskId:{...}}`) | `reminders` (usuário + task + weekday + hora) |

**DDL resumido:**
```sql
users (
  id uuid pk, email citext unique not null, password_hash text null,
  google_sub text unique null, display_name text,
  created_at timestamptz, updated_at timestamptz
)
routines (
  id uuid pk, user_id uuid fk→users on delete cascade,
  name text default 'Minha rotina', created_at, updated_at
)
tasks (
  id uuid pk, routine_id uuid fk→routines on delete cascade,
  weekday smallint check (weekday between 1 and 7),  -- 1=seg..7=dom
  time text check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  label text not null, block text not null,
  detail text default '', rule text default '',
  sort_order int default 0, created_at, updated_at
)
completions (
  id uuid pk, user_id uuid fk, task_id uuid fk→tasks on delete cascade,
  done_date date not null, created_at,
  unique (user_id, task_id, done_date)
)
reminders (
  id uuid pk, user_id uuid fk, task_id uuid fk→tasks on delete cascade,
  weekday smallint, time text, label text, enabled bool default true,
  unique (user_id, task_id)
)
refresh_tokens (
  id uuid pk, user_id uuid fk, token_hash text, expires_at timestamptz,
  revoked_at timestamptz null
)
-- Preparação p/ cobrança futura (criada mas não usada no MVP):
subscriptions (
  id uuid pk, user_id uuid fk unique, plan text default 'free',
  status text default 'active', current_period_end timestamptz null
)
```

Índices em `completions(user_id, done_date)`, `tasks(routine_id, weekday)`.

---

## 4. Contrato da API (REST/JSON)

Todas as rotas de dados exigem `Authorization: Bearer <access_token>`.

```
POST   /auth/register       {email,password,displayName} → {user, tokens}
POST   /auth/login          {email,password}             → {user, tokens}
POST   /auth/google         {idToken}                    → {user, tokens}
POST   /auth/refresh        {refreshToken}               → {tokens}
POST   /auth/logout         {refreshToken}               → 204

GET    /me                                               → {user}

GET    /routine                                          → {routine, tasks[]}
PUT    /routine/tasks       {tasks[]}   (substitui conjunto) → {tasks[]}
POST   /routine/tasks       {task}                       → {task}
PATCH  /routine/tasks/:id   {campos}                     → {task}
DELETE /routine/tasks/:id                                → 204

GET    /completions?from=&to=                            → {completions[]}
PUT    /completions        {taskId,date,done}            → {completion|null}

GET    /reminders                                        → {reminders[]}
PUT    /reminders          {taskId,enabled,time,weekday} → {reminder}

POST   /sync/pull          {since}   → {routine,tasks,completions,reminders,serverTime}
POST   /sync/push          {mutations[]} → {applied[], conflicts[]}
```

**Segurança transversal:** hash de senha com bcrypt/argon2; access token JWT curto (15 min) + refresh token rotativo (hash no banco); rate limit em `/auth/*`; validação de entrada com zod em toda rota; CORS restrito; sem segredo commitado (`.env`).

---

## 5. Cliente — o que muda no `www/index.html`

- Nova camada `api.js` (dentro do www): wrapper fetch com token, refresh automático em 401.
- Nova tela de **login/cadastro** (modal, mesmo padrão visual teal-green já existente).
- `localStorage` passa a ser **cache + outbox**: toda ação grava local (resposta instantânea) e enfileira uma mutação; um sync em background envia p/ API e reconcilia.
- Sem rede → funciona igual hoje; ao voltar a rede, sincroniza.
- Alarmes nativos (Capacitor LocalNotifications) permanecem; passam a ser derivados de `reminders` vindos da API.
- **Compatibilidade:** na primeira execução logada, migrar automaticamente os dados que já existem no localStorage do usuário para a conta dele (não perder a rotina montada).

---

## 6. Fases de implementação (cada fase = 1 ou mais agentes Sonnet)

> Regra do cliente: **toda a implementação abaixo é executada por agentes Sonnet.** Cada fase tem entregável e critério de aceite. Fases são sequenciais onde há dependência; as marcadas ∥ podem rodar em paralelo.

**FASE 0 — Fundação do backend** ✅ CONCLUÍDA
- Agente Sonnet: criar `server/` com Express, `docker-compose.yml` (Postgres), `.env.example`, runner de migrations, migration `0001_init.sql` (todas as tabelas), healthcheck `GET /health`.
- Aceite: `docker compose up` sobe Postgres; `npm run migrate` cria as tabelas; `GET /health` responde 200.

**FASE 1 — Autenticação** (depende de 0) ✅ CONCLUÍDA
- Agente Sonnet: register/login (bcrypt), JWT access+refresh, refresh rotativo, `POST /auth/google` (verificação do idToken), middleware `auth`, rate limit.
- Aceite: testes de integração (supertest) cobrindo cadastro, login certo/errado, refresh, rota protegida sem token = 401.

**FASE 2 — CRUD de rotina + tarefas** ∥ **FASE 3 — Completions + reminders** (ambas dependem de 1) ✅ CONCLUÍDAS
- Agente Sonnet A: `/routine`, `/routine/tasks` (todos os métodos), com isolamento por `user_id`.
- Agente Sonnet B: `/completions`, `/reminders`.
- Aceite (cada): testes garantindo que usuário A nunca lê/escreve dados de B; validação zod rejeitando payload inválido.

**FASE 4 — Sync offline-first** (depende de 2 e 3) ✅ CONCLUÍDA
- Agente Sonnet: `/sync/pull` e `/sync/push` com resolução de conflito por `updated_at` (last-write-wins no MVP, documentado).
- Aceite: teste simulando duas edições concorrentes → resultado determinístico e sem perda silenciosa não documentada.

**FASE 5 — Cliente: login + camada de API** (depende de 1) ✅ CONCLUÍDA
- Agente Sonnet: `api.js`, tela de login/cadastro no `www/index.html`, fluxo de token/refresh, tratamento de erro.
- Aceite: logar/deslogar funciona; app sem token cai na tela de login; visual consistente com o tema atual.

**FASE 6 — Cliente: migração localStorage → sync** (depende de 4 e 5) ✅ CONCLUÍDA
- Agente Sonnet: transformar localStorage em cache+outbox; migração automática dos dados locais existentes para a conta no primeiro login; alarmes derivados de `reminders`.
- Aceite: montar rotina offline, logar, e ver os dados aparecerem no banco; editar em 2 "dispositivos" (2 navegadores) e sincronizar.

**FASE 7 — Endurecimento e revisão final** (depende de todas) ✅ CONCLUÍDA
- Agente Sonnet: revisão de segurança (headers, rate limit, sanitização), testes end-to-end do fluxo completo, README de deploy, checklist de produção.
- Aceite: suíte de testes verde; checklist de segurança revisado; instruções de deploy reproduzíveis.
- Entregue: `npm audit` avaliado (correções não-breaking; as breaking documentadas);
  Helmet + CORS restrito por env (`CORS_ORIGIN`) + limite de corpo (100kb) + rate limit
  (global e `/auth/*`) + erros sem stack em produção confirmados; teste E2E de isolamento
  multiusuário contra Postgres real (`scripts/e2e.js` / `npm run e2e`); `server/README.md`
  (deploy Render + checklist de produção) e `app-mobile/README.md` (teste local + geração
  de APK) criados. **62 testes vitest verdes.**

---

## 6.1 Estado atual do projeto (fim da Fase 7)

**Todas as fases (0–7) concluídas.** O produto está funcional e pronto para deploy:

- Backend Node + PostgreSQL/Neon com auth (e-mail/senha + Google), CRUD de rotina,
  completions, reminders e sync offline-first, tudo isolado por usuário. **62 testes verdes.**
- Cliente PWA/Capacitor com login, sync e alarmes nativos; offline-first preservado.
- Segurança endurecida (Helmet, CORS por env, body limit, rate limit, sem vazamento de stack).
- Documentação reproduzível de deploy e de geração de APK.

**Falta (fora do escopo, fases futuras):** integrar gateway de pagamento
(a tabela `subscriptions` já existe), gerar APK/AAB **assinado** de release e publicar
na Play Store, e executar o deploy do backend em produção (passos documentados em
`server/README.md`).

**Ação de segurança recomendada ao operador:** se a credencial do banco Neon já foi
exposta em algum canal (chat/log), resetar a senha no painel do Neon e atualizar
`DATABASE_URL` antes do deploy.

**FORA DE ESCOPO deste plano (fases futuras):** gateway de pagamento (Stripe/Mercado Pago), geração do `.apk` assinado (exige Android Studio na máquina), publicação na Play Store. A tabela `subscriptions` já é criada para não exigir migração dolorosa depois.

---

## 7. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Postgres/Docker não instalados | Docker Compose sobe tudo isolado; se Docker não puder ser instalado, fallback para Postgres gerenciado (Neon/Supabase-DB-only) sem mudar o código da API |
| Complexidade de sync gerar bugs sutis | MVP usa last-write-wins documentado + testes de conflito; evoluir depois se necessário |
| Vazamento de dados entre usuários | Todo query filtra por `user_id`; testes de isolamento obrigatórios em cada fase |
| Segredos commitados | `.env` no `.gitignore`, só `.env.example` versionado |
| Custo de manter backend | MVP roda em free tier (Railway/Render/Neon); só escala com uso real |

---

## 8. Como os agentes Sonnet serão orquestrados
- Um agente por fase (ou por sub-módulo em fases paralelas), recebendo: este plano + o contrato da seção 4 + o schema da seção 3 como fonte da verdade.
- Cada agente entrega código + testes + roda os testes antes de reportar concluído.
- Eu (sessão principal) reviso cada entrega contra o critério de aceite antes de liberar a próxima fase.
```
```
