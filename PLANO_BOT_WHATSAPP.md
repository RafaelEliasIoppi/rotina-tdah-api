# Bot de avisos por WhatsApp (rotina TDAH)

## Contexto

Hoje os lembretes de horário do app só disparam **no próprio celular**, via notificação local do Capacitor (`app-mobile/src/notifications.js`), e só quando o app está instalado/aberto em segundo plano. O usuário quer um segundo canal, independente do app: um bot rodando de forma persistente na VM Oracle Cloud dele, que manda uma mensagem de **WhatsApp** no horário de cada lembrete ativo — uso pessoal (só ele), sem mexer em nada do produto/app para outros usuários.

Pesquisa no repo confirmou que **não existe nenhuma infraestrutura de push server-side hoje** (sem FCM/APNs/webhook de mensageria) — o backend só guarda a configuração (`reminders`: `taskId`, `weekday` 1-7, `time` "HH:MM", `label`, `enabled`). O bot é 100% novo (greenfield) e vai consumir a API HTTP já existente, sem precisar de nenhuma mudança no backend/banco (uso pessoal → não precisa de coluna de telefone nem tela de opt-in).

**Decisões já tomadas com o usuário:**
- Escopo: uso pessoal (só ele), não multi-usuário.
- Envio: **Baileys** (`@whiskeysockets/baileys`), biblioteca não-oficial que conecta via QR code e roda 100% na própria VM — grátis, sem cadastro de conta business.
- Conta usada pelo bot para logar na API: a conta pessoal já existente do usuário (não uma conta dedicada).

## Arquitetura

Novo projeto Node.js standalone, pasta `whatsapp-bot/` na raiz deste mesmo repositório (versionado junto, mas **não** faz parte do deploy do Render — roda só na VM Oracle, via processo próprio). Sem servidor HTTP exposto: é um worker de background puro (mais simples de proteger na VM, sem porta aberta).

Componentes:

1. **`src/apiClient.js`** — cliente HTTP para `rotina-tdah-api.onrender.com`, replicando o padrão já usado em `app-mobile/src/api.js`:
   - `POST /auth/login` uma vez (email/senha do `.env`) para obter `{ accessToken, refreshToken }` iniciais.
   - Todas as chamadas autenticadas mandam `Authorization: Bearer <accessToken>`.
   - Em qualquer 401, chama `POST /auth/refresh` com `{ refreshToken }` **uma única vez** (sem loop), substitui **os dois tokens** pelo novo par (o servidor rotaciona o refresh a cada uso — o antigo é invalidado), persiste em disco, e refaz a chamada original.
   - Tokens persistidos em um arquivo local (`state/session.json`, fora do git) para sobreviver a restart sem precisar logar de novo toda vez.
   - Respeitar rate limit: access token dura 15 min, então refresh natural ocorre a cada ~14 min de uso ativo — bem abaixo do limite de 10 req/min em `/auth/*`. Não fazer refresh proativo desnecessário, só sob 401.

2. **`src/remindersSync.js`** — busca `GET /reminders` (já retorna `taskId`, `weekday`, `time`, `label`, `enabled` — **suficiente sozinho**, sem precisar de `/sync/pull` nem `/routine`, confirmado no código) a cada N minutos (ex. 10 min) e mantém um cache em memória. Filtra só `enabled: true`.

3. **`src/scheduler.js`** — ticker a cada 30-60s (mesma ideia do `checkDueAlarms` já existente em `notifications.js`, só que em Node): pega hora atual em `America/Sao_Paulo`, compara `weekday`/`time` contra o cache de reminders, e dispara envio quando bate. Dedup por dia usando um arquivo de estado (`state/notified.json`: `{ "taskId:YYYY-MM-DD": true }`, limpo/ignorado para datas antigas) — evita reenviar o mesmo lembrete várias vezes na janela de 30-60s e sobrevive a restart do processo.

4. **`src/whatsapp.js`** — conexão Baileys (`useMultiFileAuthState` salvando sessão em `state/wa-auth/`, fora do git). Expõe `sendReminder(label, time)` → manda mensagem de texto simples pro próprio número (self-chat) ou um número/grupo configurado via `.env`. Trata reconexão automática em `connection.close` (exceto quando for logout explícito).

5. **`.env`** (na VM, nunca commitado): `API_BASE`, `BOT_EMAIL`, `BOT_PASSWORD` — usa a **conta pessoal já existente** do usuário no app, `WHATSAPP_TARGET_JID` (opcional, default = próprio número).

6. **Deploy na VM Oracle**: `systemd` service (`whatsapp-bot.service`) rodando `node src/index.js`, com `Restart=always` — sobrevive a reboot e crash. Logs via `journalctl`.

