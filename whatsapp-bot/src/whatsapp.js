import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(__dirname, '..', 'state', 'wa-auth');

export async function createWhatsAppClient({ targetJid }) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let currentSock = null;
  let isConnected = false;

  function ensureStateDir() {
    if (!existsSync(AUTH_DIR)) {
      mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  function onConnectionUpdate({ connection, lastDisconnect, qr }) {
    if (qr) {
      console.log('\n╔═══════════════════════════════════════════════╗');
      console.log('║  ESCANEIE O QR CODE ACIMA COM O WHATSAPP     ║');
      console.log('║  WhatsApp > ⋮ > Dispositivos conectados     ║');
      console.log('╚═══════════════════════════════════════════════╝\n');
    }

    if (connection === 'open') {
      isConnected = true;
      console.log(
        '[whatsapp] Conectado! JID:',
        currentSock?.user?.id,
      );
    }

    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('[whatsapp] Conexão perdida, reconectando em 5s...');
        setTimeout(createSocket, 5000);
      } else {
        console.log(
          '[whatsapp] Sessão encerrada (logout).',
          'Delete state/wa-auth/ e reinicie para escanear QR novamente.',
        );
      }
    }
  }

  function createSocket() {
    ensureStateDir();
    currentSock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    currentSock.ev.on('creds.update', saveCreds);
    currentSock.ev.on('connection.update', onConnectionUpdate);
    currentSock.ev.on('messages.upsert', () => {});
  }

  createSocket();

  await new Promise((resolve) => {
    const check = () => {
      if (currentSock?.user?.id) {
        isConnected = true;
        resolve();
      } else {
        setTimeout(check, 500);
      }
    };

    const onUpdate = ({ connection }) => {
      if (connection === 'open') {
        currentSock.ev.off('connection.update', onUpdate);
        resolve();
      }
    };

    currentSock.ev.on('connection.update', onUpdate);
    setTimeout(check, 1000);

    setTimeout(() => {
      currentSock.ev.off('connection.update', onUpdate);
      console.log(
        '[whatsapp] Aguardando QR code... (timeout 2min para primeira conexão)',
      );
      resolve();
    }, 120000);
  });

  async function sendReminder(label, time) {
    if (!currentSock) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = targetJid || currentSock.user?.id;
    if (!jid) {
      throw new Error(
        'JID de destino não disponível. Defina WHATSAPP_TARGET_JID no .env',
      );
    }

    const cleanJid = jid.includes(':') ? jid.split(':')[0] + '@s.whatsapp.net' : jid;

    const message = `⏰ *Lembrete TDAH*\n\n_${label}_\n🕐 ${time}`;
    await currentSock.sendMessage(cleanJid, { text: message });
    console.log(`[whatsapp] ✅ "${label}" às ${time} → ${cleanJid}`);
  }

  return { sendReminder };
}
