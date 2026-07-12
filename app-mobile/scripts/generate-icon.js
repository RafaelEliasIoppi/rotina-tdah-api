// Gera os PNGs do ícone do app (ic_launcher, ic_launcher_round,
// ic_launcher_foreground) em todas as densidades Android, a partir de
// scripts/icon-source.svg, usando Playwright para renderizar o SVG (mesma
// técnica já usada em capture-feature-graphic.js, sem dependência de
// ferramentas externas como resvg).

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const SVG_PATH = path.join(__dirname, "icon-source.svg");
const FOREGROUND_SVG_PATH = path.join(__dirname, "icon-foreground-source.svg");
const RES_DIR = path.join(__dirname, "..", "android", "app", "src", "main", "res");

// Tamanhos padrão do ic_launcher por densidade (px).
const DENSITIES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function renderSvgToPng(page, svg, size, outPath, transparent) {
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent;}
    body{width:${size}px;height:${size}px;}
  </style></head><body>${svg}</body></html>`;
  const tmpPath = path.join(__dirname, "_icon_render_tmp.html");
  fs.writeFileSync(tmpPath, html);
  await page.setViewportSize({ width: size, height: size });
  await page.goto("file://" + tmpPath.replace(/\\/g, "/"));
  await page.screenshot({ path: outPath, omitBackground: !!transparent });
  fs.unlinkSync(tmpPath);
}

async function main() {
  const svgRaw = fs.readFileSync(SVG_PATH, "utf8");
  const fgSvgRaw = fs.readFileSync(FOREGROUND_SVG_PATH, "utf8");
  const svgSized = (raw, size) => raw.replace("<svg ", `<svg width="${size}" height="${size}" `);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const [dir, size] of Object.entries(DENSITIES)) {
    const targetDir = path.join(RES_DIR, dir);
    fs.mkdirSync(targetDir, { recursive: true });
    await renderSvgToPng(page, svgSized(svgRaw, size), size, path.join(targetDir, "ic_launcher.png"), false);
    await renderSvgToPng(page, svgSized(svgRaw, size), size, path.join(targetDir, "ic_launcher_round.png"), false);
    await renderSvgToPng(page, svgSized(fgSvgRaw, size), size, path.join(targetDir, "ic_launcher_foreground.png"), true);
    console.log("Gerado:", dir, size + "px");
  }

  // Ícone 512x512 para a ficha da Play Store (play-store-assets/).
  const playStoreIconPath = path.join(__dirname, "..", "play-store-assets", "icone-512.png");
  await renderSvgToPng(page, svgSized(svgRaw, 512), 512, playStoreIconPath, false);
  console.log("Gerado: play-store-assets/icone-512.png 512px");

  await browser.close();
  console.log("Ícone atualizado em todas as densidades.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
