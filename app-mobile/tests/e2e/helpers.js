// Helpers compartilhados pelos specs E2E do app "Rotina TDAH".
//
// O app (www/index.html) faz fetch() para um backend real em produção
// (https://rotina-tdah-api.onrender.com) logo na carga, para buscar config
// do Google Login e do Stripe. Essas chamadas são só "best effort" (erros são
// engolidos com .catch), mas para manter os testes rápidos e determinísticos
// (sem depender de rede real), interceptamos e abortamos essas rotas.
async function blockBackendCalls(page) {
  await page.route("https://rotina-tdah-api.onrender.com/**", function (route) {
    route.abort();
  });
}

// Abre o app já com a splash fechada (clicando "Continuar sem conta"), pronto
// para os testes que não são especificamente sobre a splash em si.
async function openAppSkippingSplash(page) {
  await blockBackendCalls(page);
  await page.goto("/");
  await page.locator("#splashScreen").waitFor({ state: "visible" });
  await page.locator("#splashSkipBtn").click();
  await page.locator("#splashScreen").waitFor({ state: "hidden" });
  await page.locator("#blocksContainer .task").first().waitFor({ state: "visible" });
}

module.exports = { blockBackendCalls, openAppSkippingSplash };
