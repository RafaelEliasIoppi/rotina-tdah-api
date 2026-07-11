// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Config mínima para a suíte E2E do app "Rotina TDAH".
 *
 * O app (www/index.html) é um front-end estático offline-first: os 4 fluxos
 * cobertos por esta suíte (toggle de tarefa, streak, modo sem login, splash)
 * funcionam 100% via localStorage, sem depender do backend. Por isso os testes
 * servem apenas a pasta www/ estaticamente (via `npx serve`), sem subir o
 * servidor Node (server/).
 */
module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx serve www -l 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
