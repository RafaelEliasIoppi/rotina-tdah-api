const { test, expect } = require("@playwright/test");
const { blockBackendCalls } = require("./helpers");

// Fluxo 4: Splash nunca trava o acesso ao app.
//
// Teste de regressão do bug corrigido no commit f0effa8 (splash travava o
// acesso se o login Google falhasse).
//
// LIMITAÇÃO DE AMBIENTE: o app usa `Capacitor.Plugins.SocialLogin` (plugin
// nativo, @capgo/capacitor-social-login), que só existe de verdade dentro do
// app Android real. Rodando no browser puro via Playwright, `window.Capacitor`
// é undefined, então o código já cai naturalmente no caminho de "SocialLogin
// indisponível" (ver doGoogleLogin em www/index.html: `if (!SocialLogin) {
// showToast(...); onDone(false); return; }` ). Isso já reproduz, sem precisar
// de mock, exatamente o cenário de "login Google falhou" que motivou o bug
// original — e o teste abaixo confirma que mesmo esse clique não trava nada.
// Não é praticável simular o SDK nativo do Google (Credential Manager) num
// browser comum, então este teste também garante, de forma independente e
// mais forte, que "Continuar sem conta" sempre funciona e nunca fica
// bloqueado — que é a rede de segurança real contra esse bug.
test("clicar em Entrar com Google sem o plugin nativo não trava a splash", async ({ page }) => {
  await blockBackendCalls(page);
  await page.goto("/");
  await expect(page.locator("#splashScreen")).toBeVisible();

  // Simula a tentativa (e falha) de login Google: no browser, SocialLogin é
  // undefined, então isso reproduz o caminho de erro sem precisar mockar nada.
  await page.locator("#splashGoogleBtn").click();

  // Mesmo com o login falhando, a splash deve fechar sozinha (dismissSplash
  // é sempre chamado no callback onDone, sucesso ou falha) e o app deve ficar
  // acessível.
  await expect(page.locator("#splashScreen")).toBeHidden();
  await expect(page.locator("#blocksContainer .task").first()).toBeVisible();
});

test("independente de qualquer falha de login, Continuar sem conta sempre libera o app", async ({ page }) => {
  await blockBackendCalls(page);
  await page.goto("/");
  await expect(page.locator("#splashScreen")).toBeVisible();

  // Não interage com nenhum botão de login: garante que o caminho "sem conta"
  // por si só é suficiente e nunca fica bloqueado, seja qual for o estado do
  // login (rede indisponível, plugin nativo ausente, popup cancelado, etc.).
  await page.locator("#splashSkipBtn").click();

  await expect(page.locator("#splashScreen")).toBeHidden();
  await expect(page.locator("#blocksContainer .task").first()).toBeVisible();

  const firstTask = page.locator("#blocksContainer .task").first();
  await firstTask.click();
  await expect(firstTask).toHaveClass(/done/);
});
