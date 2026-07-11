# Plano de Continuação — Fases 8-11 (Pós-Deppe)

**Versão:** 1.0 | **Data:** 2026-07-11 | **Orquestrador:** Opus | **Implementador:** Sonnet  
**Status:** 📋 Planejado | Fases 0-7 ✅ Concluídas

---

## TL;DR — O que faz agora?

Projeto TDAH está **funcional e pronto para monetização**. Stripe foi integrado (Deppe parou no meio). Faltam:

1. **FASE 8** (Sonnet): Criar `requirePremium.js` middleware + endpoint `GET /subscriptions/config`  
2. **FASE 9** (Sonnet): Testar Stripe (checkout, webhook, cancelamento)  
3. **FASE 10** (Sonnet): Bloquear features premium  
4. **FASE 11** (Sonnet): Docs + checklist pré-produção  

**Cada fase:** ~2-3 dias, testes verdes, critério de aceite claro. Sequencial (dependências).

---

## Estado Atual

### Projeto está assim:
- ✅ Backend: Node.js + PostgreSQL, auth JWT, CRUD, sync offline
- ✅ Frontend: PWA/Capacitor, login, sincronização
- ✅ Testes: 62 vitest verdes
- ✅ Segurança: Helmet, CORS, rate limit, bcrypt

### Stripe (começado, não terminado):
- ✅ Rotas: checkout, portal, webhook listener
- ✅ Migration: subscriptions table criada
- ❌ Middleware requirePremium: **NÃO EXISTE**
- ❌ Config endpoint: **NÃO EXISTE**
- ❌ Testes Stripe: **NÃO EXISTEM**
- ❌ Credenciais Stripe: vazias em `.env`

---

## Como ler este documento

**Seção 1 (abaixo):** Resumo de cada fase
**Seção 2:** Instruções específicas para Sonnet
**Seção 3:** Arquivos + linhas críticas
**Seção 4:** Checklist pré-produção

→ **Próxima ação:** chamar Sonnet com Seção 2 (FASE 8)

---

## Seção 1: Fases 8-11 (Resumido)

### FASE 8: Finalizar Stripe — middleware + config

**Dependências:** Fase 7 ✅

**Tarefas:**
1. Criar `server/src/middleware/requirePremium.js`
   - Valida Bearer token
   - Busca subscription do usuário
   - Retorna 403 se não premium
   
2. Criar `GET /subscriptions/config` em `subscriptions.router.js`
   - Retorna `{priceId, productId, environment}`
   - Público (sem auth)
   
3. Frontend: carregar config ao iniciar
   - Usar config.priceId em vez de hardcoded
   - Desabilitar botão se priceId vazio
   
4. Testes
   - `npm run test` deve passar (adicionar testes do middleware)
   - `npm run dev` sem erros

**Critério de aceite:**
- ✅ requirePremium.js existe e funciona (teste: 403 sem premium)
- ✅ GET /subscriptions/config retorna {priceId}
- ✅ Frontend carrega config (log no console)
- ✅ Testes vitest novos passam
- ✅ Sem erros no npm run dev

---

### FASE 9: Testar Stripe end-to-end

**Dependências:** Fase 8 ✅

