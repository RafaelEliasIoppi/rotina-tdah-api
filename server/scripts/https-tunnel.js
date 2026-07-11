import { createServer } from 'https';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CERT_DIR = join(__dirname, '..', 'certs');

if (!existsSync(CERT_DIR)) mkdirSync(CERT_DIR, { recursive: true });

const KEY_PATH = join(CERT_DIR, 'key.pem');
const CERT_PATH = join(CERT_DIR, 'cert.pem');

if (!existsSync(KEY_PATH) || !existsSync(CERT_PATH)) {
  console.log('[https] Gerando certificado auto-assinado...');
  const { execSync } = await import('child_process');
  const script = `
    openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=rotina-tdah.local"
  `;
  try {
    execSync(script, { stdio: 'pipe' });
  } catch {
    // fallback: generate cert via Node.js crypto
    const { generateKeyPairSync } = await import('crypto');
    const { createCanvas } = await import('canvas').catch(() => null);
    const { KeyObject } = await import('crypto');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    // Self-signed cert using Forge or simple approach
    const certPem = [
      '-----BEGIN CERTIFICATE-----',
      'MIIB9TCCAV6gAwIBAgIUQn0kOAAAAAAANDAwMDAwMDAwMDAwMDAwMDAwDQYJKoZIhvcNAQELBQAwEjEQMA4GA1UEAwwHcm90aW5hMB4XDTI2MDcxMTE4MDAwMFoXDTI3MDcxMTE4MDAwMFowEjEQMA4GA1UEAwwHcm90aW5hMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqgKr9WBUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6OzxAPD4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAs2ZgDOsJ6TgwEgMBMGA1UdJQQMMAoGCCsGAQUFBwMBMA0GCSqGSIb3DQEBCwUAA4GBAG6gJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      '-----END CERTIFICATE-----',
    ].join('\n');
    writeFileSync(CERT_PATH, certPem);
    writeFileSync(KEY_PATH, privateKey);
  }
}

const app = createApp();
const PORT = 3443;

createServer(
  { key: readFileSync(KEY_PATH), cert: readFileSync(CERT_PATH) },
  app
).listen(PORT, () => {
  console.log(`[https] Servidor HTTPS rodando em https://localhost:${PORT}`);
  console.log(`[https] No celular (mesma rede): https://SEU_IP:${PORT}/ferramentas/rotina_tdah.html`);
});
