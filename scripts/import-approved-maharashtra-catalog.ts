/**
 * Owner-approved catalog import (2026-10-26).
 *
 * - Imports pending Marathi plays as published (sessions + inventory)
 * - Expands movies across real Maharashtra cinema venues (PVR/Cinepolis)
 * - Expands TicketKhidkee-style natya across real civic theatres
 *
 * DOES NOT scrape BookMyShow or TicketKhidkee.
 *
 * Usage: npx tsx scripts/import-approved-maharashtra-catalog.ts
 */
import { config } from 'dotenv';
import path from 'path';
import { eq, and, sql } from 'drizzle-orm';

config({ path: path.resolve(process.cwd(), '.env'), override: true });

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now()}-${Math.floor(Math.random() * 999)}`
  );
}

function istLocal(date: string, hm: string, durationMin: number) {
  const start = new Date(`${date}T${hm}:00+05:30`);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return { start, end };
}

function ymdOffset(days: number) {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  ist.setUTCDate(ist.getUTCDate() + days);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PLAYS = [
  { title: 'Punha nakki bhetu', titleMr: 'पुन्हा नक्की भेटू', venue: 'Bal Gandharva Rang Mandir', city: 'Pune', date: '2026-10-31', time: '17:00', price: 30000 },
  { title: 'Subhedar Guest House', titleMr: 'सुभेदार गेस्ट हाऊस', venue: 'Bal Gandharva Rang Mandir', city: 'Pune', date: '2026-11-01', time: '12:30', price: 30000 },
  { title: 'SHIKAYLA GELO EK', titleMr: 'शिकायला गेलो एक', venue: 'Bal Gandharva Rang Mandir', city: 'Pune', date: '2026-11-13', time: '12:30', price: 40000 },
  { title: 'Sambhavami Yugey Yugey', titleMr: 'संभवामि युगे युगे', venue: 'Bal Gandharva Rang Mandir', city: 'Pune', date: '2026-11-16', time: '12:30', price: 50000 },
  { title: 'Katha Saptakachi', titleMr: 'कथा सप्ताकाची', venue: 'Yashwantrao Chavan Natyagruha', city: 'Pune', date: '2026-11-02', time: '21:30', price: 19900 },
  { title: 'Aamne Saamne - Marathi Play', titleMr: 'आमने सामने', venue: 'Ram Krishna More Auditorium', city: 'Pune', date: '2026-10-30', time: '21:30', price: 40000 },
  { title: 'All The Best', titleMr: 'ऑल द बेस्ट', venue: 'Bal Gandharva Rang Mandir', city: 'Pune', date: '2026-11-08', time: '19:30', price: 35000 },
  { title: 'Ekada Pahava Karun', titleMr: 'एकदा पहावा करून', venue: 'Bharat Natya Rang Mandir', city: 'Pune', date: '2026-11-09', time: '16:00', price: 40000 },
  { title: 'Sangeet Sharada', titleMr: 'संगीत शारदा', venue: 'Shivaji Mandir', city: 'Mumbai', date: '2026-11-07', time: '20:00', price: 45000 },
  { title: 'Natsamrat (Live Natya)', titleMr: 'नटसम्राट (लाइव्ह नाट्य)', venue: 'Ravindra Natya Mandir', city: 'Mumbai', date: '2026-11-14', time: '19:00', price: 50000 },
  { title: 'Lavani Vaibhav Night', titleMr: 'लावणी वैभव नाईट', venue: 'Shahu Smarak Bhavan', city: 'Kolhapur', date: '2026-11-15', time: '19:30', price: 30000 },
  { title: 'Sur Nava Dhyas Nava Live', titleMr: 'सूर नवा ध्यास नवा लाइव्ह', venue: 'Suresh Bhat Auditorium', city: 'Nagpur', date: '2026-11-10', time: '18:30', price: 40000 },
];

const MOVIES = [
  { title: 'Jailer 2', titleMr: 'जेलर २', lang: 'Tamil / Hindi' },
  { title: 'Ramayan', titleMr: 'रामायण', lang: 'Hindi' },
  { title: 'Pushpa 2: The Rule', titleMr: 'पुष्पा २', lang: 'Telugu / Hindi' },
  { title: 'Baipan Bhaari Deva 2', titleMr: 'बाइपं भारी देवा २', lang: 'Marathi' },
  { title: 'Juna Furniture', titleMr: 'जुना फर्निचर', lang: 'Marathi' },
  { title: 'Kantara: Chapter 1', titleMr: 'कांतारा: चॅप्टर १', lang: 'Kannada / Hindi' },
  { title: 'Chhaava', titleMr: 'छावा', lang: 'Hindi / Marathi' },
  { title: 'Saiyaara', titleMr: 'सैय्यारा', lang: 'Hindi' },
];

const POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3cf?auto=format&fit=crop&w=800&q=80';
const PLAY_POSTER =
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80';

async function main() {
  const { db } = await import('../src/db/index.ts');
  const { events, eventSessions, organizers, venues } = await import('../src/db/schema.ts');
  const { generateSessionInventory } = await import('../src/lib/inventory-engine.ts');

  console.log('=== MahaTicket approved catalog import (no BMS/TicketKhidkee scrape) ===');

  const [org] = await db.select().from(organizers).limit(1);
  if (!org) throw new Error('No organizer row');

  async function resolveVenue(name: string, city: string) {
    const [exact] = await db
      .select()
      .from(venues)
      .where(and(eq(venues.name, name), eq(venues.city, city)))
      .limit(1);
    if (exact) return exact;
    const rows = await db.execute(sql`
      SELECT * FROM venues
      WHERE lower(name) LIKE ${'%' + name.toLowerCase().slice(0, 16) + '%'}
        AND lower(city) LIKE ${'%' + city.toLowerCase() + '%'}
      ORDER BY id LIMIT 1
    `);
    return (rows as any).rows?.[0] || null;
  }

  async function ensureEventWithSession(opts: {
    organizerId: number;
    venueId: number;
    title: string;
    titleMr: string;
    category: string;
    categoryMr: string;
    language: string;
    description: string;
    descriptionMr: string;
    posterUrl: string;
    tag?: string;
    featured?: number;
    durationMinutes: number;
    date: string;
    time: string;
    priceHintPaise?: number;
  }) {
    const existing = await db.execute(sql`
      SELECT id FROM events
      WHERE lower(title) = lower(${opts.title})
        AND venue_id = ${opts.venueId}
        AND status = 'published'
      LIMIT 1
    `);
    let eventId = (existing as any).rows?.[0]?.id as number | undefined;

    if (!eventId) {
      const [ev] = await db
        .insert(events)
        .values({
          organizerId: opts.organizerId,
          venueId: opts.venueId,
          title: opts.title,
          titleMr: opts.titleMr,
          slug: slugify(opts.title),
          category: opts.category,
          categoryMr: opts.categoryMr,
          language: opts.language,
          ageGuidance: 'U/A',
          durationMinutes: opts.durationMinutes,
          description: opts.description,
          descriptionMr: opts.descriptionMr,
          posterUrl: opts.posterUrl,
          status: 'published',
          featured: opts.featured ?? 0,
          tag: opts.tag || null,
        })
        .returning();
      eventId = ev.id;
    }

    const { start, end } = istLocal(opts.date, opts.time, opts.durationMinutes);
    const dupSess = await db.execute(sql`
      SELECT id FROM event_sessions
      WHERE event_id = ${eventId}
        AND session_start_time = ${start.toISOString()}::timestamptz
      LIMIT 1
    `);
    const dupId = (dupSess as any).rows?.[0]?.id;
    if (dupId) return { eventId, sessionId: dupId as number, created: false, inventory: 0 };

    const [sess] = await db
      .insert(eventSessions)
      .values({
        eventId,
        sessionStartTime: start,
        sessionEndTime: end,
        status: 'active',
      })
      .returning();

    const inv = await generateSessionInventory(
      sess.id,
      opts.venueId,
      opts.priceHintPaise ? Math.round(opts.priceHintPaise / 100) : undefined
    );

    return { eventId, sessionId: sess.id, created: true, inventory: inv.createdCount };
  }

  const cinemaVenues = await db.execute(sql`
    SELECT id, name, city FROM venues
    WHERE name ILIKE '%PVR%' OR name ILIKE '%Cinepolis%' OR name ILIKE '%INOX%'
    ORDER BY id
  `);
  const cinemas = ((cinemaVenues as any).rows || []) as { id: number; name: string; city: string }[];
  console.log('Cinema venues:', cinemas.length, cinemas.map((c) => `${c.id}:${c.city}`).join(', '));

  let playsOk = 0;
  for (const play of PLAYS) {
    const venue = await resolveVenue(play.venue, play.city);
    if (!venue) {
      console.warn('SKIP play — venue missing:', play.venue, play.city);
      continue;
    }
    const res = await ensureEventWithSession({
      organizerId: org.id,
      venueId: venue.id,
      title: play.title,
      titleMr: play.titleMr,
      category: 'plays',
      categoryMr: 'नाटक',
      language: 'Marathi',
      description: `${play.title} — live Marathi natya at ${play.venue}, ${play.city}.`,
      descriptionMr: `${play.titleMr} — ${play.venue}, ${play.city} येथे लाइव्ह मराठी नाट्यप्रयोग.`,
      posterUrl: PLAY_POSTER,
      tag: 'नाट्य',
      featured: 1,
      durationMinutes: 150,
      date: play.date,
      time: play.time,
      priceHintPaise: play.price,
    });
    playsOk++;
    console.log(`PLAY ${play.title} → event ${res.eventId} sess ${res.sessionId} inv=${res.inventory}`);
  }

  let movieSessions = 0;
  const useSlots = [
    { dateOffset: 1, time: '14:30' },
    { dateOffset: 2, time: '19:00' },
  ];
  for (const movie of MOVIES) {
    for (const cinema of cinemas) {
      for (const slot of useSlots) {
        const res = await ensureEventWithSession({
          organizerId: org.id,
          venueId: cinema.id,
          title: movie.title,
          titleMr: movie.titleMr,
          category: 'movies',
          categoryMr: 'चित्रपट',
          language: movie.lang,
          description: `${movie.title} at ${cinema.name}, ${cinema.city}. MahaTicket cinema catalog.`,
          descriptionMr: `${movie.titleMr} — ${cinema.name}, ${cinema.city}.`,
          posterUrl: POSTER,
          tag: 'नाऊ शोइंग',
          featured: movie.title === 'Jailer 2' || movie.title === 'Ramayan' ? 1 : 0,
          durationMinutes: 155,
          date: ymdOffset(slot.dateOffset),
          time: slot.time,
          priceHintPaise: 25000,
        });
        if (res.created) movieSessions++;
      }
    }
  }

  const summary = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM events WHERE status='published') AS published,
      (SELECT COUNT(*)::int FROM event_sessions s
         JOIN events e ON e.id=s.event_id
         WHERE e.status='published' AND s.session_start_time > NOW()) AS future_sessions,
      (SELECT COUNT(*)::int FROM events WHERE status='published' AND category='movies') AS movies,
      (SELECT COUNT(*)::int FROM events WHERE status='published' AND category='plays') AS plays
  `);
  console.log('SUMMARY', (summary as any).rows?.[0]);
  console.log(`Done. playsProcessed=${playsOk} newMovieSessions=${movieSessions}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
