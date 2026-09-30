import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const r = await p.query(
    `UPDATE seat_inventory SET status='available', held_by_user_id=NULL, hold_expires_at=NULL WHERE status='held'`
  );
  console.log('released', r.rowCount);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
