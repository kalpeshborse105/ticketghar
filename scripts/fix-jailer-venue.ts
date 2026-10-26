import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await p.query(`UPDATE events SET venue_id = 5 WHERE id = 93`);
  const r = await p.query(`
    SELECT e.id, e.title, e.status, v.name, v.city
    FROM events e JOIN venues v ON v.id = e.venue_id
    WHERE e.status = 'published' OR e.id IN (93, 94)
    ORDER BY e.id
  `);
  console.log(r.rows);
  const vc = await p.query(`SELECT COUNT(*)::int AS n FROM venues`);
  console.log('venueCount', vc.rows[0].n);
  await p.end();
}
main();
