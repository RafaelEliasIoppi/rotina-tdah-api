# 🎯 PLANO FINAL — Opus (Estratégia) + Sonnet (Implementação)

**Status:** 📋 Pronto para Sonnet | **Data:** 2026-07-11 | **Revisão:** Opus | **Execução:** Sonnet  
**Versão:** 2.0 (Opus + Plan Agent)

---

## 📊 DIAGNÓSTICO COMPLETO

### ✅ Funcionando
- **Backend:** Node.js + PostgreSQL, Auth JWT, CRUD rotina, Sync offline, 62 testes verdes
- **Frontend:** PWA/Capacitor, login, sincronização automática
- **Segurança:** Helmet, CORS, rate limit, bcrypt, validação Zod
- **Database:** Neon PostgreSQL, migrations aplicadas

### 🔴 BLOQUEADOR CRÍTICO (PRIORITÁRIO #1)
**ERRO DE IMPORT PATH:**
- Arquivo: `server/src/modules/subscriptions/subscriptions.router.js` linha 4
- Atual: `import { requireAuth } from '../../middlewares/auth.js'` (com 's')
- Correto: `import { requireAuth } from '../../middleware/auth.js'` (sem 's')
- **Impacto:** Testes quebrados (auth.test.js, health.test.js), app não inicia
- **Solução:** Corrigir linha 4 (é o ÚNICO local com problema)

### 🟡 Stripe (Começado, Incompleto)
**✅ Já existe:**
- Stripe SDK instalado
- Rotas: `/checkout`, `/me`, `/portal`, `/webhook/stripe`
- Migration: `0003_subscriptions_stripe.sql` aplicada
- Frontend: Modal + badge + botões
- Variáveis env na template

**❌ Falta:**
- Middleware `requirePremium.js` (NOVO arquivo)
- Endpoint `GET /subscriptions/config` (linha ~10 em subscriptions.router.js)
- Frontend: ler priceId dinâmico (em `index.html` linha ~1948)
- Testes: `subscriptions.test.js` (NOVO arquivo)
- Credenciais Stripe preenchidas (criadas manualmente no dashboard)

### 📱 Android Release
**❌ APK ainda é debug (não assinado)**
- Falta: keystore + gradle signing config
- Falta: build release

### 🚀 Produção
**❌ Não foi deployado**
- Backend: não está no Render/Railway (documentação existe em `server/README.md`)
- Frontend: apontando para localhost:3000 (deve apontar para prod URL)

---

## 🗺️ MAPA EXECUTIVO: FASES PARA SONNET

### **FASE 8.1 — BLOQUEADOR CRÍTICO — Corrigir Import (< 5 minutos)**

**PRIORIDADE:** 🔴 MÁXIMA (tudo depende)

**O que fazer:**
1. Abrir `server/src/modules/subscriptions/subscriptions.router.js`
2. Linha 4: trocar `middlewares` → `middleware`
3. Rodar `npm test` → esperado: 62 testes verdes (não mais 50)
4. Rodar `npm run smoke` → esperado: sem erros
5. Fazer commit: "Fix: import path middlewares → middleware"

**Arquivos:**
- `server/src/modules/subscriptions/subscriptions.router.js` linha 4

**Critério de aceite:**
- ✅ `npm test` passa 100% (62+ testes)
- ✅ `npm run smoke` passa 100%

**Sonnet:** Execute IMEDIATAMENTE

---

### **FASE 8.2 — Middleware Premium + Config Endpoint (2-3 horas)**

**Dependência:** FASE 8.1 ✅

**O que fazer:**
1. Criar `server/src/middleware/requirePremium.js` (novo arquivo)
   - Valida Bearer token
   - Busca subscription do usuário
   - Retorna 403 se plan ≠ 'premium'

2. Adicionar em `server/src/modules/subscriptions/subscriptions.router.js`:
   - Rota GET `/config` (pública, sem auth)
   - Retorna: `{priceId: env.STRIPE_PREMIUM_PRICE_ID || ""}`

