const { test, expect } = require("@playwright/test");
const { openAppSkippingSplash } = require("./helpers");

// Fluxo 2: Streak reflete corretamente a % do dia da semana selecionado.
//
// Este é o teste de regressão do bug corrigido no commit 17e0caf: a linha de
// streak (#streakRow, células .streak-day .d-pct) nunca atualizava porque a
// leitura de storage usava a chave errada. Trocamos para uma aba de dia que
// NÃO é "hoje", marcamos uma tarefa como concluída nesse dia (que é persistida
// sob a pseudo-data "template-<dia>", ver effectiveDateForDay no código-fonte),
// e verificamos que a célula de streak correspondente reflete a mudança.
test("marcar tarefa em outro dia da semana atualiza a célula de streak daquele dia", async ({ page }) => {
  await openAppSkippingSplash(page);

  // A aba do dia real ("hoje") tem um indicador visual <span class="dot">.
  const dayTabs = page.locator("#dayTabs .daytab");
  const tabCount = await dayTabs.count();
  let otherDayIndex = -1;
  let otherDayLabel = "";
  for (let i = 0; i < tabCount; i++) {
    const hasDot = (await dayTabs.nth(i).locator(".dot").count()) > 0;
    if (!hasDot) {
      otherDayIndex = i;
      otherDayLabel = (await dayTabs.nth(i).textContent()).trim();
      break;
    }
  }
  expect(otherDayIndex).toBeGreaterThanOrEqual(0);

  // Troca para o dia que não é hoje.
  await dayTabs.nth(otherDayIndex).click();
  await expect(dayTabs.nth(otherDayIndex)).toHaveAttribute("aria-selected", "true");

  // Streak inicial desse dia deve ser 0%.
  const streakCells = page.locator("#streakRow .streak-day");
  const streakCell = streakCells.nth(otherDayIndex);
  await expect(streakCell.locator(".d-pct")).toHaveText("0%");

  // Marca a primeira tarefa desse dia como concluída.
  const firstTask = page.locator("#blocksContainer .task").first();
  await firstTask.click();
  await expect(firstTask).toHaveClass(/done/);

  // A célula de streak correspondente a esse dia (não a de "hoje") deve
  // refletir a mudança e não ficar mais em 0%.
  const updatedPctText = await streakCell.locator(".d-pct").textContent();
  const updatedPct = parseInt(updatedPctText, 10);
  expect(updatedPct).toBeGreaterThan(0);
  await expect(streakCell).toHaveClass(/(partial|full)/);
});
