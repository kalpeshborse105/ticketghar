import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  const client = await pool.connect();
  try {
    const checks = await client.query(`
      SELECT t.relname as table_name, c.conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'events' AND c.contype = 'c';
    `);
    console.log('Events check constraints:');
    console.table(checks.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
