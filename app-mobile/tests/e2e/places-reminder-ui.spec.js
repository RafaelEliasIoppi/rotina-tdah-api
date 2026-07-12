const { test, expect } = require("@playwright/test");
const { openAppSkippingSplash } = require("./helpers");

// Fluxo: UI de "Lembretes por lugar" (Fase G3).
// Cobertura limitada ao que é possível em Playwright (sem GPS/geofence nativo
// real — ver PLANO_GEOLOCALIZACAO.md seção 10, Fase G6): abrir o editor,
// expandir a opção "Lembrar por lugar" numa tarefa e ver o campo de busca de
// endereço aparecer.
test("abrir 'Lembrar por lugar' em uma tarefa mostra o campo de busca de endereço", async ({ page }) => {
  await openAppSkippingSplash(page);

  await page.locator("#editFab").click();
  await expect(page.locator("#editOverlay")).toHaveClass(/show/);

  const firstRow = page.locator("#editRows .edit-row").first();
  const placeToggle = firstRow.locator(".place-toggle-btn");
  await expect(placeToggle).toBeVisible();
  await expect(placeToggle).toHaveText(/Lembrar por lugar/);

  await placeToggle.click();

  const panel = firstRow.locator(".place-panel");
  await expect(panel).toHaveClass(/show/);
  await expect(panel.locator('input[type="text"]')).toBeVisible();
  await expect(panel.locator("button", { hasText: "Usar minha localização atual" })).toBeVisible();
  await expect(panel.locator("button", { hasText: "Confirmar local" })).toBeVisible();
});

// Fluxo: primeira vez usando a feature deve exibir a tela de disclosure de
// privacidade antes de qualquer pedido de permissão (obrigatório — seção 6
// do plano). Aqui validamos que escolher um resultado de busca e confirmar
// dispara a disclosure quando ela ainda não foi vista neste dispositivo.
test("confirmar um local pela 1a vez exibe a tela de disclosure de privacidade", async ({ page }) => {
  await openAppSkippingSplash(page);

  // Intercepta a busca de endereço (Nominatim) para não depender de rede real.
  await page.route("https://nominatim.openstreetmap.org/**", function (route) {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ display_name: "Rua Teste, 123 - Cidade Teste", lat: "-23.55", lon: "-46.63" }])
    });
  });

  await page.locator("#editFab").click();
  const firstRow = page.locator("#editRows .edit-row").first();
  await firstRow.locator(".place-toggle-btn").click();

  const panel = firstRow.locator(".place-panel");
  await panel.locator('input[type="text"]').fill("Rua Teste");
  await panel.locator(".place-result-item", { hasText: "Rua Teste, 123 - Cidade Teste" }).click();

  await panel.locator("button", { hasText: "Confirmar local" }).click();

  await expect(page.locator("#placesPrivacyOverlay")).toHaveClass(/show/);
  await expect(page.locator("#placesPrivacyTitle")).toHaveText("Lembretes por lugar");
});
