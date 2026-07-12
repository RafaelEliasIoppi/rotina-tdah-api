# Varredura do app no celular físico — 2026-07-11

Baseado em screenshots reais capturados via ADB (dark mode do sistema) + revisão do CSS/JS correspondente. Registrado para não perder os achados e evitar reintroduzir os mesmos bugs.

## 1. Bugs visuais confirmados

### 🔴 Alta — Título da splash é tampado pela status bar ao rolar
A última linha do heading "Feito para como sua mente realmente funciona" (a palavra "funciona") fica atrás do relógio/ícones do sistema quando a tela rola. A splash não tem fundo sólido cobrindo essa faixa nem margem de segurança contínua durante o scroll — só no topo absoluto.

**Fonte:** `app-mobile/www/styles.css:692-694` — `.splash-inner` tem `padding-top: max(28px, env(safe-area-inset-top))` só no estado inicial (topo), não impede que o conteúdo role para debaixo da status bar durante o scroll.

**Correção sugerida:** dar à `.splash` um fundo sólido full-bleed que cubra até a área da status bar (a splash já é full-screen), e garantir `padding-top` suficiente em todo o conteúdo scrollável, não só no container externo — ou usar `position: sticky` com z-index maior na barra de status simulada, se o app desenhar uma.

### 🟡 Média — Seletor de conta Google abre nativo do Android com contas pessoais visíveis
Ao tocar em "Continuar com Google", o sistema mostra a lista de todas as contas Google já logadas no aparelho (incluindo e-mails pessoais não relacionados ao app). É comportamento padrão do Android/Credential Manager, não bug do app — mas vale avaliar usar `filterByAuthorizedAccounts` para reduzir ruído.

## 2. Oportunidades de UX (splash / primeira impressão)

### 🟡 Média — Splash é longa demais para quem já é usuário recorrente
3 cards de conteúdo educativo + 2 botões aparecem *toda vez* que o app reabre após ficar em segundo plano (decisão intencional documentada em memória do projeto). Para uso diário, isso pode virar fricção.

**Sugestão:** manter a splash completa para usuários deslogados (reforça a proposta educativa), mas para quem já está logado, considerar uma versão reduzida (só header + "Continuar como Fulano") depois da primeira vez, ou pular direto pra rotina com toast discreto.

### 🟢 Baixa — Botão "Continuar sem conta" tem baixa afordância
Link sublinhado pequeno e centralizado, contra um botão "Continuar com Google" em card cheio com ícone colorido. Empurra visualmente para login Google, quando o app permite uso 100% offline sem conta.

## 3. Achados de revisão de código (não capturados visualmente nesta sessão)

### 🟡 Média — Ícone da notificação nativa (geofencing) usa o ícone genérico do app
`GeofenceBroadcastReceiver.showNotification()` usa `context.getApplicationInfo().icon` como ícone da notificação — deveria ser um ícone monocromático simples (silhueta branca), senão aparece como quadrado cinza genérico em muitos launchers desde Android 5+.

**Arquivo:** `app-mobile/android/app/src/main/java/com/rotinatdah/app/GeofenceBroadcastReceiver.java`

### 🟢 Baixa — Falta validação de campo do geofencing (Fase G6 do plano)
A feature "Lembretes por Lugar" nunca foi testada saindo/entrando fisicamente de um local real — só via UI simulada (Playwright) e build. Ver `PLANO_GEOLOCALIZACAO.md`, seção Fase G6.

### 🟢 Baixa — App não conferido em light mode no dispositivo real
Toda a varredura desta sessão foi em dark mode (tema do sistema do celular). O CSS já suporta light mode, mas não foi conferido visualmente no aparelho físico.

## Prioridade sugerida

1. Corrigir corte do título da splash atrás da status bar (alta visibilidade, toda abertura do app)
2. Ícone monocromático para notificações de geofencing
3. Revisar afordância "Continuar sem conta" vs. peso visual do botão Google
4. Considerar splash reduzida para usuários recorrentes já logados
5. Validação de campo da geolocalização (Fase G6)
