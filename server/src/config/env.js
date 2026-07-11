import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Carrega o .env (silencioso se não existir; em testes/CI as vars podem vir do ambiente).
loadDotenv();

// No MVP da Fase 0 apenas DATABASE_URL e PORT são obrigatórias.
// Os segredos de auth (JWT_*, GOOGLE_CLIENT_ID) serão exigidos em fases futuras.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  // Ativa SSL no pool (necessário para Neon). Aceita "true"/"false"/"1"/"0".
  DB_SSL: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  // Segredos de autenticação — obrigatórios a partir da Fase 1.
  // Exigimos comprimento mínimo para evitar segredos triviais em produção.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET deve ter ao menos 16 caracteres'),
  // Access token curto (15 min por padrão) e refresh de ~30 dias.
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Opcional: se ausente, POST /auth/google responde 501 (não quebra o boot).
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),

  // Origens permitidas no CORS (lista separada por vírgula).
  // Ausente/vazio → CORS permissivo (reflete qualquer origem), conveniente em dev.
  // Setado → apenas as origens listadas são aceitas (recomendado em produção).
  // Ex.: CORS_ORIGIN=https://meu-app.com,https://www.meu-app.com
  CORS_ORIGIN: z.string().optional(),

  // Stripe — necessário para módulo de pagamentos
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PREMIUM_PRICE_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Falha rápido com mensagem clara listando cada variável problemática.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('\n');
  console.error(`\n[config] Variáveis de ambiente inválidas:\n${issues}\n`);
  throw new Error('Configuração de ambiente inválida. Verifique seu .env (veja .env.example).');
}

export const env = parsed.data;
export default env;
