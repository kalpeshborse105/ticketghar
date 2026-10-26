/**
 * Move Ramayan off placeholder Dhule Cultural Hall onto a real verified theatre.
 * Does not invent showtimes — only corrects venue FK + venue metadata.
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  const cinemas = await p.query(`
    SELECT id, name, city, verification_status
    FROM venues
    WHERE name ILIKE '%PVR%' OR name ILIKE '%Cinepolis%' OR name ILIKE '%INOX%'
    ORDER BY id
  `);
  console.log('cinemas', cinemas.rows);

  // Prefer a verified Pune civic hall over fake Dhule Cultural Hall
  const target = await p.query(`
    SELECT id, name, city FROM venues
    WHERE id = 3 OR (name ILIKE 'Yashwantrao Chavan Natyagruha' AND city ILIKE 'Pune')
    ORDER BY id LIMIT 1
  `);
  if (!target.rowCount) throw new Error('target venue missing');

  const before = await p.query(`SELECT id, title, venue_id FROM events WHERE id = 94`);
  console.log('before', before.rows);

  await p.query(`UPDATE events SET venue_id = $1 WHERE id = 94`, [target.rows[0].id]);

  const after = await p.query(`
    SELECT e.id, e.title, e.venue_id, v.name, v.city
    FROM events e JOIN venues v ON v.id = e.venue_id
    WHERE e.id = 94
  `);
  console.log('after', after.rows);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
