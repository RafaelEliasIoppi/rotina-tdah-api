// Gera o feature graphic (1024x500) exigido pela ficha da Play Store,
// renderizando um HTML estático via Playwright e tirando um screenshot exato
// das dimensões pedidas pelo Google.
//
// Uso: node scripts/capture-feature-graphic.js

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "play-store-assets");
const HTML_PATH = path.join(__dirname, "capture-feature-graphic.html");
const ICON_PATH = path.join(OUT_DIR, "icone-512.png");

async function main() {
  const iconBase64 = fs.readFileSync(ICON_PATH).toString("base64");
  const html = fs
    .readFileSync(HTML_PATH, "utf8")
    .replace("ICON_DATA_URI", "data:image/png;base64," + iconBase64);

  const tmpHtmlPath = path.join(__dirname, "_feature-graphic-tmp.html");
  fs.writeFileSync(tmpHtmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto("file://" + tmpHtmlPath.replace(/\\/g, "/"));
  await page.screenshot({ path: path.join(OUT_DIR, "feature-graphic.png") });
  await browser.close();

  fs.unlinkSync(tmpHtmlPath);
  console.log("Feature graphic salvo em:", path.join(OUT_DIR, "feature-graphic.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