3. Atualizar testes:
   - Criar `server/test/subscriptions.middleware.test.js`
   - Teste: sem token → 401
   - Teste: free → 403 em rota premium
   - Teste: premium → 200 em rota premium
   - Teste: GET /config retorna {priceId}

4. Validar:
   - `npm run test` deve passar (≥ 65 testes)
   - `npm run dev` sem erros

**Arquivos:**
- `server/src/middleware/requirePremium.js` (NOVO)
- `server/src/modules/subscriptions/subscriptions.router.js` (add ~10 linhas)
- `server/test/subscriptions.middleware.test.js` (NOVO)

**Critério de aceite:**
- ✅ `server/src/middleware/requirePremium.js` existe
- ✅ GET `/subscriptions/config` retorna `{priceId}`
- ✅ `npm run test` passa (≥ 65 testes)
- ✅ Middleware funciona (testes 403/200)

**Sonnet:** Execute após 8.1 ✅

---

### **FASE 8.3 — Frontend: Carregar Config Dinâmico (1-2 horas)**

**Dependência:** FASE 8.2 ✅ (precisa de GET `/config`)

**O que fazer:**
1. Editar `app-mobile/www/index.html` (linhas ~1860-1950):
   - Ao iniciar: `fetch GET /config`
   - Salvar `config.stripePremiumPriceId` em variável global
   - Usar no POST `/subscriptions/checkout` (não hardcode `"price_premium"`)
   - Se priceId vazio: desabilitar botão com tooltip "Stripe não configurado"

2. Testar localmente:
   - `npm run dev` no backend
   - Abrir app em navegador → verificar priceId no console
   - Verificar que priceId é dinâmico

**Arquivos:**
- `app-mobile/www/index.html` (~30 linhas modificadas)

**Critério de aceite:**
- ✅ GET `/config` é chamado ao iniciar
- ✅ `priceId` é dinâmico (não hardcoded)
- ✅ Botão "Assinar" usa `config.stripePremiumPriceId`
- ✅ Console mostra priceId carregado

**Sonnet:** Execute após 8.2 ✅ (pode rodar paralelo com 8.2 se houver dois agentes)

---

### **FASE 8.4 — Testar Webhook Stripe (2-3 horas, envolve ops manual)**

**Dependência:** FASE 8.2 ✅ (config endpoint) + FASE 8.3 ✅ (frontend)

