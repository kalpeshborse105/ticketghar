/**
 * Create demo published events on existing MH venues with sessions + seat inventory.
 * Run: npx tsx scripts/seed-demo-events.ts
 */
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SHOWS = [
  { title: 'Punha Sahi Re Sahi', titleMr: 'पुन्हा सही रे सही', category: 'plays', categoryMr: 'नाटक', city: 'Pune' },
  { title: 'Ghashiram Kotwal', titleMr: 'घाशीराम कोतवाल', category: 'plays', categoryMr: 'नाटक', city: 'Pune' },
  { title: 'Sur Nava Dhyas Nava', titleMr: 'सूर नवा ध्यास नवा', category: 'music', categoryMr: 'संगीत', city: 'Mumbai' },
  { title: 'Aai Shapath', titleMr: 'आई शपथ', category: 'comedy', categoryMr: 'कॉमेडी', city: 'Pune' },
  { title: 'Lavani Vaibhav', titleMr: 'लावणी वैभव', category: 'cultural', categoryMr: 'सांस्कृतिक', city: 'Kolhapur' },
  { title: 'Warli Art Workshop', titleMr: 'वारली चित्रकला कार्यशाळा', category: 'workshops', categoryMr: 'कार्यशाळा', city: 'Thane' },
  { title: 'Sairat Echoes', titleMr: 'सैराट इकोज', category: 'music', categoryMr: 'संगीत', city: 'Sangli' },
  { title: 'Nashik Grape Harvest Night', titleMr: 'नाशिक द्राक्ष काढणी रात्र', category: 'music', categoryMr: 'संगीत', city: 'Nashik' },
];

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const c = await pool.connect();

  try {
    let org = await c.query(`SELECT id FROM organizers ORDER BY id LIMIT 1`);
    if (!org.rows[0]) {
      org = await c.query(`
        INSERT INTO organizers (name, company_name, email, phone, city, verification_status)
        VALUES ('MahaTicket Demo', 'MahaTicket Demo Org', 'demo@mahaticket.in', '+919820012345', 'Pune', 'verified')
        RETURNING id
      `);
    }
    const organizerId = org.rows[0].id;

    const existing = await c.query(`SELECT count(*)::int AS n FROM events`);
    if (existing.rows[0].n > 0) {
      console.log('Events already exist:', existing.rows[0].n);
      return;
    }

    let created = 0;
    for (const show of SHOWS) {
      const venue = await c.query(
        `SELECT id FROM venues WHERE city ILIKE $1 ORDER BY id LIMIT 1`,
        [show.city]
      );
      const venueId = venue.rows[0]?.id || (await c.query(`SELECT id FROM venues ORDER BY id LIMIT 1`)).rows[0].id;

      const slug =
        show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
        `-${Date.now()}-${created}`;

      const ev = await c.query(
        `INSERT INTO events (
           organizer_id, venue_id, title, title_mr, slug, category, category_mr,
           language, description, description_mr, poster_url, status, featured
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'Marathi',$8,$9,$10,'published',$11)
         RETURNING id`,
        [
          organizerId,
          venueId,
          show.title,
          show.titleMr,
          slug,
          show.category,
          show.categoryMr,
          `${show.title} — live on MahaTicket`,
          `${show.titleMr} — महाटिकिटवर थेट`,
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
          created < 3 ? 1 : 0,
        ]
      );
      const eventId = ev.rows[0].id;

      // Two showtimes: Sat & Sun evening
      for (const dayOffset of [1, 2]) {
        const start = new Date();
        start.setDate(start.getDate() + dayOffset);
        start.setHours(18, 30, 0, 0);
        const end = new Date(start.getTime() + 150 * 60000);
        const sess = await c.query(
          `INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
           VALUES ($1,$2,$3,'active') RETURNING id`,
          [eventId, start.toISOString(), end.toISOString()]
        );
        const { generateSessionInventory } = await import('../src/lib/inventory-engine.ts');
        await generateSessionInventory(sess.rows[0].id, venueId);
      }
      created++;
      console.log('Created', show.title, 'venue', venueId);
    }
    console.log('Done events=', created);
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
