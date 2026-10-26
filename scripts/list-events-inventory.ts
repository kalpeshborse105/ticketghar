/**
 * Read-only inventory of events + venues (no deletes).
 * Usage: npx tsx scripts/list-events-inventory.ts
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

const raw = process.env.DATABASE_URL || '';
const url = raw
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

async function main() {
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  const ven = await p.query('SELECT COUNT(*)::int AS c FROM venues');
  const cities = await p.query(`
    SELECT COALESCE(city, '(none)') AS city, COUNT(*)::int AS c
    FROM venues
    GROUP BY city
    ORDER BY c DESC
    LIMIT 25
  `);

  const ev = await p.query(`
    SELECT e.id, e.title, e.title_mr, e.status, e.category, e.slug,
           v.name AS venue, v.city,
           (SELECT COUNT(*)::int FROM event_sessions s WHERE s.event_id = e.id) AS sessions,
           (SELECT COUNT(*)::int FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()) AS upcoming,
           (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders
    FROM events e
    LEFT JOIN venues v ON v.id = e.venue_id
    ORDER BY e.id
  `);

  const payload = {
    generatedAt: new Date().toISOString(),
    venues: ven.rows[0].c,
    cities: cities.rows,
    eventCount: ev.rows.length,
    events: ev.rows.map((r) => ({
      id: r.id,
      status: r.status,
      title: r.title_mr || r.title,
      titleEn: r.title,
      category: r.category,
      venue: r.venue,
      city: r.city,
      sessions: r.sessions,
      upcoming: r.upcoming,
      orders: r.orders,
      slug: r.slug,
    })),
    noUpcoming: ev.rows
      .filter((r) => Number(r.upcoming) === 0)
      .map((r) => ({ id: r.id, status: r.status, title: r.title, orders: r.orders })),
    safeUnpublish: ev.rows
      .filter(
        (r) =>
          r.status === 'published' &&
          Number(r.upcoming) === 0 &&
          Number(r.orders) === 0
      )
      .map((r) => ({ id: r.id, title: r.title })),
    publishedCount: ev.rows.filter((r) => r.status === 'published').length,
    unpublishedCount: ev.rows.filter((r) => r.status === 'unpublished').length,
  };

  const fs = await import('fs');
  const outPath = 'docs/EVENTS_INVENTORY_2026-10-26.json';
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(
    `venues=${payload.venues} events=${payload.eventCount} published=${payload.publishedCount} unpublished=${payload.unpublishedCount} safeUnpublishLeft=${payload.safeUnpublish.length}`
  );
  console.log(
    'withUpcoming:',
    payload.events
      .filter((e) => e.upcoming > 0 && e.status === 'published')
      .map((e) => `${e.id}:${e.titleEn}`)
      .join(' | ') || '(none)'
  );
  console.log(
    'safeUnpublishIds:',
    payload.safeUnpublish.map((e) => e.id).join(',') || '(none)'
  );

  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