## O que falta definir antes de implementar (bloqueadores reais)

Nada bloqueia começar a **escrever o código** do bot agora — ele não depende da VM para ser desenvolvido/testado (dá pra rodar em qualquer máquina com Node, apontando pro `API_BASE` de produção). Os itens abaixo só entram em jogo na hora do **deploy final** na VM Oracle, e ficam em aberto por decisão do usuário (resolver na hora):
- Acesso SSH à VM (host/usuário/chave) e versão do Node disponível nela — hoje documentado no projeto separado "urgencia".
- Método de levar o código até a VM (git clone/pull, scp, outro).
- Confirmar que a VM tem saída de rede liberada para: `rotina-tdah-api.onrender.com` (HTTPS) e os servidores do WhatsApp Web (WebSocket, usado pelo Baileys).

O único passo que **exige interação manual humana** (não dá pra automatizar) é escanear o QR code do Baileys uma vez, com o celular do usuário, para autorizar a sessão do WhatsApp Web — isso acontece uma vez por ambiente (dev e, depois, de novo quando mudar para a VM, a menos que a pasta `state/wa-auth/` seja copiada junto).

## Fora de escopo agora (v2 / futuro)

- Multi-usuário (exigiria migration nova + tela de opt-in no app).
- Mensagens ricas usando `detail`/`rule` da task (exigiria também consultar `/sync/pull`, não só `/reminders`).
- Resumo diário, lembretes de "Bloco de foco"/pomodoro, ou responder ao WhatsApp para marcar tarefa como feita (exigiria endpoint novo de escrita).
- WhatsApp Business Cloud API oficial (troca de biblioteca, caso o Baileys se mostrar instável/banido no uso real).

## Passos de implementação (quando formos construir)

1. Scaffold `whatsapp-bot/` (package.json, dependências: `@whiskeysockets/baileys`, `dotenv`) + conexão Baileys isolada, validar QR code + envio de uma mensagem de teste manual.
2. `apiClient.js` com login + refresh automático (replicar padrão do `app-mobile/src/api.js`).
3. `remindersSync.js` + `scheduler.js` com dedupe diário.
4. Ligar tudo em `src/index.js`, testar localmente comparando contra um lembrete real cadastrado no app.
5. Systemd service na VM Oracle + verificação de que sobrevive a reboot.

## Verificação

- Teste manual: cadastrar um lembrete de teste no app pra daqui a poucos minutos, rodar o bot localmente, confirmar que a mensagem chega no WhatsApp no horário certo (e só uma vez).
- Testar cenário de restart no meio do dia: matar o processo depois de um lembrete já ter disparado, subir de novo, confirmar que **não** reenvia o mesmo lembrete (dedupe funcionando via `state/notified.json`).
- Testar expiração do access token (esperar 15+ min com o bot rodando) e confirmar que o refresh automático funciona sem exigir novo login manual.

## Status / atualizações

- **Implementação inicial concluída** (`bb8114a`): scaffold completo de `whatsapp-bot/` — `apiClient.js`, `remindersSync.js`, `scheduler.js`, `whatsapp.js`, `index.js` — seguindo a arquitetura acima.
- **`6597893`**: `printQRInTerminal` (opção nativa do Baileys para mostrar o QR no terminal) ficou obsoleta na versão usada; trocado por dependência explícita `qrcode-terminal`.
- **`e6d4b8c`**: conexão falhava com erro 405 do WhatsApp; corrigido usando `fetchLatestBaileysVersion()` em vez de fixar uma versão de protocolo desatualizada.
- **`a2b9eed`**: bot rodando ao vivo na VM Oracle (via SSH) derrubava o processo com `RangeError` poucos segundos após conectar, antes de dar tempo de escanear o QR — causa era `Intl.DateTimeFormat({ weekday: 'numeric' })`, opção inválida (só aceita `'long'/'short'/'narrow'`). Corrigido pegando o nome curto do dia em inglês (estável, independe de locale) e mapeando para 1-7, no mesmo padrão do resto do projeto. Também normaliza `hour === '24'` que alguns runtimes ICU retornam à meia-noite com `hour12: false`.
- **`8a5afc9`**: `sendReminder()` era chamado sem `await` no scheduler, então falhas de envio viravam promise solta e não eram capturadas pelo `catch` — o lembrete era marcado como disparado mesmo sem confirmação real de envio. Corrigido aguardando o envio antes de marcar como notificado.
- Bot já validado rodando ao vivo na VM Oracle via SSH (não só localmente).
