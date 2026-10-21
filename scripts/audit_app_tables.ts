/**
 * Audit live DB tables vs MahaTicket drizzle app schema.
 * Does NOT drop anything unless --purge-legacy is passed.
 */
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/** Tables the Next/Android booking app actually uses (drizzle + geo) */
const APP_TABLES = new Set([
  'users',
  'organizers',
  'districts',
  'talukas',
  'cities',
  'venues',
  'venue_sections',
  'seats',
  'events',
  'event_sessions',
  'ticket_types',
  'seat_inventory',
  'orders',
  'tickets',
  'coupons',
  'announcements',
  'audit_logs',
  'device_tokens',
  'notification_log',
  'partner_leads',
  'settlements',
  'ticket_scans',
]);

/** Clearly leftover from UUID-era / unused by this app */
const LEGACY_SAFE_DROP = [
  'legacy_events_uuid',
  'legacy_bookings_uuid',
  'legacy_tickets_uuid',
  'legacy_shows_uuid',
  'organizer_clients',
  'organizer_theater_assignments',
  'theaters',
  'profiles',
];

async function main() {
  const purge = process.argv.includes('--purge-legacy');
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    const tables = await c.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema='public' and table_type='BASE TABLE' order by 1`
    );
    const names = tables.rows.map((r) => r.table_name);
    const unknown = names.filter((n) => !APP_TABLES.has(n) && !n.startsWith('pg_'));
    const missing = [...APP_TABLES].filter((n) => !names.includes(n));

    console.log('=== LIVE TABLES ===');
    for (const n of names) {
      const cnt = await c.query(`select count(*)::int as n from "${n}"`);
      const tag = APP_TABLES.has(n) ? 'APP' : LEGACY_SAFE_DROP.includes(n) ? 'LEGACY' : 'OTHER';
      console.log(`${tag.padEnd(7)} ${n.padEnd(36)} rows=${cnt.rows[0].n}`);
    }

    console.log('\nMissing app tables:', missing.length ? missing.join(', ') : '(none)');
    console.log('Non-app tables:', unknown.join(', ') || '(none)');

    // Spot-check critical columns
    const colChecks: Array<[string, string[]]> = [
      ['events', ['id', 'title', 'title_mr', 'venue_id', 'trailer_url', 'tag']],
      ['venues', ['id', 'name', 'name_mr', 'city', 'district_id']],
      ['event_sessions', ['id', 'event_id', 'session_start_time']],
      ['seat_inventory', ['session_id', 'seat_id', 'status', 'ticket_type_id']],
      ['ticket_types', ['id', 'session_id', 'price']],
      ['orders', ['order_number', 'grand_total', 'payment_status']],
      ['districts', ['code', 'name', 'name_mr']],
    ];
    console.log('\n=== COLUMN CHECKS ===');
    for (const [table, cols] of colChecks) {
      if (!names.includes(table)) {
        console.log(`SKIP ${table} (missing)`);
        continue;
      }
      const existing = await c.query(
        `select column_name from information_schema.columns where table_schema='public' and table_name=$1`,
        [table]
      );
      const set = new Set(existing.rows.map((r: { column_name: string }) => r.column_name));
      const bad = cols.filter((x) => !set.has(x));
      console.log(bad.length ? `FAIL ${table}: missing ${bad.join(', ')}` : `OK   ${table}`);
    }

    if (purge) {
      console.log('\n=== PURGING LEGACY (unused by MahaTicket app) ===');
      for (const t of LEGACY_SAFE_DROP) {
        if (!names.includes(t)) continue;
        await c.query(`DROP TABLE IF EXISTS public."${t}" CASCADE`);
        console.log('dropped', t);
      }
    } else {
      console.log('\n(dry-run) Re-run with --purge-legacy to drop LEGACY tables only.');
    }
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
