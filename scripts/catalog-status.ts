import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const s = await p.query(`
    SELECT
      (SELECT COUNT(*)::int FROM events WHERE status='published') AS published,
      (SELECT COUNT(*)::int FROM event_sessions s
         JOIN events e ON e.id=s.event_id
         WHERE e.status='published' AND s.session_start_time > NOW()) AS future_sessions,
      (SELECT COUNT(*)::int FROM events WHERE status='published' AND category='movies') AS movies,
      (SELECT COUNT(*)::int FROM events WHERE status='published' AND category='plays') AS plays
  `);
  console.log(s.rows[0]);
  const sample = await p.query(`
    SELECT id, title, category FROM events
    WHERE status='published' ORDER BY id DESC LIMIT 10
  `);
  console.log(sample.rows);
  await p.end();
}
main();
