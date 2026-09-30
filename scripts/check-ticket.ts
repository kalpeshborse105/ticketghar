import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const r = await p.query(`select ticket_code, length(qr_payload) as len, left(qr_payload,120) as q from tickets where ticket_code='MT-TK-88192-A1'`);
  console.log(r.rows);
  await p.end();
}

main();
