import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

// SSL condicional: Neon e a maioria dos Postgres gerenciados exigem SSL.
// Para o Postgres local do Docker, DB_SSL=false desliga.
const ssl = env.DB_SSL ? { rejectUnauthorized: false } : false;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl,
});

// Evita derrubar o processo por erros ociosos do pool (ex.: perda de conexão).
pool.on('error', (err) => {
  console.error('[db] erro inesperado em cliente ocioso do pool:', err.message);
});

/**
 * Verifica a saúde da conexão executando SELECT 1.
 * Retorna true/false sem lançar — usado pelo /health para degradar graciosamente.
 */
export async function checkDbHealth() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export default pool;
