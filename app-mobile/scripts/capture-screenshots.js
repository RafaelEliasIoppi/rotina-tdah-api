// Script standalone (não é parte da suite de testes) para capturar screenshots
// do app para a ficha da Play Store. Serve www/ estaticamente e usa Playwright
// para emular um telefone Android, navegando pelas telas principais.
//
// Uso: node scripts/capture-screenshots.js
// Pré-requisito: `npx serve www -l 4173` já rodando (ou o script sobe sozinho).

const { chromium, devices } = require("@playwright/test");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "play-store-assets", "screenshots");
const BASE_URL = "http://127.0.0.1:4173";

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Servidor não subiu a tempo: " + url);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = spawn("npx", ["serve", "www", "-l", "4173"], {
    cwd: path.join(__dirname, ".."),
    shell: true,
    stdio: "ignore",
  });

  try {
    await waitForServer(BASE_URL, 20000);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...devices["Pixel 7"],
    });
    // Bloqueia chamadas ao backend real, igual aos testes E2E.
    await context.route("https://rotina-tdah-api.onrender.com/**", (route) =>
      route.abort()
    );

    const page = await context.newPage();
    await page.goto(BASE_URL + "/");

    // 1. Splash / boas-vindas
    await page.locator("#splashScreen").waitFor({ state: "visible" });
    await page.waitForTimeout(400); // deixa a animação de entrada da splash assentar
    await page.screenshot({ path: path.join(OUT_DIR, "01-splash.png") });

    // 2. Rotina do dia (tela principal)
    //
    // Os screenshots públicos da ficha da loja usam textos neutros para os 2
    // itens "momento espiritual" da rotina padrão (que reflete a rotina pessoal
    // do criador do app, mantida como está no produto real — ver tasks.js).
    // Isso NÃO altera app-mobile/src/tasks.js nem o app entregue ao usuário,
    // apenas o texto exibido nesta sessão de captura de tela.
    await page.locator("#splashSkipBtn").click();
    await page.locator("#splashScreen").waitFor({ state: "hidden" });
    await page.locator("#blocksContainer .task").first().waitFor({ state: "visible" });

    // A lista é re-renderizada do zero (renderBlocks) a cada mudança de estado
    // (ex.: marcar tarefa), então a mutação de texto precisa ser reaplicada
    // depois de cada interação, não só uma vez.
    async function neutralizeSpiritualItems() {
      await page.evaluate(() => {
        var replacements = [
          {
            matchLabel: "Momento espiritual (15 min)",
            label: "Pausa consciente (15 min)",
            detail: "Respiração ou alongamento breve, antes de qualquer tela.",
          },
          {
            matchLabel: "Momento espiritual de encerramento (10 min)",
            label: "Momento de encerramento (10 min)",
            detail: "Revisar o dia com gratidão. Reconhecer o erro sem se punir.",
          },
        ];
        document.querySelectorAll(".task").forEach(function (card) {
          var labelEl = card.querySelector(".task-label");
          if (!labelEl) return;
          var match = replacements.find(function (r) {
            return labelEl.textContent === r.matchLabel;
          });
          if (!match) return;
          labelEl.textContent = match.label;
          var detailEl = card.querySelector(".task-detail");
          if (detailEl) detailEl.textContent = match.detail;
        });
      });
    }

    await neutralizeSpiritualItems();
    await page.screenshot({ path: path.join(OUT_DIR, "02-rotina-do-dia.png") });

    // 3. Progresso (marca 2 tarefas para mostrar o anel de progresso avançando)
    await page.locator(".task").filter({ hasText: "Acordar" }).first().click();
    await neutralizeSpiritualItems();
    await page.locator(".task").filter({ hasText: "Preparação para sair" }).first().click();
    await neutralizeSpiritualItems();
    await page.screenshot({ path: path.join(OUT_DIR, "03-progresso.png") });

    // 4. Seção educativa "Entenda o TDAH"
    await page.locator("#tdahInfoBtn").click();
    await page.locator("#tdahInfoOverlay").waitFor({ state: "visible" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, "04-entenda-o-tdah.png") });
    await page.locator("#tdahInfoOverlay .modal-close").click();
    await page.locator("#tdahInfoOverlay").waitFor({ state: "hidden" });

    await browser.close();
    console.log("Screenshots salvos em:", OUT_DIR);
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
