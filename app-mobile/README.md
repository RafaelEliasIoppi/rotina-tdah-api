# Rotina TDAH — App (Cliente Web + Android)

Cliente offline-first do app de rotina TDAH. É um PWA (um único
`www/index.html`) empacotado como app Android via **Capacitor**, com alarmes
locais nativos (`@capacitor/local-notifications`).

- **App ID:** `com.rotinatdah.app`
- **Web dir:** `www` (o app é o `www/index.html`)
- **Backend:** ver `../server/README.md` (a API é a fonte da verdade; o
  localStorage funciona como cache + fila de sincronização)

---

## 1. Testar o cliente localmente (apontando para o backend local)

1. Suba o backend local (ver `../server/README.md`):

   ```bash
   cd ../server
   npm run dev        # API em http://localhost:3000
   ```

2. Confirme que o cliente aponta para o backend local. Em `www/index.html`, a
   constante já vem assim por padrão:

   ```js
   var API_BASE = "http://localhost:3000";
   ```

3. Abra o cliente no navegador. Sirva a pasta `www/` por HTTP (necessário para o
   PWA e para as chamadas fetch):

   ```bash
   npx serve www
   # ou:  python -m http.server 8080 --directory www
   ```

   Acesse a URL indicada (ex.: `http://localhost:3000/` do `serve`, ou
   `http://localhost:8080/`).

> **Offline-first:** se o backend estiver fora do ar, o app continua funcionando
> só com `localStorage`; ao voltar a conexão, ele sincroniza.

---

## 2. Gerar o APK (Android)

O fluxo Capacitor já está montado. **É necessário o Android Studio instalado**
(com o Android SDK).

```bash
# na pasta app-mobile/
npm install                 # dependências do Capacitor (uma vez)
npx cap sync android        # copia o www/ para o projeto Android e sincroniza plugins
npx cap open android        # abre o projeto no Android Studio
```

No Android Studio:

1. Aguarde o Gradle sincronizar.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. O APK de debug sai em
   `android/app/build/outputs/apk/debug/app-debug.apk`.

Atalhos npm equivalentes (definidos no `package.json`):

```bash
npm run sync            # = npx cap sync android
npm run open:android    # = npx cap open android
```

> **IMPORTANTE — trocar a `API_BASE` antes de gerar o APK de uso real.**
> Com `API_BASE = "http://localhost:3000"`, o app só fala com o backend rodando
> **no próprio PC**. Para o app funcionar em qualquer celular, edite
> `www/index.html` e aponte para a URL pública HTTPS do backend:
>
> ```js
> var API_BASE = "https://rotina-tdah-api.onrender.com";
> ```
>
> Depois rode `npx cap sync android` de novo e gere o APK.
> (Android bloqueia HTTP em texto puro por padrão — a API pública **precisa** ser HTTPS.)

---

## 3. Estado atual do projeto

### Funciona
- Rotina diária por blocos, com marcação de tarefas concluídas.
- Alarmes locais nativos no Android (Capacitor Local Notifications), derivados
  dos reminders.
- 100% offline via `localStorage` (cache + fila de sincronização).
- Login/cadastro por e-mail/senha e Google OAuth (via backend).
- Sincronização com o backend (pull/push), com dados isolados por usuário e
  migração automática dos dados locais para a conta no primeiro login.
- Backend próprio (Node + PostgreSQL/Neon) com 62 testes verdes, pronto para
  deploy (ver `../server/README.md`).

### Falta (fora do escopo do MVP atual)
- **Pagamento / assinatura:** a tabela `subscriptions` já existe no banco, mas
  não há gateway (Stripe / Mercado Pago) integrado. Tudo é grátis por enquanto.
- **Publicação na Play Store:** exige APK/AAB **assinado** com keystore de
  release, ficha da loja, política de privacidade e conta de desenvolvedor
  Google. O APK atual é de **debug** (para testes), não de release.
- **Deploy do backend em produção:** os passos estão documentados
  (`../server/README.md`), mas o deploy em si é uma ação manual do operador.
