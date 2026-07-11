// Copia ferramentas/rotina_tdah.html (fonte da verdade) para www/index.html.
// A integração com @capacitor/local-notifications já foi mesclada manualmente
// em www/index.html; ao rodar este script após editar o arquivo original,
// reaplique manualmente as mudanças de alarme nativo (bloco "Notifications / Alarms").
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'ferramentas', 'rotina_tdah.html');
const dest = path.join(__dirname, '..', 'www', 'index.html');

if (!fs.existsSync(src)) {
  console.error('Fonte não encontrada:', src);
  process.exit(1);
}

console.log('Aviso: este script copia o HTML base, mas NÃO reaplica automaticamente');
console.log('a integração de alarmes nativos (LocalNotifications) — isso precisa ser');
console.log('mesclado manualmente em www/index.html após copiar mudanças novas.');
fs.copyFileSync(src, dest);
console.log('Copiado para', dest);