**O que fazer:**
1. Criar conta Stripe (https://stripe.com/br) — SE NÃO EXISTIR
2. Obter credenciais:
   - Dashboard → Developers → API Keys
   - Copiar `Secret Key` (sk_test_...)
   - Copiar `Webhook secret` (whsec_...)
3. Criar produto "Premium":
   - Preço: R$ 9,90/mês (recorrente)
   - Copiar `price_` (ex: price_1AB2Cd3EfGhIjKlMnOpQrStUvW)
4. Preencher `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_PREMIUM_PRICE_ID=price_xxxxx
   ```
5. Testar webhook:
   ```bash
   cd server && npm run dev
   # Em outro terminal:
   stripe listen --forward-to localhost:3000/subscriptions/webhook/stripe
   # Em um terceiro terminal:
   stripe trigger checkout.session.completed
   ```
6. Verificar:
   - Backend recebe webhook
   - Subscription criada no banco
   - Sem erros de parsing/auth

**Arquivos:**
- `server/.env` (preencher 3 variáveis)

**Critério de aceite:**
- ✅ Conta Stripe criada
- ✅ Credenciais em `.env`
- ✅ Webhook recebido e processado sem erros
- ✅ Subscription criada no banco após webhook

**Sonnet:** Execute após 8.3 ✅

**⚠️ Blockers:** Precisa de conta Stripe (criar em dashboard)

---

### **FASE 8.5 — Build APK Release Assinado (1-2 horas)**

**Dependência:** FASE 8.1 ✅ (testes verdes)

**O que fazer:**
1. Gerar keystore (senha única e segura):
   ```bash
   cd app-mobile/android
   keytool -genkey -v -keystore release-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias rotina-tdah-release
   ```
2. Criar `app-mobile/android/gradle.properties`:
   ```properties
   RELEASE_KEYSTORE_FILE=../release-keystore.jks
   RELEASE_KEYSTORE_PASSWORD=<sua-senha>
   RELEASE_KEY_ALIAS=rotina-tdah-release
   RELEASE_KEY_PASSWORD=<sua-senha>
   ```
3. Editar `app-mobile/android/app/build.gradle`:
   - Adicionar `signingConfigs.release`
   - Configurar `buildTypes.release.signingConfig`
4. Build:
   ```bash
   cd app-mobile/android
   ./gradlew.bat bundleRelease
   ```
5. Output: `app-mobile/android/app/build/outputs/bundle/release/app-release.aab`

**Arquivos:**
- `app-mobile/android/gradle.properties` (NOVO)
- `app-mobile/android/app/build.gradle` (add ~20 linhas)
- `app-mobile/android/release-keystore.jks` (NOVO — gerado)

**Critério de aceite:**
- ✅ AAB gerado em `build/outputs/bundle/release/app-release.aab`
- ✅ Arquivo assinado (verificar com jarsigner)
- ✅ Sem erros de build

**Sonnet:** Execute após 8.1 ✅ (pode rodar paralelo com 8.4)

---

### **FASE 8.6 — Deploy Backend (Render) (2-3 horas)**

**Dependência:** FASE 8.4 ✅ (credenciais Stripe) + FASE 8.1 ✅ (testes verdes)

**O que fazer:**
1. Suba repo no GitHub (ou verifique se já está)
2. Em Render (https://render.com):
   - Dashboard → New → Web Service
   - Conecte repositório
   - Root Directory: `server`
   - Runtime: Node
   - Build: `npm install`
   - Start: `npm start`
   - Health check: `/health`
3. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<neon-url-com-?sslmode=require>
   DB_SSL=true
   JWT_SECRET=<novo-com-40-chars>
   JWT_REFRESH_SECRET=<novo-com-40-chars>
   CORS_ORIGIN=<seu-dominio-frontend-ou-vazio>
   GOOGLE_CLIENT_ID=<seu-id>
   STRIPE_SECRET_KEY=sk_live_xxxxx   # ← usar chave LIVE, não test
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_PREMIUM_PRICE_ID=price_xxxxx
   ```
4. Após deploy:
   - Abrir Shell no Render
   - Rodar: `npm run migrate`
5. Testar:
   ```bash
   curl https://seu-dominio.onrender.com/health
   curl https://seu-dominio.onrender.com/config
   ```

**Arquivos:**
- `.env.example` (atualizar com Stripe vars — feito em Fase 11)
- `server/README.md` (atualizar com deploy Render — feito em Fase 11)

**Critério de aceite:**
- ✅ Render dashboard mostra "deployed"
- ✅ GET /health retorna 200
- ✅ GET /config retorna config pública
- ✅ Migrations aplicadas com sucesso

**Sonnet:** Execute após 8.4 ✅

**⚠️ Blockers:** Precisa de conta Render (gratuita)

---

### **FASE 8.7 — Deploy Frontend + Novo APK (1-2 horas)**

**Dependência:** FASE 8.6 ✅ (backend em prod) + FASE 8.5 ✅ (keystore)

**O que fazer:**
1. Editar `app-mobile/www/index.html` linha ~1861:
   - Trocar: `var API_BASE = "http://localhost:3000"`
   - Para: `var API_BASE = "https://seu-dominio.onrender.com"`
2. Sincronizar Capacitor:
   ```bash
   cd app-mobile
   npx cap sync android
   ```
3. Gerar novo APK:
   ```bash
   cd app-mobile/android
   ./gradlew.bat bundleRelease
   ```
4. Testar em device:
   - Instalar novo APK
   - Logar
   - Criar tarefa
   - Verificar sincronização com backend remoto

**Arquivos:**
- `app-mobile/www/index.html` (linha ~1861, 1 linha)
- `app-mobile/android/app/build.gradle` (nenhuma mudança, build automático)

**Critério de aceite:**
- ✅ API_BASE aponta para prod URL
- ✅ APK gera sem erros
- ✅ App conecta ao backend remoto
- ✅ Dados sincronizam

**Sonnet:** Execute após 8.6 ✅

---

### **FASE 11 — Documentação + Checklist Pré-Produção (1-2 horas)**

**Dependência:** Fases 8.1-8.7 ✅

**O que fazer:**
1. Atualizar `server/README.md`:
   - Seção "Stripe Setup"
   - Como obter credenciais
   - Template de `.env`

2. Atualizar `.env.example`:
   - Adicionar `STRIPE_SECRET_KEY=sk_test_...`
   - Adicionar `STRIPE_WEBHOOK_SECRET=whsec_...`
   - Adicionar `STRIPE_PREMIUM_PRICE_ID=price_...`

3. Atualizar `app-mobile/README.md`:
   - Seção "Build Release APK"
   - Passo a passo keystore + gradle

4. Checklist pré-produção:
   ```
   SEGURANÇA
   [ ] npm audit → 0 critical
   [ ] Helmet + CORS configurados
   [ ] Erros sem stack em produção
   [ ] Nenhum sk_live_ no git
   [ ] Rate limit ativo (/auth/*, /subscriptions/*)
   
   TESTES
   [ ] npm test → todos verdes (≥65 testes)
   [ ] npm run smoke → sem erros
   [ ] Webhook testado localmente
   [ ] Fluxo completo: login → checkout → webhook → DB
   
   COMPLIANCE
   [ ] .env.example sem segredos
   [ ] .gitignore exclui .env
   [ ] README com instruções claras
   [ ] Backup Neon ativado
   
   DEPLOYMENT
   [ ] Health check passa em produção
   [ ] Migrations aplicadas
   [ ] CORS permitindo frontend
   [ ] Logs estruturados (ou console.log OK)
   ```

5. Commit final:
   ```bash
   git add .env.example README.md app-mobile/README.md
   git commit -m "Docs: Stripe setup + release build instructions"
   ```

**Arquivos:**
- `server/README.md` (~30 linhas adicionadas)
- `.env.example` (3 linhas adicionadas)
- `app-mobile/README.md` (~50 linhas adicionadas)

**Critério de aceite:**
- ✅ Documentação clara e reproduzível
- ✅ Checklist completado
- ✅ Nenhum segredo commitado
- ✅ Projeto pronto para produção

**Sonnet:** Execute após todas as fases ✅

---

## 🔗 DEPENDÊNCIAS E ORDEM

```
FASE 8.1 (Bloqueador: import path)
    ↓
FASE 8.2 (Middleware + config) ∥ FASE 8.5 (Build APK)
    ↓
FASE 8.3 (Frontend dinâmico)
    ↓
FASE 8.4 (Testar webhook)
    ↓
FASE 8.6 (Deploy backend)
    ↓
FASE 8.7 (Deploy frontend)
    ↓
FASE 11 (Docs + checklist)
```

**Sequencial:** 8.1 → 8.2 → 8.3 → 8.4 → 8.6 → 8.7 → 11  
**Paralelização:** 8.2 ∥ 8.5 (depois que 8.1 passa)

---

## 📝 INSTRUÇÕES ESPECÍFICAS PARA SONNET

### Fase 8.1 (Bloqueador)

```
Você é um engenheiro Node.js. Projeto TDAH tem erro crítico de import.

PROBLEMA:
- Arquivo: server/src/modules/subscriptions/subscriptions.router.js linha 4
- Importa: '../../middlewares/auth.js' (com 's')
- Deveria: '../../middleware/auth.js' (sem 's')

SOLUÇÃO:
1. Abrir arquivo acima
2. Corrigir linha 4
3. Fazer grep por qualquer outro import de 'middlewares/' (plural)
4. Rodar: npm test → esperado 62+ testes verdes
5. Rodar: npm run smoke → esperado sem erros
6. Commit: "Fix: import path middlewares → middleware"

CRITÉRIO:
✅ npm test passa 100%
✅ npm run smoke passa 100%
```

### Fase 8.2 (Middleware + Config)

```
Você é um engenheiro Node.js. Crie o middleware premium.

TAREFAS:
1. Criar server/src/middleware/requirePremium.js:
   - Estende requireAuth
   - Valida subscription.plan === 'premium'
   - Retorna 403 {error, code: 'PREMIUM_ONLY'} se não premium

2. Adicionar em subscriptions.router.js:
   - GET /config (pública, sem auth)
   - Retorna {priceId: env.STRIPE_PREMIUM_PRICE_ID || ""}

3. Criar testes:
   - Teste: free user → 403 em rota premium
   - Teste: premium user → 200 em rota premium
   - Teste: GET /config retorna {priceId}

4. Rodar: npm test → esperado ≥65 testes verdes

CRITÉRIO:
✅ requirePremium.js existe
✅ GET /subscriptions/config funciona
✅ Testes verdes (≥65)
✅ npm run dev sem erros
```

### Fase 8.3 (Frontend)

```
Você é um engenheiro frontend. Configure o app para ler priceId do backend.

TAREFAS:
1. Editar app-mobile/www/index.html:
   - Ao inicializar: fetch GET /config
   - Salvar config.stripePremiumPriceId
   - Usar em POST /subscriptions/checkout (não hardcode)
   - Se vazio: desabilitar botão + tooltip

2. Testar:
   - npm run dev no backend
   - Abrir app
   - Verificar console: "stripePremiumPriceId loaded: price_xxx"
   - Botão "Assinar" usa valor dinâmico

CRITÉRIO:
✅ GET /config é chamado ao inicializar
✅ priceId é dinâmico
✅ Frontend renderiza sem erros
✅ Botão funciona
```

### Fases 8.4, 8.5, 8.6, 8.7

Cada uma com instruções específicas (ver documento acima seções FASE 8.4-8.7)

---

## 📊 PROGRESSO

| # | Fase | Status | Bloqueador | Sonnet |
|---|------|--------|-----------|---------|
| 8.1 | Bloqueador: import path | 🔴 CRÍTICO | Nenhum | Execute AGORA |
| 8.2 | Middleware + config | ⏳ Pending | 8.1 ✅ | Após 8.1 |
| 8.3 | Frontend dinâmico | ⏳ Pending | 8.2 ✅ | Após 8.2 |
| 8.4 | Testar webhook | ⏳ Pending | 8.3 ✅ | Após 8.3 |
| 8.5 | Build APK | ⏳ Pending | 8.1 ✅ | Paralelo 8.2 |
| 8.6 | Deploy backend | ⏳ Pending | 8.4 ✅ | Após 8.4 |
| 8.7 | Deploy frontend | ⏳ Pending | 8.6 ✅ | Após 8.6 |
| 11 | Docs + checklist | ⏳ Pending | 8.7 ✅ | Após 8.7 |

---

## 🚀 PRÓXIMA AÇÃO IMEDIATA

### EXECUTE AGORA:

**Chamar Sonnet com:**
```
FASE 8.1 — BLOQUEADOR CRÍTICO

server/src/modules/subscriptions/subscriptions.router.js linha 4:
- Atual: import { requireAuth } from '../../middlewares/auth.js'
- Corrigir para: import { requireAuth } from '../../middleware/auth.js'

Depois:
- npm test → deve passar 62+ testes (atualmente 50 quebrados)
- npm run smoke → deve passar

Fazer commit: "Fix: import path middlewares → middleware"

Reportar quando terminar com saída de npm test.
```

---

## 📞 REFERÊNCIAS

- **Plano detalhado anterior:** `/PLANO_CONTINUACAO_FASES_8_11.md`
- **Histórico:** `/PLANO_REESTRUTURACAO.md` + `/WIP-monetizacao.md`
- **Artifact:** https://claude.ai/code/artifact/7ffb37a6-57d7-48b1-98be-1b61923a6af4
- **Memory:** `~/.claude/projects/.../memory/project_tdah_status.md`

---

**Status:** 🎯 Pronto para Sonnet começar FASE 8.1 AGORA
