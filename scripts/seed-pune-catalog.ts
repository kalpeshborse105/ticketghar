/**
 * Seed Pune-focused real catalog: natak / movies / comedy with
 * Balcony / Gold / Silver style sections on an existing Pune venue.
 *
 * Usage: npx tsx scripts/seed-pune-catalog.ts
 */
import 'dotenv/config';
import { db } from '../src/db/index.ts';
import {
  announcements,
  eventSessions,
  events,
  organizers,
  seatInventory,
  seats,
  ticketTypes,
  venueSections,
  venues,
} from '../src/db/schema.ts';
import { and, eq, like, sql } from 'drizzle-orm';

const CATALOG = [
  {
    title: 'Ghashiram Kotwal',
    titleMr: 'घाशीराम कोतवाल',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'Marathi',
    tag: 'क्लासिक',
    poster:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    desc: 'Vijay Tendulkar classic political satire.',
    descMr: 'विजय तेंडुलकर यांचे क्लासिक राजकीय नाटक.',
  },
  {
    title: 'Sangeet Sharada',
    titleMr: 'संगीत शारदा',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'Marathi',
    tag: 'संगीत नाटक',
    poster:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    desc: 'Classic Marathi musical theatre.',
    descMr: 'क्लासिक मराठी संगीत नाटक.',
  },
  {
    title: 'Natasamrat',
    titleMr: 'नटसम्राट',
    category: 'movies',
    categoryMr: 'चित्रपट',
    language: 'Marathi',
    tag: 'सुपरहिट',
    poster:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    desc: 'Nana Patekar starrer classic drama.',
    descMr: 'नाना पाटेकर अभिनीत क्लासिक चित्रपट.',
  },
  {
    title: 'Pune Standup Night',
    titleMr: 'पुणे स्टँडअप नाईट',
    category: 'comedy',
    categoryMr: 'कॉमेडी',
    language: 'Marathi',
    tag: 'हॉट',
    poster:
      'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=80',
    desc: 'Live Marathi / Hindi comedy night in Pune.',
    descMr: 'पुण्यातील थेट स्टँडअप कॉमेडी.',
  },
  {
    title: 'Balgandharva Music Evening',
    titleMr: 'बालगंधर्व संगीत संध्या',
    category: 'music',
    categoryMr: 'संगीत',
    language: 'Marathi',
    tag: 'विशेष',
    poster:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    desc: 'Classical and natya sangeet evening.',
    descMr: 'नाट्यसंगीत व शास्त्रीय संध्याकाळ.',
  },
];

const TIERS = [
  { name: 'Balcony', nameMr: 'बाॅलकोनी', rows: 3, cols: 10, price: 25000, tier: 'silver' },
  { name: 'Silver', nameMr: 'सिल्व्हर', rows: 4, cols: 12, price: 40000, tier: 'silver' },
  { name: 'Gold', nameMr: 'गोल्ड', rows: 4, cols: 12, price: 60000, tier: 'gold' },
];

