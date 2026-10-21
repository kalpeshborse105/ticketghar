import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const raw = (process.env.DATABASE_URL || '')
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString: raw,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const ev = await pool.query('SELECT id, title FROM events LIMIT 1');
  const eventId = ev.rows[0].id;
  console.log('Testing for event:', eventId, ev.rows[0].title);

  const res = await pool.query(
    `INSERT INTO event_reviews (event_id, user_email, user_name, city, rating, comment, verified_attendance)
     VALUES ($1, $2, $3, $4, $5, $6, 1)
     RETURNING id, rating, comment`,
    [eventId, `reviewer_${Date.now()}@gmail.com`, 'अमोल शहाणे', 'पुणे', 5, 'खूपच सुरेख अनुभव. संगीत आणि संवाद अप्रतिम!']
  );
  console.log('Inserted review successfully:', res.rows[0]);

  const stats = await pool.query(
    `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as count
     FROM event_reviews
     WHERE event_id = $1`,
    [eventId]
  );
  console.log('Updated DB rating stats:', stats.rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