**Tarefas:**
1. Criar conta Stripe (https://stripe.com/br)
   - Pegar API keys (test mode)
   - Criar produto "Premium" (R$ 9,90/mês)
   - Configurar webhook

2. Preencher `.env` com credenciais
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `STRIPE_PREMIUM_PRICE_ID=price_...`

3. Teste manual
   - `npm run dev` (backend)
   - `stripe listen --forward-to localhost:3000/subscriptions/webhook/stripe` (webhook)
   - Logar no app
   - Checkout com card `4242 4242 4242 4242`
   - Verificar: webhook recebido + banco atualizado

4. Testes automatizados
   - Criar `server/test/subscriptions.test.js`
   - Mock webhook: `checkout.session.completed`
   - Mock webhook: `customer.subscription.deleted`
   - Verificar DB mudanças

**Critério de aceite:**
- ✅ Conta Stripe criada + credenciais em `.env`
- ✅ Checkout funciona: card → webhook → DB
- ✅ Cancelamento funciona: portal → webhook → DB (plan_id=free)
- ✅ Testes: `npm run test -- subscriptions.test.js` verdes
- ✅ Sem erros no servidor

---

### FASE 10: Bloquear features premium

**Dependências:** Fase 8 ✅

**Tarefas:**
1. Identificar features premium (exemplo: relatórios avançados)

2. Aplicar middleware `requirePremium()` em rotas
   ```javascript
   router.get('/reports', requirePremium(), getReports)
   ```

3. Frontend: mostrar "Feature premium" se receber 403

4. Testes
   - Usuário free: GET /reports → 403 + mensagem
   - Usuário premium: GET /reports → 200

**Critério de aceite:**
- ✅ Pelo menos 1 rota protegida
- ✅ Teste: free → 403, premium → 200
- ✅ Frontend mostra mensagem amigável
- ✅ Testes vitest passam

---

### FASE 11: Docs + checklist pré-produção

**Dependências:** Fases 8-10 ✅

**Tarefas:**
1. Atualizar `server/README.md`
   - Seção "Stripe Setup"
   - Variáveis de env
   - Como obter API keys

2. Atualizar `.env.example`
   - Exemplos Stripe (sk_test_..., whsec_..., price_...)

3. Checklist pré-produção
   ```
   [ ] npm run test → todos verdes
   [ ] npm audit → sem critical
   [ ] Sem sk_live_ no git
   [ ] Helmet + CORS restrito
   [ ] Erros sem stack em prod
   [ ] NODE_ENV=production npm run dev → funciona
   [ ] Backups Neon ativados
   ```

4. Marcar projeto como "ready for deploy"

**Critério de aceite:**
- ✅ README tem Stripe setup claro
- ✅ `.env.example` completo
- ✅ Checklist verificado (✓ em cada item)
- ✅ Nenhuma credencial (sk_live_) no git

---

## Seção 2: Instruções para Sonnet (Fase 8)

Copiar/colar ao chamar Sonnet:

```
=== FASE 8: Finalizar Stripe — middleware + config endpoint ===

Contexto:
- Projeto TDAH: Node.js + Express + Postgres (Neon)
- 62 testes vitest já verdes
- Stripe instalado: rotas /checkout, /me, /portal, webhook existem
- Falta: requirePremium middleware + /subscriptions/config endpoint

Arquivos relevantes (LEIA ANTES DE COMEÇAR):
- server/src/middleware/auth.js (padrão de middleware)
- server/src/modules/subscriptions/subscriptions.router.js (onde adicionar config)
- server/src/app.js (linhas 100-113, onde webhook é montado)
- app-mobile/www/index.html (linhas 1-100, topbar + modal de planos)
- server/src/config/env.js (variáveis Stripe)

Tarefas:
1. Criar server/src/middleware/requirePremium.js
   - Valida Authorization: Bearer token
   - Busca subscription do usuário (query DB)
   - Se plan !== 'premium': retorna 403 {error: "Premium feature"}
   - Se plan === 'premium' ou 'free' mas é feature pública: continua
   
2. Adicionar GET /subscriptions/config em subscriptions.router.js
   - Rota pública (sem requireAuth)
   - Retorna: {priceId: process.env.STRIPE_PREMIUM_PRICE_ID || ""}
   
3. Atualizar frontend (app-mobile/www/index.html)
   - Ao iniciar: fetch GET /subscriptions/config
   - Guardar config.priceId em window.stripeConfig
   - Usar window.stripeConfig.priceId em vez de hardcoded "price_premium"
   - Se priceId vazio: desabilitar botão "Assinar" com tooltip "Stripe não configurado"
   
4. Criar testes
   - Criar server/test/subscriptions.middleware.test.js
   - Teste: sem token → 401
   - Teste: token válido mas free → 403 em rota protegida
   - Teste: token válido e premium → 200 em rota protegida
   - GET /subscriptions/config retorna {priceId}
   
5. Testar localmente
   - npm run test (deve passar com novos testes)
   - npm run dev (sem erros no stderr)
   - Verificar: GET localhost:3000/subscriptions/config retorna {priceId:""}

Aceite:
- ✅ requirePremium.js existe
- ✅ GET /subscriptions/config retorna {priceId}
- ✅ Frontend carrega config ao iniciar (log no console)
- ✅ Botão "Assinar" desabilitado se priceId vazio
- ✅ npm run test verde (>63 testes)
- ✅ npm run dev sem erros

Quando terminar:
1. Git commit com mensagem: "Fase 8: middleware requirePremium + config endpoint"
2. Listar arquivos modificados
3. Copiar output de "npm run test"
4. Reportar: "Fase 8 concluída ✅"
```

---

## Seção 3: Arquivos críticos + linhas

| Arquivo | O que | Linhas | Status |
|---------|-------|--------|--------|
| `server/src/middleware/requirePremium.js` | NOVO | — | ⏳ Criar |
| `server/src/middleware/auth.js` | referência | — | ✅ Usar padrão |
| `server/src/modules/subscriptions/subscriptions.router.js` | Adicionar GET /config | ~10 | ⏳ Editar |
| `app-mobile/www/index.html` | Carregar config | ~20 | ⏳ Editar |
| `server/src/app.js` | Nenhuma mudança | 100-113 | ✅ OK |
| `server/.env` | Preencher Stripe vars | 3 | ⏳ Após Fase 9 |
| `server/.env.example` | Adicionar exemplos | 3 | ⏳ Fase 11 |
| `server/test/subscriptions.middleware.test.js` | NOVO | ~80 | ⏳ Criar |

---

## Seção 4: Checklist Pré-Produção (Fase 11)

```
SEGURANÇA
[ ] npm audit → 0 critical (warnings OK se não-breaking)
[ ] Helmet headers aplicados (server/app.js linha ~20)
[ ] CORS restrito: CORS_ORIGIN setado em .env
[ ] Erro sem stack em produção: NODE_ENV=production npm run dev
[ ] Sem sk_live_ commitado: grep -r "sk_live_" .
[ ] Rate limit: /auth/* e /subscriptions/checkout*

TESTES
[ ] npm run test → todos verdes (>65 testes)
[ ] npm run test -- subscriptions → todos verdes
[ ] Teste isolamento multiusuário (DB não vazada entre users)
[ ] Teste fluxo completo: login → checkout → webhook → DB

PERFORMANCE
[ ] Pagina carrega em <3s (browser DevTools)
[ ] Bundle frontend <500kb (gzip)
[ ] Queries DB com índices: completions(user_id, date), tasks(routine_id, weekday)

COMPLIANCE
[ ] .env.example sem segredos
[ ] .gitignore exclui .env e *.key
[ ] README documentação reproduzível
[ ] LICENSE definido (se público)

DEPLOY
[ ] Database: Neon backups ativados
[ ] Backend: instruções Deploy Render/Railway documentadas
[ ] Frontend: instruções APK build documentadas
[ ] Rollback plan: versioning + canary (documentado)
```

---

## Como continuar

### Próxima ação imediata:
1. ✅ **Este documento** foi criado: `/PLANO_CONTINUACAO_FASES_8_11.md`
2. ✅ **Artifact** foi criado para visualizar: https://claude.ai/code/artifact/...
3. ⏳ **Chamar Sonnet para FASE 8** com Seção 2 acima
4. ⏳ **Revisar** depois de Sonnet terminar
5. ⏳ **Liberar FASE 9** com credenciais Stripe

### Dependências externas:
- FASE 9 precisa: conta Stripe (criar em dashboard.stripe.com)
- FASE 11 precisa: Neon backups ativados (painel Neon)

---

## Perguntas frequentes

**P: E se Sonnet não conseguir fazer Fase 8?**  
R: Criar issue aqui com erro específico. Pode ser que falta dependência no servidor ou migration não rodou.

**P: Quanto tempo cada fase demora?**  
R: ~2-3 dias por fase (incluindo testes + review). Total: ~10-15 dias para Fases 8-11.

**P: Posso fazer features novas enquanto isso?**  
R: Não. Fases 8-11 são pré-requisito para produção. Depois posso adicionar features.

**P: E o APK assinado?**  
R: Fora de escopo (Fase 11). Documentado em `app-mobile/README.md`. Fazer depois que Stripe está pronto.

---

## Referências

- Documento detalhado: [Artifact: PLANO_CONTINUACAO_DEPPE.md](https://claude.ai/code/artifact/7ffb37a6-57d7-48b1-98be-1b61923a6af4)
- Stripe docs: https://stripe.com/docs/api
- Webhook testing: https://stripe.com/docs/webhooks/test
- Projeto: `/server` + `/app-mobile`
