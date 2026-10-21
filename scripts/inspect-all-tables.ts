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
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    const legacy = [
      'legacy_bookings_uuid2',
      'legacy_events_uuid2',
      'legacy_profiles_uuid2',
      'legacy_seats_uuid2',
      'legacy_showtimes_uuid2',
      'legacy_venues_uuid2'
    ];
    console.log('Legacy table row counts:');
    for (const t of legacy) {
      try {
        const r = await client.query(`SELECT count(*) FROM ${t}`);
        console.log(`${t}: ${r.rows[0].count} rows`);
      } catch (e: any) {
        console.log(`${t}: Error or does not exist (${e.message})`);
      }
    }

    // Check all active tables and their row counts
    const activeTables = [
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
      'ticket_scans',
      'settlements',
      'partner_leads',
      'audit_logs',
      'coupons',
      'announcements',
      'device_tokens',
      'notification_log',
      'event_reviews',
      'event_images',
      'home_sections'
    ];
    console.log('\nActive table row counts:');
    for (const t of activeTables) {
      try {
        const r = await client.query(`SELECT count(*) FROM ${t}`);
        console.log(`${t}: ${r.rows[0].count} rows`);
      } catch (e: any) {
        console.log(`${t}: Table missing! (${e.message})`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
