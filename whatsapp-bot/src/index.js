import 'dotenv/config';
import { createApiClient } from './apiClient.js';
import { createRemindersSync } from './remindersSync.js';
import { createScheduler } from './scheduler.js';
import { createWhatsAppClient } from './whatsapp.js';

const API_BASE =
  process.env.API_BASE || 'https://rotina-tdah-api.onrender.com';
const BOT_EMAIL = process.env.BOT_EMAIL;
const BOT_PASSWORD = process.env.BOT_PASSWORD;
const WHATSAPP_TARGET_JID = process.env.WHATSAPP_TARGET_JID || null;

if (!BOT_EMAIL || !BOT_PASSWORD) {
  console.error(
    '[index] BOT_EMAIL e BOT_PASSWORD são obrigatórios no .env',
  );
  process.exit(1);
}

async function main() {
  console.log('[index] Iniciando WhatsApp Bot - Rotina TDAH');
  console.log('[index] API:', API_BASE);

  const apiClient = createApiClient({
    apiBase: API_BASE,
    email: BOT_EMAIL,
    password: BOT_PASSWORD,
  });

  try {
    await apiClient.ensureAuthenticated();
    console.log('[index] Autenticado na API');
  } catch (err) {
    console.error('[index] Falha na autenticação:', err.message);
    process.exit(1);
  }

  let sendReminder;
  try {
    const whatsapp = await createWhatsAppClient({
      targetJid: WHATSAPP_TARGET_JID,
    });
    sendReminder = whatsapp.sendReminder;
    console.log('[index] Cliente WhatsApp pronto');
  } catch (err) {
    console.error('[index] Falha ao conectar WhatsApp:', err.message);
    process.exit(1);
  }

  const remindersSync = createRemindersSync(apiClient);
  remindersSync.start();
  console.log('[index] Sincronizador de lembretes iniciado');

  const scheduler = createScheduler(remindersSync, sendReminder);
  scheduler.start();
  console.log('[index] Bot rodando. Ctrl+C para parar.');

  function shutdown() {
    console.log('\n[index] Parando...');
    scheduler.stop();
    remindersSync.stop();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[index] Erro fatal:', err);
  process.exit(1);
});
