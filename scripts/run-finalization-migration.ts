/**
 * Check + apply supabase/migrations/20261026_finalization_schema_gaps.sql
 * Idempotent. Usage: npx tsx scripts/run-finalization-migration.ts
 */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function columnExists(client: any, table: string, column: string) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rowCount > 0;
}

async function tableExists(client: any, table: string) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return r.rowCount > 0;
}

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  if (!connectionString) {
    throw new Error('DATABASE_URL missing');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 25000,
  });
  const client = await pool.connect();

  try {
    console.log('=== Pre-check ===');
    const before = {
      coupons_used_count: await columnExists(client, 'coupons', 'used_count'),
      events_rejection_reason: await columnExists(client, 'events', 'rejection_reason'),
      users_avatar_url: await columnExists(client, 'users', 'avatar_url'),
      event_reviews: await tableExists(client, 'event_reviews'),
    };
    console.log(JSON.stringify(before, null, 2));

    const needsRun = Object.values(before).some((v) => !v);
    if (!needsRun) {
      console.log('All gaps already present. Migration SQL is a no-op (already applied).');
    } else {
      console.log('Applying 20261026_finalization_schema_gaps.sql ...');
      const sqlPath = path.resolve(
        'supabase/migrations/20261026_finalization_schema_gaps.sql'
      );
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('Migration applied OK.');
    }

    console.log('=== Post-check ===');
    const after = {
      coupons_used_count: await columnExists(client, 'coupons', 'used_count'),
      events_rejection_reason: await columnExists(client, 'events', 'rejection_reason'),
      users_avatar_url: await columnExists(client, 'users', 'avatar_url'),
      event_reviews: await tableExists(client, 'event_reviews'),
    };
    console.log(JSON.stringify(after, null, 2));

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM venues) AS venues,
        (SELECT COUNT(*)::int FROM events) AS events,
        (SELECT COUNT(*)::int FROM event_sessions) AS sessions,
        (SELECT COUNT(*)::int FROM seats) AS seats,
        (SELECT COUNT(*)::int FROM event_reviews) AS reviews
    `);
    console.log('Catalog counts:', counts.rows[0]);

    const allOk = Object.values(after).every(Boolean);
    if (!allOk) {
      throw new Error('Post-check failed — some objects still missing');
    }
    console.log('SUCCESS: schema gaps verified.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
