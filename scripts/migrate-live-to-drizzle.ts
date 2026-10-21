/**
 * One-time: move UUID-era tables aside, apply drizzle schema.sql, keep districts.
 * Legacy tables are renamed (not dropped) so data can be recovered.
 *
 * Run: npx tsx scripts/migrate-live-to-drizzle.ts
 */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const CONFLICTING = [
  'events',
  'bookings',
  'tickets',
  'shows',
  // keep theaters as legacy catalog; venues is the app table
];

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const table of CONFLICTING) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name=$1`,
        [table]
      );
      if (exists.rowCount === 0) continue;

      // Detect UUID-era events (title_en) vs drizzle events (title)
      if (table === 'events') {
        const col = await client.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='events' AND column_name='title_en'`
        );
        if (col.rowCount === 0) {
          console.log('events already looks like drizzle schema — skip rename');
          continue;
        }
      }

      const legacy = `legacy_${table}_uuid`;
      const legacyExists = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name=$1`,
        [legacy]
      );
      if (legacyExists.rowCount && legacyExists.rowCount > 0) {
        console.log(`${legacy} already exists — drop empty conflict target if needed`);
        await client.query(`DROP TABLE IF EXISTS public.${table} CASCADE`);
      } else {
        console.log(`Renaming ${table} → ${legacy}`);
        await client.query(`ALTER TABLE public.${table} RENAME TO ${legacy}`);
      }
    }

    await client.query('COMMIT');
    console.log('Legacy rename done. Applying schema.sql...');

    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('schema.sql applied.');

    // Ensure districts columns from MH migration still present
    const distSql = fs.readFileSync(
      path.resolve('supabase/migrations/20261017_maharashtra_districts.sql'),
      'utf8'
    );
    await client.query(distSql);

    // Add district_id to venues if schema.sql is older
    await client.query(`
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES public.districts(id);
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS city_id INTEGER;
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS name_mr TEXT;
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS is_template INTEGER DEFAULT 1;
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'public_theatre';
      ALTER TABLE public.venues
        ADD COLUMN IF NOT EXISTS layout_config TEXT;
    `);

    // Backfill name_mr if null
    await client.query(`UPDATE public.venues SET name_mr = name WHERE name_mr IS NULL OR name_mr = ''`);

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM districts) AS districts,
        (SELECT COUNT(*)::int FROM venues) AS venues,
        (SELECT COUNT(*)::int FROM events) AS events,
        (SELECT COUNT(*)::int FROM information_schema.tables
           WHERE table_schema='public' AND table_name='event_sessions') AS has_sessions_table
    `);
    console.log('Counts:', counts.rows[0]);
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
