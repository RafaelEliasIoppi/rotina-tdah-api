# Justificativa de uso de ACCESS_BACKGROUND_LOCATION — Google Play Console

> Texto para colar no formulário de declaração de permissões sensíveis do Google Play Console
> (Play Console → Política do app → Permissões sensíveis → Localização em segundo plano),
> conforme exigido pela política descrita em
> support.google.com/googleplay/android-developer/answer/9799150.
>
> O Console costuma ter um campo único de texto livre com limite de caracteres que varia por
> fluxo (historicamente entre ~500 e ~1000 caracteres). Por isso há uma versão principal enxuta
> e uma versão curta alternativa, caso o campo apresentado seja mais restrito.

---

## Versão principal (~180 palavras)

```
O app Rotina TDAH ajuda pessoas com TDAH a lembrar de tarefas cotidianas usando pistas de
lugar, não só de horário — necessidade documentada na literatura sobre déficit de memória
prospectiva no TDAH. A permissão de localização em segundo plano é usada exclusivamente pela
funcionalidade central "Lembretes por Lugar": o app dispara uma notificação quando o usuário
chega ou sai de um raio de aproximadamente 150 metros de um local que ELE MESMO cadastrou
manualmente (ex.: "Casa", "Farmácia", "Trabalho"), para lembrar tarefas associadas a esse
lugar — por exemplo, "levar o remédio ao sair de casa" ou "retirar receita ao chegar na
farmácia".

Essa detecção só funciona com o app em segundo plano porque o usuário não mantém o app aberto
o dia todo; sem a permissão em background, a função simplesmente não dispara. Não há
rastreamento contínuo nem qualquer histórico de localização armazenado — o app apenas compara
a posição atual do dispositivo com os locais cadastrados pelo próprio usuário, no momento da
transição, e descarta a comparação em seguida.

A função é 100% opcional (opt-in): nunca é ativada por padrão, e o app exibe uma tela de aviso
explicando o funcionamento antes de solicitar qualquer permissão de localização ao usuário.
```

Aproximadamente 195 palavras / 1.320 caracteres.

---

## Versão curta alternativa (~55 palavras)

```
Usada apenas pela função core "Lembretes por Lugar": notifica o usuário ao chegar/sair de um
raio de ~150m de um local que ele mesmo cadastrou, para lembretes ligados a lugares (ex.:
remédio ao sair de casa). Função opcional, com tela de aviso antes da permissão. Não há
rastreamento contínuo nem histórico de localização armazenado — só comparação pontual no
momento da transição.
```

Aproximadamente 58 palavras / 400 caracteres.

---

## Pontos de apoio (para preencher os demais campos do mesmo fluxo, se solicitados)

- **A permissão é essencial para uma feature core, não acessória**: "Lembretes por Lugar" é
  anunciada como funcionalidade principal do app, com UI dedicada de cadastro de locais.
- **Prominent disclosure já implementado**: antes do primeiro pedido de permissão de
  localização, o app exibe uma tela própria (`#placesPrivacyOverlay`, em
  `app-mobile/www/index.html`) explicando em linguagem simples o que a função faz, que
  funciona só no aparelho e que não guarda histórico de localização.
- **Sem coleta de histórico**: nem o aplicativo nem o backend armazenam trajeto ou posições
  passadas do usuário — apenas os locais que o próprio usuário cadastrou (nome, coordenadas,
  raio), para permitir sincronização entre os aparelhos dele.
- **Sem compartilhamento com terceiros**: os locais cadastrados nunca são expostos a outros
  usuários, nem usados para qualquer forma de monitoramento por terceiros (a política de
  privacidade do app declara isso explicitamente na seção "Lembretes por Lugar").
- Screenshot/vídeo de demonstração a anexar no mesmo formulário: fluxo de cadastro de local em
  `editor.js` + a tela de disclosure (`#placesPrivacyOverlay`) + exemplo de notificação
  disparada ao entrar/sair do raio.