async function main() {
  let [org] = await db.select().from(organizers).limit(1);
  if (!org) {
    const [created] = await db
      .insert(organizers)
      .values({
        name: 'Pune Natya Parishad',
        companyName: 'Pune Natya Parishad',
        email: 'organizer@mahaticket.local',
        phone: '9876543210',
        city: 'Pune',
        verificationStatus: 'verified',
      })
      .returning();
    org = created;
  }

  let [venue] = await db.select().from(venues).where(eq(venues.city, 'Pune')).limit(1);
  if (!venue) {
    const [created] = await db
      .insert(venues)
      .values({
        name: 'Balgandharva Rangmandir',
        nameMr: 'बालगंधर्व रंगमंदिर',
        address: 'J.M. Road, Shivajinagar',
        city: 'Pune',
        totalCapacity: 800,
        hasSeatLayout: 1,
      })
      .returning();
    venue = created;
  }

  // Ensure Balcony / Silver / Gold sections + seats
  for (const t of TIERS) {
    let [sec] = await db
      .select()
      .from(venueSections)
      .where(and(eq(venueSections.venueId, venue.id), eq(venueSections.name, t.name)))
      .limit(1);
    if (!sec) {
      const [created] = await db
        .insert(venueSections)
        .values({
          venueId: venue.id,
          name: t.name,
          nameMr: t.nameMr,
          rowsCount: t.rows,
          colsCount: t.cols,
          basePrice: t.price,
        })
        .returning();
      sec = created;
    }

    const existingSeats = await db.select().from(seats).where(eq(seats.sectionId, sec.id)).limit(1);
    if (!existingSeats.length) {
      const rows: any[] = [];
      for (let r = 0; r < t.rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 1; c <= t.cols; c++) {
          rows.push({
            venueId: venue.id,
            sectionId: sec.id,
            rowLabel,
            seatNumber: c,
            seatCode: `${t.name.slice(0, 3).toUpperCase()}-${rowLabel}-${String(c).padStart(2, '0')}`,
            tier: t.tier,
          });
        }
      }
      await db.insert(seats).values(rows);
      console.log(`seats: ${t.name} x${rows.length}`);
    }
  }

  const sections = await db.select().from(venueSections).where(eq(venueSections.venueId, venue.id));
  const allSeats = await db.select().from(seats).where(eq(seats.venueId, venue.id));

  for (const item of CATALOG) {
    const slug = `pune-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    let [ev] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev) {
      const [created] = await db
        .insert(events)
        .values({
          organizerId: org.id,
          venueId: venue.id,
          title: item.title,
          titleMr: item.titleMr,
          slug,
          category: item.category,
          categoryMr: item.categoryMr,
          language: item.language,
          description: item.desc,
          descriptionMr: item.descMr,
          posterUrl: item.poster,
          bannerUrl: item.poster,
          status: 'published',
          featured: 1,
          tag: item.tag,
        })
        .returning();
      ev = created;
      console.log('event', ev.title);
    }

    // 2 sessions starting tomorrow
    const existingSessions = await db
      .select()
      .from(eventSessions)
      .where(eq(eventSessions.eventId, ev.id));
    if (!existingSessions.length) {
      const starts = [19, 21].map((hour, idx) => {
        const start = new Date();
        start.setDate(start.getDate() + 1 + idx);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 3);
        return { start, end };
      });

      for (const s of starts) {
        const [session] = await db
          .insert(eventSessions)
          .values({
            eventId: ev.id,
            sessionStartTime: s.start,
            sessionEndTime: s.end,
            status: 'active',
          })
          .returning();

        for (const sec of sections) {
          const price = sec.basePrice || 40000;
          const secSeats = allSeats.filter((x) => x.sectionId === sec.id);
          const [tt] = await db
            .insert(ticketTypes)
            .values({
              eventId: ev.id,
              sessionId: session.id,
              sectionId: sec.id,
              name: sec.name,
              nameMr: sec.nameMr,
              price,
              totalQuota: secSeats.length || 40,
              availableQuota: secSeats.length || 40,
              isSeated: 1,
            })
            .returning();

          if (secSeats.length) {
            await db.insert(seatInventory).values(
              secSeats.map((seat) => ({
                sessionId: session.id,
                seatId: seat.id,
                ticketTypeId: tt.id,
                status: 'available',
              }))
            );
          }
        }
        console.log('session', session.id, 'inventory ok');
      }
    }
  }

  // Admin-managed mid ads
  const [ad] = await db
    .select()
    .from(announcements)
    .where(like(announcements.title, '%Pune Popular%'))
    .limit(1);
  if (!ad) {
    await db.insert(announcements).values({
      title: 'Pune Popular Mid Banner',
      message: 'Admin-managed offer strip for Pune — edit in admin announcements.',
      city: 'Pune',
      category: 'promo',
      active: 1,
      ctaLabel: 'Explore',
      ctaUrl: '/',
      imageUrl:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    });
    console.log('announcement seeded');
  }

  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM events WHERE status='published') AS events,
      (SELECT count(*) FROM venues WHERE city='Pune') AS pune_venues,
      (SELECT count(*) FROM venue_sections) AS sections,
      (SELECT count(*) FROM seats) AS seats,
      (SELECT count(*) FROM seat_inventory) AS inventory
  `);
  console.log('OK', counts.rows?.[0] || counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
