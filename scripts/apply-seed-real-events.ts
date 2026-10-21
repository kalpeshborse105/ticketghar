import { config } from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

config({ override: true });

function getCleanUrl(): string {
  return (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function main() {
  const pool = new pg.Pool({
    connectionString: getCleanUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  const client = await pool.connect();
  try {
    const sqlPath = path.join(process.cwd(), 'seed_real_events_movies_plays.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing seed_real_events_movies_plays.sql against database...');
    const res = await client.query(sqlContent);
    console.log('Seed executed successfully!');

    // Run verification query
    const verifySql = `
      SELECT 
        e.id, 
        e.title, 
        e.category, 
        v.name AS venue_name,
        COUNT(DISTINCT es.id) AS future_sessions,
        COUNT(DISTINCT si.id) AS total_inventory_seats,
        SUM(CASE WHEN si.status = 'available' THEN 1 ELSE 0 END) AS available_seats,
        SUM(CASE WHEN si.status = 'booked' THEN 1 ELSE 0 END) AS booked_seats
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      LEFT JOIN event_sessions es ON es.event_id = e.id
      LEFT JOIN seat_inventory si ON si.session_id = es.id
      WHERE e.slug IN (
        'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
        'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
        'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
        'ghashiram-kotwal', 'vasantotsav-2026'
      )
      GROUP BY e.id, e.title, e.category, v.name
      ORDER BY e.category, e.title;
    `;
    const verifyRes = await client.query(verifySql);
    console.table(verifyRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Execution error:', e);
  process.exit(1);
});
