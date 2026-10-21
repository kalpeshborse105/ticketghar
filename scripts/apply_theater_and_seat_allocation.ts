import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function run() {
  const connString = getConnectionString();
  if (!connString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  console.log('--- Connecting to database ---');
  const client = await pool.connect();

  try {
    // 1. Run 01_theater_design_500_seats.sql
    console.log('\n======================================================');
    console.log('Executing 01_theater_design_500_seats.sql...');
    console.log('======================================================');
    const sql1Path = path.join(__dirname, '01_theater_design_500_seats.sql');
    const sql1 = fs.readFileSync(sql1Path, 'utf8');
    await client.query(sql1);
    console.log('✓ 01_theater_design_500_seats.sql executed successfully!');

    // Verify seats count
    const seatsRes = await client.query('SELECT count(*) FROM public.seats WHERE venue_id = 1');
    console.log(`✓ Physical seats in Venue 1 (Bal Gandharva): ${seatsRes.rows[0].count} (Expected: 500)`);

    // 2. Run 02_allocate_seats_all_events.sql
    console.log('\n======================================================');
    console.log('Executing 02_allocate_seats_all_events.sql...');
    console.log('======================================================');
    const sql2Path = path.join(__dirname, '02_allocate_seats_all_events.sql');
    const sql2 = fs.readFileSync(sql2Path, 'utf8');
    await client.query(sql2);
    console.log('✓ 02_allocate_seats_all_events.sql executed successfully!');

    // Verify session inventory
    const invRes = await client.query(`
      SELECT
        es.id AS session_id,
        e.title AS event_title,
        to_char(es.session_start_time, 'YYYY-MM-DD HH24:MI') AS showtime,
        COUNT(si.id) AS total_seats,
        COUNT(CASE WHEN si.status = 'available' THEN 1 END) AS available_seats
      FROM public.event_sessions es
      JOIN public.events e ON es.event_id = e.id
      LEFT JOIN public.seat_inventory si ON si.session_id = es.id
      WHERE e.venue_id = 1
      GROUP BY es.id, e.title, es.session_start_time
      ORDER BY es.session_start_time
    `);
    console.log('\n--- Session Inventory Verification ---');
    console.table(invRes.rows);

  } catch (err) {
    console.error('Error executing scripts:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
