# Plano: Lembretes por Local (Geofencing) — Rotina TDAH

**Autor:** Opus (arquitetura) + agente-informacao-tdah (fundamentação clínica)
**Data:** 2026-07-11
**Status:** Proposta, aguardando validação do usuário antes de implementar

---

## 1. Por que isso, e não outra coisa

Consultei o agente de informação sobre TDAH antes de desenhar qualquer coisa. Resumo do que ele
trouxe (fontes: Manual Barkley cap. 3/7/14, Cartilha ABP/Alexa):

- A base **não** tem material específico sobre "geofencing" ou "memória prospectiva" por nome —
  isso é extrapolação em cima de um princípio que ela cobre bem: **miopia temporal e déficit de
  memória de trabalho não-verbal** (Barkley, cap. 7). Uma intenção formada num momento ("preciso
  levar o remédio") se perde porque não há pista presente no momento/lugar certo da ação.
- O app já usa esse princípio via horário. Local é uma pista **mais forte que horário** para
  transições da vida real, porque a rotina real não bate com o horário planejado (trânsito,
  atraso, imprevisto) — mas o *lugar* onde a ação deveria acontecer não muda.
- Risco documentado (Barkley cap. 14, terapia familiar): geolocalização usada por **terceiros**
  (pais monitorando localização de adolescente) tem base na literatura para ser
  **contraproducente** — reforça dinâmica de controle que piora autonomia e conflito familiar em
  TDAH. **Não vamos construir "onde meu filho está agora"**. Qualquer coisa nessa direção fica de
  fora do escopo, ponto.
- Risco de hipervigilância/ansiedade por notificação excessiva (Cartilha ABP, TDAH como transtorno
  de autorregulação, não só atenção) — o design precisa ser econômico em disparos, não "todo lugar
  vira alarme".

**Duas funcionalidades sobrevivem ao crivo clínico + têm valor de produto real:**

1. **Lembrete ao SAIR de um lugar** (ex.: sair de casa de manhã → "levou remédio? chave? material?")
2. **Lembrete ao CHEGAR em um lugar associado a uma tarefa** (ex.: chegar na farmácia → "retirar
   receita controlada")

Ambas são *self-service*: o próprio usuário define os locais e o que quer ser lembrado ali. Nada
de rastreamento por terceiros, nada de histórico de localização armazenado além do necessário para
o gatilho funcionar.

---

## 2. Nome da feature (proposto)

**"Lembretes por Lugar"** (evitar o termo técnico "geofencing" na UI — usuário não precisa saber
o nome do mecanismo).

Posicionamento: extensão natural do sistema de lembretes que já existe por horário
(`@capacitor/local-notifications`), não uma feature isolada. Na UI, cada tarefa/lembrete ganha uma
opção adicional: "Lembrar por horário" (já existe) ou "Lembrar por lugar" (novo).

---

## 3. Escopo v1 (o que fazer primeiro)

- Usuário pode cadastrar **até 3 lugares** (free) — nome livre + endereço buscado (ex.:
  "Casa", "Farmácia", "Trabalho"). Limite deliberado: evita a UI virar gerenciador de mapas
  complexo, e é meio-termo saudável para não gerar fadiga de notificação.
- Cada lugar tem um raio fixo de 150m (não configurável na v1 — configurável é complexidade sem
  ganho claro agora; GPS urbano tem erro de 10-50m, 150m é o mínimo prático para não disparar
  cedo/tarde demais).
- Associar um lembrete existente a um lugar + evento (`chegar` ou `sair`), em vez de/além de
  horário.
- Notificação local (mesma infra do `@capacitor/local-notifications` já usada), disparada pelo
  serviço de geofencing nativo do Android (**não** por polling constante de GPS — ver seção 5,
  bateria é a restrição real aqui).
- **Sem histórico de localização.** O app não guarda "onde você esteve" — só compara a posição
  atual contra os raios cadastrados, em tempo real, no próprio dispositivo. Nada disso é
  sincronizado com o backend por padrão (ver seção 6, privacidade).

**Fora do escopo v1** (não construir agora, mas documentar por quê):
- Geofencing "reverso" (terceiro vendo onde o usuário está) — **nunca**, por fundamentação clínica.
- Raio configurável por lugar — complexidade de UI sem validação de que é necessário.
- Múltiplos raios por lugar (ex. "zona ampla" + "zona precisa") — over-engineering para v1.
- iOS — o app hoje só publica Android; geofencing em iOS exige tratamento de permissão bem
  diferente (Core Location + "Always" permission, App Store é mais rígida). Avaliar depois se o
  app for pra iOS.

---

## 4. Fluxo de UX proposto

1. Usuário abre um lembrete existente (ou cria um novo) → toca em "Lembrar por lugar" em vez de
   horário.
2. Se é a primeira vez usando a feature: tela explicativa curta (1 tela, não wizard) — "O app vai
   te lembrar quando você chegar ou sair de um lugar que você escolher. Isso só funciona no seu
   aparelho — não guardamos seu histórico de localização." + botão "Permitir localização".
3. Usuário busca/marca um lugar no mapa (ou usa "Minha localização atual" como atalho para "Casa").
4. Escolhe: chegar / sair.
5. Lembrete fica visível na lista normal de tarefas com um ícone de local em vez de horário —
   **consistência visual** com o padrão já existente no app (não criar uma segunda UI paralela).

**Ponto de atenção de design** (calibrado pelo alerta de hipervigilância): o app deve ter um
teto rígido de notificações por local — sugestão: não disparar o mesmo lembrete de local mais de
1x por período de 3h, mesmo que o usuário saia/entre repetidamente na área (comum em rotas
urbanas com múltiplas passagens perto de um ponto).

---

## 5. Arquitetura técnica

### 5.1 Por que não pode ser "checar GPS a cada X minutos"

Polling de GPS em foreground/background é o maior consumidor de bateria depois da tela. Para um
app de rotina que o usuário espera manter instalado o dia todo, isso mataria a adoção em 1 semana
por "app consumindo bateria". A resposta correta é usar a **Geofencing API nativa do Android**
(parte do Google Play Services / `com.google.android.gms.location`), que:
- É gerenciada pelo SO, não pelo app — o Android decide a frequência de checagem baseado em
  velocidade de movimento, bateria, etc.
- Dispara um `PendingIntent`/broadcast quando cruza a borda do raio, mesmo com o app fechado.
- É o mesmo mecanismo usado por apps como Google Maps para "chegando em casa".

### 5.2 Plugin Capacitor

Não existe plugin oficial `@capacitor/geofencing`. Opções reais, avaliadas:

| Opção | Prós | Contras |
|---|---|---|
| **`@capacitor-community/background-geolocation`** | Mantido pela comunidade Capacitor, mais próximo do ecossistema já usado no projeto | Mistura tracking contínuo + geofence; precisa configurar pra só usar geofence, não tracking |
| **Plugin nativo customizado** (Java, dentro de `android/app/src/main/java/...`) usando `GeofencingClient` do Play Services diretamente | Controle total, só o necessário, sem dependência de terceiro pouco mantido | Mais trabalho: escrever a ponte Capacitor↔Java (`@CapacitorPlugin`), já que não existe wrapper pronto — mas o projeto já tem 2 plugins nativos configurados (`local-notifications`, `capgo/social-login`), então o padrão de "plugin nativo Android" já é familiar no repo |
| **`react-native-geofencing`-like via WebView Geolocation API pura** | Zero plugin nativo | **Não funciona em background** — API de geolocalização do browser/WebView é suspensa quando o app não está em foreground. Inviável para o caso de uso (usuário não vai deixar o app aberto o dia todo). |

**Recomendação**: plugin nativo customizado, curto (a Geofencing API do Play Services é bem
direta — cadastrar geofences, registrar um `BroadcastReceiver`, e no receiver, chamar a mesma
lógica de notificação local que `@capacitor/local-notifications` já usa por baixo). Evita
dependência externa de manutenção incerta para algo que é o coração de uma feature nova.

### 5.3 Onde entra no código existente

- `app-mobile/src/` ganha um módulo novo, `geofencing.js`, seguindo o padrão modular já
  estabelecido (`tasks.js`, `notifications.js`, etc.) — expõe `registerGeofence()`,
  `removeGeofence()`, `initGeofencing()`.
- `app-mobile/android/app/src/main/java/.../GeofencePlugin.java` — novo plugin nativo Capacitor.
- Modelo de dados: cada tarefa em `tasks.js` ganha um campo opcional `location: { lat, lng, radius,
  trigger: "enter"|"exit", label }`, ao lado do `time` que já existe — **não substitui** hora, é
  alternativo/complementar (algumas tarefas continuam só por horário).
- Permissões novas no `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  (esta última é a mais sensível — ver seção 6).

### 5.4 Sincronização (Sync.js / backend)

Os *locais cadastrados pelo usuário* (nome + lat/lng + raio) fazem sentido sincronizar entre
dispositivos, do mesmo jeito que a rotina já sincroniza — é dado de configuração, não dado de
rastreamento. **Isso é diferente de "histórico de onde o usuário esteve"**, que não deve existir
em lugar nenhum, nem local nem backend.

Precisa de uma tabela nova no backend (`server/src/modules/`), algo como `saved_places` (id,
user_id, label, lat, lng, radius) — CRUD simples, mesmo padrão dos outros módulos existentes.

---

## 6. Privacidade — não é detalhe, é o que decide se a feature é aceitável

Este é o ponto onde a fundamentação clínica bate direto com decisão técnica:

1. **`ACCESS_BACKGROUND_LOCATION` é a permissão mais desconfiada do Android** — desde Android 10+,
   o SO mostra uma tela extra específica ("Permitir o tempo todo" vs "Só durante o uso"), e o
   Google Play tem uma política própria e rigorosa para apps que pedem essa permissão (exige
   formulário de justificativa na Play Console, tela de "prominent disclosure" no próprio app
   antes de pedir). **Isso é outro ponto de risco de rejeição na revisão da Play Store**, do
   mesmo jeito que o Stripe foi — precisa ser tratado com a mesma seriedade.
2. A feature deve ser **100% opt-in**, nunca pedida na primeira abertura do app — só quando o
   usuário ativamente tenta usar "Lembrar por lugar" pela primeira vez.
3. **Nenhum dado de localização histórica** é armazenado — nem local, nem no backend. Só a
   posição atual é comparada contra os raios, e descartada depois de cada checagem. Isso deve ser
   dito explicitamente na política de privacidade (`GET /privacy` já existe no backend, precisa
   de uma seção nova).
4. **Nenhum terceiro** (incluindo "responsável"/pais) tem acesso à localização do usuário — a
   feature é estritamente para autogerenciamento da própria pessoa. Isso vem direto do alerta do
   Cap. 14 de Barkley.

---

## 7. Impacto na política da Play Store (repete o que já vivemos com Stripe)

Assim como a assinatura via Stripe quebrava a política de billing, `ACCESS_BACKGROUND_LOCATION`
tem uma política própria e específica do Google Play
(support.google.com/googleplay/android-developer/answer/9799150) que exige:
- Justificativa por escrito na Play Console de por que o app precisa da permissão em background.
- Vídeo ou screenshot demonstrando o uso dentro do fluxo do app.
- Não aprovar apps que pedem a permissão sem uma feature core e óbvia que dependa dela.

**Isso é factível para nós** (a feature É o core da funcionalidade, não um acessório) — mas é
outra rodada de revisão manual do Google, potencialmente mais demorada que a revisão padrão.
Recomendo: publicar a v1 do app (sem essa feature) primeiro — como já está pronto — e lançar
"Lembretes por Lugar" como atualização v1.1, depois que o app já estiver aprovado e com histórico
de conta limpo. Pedir uma permissão sensível já na primeira submissão aumenta o risco de rejeição
combinado com tudo mais que está sendo revisado.

---

## 8. Estimativa de esforço (ordem de grandeza, não sprint plan)

| Etapa | Esforço |
|---|---|
| Plugin nativo Android (GeofencingClient + broadcast receiver + ponte Capacitor) | Médio — 1-2 dias, mas é a parte tecnicamente mais arriscada (não temos precedente no repo) |
| UI de cadastro de lugar (busca/mapa) | Médio — depende de escolher biblioteca de mapa (Google Maps SDK teria custo de API key + billing Google Cloud; alternativa mais simples: usar só busca de endereço via geocoding, sem mapa visual, para v1) |
| Integração com modelo de tarefas existente (`tasks.js`, `render.js`) | Pequeno — já é modular |
| Backend: CRUD de `saved_places` | Pequeno — padrão já replicado várias vezes no projeto |
| Tela de disclosure de privacidade + textos da Play Console | Pequeno, mas obrigatório antes de submeter |
| Testes E2E (limitação: Playwright não simula GPS nativo/background do Android) | Precisa de teste manual em dispositivo físico, suite E2E cobre só a parte de UI/cadastro |

---

## 9. Decisões do usuário (2026-07-11)

1. **Mapa**: sem Google Maps SDK. Busca de endereço por texto (geocoding) + atalho "usar minha
   localização atual". Mais simples, sem custo de API.
2. **Timing**: incluir já na v1 que vai para a Play Store (o usuário aceitou o risco de revisão
   mais demorada/possível rejeição por empilhar duas mudanças sensíveis — Stripe removido +
   `ACCESS_BACKGROUND_LOCATION` nova — na mesma submissão). Consequência prática: a submissão para
   a Play Store deste app **fica bloqueada até esta feature estar pronta e testada**, já que ela
   entra na mesma build.
3. **Limites confirmados**: 3 locais no plano grátis; sem monitoramento por terceiros em nenhuma
   hipótese (mantido por fundamentação clínica, cap. 14 Barkley).

## 10. Plano de implementação — divisão de trabalho para agentes Sonnet

Como o Opus, vou orquestrar. Cada fase abaixo é um despacho separado para um agente
`general-purpose` (Sonnet), sequencial (cada uma depende da anterior), seguindo o padrão já
validado no projeto (contexto do arquivo + passo a passo + pedir commit ao final, sem push).

### Fase G1 — Plugin nativo Android de geofencing
Criar `app-mobile/android/app/src/main/java/com/rotinatdah/app/GeofencePlugin.java`
(`@CapacitorPlugin`), usando `GeofencingClient` do Google Play Services:
- Métodos expostos ao JS: `addGeofence({id, lat, lng, radius, trigger})`,
  `removeGeofence({id})`, `requestPermissions()`.
- `BroadcastReceiver` que recebe o evento de transição (`GEOFENCE_TRANSITION_ENTER` /
  `_EXIT`) e dispara uma notificação local reaproveitando o canal já configurado por
  `@capacitor/local-notifications` (não duplicar infraestrutura de notificação).
- Regra de limite de repetição: não disparar a mesma notificação de local mais de 1x a cada 3h
  (guardar timestamp do último disparo em `SharedPreferences`, chave por geofence id).
- Adicionar ao `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
  registrar o receiver.
- Adicionar dependência `com.google.android.gms:play-services-location` no `build.gradle` do
  módulo `app`.

### Nota pós-G1 (revisão do Opus)

O `GeofencePlugin`/`GeofenceBroadcastReceiver` da Fase G1 foram implementados e validados
(build OK, commit `3d080e9`). Ponto identificado na revisão: a notificação disparada pelo
`BroadcastReceiver` hoje é genérica ("Você chegou em um local com lembrete") porque o receiver
não tem acesso ao nome do local nem ao texto da tarefa associada — esse dado só existe no lado
JS (`tasks.js`). **A Fase G2 precisa resolver isso**: ao chamar `addGeofence`, passar também
`label` (nome do local) e `taskLabel`/`taskDetail` (texto da tarefa) como extras, e o plugin
Java deve persistir isso (ex: em `SharedPreferences`, chave por geofence id) para o
`GeofenceBroadcastReceiver` conseguir montar uma notificação específica
("Chegando na Farmácia: retirar receita") em vez do texto genérico atual.

### Fase G2 — Módulo JS `geofencing.js` + integração ao modelo de tarefas
- Novo `app-mobile/src/geofencing.js`, padrão modular igual aos demais (`tasks.js`,
  `notifications.js`): `initGeofencing()`, `registerPlaceForTask(taskId, place, trigger)`,
  `removePlaceForTask(taskId)`, `geocodeAddress(query)` (usar API de geocoding gratuita/simples —
  ex. Nominatim/OpenStreetMap, sem custo, já que não há Google Maps SDK).
- Estender o modelo de tarefa em `tasks.js` com campo opcional `location: {lat, lng, radius,
  trigger, label}` ao lado do `time` existente — sem quebrar tarefas que só usam horário.
- Atualizar `render.js` para mostrar ícone de local em vez de horário quando a tarefa tem
  `location` em vez de (ou além de) `time`.

### Fase G3 — UI de cadastro de local
- Na edição de uma tarefa (`editor.js` / `#editOverlay`), adicionar opção "Lembrar por lugar":
  campo de busca de endereço (geocoding), botão "Usar minha localização atual", seletor
  chegar/sair.
- Tela de disclosure de privacidade (1 tela, simples) na primeira vez que o usuário tenta usar a
  feature, antes de pedir a permissão do Android — texto: o que é guardado (só o local
  cadastrado), o que NÃO é guardado (histórico de onde o usuário esteve), que funciona só
  localmente.
- Limite de 3 locais: bloquear cadastro do 4º com mensagem clara (não é paywall agressivo, é
  linguagem de "limite do plano gratuito").

### Fase G4 — Backend: CRUD de locais salvos
- Nova tabela `saved_places` (migration em `server/`, padrão dos módulos existentes): id,
  user_id, label, lat, lng, radius, created_at.
- Módulo `server/src/modules/places/` (router, service, repo) — CRUD simples, autenticado,
  isolado por user_id (mesmo padrão de `tasks`/`subscriptions`).
- Sync: os locais entram no fluxo de sincronização já existente (`sync.js`), mesmo padrão de
  pull/push das tarefas.
- **Não** criar nenhum endpoint que exponha localização de um usuário para outro usuário/role —
  isso reforça em código a decisão de não ter monitoramento por terceiros.

### Fase G5 — Textos de compliance para a Play Store + política de privacidade
- Atualizar a política de privacidade pública (`GET /privacy` no backend) com seção específica
  sobre geolocalização: o que é coletado, que não há histórico, que é opt-in.
- Redigir a justificativa de uso de `ACCESS_BACKGROUND_LOCATION` para o formulário da Play
  Console (texto explicando a feature core que depende da permissão).
- Atualizar `app-mobile/play-store-assets/ficha-play-store.md` se a feature mudar a descrição
  do app (provavelmente vale mencionar "lembretes por local" como diferencial).

### Fase G6 — Testes + validação manual em dispositivo físico
- Testes E2E (Playwright) cobrindo a parte de UI: cadastro de local, edição, limite de 3,
  exibição na lista de tarefas — sem poder simular o gatilho de geofence real (limitação de
  ambiente).
- Validação manual obrigatória no celular físico do usuário: sair/entrar fisicamente na área de
  um local cadastrado e confirmar que a notificação dispara, inclusive com o app fechado.

**Ordem de execução**: G1 → G2 → G3 podem ser despachados em sequência rápida (mesma sessão). G4
pode rodar em paralelo com G2/G3 (não tem dependência direta). G5 depois que a feature estiver
funcionalmente pronta. G6 é validação final antes de gerar o AAB definitivo para a Play Store.
