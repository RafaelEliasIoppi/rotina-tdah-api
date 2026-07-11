import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Runner de migrations simples e idempotente.
 * - Garante a tabela schema_migrations.
 * - Aplica, em ordem alfabética, os arquivos .sql ainda não registrados.
 * - Cada arquivo roda dentro de sua própria transação; falha => rollback.
 */
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] aplicando ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha na migration ${file}: ${err.message}`);
      }
    }

    if (count === 0) {
      console.log('[migrate] nenhuma migration pendente.');
    } else {
      console.log(`[migrate] ${count} migration(s) aplicada(s).`);
    }
  } finally {
    client.release();
  }
}

// Executa quando chamado diretamente (npm run migrate).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] erro:', err.message);
      process.exit(1);
    });
}

export default runMigrations;
