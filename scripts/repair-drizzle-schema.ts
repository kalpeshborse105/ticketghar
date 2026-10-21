/**
 * Repair mixed UUID/integer schema → pure MahaTicket drizzle schema.
 * Renames conflicting UUID tables, applies supabase/schema.sql, restores geo + theaters.
 */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const CONFLICT = ['events', 'venues', 'bookings', 'tickets', 'showtimes', 'profiles', 'seats'];

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
  const client = await pool.connect();

  try {
    for (const table of CONFLICT) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table]
      );
      if (!exists.rowCount) continue;

      const idType = await client.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 AND column_name='id'`,
        [table]
      );
      const dt = idType.rows[0]?.data_type;
      if (dt === 'uuid' || dt === 'text') {
        const legacy = `legacy_${table}_uuid2`;
        const legacyExists = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
          [legacy]
        );
        if (legacyExists.rowCount) {
          await client.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
          console.log('dropped conflicting', table);
        } else {
          await client.query(`ALTER TABLE public."${table}" RENAME TO "${legacy}"`);
          console.log('renamed', table, '→', legacy);
        }
      } else {
        console.log('keep', table, dt);
      }
    }

    // Also drop integer child tables that may reference old UUID parents wrongly
    for (const t of ['venue_sections', 'seat_inventory', 'ticket_types', 'event_sessions', 'orders']) {
      // keep if already integer and consistent — schema.sql uses IF NOT EXISTS
      console.log('ensure via schema:', t);
    }

    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('schema.sql applied');

    // seed.sql
    const seedSql = fs.readFileSync(path.resolve('supabase/seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('seed.sql applied');

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM districts) AS districts,
        (SELECT count(*)::int FROM venues) AS venues,
        (SELECT count(*)::int FROM events) AS events,
        (SELECT count(*)::int FROM event_sessions) AS sessions,
        (SELECT count(*)::int FROM seats) AS seats
    `);
    console.log('counts', counts.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
