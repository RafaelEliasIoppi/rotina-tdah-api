const { test, expect } = require("@playwright/test");
const { openAppSkippingSplash } = require("./helpers");

// Fluxo 1: Toggle de tarefa atualiza o progresso do dia.
// Marcar uma tarefa como concluída deve atualizar o anel de progresso
// (#ringLabel) e o texto de resumo (#progressSub) imediatamente.
test("marcar tarefa atualiza o anel de progresso e o resumo", async ({ page }) => {
  await openAppSkippingSplash(page);

  const ringLabel = page.locator("#ringLabel");
  const progressSub = page.locator("#progressSub");

  await expect(ringLabel).toHaveText("0%");
  await expect(progressSub).toHaveText(/^0 de \d+ concluídas/);

  const firstTask = page.locator("#blocksContainer .task").first();
  await firstTask.click();

  await expect(firstTask).toHaveClass(/done/);
  await expect(ringLabel).not.toHaveText("0%");

  const ringText = await ringLabel.textContent();
  const pct = parseInt(ringText, 10);
  expect(pct).toBeGreaterThan(0);

  await expect(progressSub).toHaveText(/^1 de \d+ concluídas/);
});
