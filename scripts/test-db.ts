import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  console.log('using DATABASE_URL', Boolean(url));
  const p = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await p.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS trailer_url text;');
  await p.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_urls text;');
  const r = await p.query('select count(*)::int as n from events');
  console.log('events count:', r.rows[0]);
  await p.end();
}

main().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
