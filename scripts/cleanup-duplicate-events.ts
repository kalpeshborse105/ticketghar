import 'dotenv/config';
import { pool } from '../src/db';

async function main() {
  console.log('--- Cleaning Up Duplicate Database Events ---');

  // 1. Merge Ghashiram Kotwal: reassign all sessions and ticket_types from 17, 25 to 10
  console.log('Merging Ghashiram Kotwal (IDs 17, 25 -> 10)...');
  await pool.query('UPDATE event_sessions SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('UPDATE ticket_types SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('UPDATE orders SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('UPDATE coupons SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('UPDATE event_reviews SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('UPDATE event_images SET event_id = 10 WHERE event_id IN (17, 25)');
  await pool.query('DELETE FROM events WHERE id IN (17, 25)');
  console.log('✓ Ghashiram Kotwal merged into ID 10 successfully.');

  // 2. Merge Punha Sahi Re Sahi: reassign from 24 to 9
  console.log('Merging Punha Sahi Re Sahi (ID 24 -> 9)...');
  await pool.query('UPDATE event_sessions SET event_id = 9 WHERE event_id = 24');
  await pool.query('UPDATE ticket_types SET event_id = 9 WHERE event_id = 24');
  await pool.query('UPDATE orders SET event_id = 9 WHERE event_id = 24');
  await pool.query('UPDATE coupons SET event_id = 9 WHERE event_id = 24');
  await pool.query('UPDATE event_reviews SET event_id = 9 WHERE event_id = 24');
  await pool.query('UPDATE event_images SET event_id = 9 WHERE event_id = 24');
  await pool.query('DELETE FROM events WHERE id = 24');
  console.log('✓ Punha Sahi Re Sahi merged into ID 9 successfully.');

  // Verify
  const ghashCheck = await pool.query("SELECT id, title, slug, venue_id FROM events WHERE title ILIKE '%ghash%' OR title ILIKE '%घाशी%'");
  console.log('Remaining Ghash events:', ghashCheck.rows);

  const ghashSessions = await pool.query("SELECT id, event_id, session_start_time, status FROM event_sessions WHERE event_id = 10 ORDER BY session_start_time");
  console.log('Ghashiram Kotwal (ID 10) total sessions:', ghashSessions.rows.length);
  ghashSessions.rows.forEach(s => {
    console.log(`  Session ID ${s.id} -> ${s.session_start_time}`);
  });

  process.exit(0);
}

main().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
