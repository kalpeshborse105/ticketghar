/**
 * READ-ONLY database audit for MahaTicket cleanup planning.
 * Never mutates data. Prints JSON summary + writes docs/DB_AUDIT_RAW.json
 *
 * Usage: npx tsx scripts/db-audit-readonly.ts
 */
import { config } from 'dotenv';
import fs from 'fs';
import pg from 'pg';

config({ override: true });

function classifyConnection(rawUrl: string) {
  const hasUrl = Boolean(rawUrl);
  let host = '(none)';
  let port = '';
  let database = '';
  let userPreview = '';
  try {
    const normalized = rawUrl.replace(/^postgres(ql)?:/i, 'http:');
    const u = new URL(normalized);
    host = u.hostname;
    port = u.port || '5432';
    database = (u.pathname || '/').replace(/^\//, '');
    const user = decodeURIComponent(u.username || '');
    userPreview = user ? `${user.slice(0, 3)}***` : '';
  } catch {
    host = 'parse_error';
  }
  const blob = `${host}/${database}`;
  const looksLocal = /localhost|127\.0\.0\.1/i.test(host);
  const looksSupabase = /supabase\.co|pooler\.supabase/i.test(host);
  let classification: string;
  if (!hasUrl) classification = 'not-configured';
  else if (looksLocal) classification = 'local-dev';
  else if (looksSupabase) classification = 'hosted-supabase — TREAT AS PRODUCTION unless owner confirms staging project';
  else classification = 'remote-unknown — confirm staging vs production with owner';

  return {
    hasDatabaseUrl: hasUrl,
    host,
    port,
    database,
    userPreview,
    classification,
    secretsPrinted: false,
  };
}

async function main() {
  const raw = process.env.DATABASE_URL || process.env.SQL_URL || '';
  const connection = classifyConnection(raw);
  if (!connection.hasDatabaseUrl) {
    console.log(JSON.stringify({ connection, liveInspection: false }, null, 2));
    process.exit(1);
  }

  const url = raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  const q = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
    const res = await p.query(sql, params);
    return res.rows as T[];
  };

  // Verify columns exist via information_schema for key tables
  const columns = await q<{ table_name: string; column_name: string; data_type: string }>(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'venues','venue_sections','seats','events','event_sessions','ticket_types',
        'seat_inventory','orders','tickets','ticket_scans','users','event_reviews',
        'settlements','audit_logs','coupons','organizers'
      )
    ORDER BY table_name, ordinal_position
  `);

  const countsRows = await q(`
    SELECT 'venues' AS entity, COUNT(*)::int AS n FROM venues
    UNION ALL SELECT 'venue_sections', COUNT(*)::int FROM venue_sections
    UNION ALL SELECT 'seats', COUNT(*)::int FROM seats
    UNION ALL SELECT 'events', COUNT(*)::int FROM events
    UNION ALL SELECT 'event_sessions', COUNT(*)::int FROM event_sessions
    UNION ALL SELECT 'ticket_types', COUNT(*)::int FROM ticket_types
    UNION ALL SELECT 'seat_inventory', COUNT(*)::int FROM seat_inventory
    UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
    UNION ALL SELECT 'tickets', COUNT(*)::int FROM tickets
    UNION ALL SELECT 'ticket_scans', COUNT(*)::int FROM ticket_scans
    UNION ALL SELECT 'users', COUNT(*)::int FROM users
    UNION ALL SELECT 'event_reviews', COUNT(*)::int FROM event_reviews
    UNION ALL SELECT 'settlements', COUNT(*)::int FROM settlements
    UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
    UNION ALL SELECT 'organizers', COUNT(*)::int FROM organizers
    UNION ALL SELECT 'coupons', COUNT(*)::int FROM coupons
  `);
  const counts = Object.fromEntries(countsRows.map((r: any) => [r.entity, r.n]));

  const eventsByStatus = await q(`
    SELECT status, COUNT(*)::int AS n
    FROM events
    GROUP BY status
    ORDER BY n DESC
  `);

  const suspicious = await q(`
    SELECT e.id, e.title, e.title_mr, e.status, e.slug, e.category
    FROM events e
    WHERE e.title ILIKE '%[SEED]%'
       OR e.title ILIKE '%demo%'
       OR e.title ILIKE '%test%'
       OR e.title ILIKE '%placeholder%'
       OR e.title ILIKE '%fake%'
       OR e.title ILIKE '%sample%'
       OR e.title ILIKE '%dummy%'
       OR COALESCE(e.title_mr,'') ILIKE '%demo%'
       OR COALESCE(e.title_mr,'') ILIKE '%test%'
       OR e.slug ILIKE '%demo%'
       OR e.slug ILIKE '%test%'
       OR e.slug ILIKE '%seed%'
       OR COALESCE(e.description,'') ILIKE '%lorem ipsum%'
       OR COALESCE(e.description_mr,'') ILIKE '%lorem ipsum%'
    ORDER BY e.id
  `);

  const noFutureByStatus = await q(`
    SELECT e.status, COUNT(*)::int AS n
    FROM events e
    WHERE NOT EXISTS (
      SELECT 1 FROM event_sessions s
      WHERE s.event_id = e.id
        AND s.session_start_time > NOW()
        AND COALESCE(s.status, 'scheduled') <> 'cancelled'
    )
    GROUP BY e.status
    ORDER BY n DESC
  `);

  const withFutureAndInventory = await q(`
    SELECT e.id, e.title, e.status,
           COUNT(DISTINCT s.id)::int AS future_sessions,
           COUNT(DISTINCT si.id)::int AS inventory_rows,
           COUNT(DISTINCT si.id) FILTER (WHERE si.status = 'available')::int AS available_seats
    FROM events e
    JOIN event_sessions s ON s.event_id = e.id
      AND s.session_start_time > NOW()
      AND COALESCE(s.status, 'scheduled') <> 'cancelled'
    LEFT JOIN seat_inventory si ON si.session_id = s.id
    GROUP BY e.id, e.title, e.status
    ORDER BY e.id
  `);

  const withDependencies = await q(`
    SELECT e.id, e.title, e.status,
           (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
           (SELECT COUNT(*)::int FROM tickets t
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS tickets,
           (SELECT COUNT(*)::int FROM ticket_scans ts
              JOIN tickets t ON t.id = ts.ticket_id
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS scans,
           (SELECT COUNT(*)::int FROM event_reviews r WHERE r.event_id = e.id) AS reviews,
           (SELECT COUNT(*)::int FROM orders o
              WHERE o.event_id = e.id
                AND o.payment_status IS NOT NULL
                AND o.payment_status NOT IN ('', 'pending', 'created', 'failed')) AS paidish_orders,
           (SELECT COUNT(*)::int FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()) AS future_sessions
    FROM events e
    WHERE EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
       OR EXISTS (
            SELECT 1 FROM tickets t
            JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
          )
       OR EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
    ORDER BY e.id
  `);

  const publishedNoUpcoming = await q(`
    SELECT e.id, e.title, e.status,
           (SELECT COUNT(*)::int FROM event_sessions s WHERE s.event_id = e.id) AS sessions_total,
           (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders
    FROM events e
    WHERE e.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = e.id
          AND s.session_start_time > NOW()
          AND COALESCE(s.status, 'scheduled') <> 'cancelled'
      )
    ORDER BY e.id
  `);

  const venueDuplicates = await q(`
    SELECT
      lower(regexp_replace(COALESCE(v.name,''), '\\s+', ' ', 'g')) AS norm_name,
      lower(regexp_replace(COALESCE(v.city,''), '\\s+', ' ', 'g')) AS norm_city,
      COUNT(*)::int AS n,
      array_agg(v.id ORDER BY v.id) AS ids,
      array_agg(v.name ORDER BY v.id) AS names,
      array_agg(COALESCE(v.address,'') ORDER BY v.id) AS addresses
    FROM venues v
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
    ORDER BY n DESC, norm_city, norm_name
  `);

  const venueCapacityMismatch = await q(`
    SELECT v.id, v.name, v.city, v.total_capacity,
           COUNT(s.id)::int AS physical_seats,
           (COUNT(s.id)::int - COALESCE(v.total_capacity, 0)) AS delta
    FROM venues v
    LEFT JOIN venue_sections vs ON vs.venue_id = v.id
    LEFT JOIN seats s ON s.section_id = vs.id
    GROUP BY v.id, v.name, v.city, v.total_capacity
    HAVING COALESCE(v.total_capacity, 0) > 0
       AND COUNT(s.id) > 0
       AND COUNT(s.id) <> COALESCE(v.total_capacity, 0)
    ORDER BY ABS(COUNT(s.id)::int - COALESCE(v.total_capacity, 0)) DESC
  `);

  // schema: venue_sections has rows_count/cols_count — no capacity column
  const sectionCapacityMismatch = await q(`
    SELECT vs.id, vs.venue_id, vs.name,
           vs.rows_count, vs.cols_count,
           (vs.rows_count * vs.cols_count)::int AS configured_capacity,
           COUNT(s.id)::int AS seat_count,
           (COUNT(s.id)::int - (vs.rows_count * vs.cols_count)) AS delta
    FROM venue_sections vs
    LEFT JOIN seats s ON s.section_id = vs.id
    GROUP BY vs.id, vs.venue_id, vs.name, vs.rows_count, vs.cols_count
    HAVING COUNT(s.id) <> (vs.rows_count * vs.cols_count)
    ORDER BY ABS(COUNT(s.id)::int - (vs.rows_count * vs.cols_count)) DESC
  `);

  const proposedSoftUnpublish = await q(`
    SELECT e.id, e.title, e.status,
           (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
           (SELECT COUNT(*)::int FROM tickets t
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS tickets,
           (SELECT COUNT(*)::int FROM event_reviews r WHERE r.event_id = e.id) AS reviews,
           (SELECT COUNT(*)::int FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()) AS future_sessions
    FROM events e
    WHERE e.status = 'published'
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
      AND NOT EXISTS (
            SELECT 1 FROM tickets t
            JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
          )
      AND NOT EXISTS (
            SELECT 1 FROM ticket_scans ts
            JOIN tickets t ON t.id = ts.ticket_id
            JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
          )
      AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
      AND (
        e.title ILIKE '%demo%' OR e.title ILIKE '%test%' OR e.title ILIKE '%[SEED]%'
        OR e.slug ILIKE '%demo%' OR e.slug ILIKE '%test%' OR e.slug ILIKE '%seed%'
        OR (
          NOT EXISTS (
            SELECT 1 FROM event_sessions s
            WHERE s.event_id = e.id AND s.session_start_time > NOW()
          )
        )
      )
    ORDER BY e.id
  `);

  // Historical already unpublished (prior soft cleanup) — capture for report
  const alreadyUnpublishedZeroDeps = await q(`
    SELECT e.id, e.title, e.status
    FROM events e
    WHERE e.status = 'unpublished'
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
    ORDER BY e.id
  `);

  const orderPaymentStatuses = await q(`
    SELECT payment_status, COUNT(*)::int AS n
    FROM orders
    GROUP BY payment_status
    ORDER BY n DESC
  `);

  const sessionStatuses = await q(`
    SELECT COALESCE(status,'(null)') AS status, COUNT(*)::int AS n
    FROM event_sessions
    GROUP BY status
    ORDER BY n DESC
  `);

  const allEventsBrief = await q(`
    SELECT e.id, e.title, e.title_mr, e.status, e.category, e.slug,
           v.name AS venue, v.city,
           (SELECT COUNT(*)::int FROM event_sessions s WHERE s.event_id = e.id) AS sessions,
           (SELECT COUNT(*)::int FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()) AS future_sessions,
           (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
           (SELECT COUNT(*)::int FROM tickets t
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS tickets,
           (SELECT COUNT(*)::int FROM event_reviews r WHERE r.event_id = e.id) AS reviews
    FROM events e
    LEFT JOIN venues v ON v.id = e.venue_id
    ORDER BY e.id
  `);

  const report = {
    generatedAt: new Date().toISOString(),
    liveInspection: true,
    connection,
    counts,
    eventsByStatus,
    sessionStatuses,
    orderPaymentStatuses,
    suspiciousNaming: suspicious,
    noFutureSessionsByStatus: noFutureByStatus,
    withFutureAndInventory,
    withDependencies,
    publishedNoUpcomingBookable: publishedNoUpcoming,
    venueDuplicates,
    venueCapacityMismatch,
    sectionCapacityMismatch,
    proposedSoftUnpublishCandidates: proposedSoftUnpublish,
    alreadyUnpublishedZeroOrderEvents: alreadyUnpublishedZeroDeps,
    allEventsBrief,
    columnCatalog: columns,
    priorSoftUnpublishNote:
      'On 2026-10-26 a prior session soft-unpublished 18 zero-order events. This audit is read-only and does not mutate further.',
  };

  fs.writeFileSync('docs/DB_AUDIT_RAW.json', JSON.stringify(report, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        wrote: 'docs/DB_AUDIT_RAW.json',
        connection,
        counts,
        eventsByStatus,
        suspiciousCount: suspicious.length,
        publishedNoUpcoming: publishedNoUpcoming.length,
        proposedSoftUnpublish: proposedSoftUnpublish.length,
        venueDuplicates: venueDuplicates.length,
        venueCapacityMismatch: venueCapacityMismatch.length,
        sectionCapacityMismatch: sectionCapacityMismatch.length,
        withFutureAndInventory: withFutureAndInventory.length,
        withDependencies: withDependencies.length,
      },
      null,
      2
    )
  );

  await p.end();
}

main().catch((e) => {
  console.error('AUDIT_FAILED', e?.message || e);
  process.exit(1);
});
