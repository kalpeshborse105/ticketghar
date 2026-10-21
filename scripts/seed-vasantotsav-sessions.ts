import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });
const url = (process.env.DATABASE_URL || '').replace(/([?&])sslmode=[^&]*/gi, '$1').replace(/\?&/, '?').replace(/[?&]$/, '');
const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('Seeding sessions for Vasantotsav 2026 Live...');
  
  // Find event
  const evRes = await p.query("SELECT id, venue_id FROM events WHERE slug = 'vasantotsav-2026' OR title ILIKE '%vasantotsav%' LIMIT 1");
  if (evRes.rows.length === 0) {
    console.log('Vasantotsav event not found');
    await p.end();
    return;
  }
  const eventId = evRes.rows[0].id;
  const venueId = evRes.rows[0].venue_id || 1;
  console.log(`Found event ${eventId}, venue ${venueId}`);

  // Create 3 upcoming sessions for today, tomorrow, and day after tomorrow
  const sessions = [
    { offsetDays: 0, hours: 18, mins: 30, label: 'Today Evening' },
    { offsetDays: 1, hours: 18, mins: 30, label: 'Tomorrow Evening' },
    { offsetDays: 2, hours: 10, mins: 0, label: 'Sunday Morning' },
  ];

  for (const s of sessions) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + s.offsetDays);
    startTime.setHours(s.hours, s.mins, 0, 0);

    const endTime = new Date(startTime.getTime() + 3.5 * 3600 * 1000);

    // Insert session
    const sessRes = await p.query(
      `INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [eventId, startTime.toISOString(), endTime.toISOString()]
    );
    const sessionId = sessRes.rows[0].id;
    console.log(`Created session ${sessionId} on ${startTime.toISOString()}`);

    // Insert ticket types: Balcony ₹250, Stall ₹400, VIP ₹650
    const ticketTypes = [
      { name: 'Balcony', nameMr: 'बालकनी', price: 25000, quota: 100 },
      { name: 'Stall / Orchestra', nameMr: 'स्टॉल / ऑर्केस्ट्रा', price: 40000, quota: 120 },
      { name: 'VIP Front Row', nameMr: 'व्हीआयपी प्रथम श्रेणी', price: 65000, quota: 50 },
    ];

    for (const tt of ticketTypes) {
      await p.query(
        `INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $6, 1)`,
        [eventId, sessionId, tt.name, tt.nameMr, tt.price, tt.quota]
      );
    }
  }

  // Also clean duplicate reviews for event 49 by user kalpeshborse105 if any
  try {
    await p.query(`
      DELETE FROM event_reviews 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM event_reviews 
        GROUP BY event_id, user_email
      )
    `);
    console.log('Deduplicated existing reviews in database');
  } catch (err: any) {
    console.log('Deduplicate error (non-fatal):', err.message);
  }

  console.log('Vasantotsav 2026 successfully seeded with real upcoming sessions and tiered pricing!');
  await p.end();
}

run().catch((e) => {
  console.error('Error seeding:', e);
  process.exit(1);
});
