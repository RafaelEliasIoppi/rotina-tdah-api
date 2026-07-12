const { test, expect } = require("@playwright/test");
const { openAppSkippingSplash } = require("./helpers");

// Fluxo: descoberta central de "Lembretes por lugar" (link/card na tela
// principal + modal "Meus locais"), camada de visibilidade adicionada por
// cima do fluxo já existente em editor.js (buildPlaceSection).

test("sem locais cadastrados, mostra o link discreto e a tela 'Meus locais' com estado vazio", async ({ page }) => {
  await openAppSkippingSplash(page);

  const emptyLink = page.locator("#placesDiscoveryEmpty");
  await expect(emptyLink).toBeVisible();
  await expect(page.locator("#placesDiscoveryCard")).toBeHidden();

  await emptyLink.click();
  await expect(page.locator("#placesOverlay")).toHaveClass(/show/);
  await expect(page.locator("#placesList")).toContainText("Você ainda não tem lembretes por lugar");

  // Botão "+ Adicionar" fecha "Meus locais" e abre o editor de rotina guiando o usuário.
  await page.locator("#placesAddBtn").click();
  await expect(page.locator("#placesOverlay")).not.toHaveClass(/show/);
  await expect(page.locator("#editOverlay")).toHaveClass(/show/);
  await expect(page.locator("#toast")).toHaveText(/Escolha a tarefa/);
});

test("depois de cadastrar um local pelo editor, o card 'locais ativos' aparece e a lista mostra o item", async ({ page }) => {
  await openAppSkippingSplash(page);

  await page.route("https://nominatim.openstreetmap.org/**", function (route) {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ display_name: "Farmácia Teste", lat: "-23.55", lon: "-46.63" }])
    });
  });

  await page.locator("#editFab").click();
  const firstRow = page.locator("#editRows .edit-row").first();
  await firstRow.locator(".place-toggle-btn").click();

  const panel = firstRow.locator(".place-panel");
  await panel.locator('input[type="text"]').fill("Farmácia Teste");
  await panel.locator(".place-result-item", { hasText: "Farmácia Teste" }).click();
  await panel.locator("button", { hasText: "Confirmar local" }).click();

  // Primeira vez: aparece a disclosure de privacidade; "Agora não" ainda salva o local (fallback local/web).
  await expect(page.locator("#placesPrivacyOverlay")).toHaveClass(/show/);
  await page.locator("#placesPrivacySkipBtn").click();

  await expect(page.locator("#toast")).toHaveText(/Lembrete por lugar salvo/);

  await page.locator("#editDoneBtn").click();
  await expect(page.locator("#editOverlay")).not.toHaveClass(/show/);

  const card = page.locator("#placesDiscoveryCard");
  await expect(card).toBeVisible();
  await expect(page.locator("#placesDiscoveryEmpty")).toBeHidden();
  await expect(page.locator("#placesDiscoverySub")).toContainText("Farmácia Teste");

  await card.click();
  await expect(page.locator("#placesOverlay")).toHaveClass(/show/);
  await expect(page.locator("#placesCount")).toHaveText(/1 de 3 locais usados/);
  await expect(page.locator("#placesList .places-item")).toHaveCount(1);
  await expect(page.locator("#placesList")).toContainText("Farmácia Teste");

  // Remover pela tela "Meus locais" volta ao estado vazio.
  await page.locator("#placesList .places-item .btn-danger").click();
  await expect(page.locator("#placesList")).toContainText("Você ainda não tem lembretes por lugar");
});
