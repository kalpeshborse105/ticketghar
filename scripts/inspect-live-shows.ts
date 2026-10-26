import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });
const url = (process.env.DATABASE_URL || '')
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

async function main() {
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const rows = await p.query(`
    SELECT e.id, e.title, e.status, e.venue_id, v.name AS venue, v.city,
           s.id AS session_id, s.session_start_time, s.session_end_time, s.status AS sess_status
    FROM events e
    LEFT JOIN venues v ON v.id = e.venue_id
    LEFT JOIN event_sessions s ON s.event_id = e.id
    WHERE e.id IN (93, 94)
    ORDER BY e.id, s.session_start_time
  `);
  console.log(JSON.stringify(rows.rows, null, 2));
  await p.end();
}
main();
