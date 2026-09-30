/**
 * Apply supabase/schema.sql + seed.sql to the configured Postgres (Supabase).
 * Safe: does not DROP tables. Seed skips when events already exist.
 *
 * Usage: npx tsx scripts/apply-supabase.ts
 */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 20000,
      })
    : new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME || 'postgres',
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 20000,
      });

  const client = await pool.connect();
  try {
    const tables = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'events'
       ) AS exists`
    );
    const eventsExist = tables.rows[0]?.exists === true;

    if (!eventsExist) {
      console.log('Database empty (no events table). Applying schema.sql...');
    } else {
      console.log('Tables already exist. Applying schema.sql idempotently (IF NOT EXISTS)...');
    }

    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('schema.sql applied.');

    const seedSql = fs.readFileSync(path.resolve('supabase/seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('seed.sql applied (or skipped if data present).');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM events) AS events,
        (SELECT COUNT(*)::int FROM venues) AS venues,
        (SELECT COUNT(*)::int FROM cities) AS cities,
        (SELECT COUNT(*)::int FROM seat_inventory) AS seat_inventory,
        (SELECT COUNT(*)::int FROM users) AS users
    `);
    console.log('Counts:', counts.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('apply-supabase failed:', err.message);
  process.exit(1);
});
