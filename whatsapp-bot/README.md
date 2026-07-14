# Bot de avisos por WhatsApp — implementação

Bot standalone que roda 24/7 na VM Oracle Cloud do usuário e manda uma mensagem de WhatsApp no horário de cada lembrete ativo da conta pessoal dele. Ver `PLANO_BOT_WHATSAPP.md` (raiz do repo) para o plano original/contexto de decisão. Este README documenta o que foi **de fato implementado e rodado em produção**.

## Status

Em produção, rodando como serviço systemd na VM Oracle (`saur`), conectado ao WhatsApp pessoal do usuário. Testado ponta a ponta em 2026-07-14: lembrete de teste disparou no horário certo e a mensagem chegou no WhatsApp.

## Componentes

- `src/apiClient.js` — login (`POST /auth/login`) + refresh automático (`POST /auth/refresh`) na API de produção, tokens persistidos em `state/session.json` (fora do git).
- `src/remindersSync.js` — busca `GET /reminders` a cada 10 min, filtra `enabled: true`, mantém cache em memória.
- `src/scheduler.js` — ticker a cada 30s, compara hora atual em `America/Sao_Paulo` contra o cache, dispara envio e faz dedupe diário via `state/notified.json`.
- `src/whatsapp.js` — conexão Baileys (`useMultiFileAuthState`, sessão em `state/wa-auth/`, fora do git), QR code no terminal na primeira conexão, reconexão automática em `connection.close`.
- `src/index.js` — liga tudo: autentica na API, conecta WhatsApp, inicia sync e scheduler.

## Bugs encontrados e corrigidos durante a implementação

1. **`RangeError` no scheduler (crítico)** — `getSaoPauloNow()` usava `Intl.DateTimeFormat` com `weekday: 'numeric'`, opção que não existe (só aceita `'long'/'short'/'narrow'`). Isso derrubava o processo poucos segundos depois de conectar no WhatsApp, então nenhum lembrete jamais chegava a disparar mesmo com o QR pareado com sucesso. Corrigido pegando o nome curto do dia em inglês (`weekday: 'short'`) e convertendo para o número 1–7 via `WEEKDAY_MAP` (commit `a2b9eed`).
2. **Envio sem `await` no scheduler** — `sendReminder(...)` era chamado sem `await` dentro do `tick()`, então o log "Lembrete disparado" aparecia (e o item era marcado como notificado) assim que a função era *chamada*, não quando o envio de fato terminava. Um erro real de envio viraria uma promise rejeitada solta, sem cair no `catch` existente. Corrigido aguardando o envio antes de marcar como notificado e salvar o estado (commit `8a5afc9`).

## Deploy na VM (systemd)

Unit file em `/etc/systemd/system/whatsapp-bot.service` na VM (não versionado, vive só lá):

```ini
[Unit]
Description=Rotina TDAH - Bot de avisos por WhatsApp
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/rotina-tdah-api/whatsapp-bot
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Habilitado com `sudo systemctl enable --now whatsapp-bot.service` — sobrevive a reboot da VM e reinicia sozinho em caso de crash (`Restart=always`).

### Operação

- Ver logs: `sudo journalctl -u whatsapp-bot -f`
- Reiniciar (ex. depois de um `git pull` com código novo): `sudo systemctl restart whatsapp-bot.service`
- Status: `sudo systemctl status whatsapp-bot.service`
- Atualizar código: `cd ~/rotina-tdah-api && git pull origin master && sudo systemctl restart whatsapp-bot.service`

## Teste end-to-end realizado

Lembrete real ("Acordar", task `36bc46da-bd8a-414c-b7e5-d91bfdceab32`) foi temporariamente alterado via `PUT /reminders` para um horário próximo com label "TESTE BOT WHATSAPP", o serviço foi reiniciado para forçar resync imediato, e o disparo foi confirmado tanto no log (`[scheduler] Lembrete disparado: "TESTE BOT WHATSAPP" às 14:49`) quanto pela confirmação do usuário de recebimento no WhatsApp. O lembrete foi revertido para os valores originais (`weekday: 1, time: "05:45", label: "Acordar", enabled: true`) logo em seguida.

## Notas

- Erros do tipo `MessageCounterError` / `Bad MAC` / `No matching sessions found for message` nos logs do Baileys são ruído normal de decodificação de **mensagens recebidas** (protocolo Signal), mais comuns logo após reconexões rápidas (como as feitas durante testes manuais). Não afetam o envio dos lembretes.
- Chave SSH privada da VM fica fora do controle de versão (`.gitignore` root exclui `ssh-key-*`).
