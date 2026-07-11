const { test, expect } = require("@playwright/test");
const { blockBackendCalls } = require("./helpers");

// Fluxo 3: App funciona sem login (modo offline-first).
//
// Com localStorage limpo (primeira abertura) e sem nenhuma sessão autenticada,
// o app deve: mostrar a splash, permitir fechar via "Continuar sem conta", e
// funcionar normalmente depois disso (ver tarefas, marcar tarefas) mesmo sem
// o backend responder (rotas para a API real são abortadas por
// blockBackendCalls — ver nota em helpers.js).
test("app funciona sem login usando apenas localStorage (splash -> continuar sem conta -> tarefas)", async ({ page }) => {
  await blockBackendCalls(page);
  await page.goto("/");

  // localStorage começa limpo nesta página (contexto novo do Playwright) e a
  // splash deve aparecer sempre na primeira abertura.
  await expect(page.locator("#splashScreen")).toBeVisible();
  await expect(page.locator("#splashScreen")).not.toHaveAttribute("hidden", "");

  await page.locator("#splashSkipBtn").click();

  await expect(page.locator("#splashScreen")).toBeHidden();

  // App funciona normalmente: tarefas visíveis e marcáveis, sem sessão.
  const blocksContainer = page.locator("#blocksContainer");
  await expect(blocksContainer).toBeVisible();
  const tasks = blocksContainer.locator(".task");
  await expect(tasks.first()).toBeVisible();
  expect(await tasks.count()).toBeGreaterThan(0);

  const firstTask = tasks.first();
  await firstTask.click();
  await expect(firstTask).toHaveClass(/done/);

  const ringLabel = page.locator("#ringLabel");
  await expect(ringLabel).not.toHaveText("0%");
});
