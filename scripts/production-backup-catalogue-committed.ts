/**
 * Creates theatre_backup_<stamp> row snapshots and COMMITs (outside reset TX).
 * Never deletes. Never copies app_secrets.
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

function quote(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad ${name}`);
  return `"${name}"`;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const schema = `theatre_backup_${stamp}`;
  const tables = [
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
    'event_reviews',
    'event_images',
    'users',
    'organizers',
    'districts',
    'talukas',
    'cities',
  ];

  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const c = await p.connect();
  try {
    await c.query('BEGIN');
    await c.query(`CREATE SCHEMA ${quote(schema)}`);
    await c.query(
      `CREATE TABLE ${quote(schema)}.meta (backed_up_at timestamptz DEFAULT now(), note text)`
    );
    await c.query(`INSERT INTO ${quote(schema)}.meta (note) VALUES ($1)`, [
      'Pre-clear committed snapshot for MahaTicket test catalogue wipe',
    ]);
    for (const t of tables) {
      await c.query(
        `CREATE TABLE ${quote(schema)}.${quote(t)} AS TABLE public.${quote(t)}`
      );
    }
    await c.query('COMMIT');
    console.log(JSON.stringify({ status: 'COMMITTED_BACKUP', schema, tables }, null, 2));
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
