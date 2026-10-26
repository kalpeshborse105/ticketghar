/**
 * READ-ONLY theatre catalogue final audit.
 * Writes docs/THEATRE_DATABASE_FINAL_AUDIT_DATA.json — never mutates DB.
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

function classifyHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.includes('supabase')) {
    return { hostFamily: 'supabase-pooler', isProductionLikely: true, hostname };
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return { hostFamily: 'localhost', isProductionLikely: false, hostname };
  }
  return { hostFamily: hostname, isProductionLikely: true, hostname };
}

async function main() {
  const hostRaw = (() => {
    try {
      return new URL(poolUrl().replace(/^postgresql?/i, 'http')).hostname;
    } catch {
      return '(unparsed)';
    }
  })();
  const host = classifyHost(hostRaw);
  console.log('HOST', host);

  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const tables = (
      await p.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
    ).rows.map((r) => r.table_name as string);

    const columns = (
      await p.query(`
        SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
               character_maximum_length, numeric_precision
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `)
    ).rows;

    const fks = (
      await p.query(`
        SELECT
          tc.constraint_name,
          tc.table_name AS from_table,
          kcu.column_name AS from_column,
          ccu.table_name AS to_table,
          ccu.column_name AS to_column,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `)
    ).rows;

    const uniques = (
      await p.query(`
        SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
               string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
        ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
      `)
    ).rows;

    const indexes = (
      await p.query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `)
    ).rows;

    const rowCounts: Record<string, number> = {};
    for (const t of tables) {
      const r = await p.query(`SELECT COUNT(*)::int AS c FROM public.${quoteIdent(t)}`);
      rowCounts[t] = r.rows[0].c as number;
    }

    const tableExists = Object.fromEntries(
      [
        'bookings',
        'booking_items',
        'payments',
        'orders',
        'tickets',
        'venues',
        'villages',
        'talukas',
        'cities',
        'districts',
      ].map((name) => [name, tables.includes(name)])
    );

    const citiesTalukaFk = fks.filter(
      (f) => f.from_table === 'cities' && f.from_column === 'taluka_id'
    );
    const citiesDistrictFk = fks.filter(
      (f) => f.from_table === 'cities' && f.from_column === 'district_id'
    );

    const venues = (
      await p.query(`
        SELECT
          v.id, v.name, v.name_mr, v.address, v.city, v.state, v.pincode,
          v.latitude, v.longitude, v.total_capacity, v.has_seat_layout,
          v.verification_status, v.is_template, v.ownership_type,
          v.district_id, v.city_id, v.created_at,
          c.name AS city_catalog_name, c.taluka_id AS city_taluka_id,
          d.name AS district_catalog_name, d.code AS district_code,
          t.name AS city_taluka_name,
          (SELECT COUNT(*)::int FROM venue_sections vs WHERE vs.venue_id = v.id) AS sections,
          (SELECT COUNT(*)::int FROM seats s WHERE s.venue_id = v.id) AS seats,
          (SELECT COUNT(*)::int FROM events e WHERE e.venue_id = v.id) AS events,
          (SELECT COUNT(*)::int FROM events e WHERE e.venue_id = v.id AND e.status = 'published') AS published_events,
          (SELECT COUNT(*)::int FROM event_sessions es
             JOIN events e ON e.id = es.event_id WHERE e.venue_id = v.id) AS sessions,
          (SELECT COUNT(*)::int FROM ticket_types tt
             JOIN events e ON e.id = tt.event_id WHERE e.venue_id = v.id) AS ticket_types,
          (SELECT COUNT(*)::int FROM seat_inventory si
             JOIN event_sessions es ON es.id = si.session_id
             JOIN events e ON e.id = es.event_id WHERE e.venue_id = v.id) AS seat_inventory,
          (SELECT COUNT(*)::int FROM orders o
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS orders,
          (SELECT COUNT(*)::int FROM tickets tk
             JOIN orders o ON o.id = tk.order_id
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS tickets,
          (SELECT COUNT(*)::int FROM ticket_scans ts
             JOIN tickets tk ON tk.id = ts.ticket_id
             JOIN orders o ON o.id = tk.order_id
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS scans,
          (SELECT COUNT(*)::int FROM settlements st
             JOIN events e ON e.id = st.event_id WHERE e.venue_id = v.id) AS settlements,
          (SELECT COUNT(*)::int FROM event_reviews er
             JOIN events e ON e.id = er.event_id WHERE e.venue_id = v.id) AS reviews
        FROM venues v
        LEFT JOIN cities c ON c.id = v.city_id
        LEFT JOIN districts d ON d.id = v.district_id
        LEFT JOIN talukas t ON t.id = c.taluka_id
        ORDER BY v.id
      `)
    ).rows;

    const nearDupes = (
      await p.query(`
        SELECT lower(regexp_replace(name, '\\s+', ' ', 'g')) AS norm_name,
               array_agg(id ORDER BY id) AS ids,
               array_agg(name ORDER BY id) AS names,
               array_agg(city ORDER BY id) AS cities,
               COUNT(*)::int AS cnt
        FROM venues
        GROUP BY 1
        HAVING COUNT(*) > 1
        ORDER BY 1
      `)
    ).rows;

    const softNearDupes = (
      await p.query(`
        WITH normalized AS (
          SELECT id, name, city, address,
            lower(regexp_replace(
              regexp_replace(name, '(natyagruha|natya\\s*mandir|auditorium|theatre|theater|hall|rang\\s*mandir|sabhagruh|sabhagruha)', '', 'gi'),
              '\\s+', ' ', 'g'
            )) AS stem
          FROM venues
        )
        SELECT stem,
               array_agg(id ORDER BY id) AS ids,
               array_agg(name ORDER BY id) AS names,
               array_agg(city ORDER BY id) AS cities,
               COUNT(*)::int AS cnt
        FROM normalized
        WHERE length(trim(stem)) > 3
        GROUP BY stem
        HAVING COUNT(*) > 1
        ORDER BY cnt DESC, stem
      `)
    ).rows;

    async function venueDetail(ids: number[]) {
      const events = (
        await p.query(
          `SELECT e.id, e.venue_id, e.title, e.status, e.slug,
                  (SELECT COUNT(*)::int FROM event_sessions es WHERE es.event_id = e.id) AS sessions,
                  (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
                  (SELECT COUNT(*)::int FROM tickets tk
                     JOIN orders o ON o.id = tk.order_id WHERE o.event_id = e.id) AS tickets
           FROM events e WHERE e.venue_id = ANY($1::int[]) ORDER BY e.venue_id, e.id`,
          [ids]
        )
      ).rows;
      const sections = (
        await p.query(
          `SELECT id, venue_id, name, rows_count, cols_count, base_price
           FROM venue_sections WHERE venue_id = ANY($1::int[]) ORDER BY venue_id, id`,
          [ids]
        )
      ).rows;
      return { events, sections };
    }

    const focusDupes = {
      dinanath: await venueDetail([2, 12]),
      yashwantrao: await venueDetail([3, 53]),
    };

    const locationStats = {
      districts: (await p.query(`SELECT COUNT(*)::int AS c FROM districts`)).rows[0].c,
      districtsSample: (
        await p.query(`SELECT id, code, name, name_mr, division FROM districts ORDER BY id LIMIT 5`)
      ).rows,
      talukas: (await p.query(`SELECT COUNT(*)::int AS c FROM talukas`)).rows[0].c,
      cities: (await p.query(`SELECT COUNT(*)::int AS c FROM cities`)).rows[0].c,
      citiesWithTaluka: (
        await p.query(`SELECT COUNT(*)::int AS c FROM cities WHERE taluka_id IS NOT NULL`)
      ).rows[0].c,
      citiesWithDistrict: (
        await p.query(`SELECT COUNT(*)::int AS c FROM cities WHERE district_id IS NOT NULL`)
      ).rows[0].c,
      citiesMissingDistrict: (
        await p.query(`SELECT id, name, taluka_id FROM cities WHERE district_id IS NULL ORDER BY id`)
      ).rows,
      cityDistrictMismatch: (
        await p.query(`
          SELECT c.id, c.name, c.district_id AS city_district_id, t.district_id AS taluka_district_id
          FROM cities c
          JOIN talukas t ON t.id = c.taluka_id
          WHERE c.district_id IS DISTINCT FROM t.district_id
        `)
      ).rows,
      venuesMissingCityId: venues.filter((v) => v.city_id == null).length,
      venuesMissingDistrictId: venues.filter((v) => v.district_id == null).length,
      venuesWithBothFks: venues.filter((v) => v.city_id != null && v.district_id != null).length,
    };

    const dependencySummary = {
      venuesWithOrders: venues.filter((v) => Number(v.orders) > 0).map((v) => v.id),
      venuesWithTickets: venues.filter((v) => Number(v.tickets) > 0).map((v) => v.id),
      venuesWithScans: venues.filter((v) => Number(v.scans) > 0).map((v) => v.id),
      venuesWithSettlements: venues.filter((v) => Number(v.settlements) > 0).map((v) => v.id),
      venuesWithReviews: venues.filter((v) => Number(v.reviews) > 0).map((v) => v.id),
      venuesWithEvents: venues.filter((v) => Number(v.events) > 0).map((v) => v.id),
      venuesWithPublishedEvents: venues.filter((v) => Number(v.published_events) > 0).map((v) => v.id),
      venuesZeroDeps: venues
        .filter(
          (v) =>
            Number(v.events) === 0 &&
            Number(v.orders) === 0 &&
            Number(v.tickets) === 0 &&
            Number(v.scans) === 0 &&
            Number(v.settlements) === 0 &&
            Number(v.reviews) === 0
        )
        .map((v) => v.id),
    };

    const schemaCodeMismatchNotes = [
      {
        fact: 'LIVE_AND_DRIZZLE',
        note: 'Authoritative order/ticket model is orders + tickets. No bookings/booking_items/payments tables in live public schema.',
      },
      {
        fact: 'DATABASE_SCHEMA_AUDIT.md_STALE',
        note: 'Mentions bookings, booking_items, payments, and columns (x_pos, capacity on sections) that are absent from live schema.sql / schema.ts.',
      },
      {
        fact: 'cities.taluka_id_FK',
        note:
          citiesTalukaFk.length > 0
            ? `FK present: ${JSON.stringify(citiesTalukaFk)}`
            : 'NO foreign key from cities.taluka_id → talukas.id in live DB (column exists; Drizzle declares .references but supabase/schema.sql omits FK).',
      },
    ];

    const out = {
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'LIVE_DATABASE_READONLY',
        host,
        warning: 'Read-only audit. No writes performed. Do not treat as cleanup approval.',
      },
      tableExists,
      rowCounts,
      tables,
      columnsByTable: groupBy(columns, 'table_name'),
      foreignKeys: fks,
      venueRelatedForeignKeys: fks.filter((f) =>
        ['venues', 'venue_sections', 'seats', 'events', 'event_sessions', 'ticket_types', 'seat_inventory', 'orders', 'tickets', 'ticket_scans', 'settlements', 'event_reviews', 'event_images', 'cities', 'districts', 'talukas'].includes(
          f.from_table
        )
      ),
      primaryKeysAndUniques: uniques,
      indexes,
      citiesTalukaFk,
      citiesDistrictFk,
      locationStats,
      venues,
      nearDuplicateExactNames: nearDupes,
      nearDuplicateSoftStems: softNearDupes,
      focusDuplicateDetails: focusDupes,
      dependencySummary,
      schemaCodeMismatchNotes,
    };

    const outPath = path.join(process.cwd(), 'docs', 'THEATRE_DATABASE_FINAL_AUDIT_DATA.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('WROTE', outPath);
    console.log(
      JSON.stringify(
        {
          tables: tables.length,
          venues: venues.length,
          exactDupes: nearDupes.length,
          softDupes: softNearDupes.length,
          venuesWithOrders: dependencySummary.venuesWithOrders,
          citiesTalukaFkCount: citiesTalukaFk.length,
          missingTables: Object.entries(tableExists)
            .filter(([, e]) => !e)
            .map(([n]) => n),
        },
        null,
        2
      )
    );
  } finally {
    await p.end();
  }
}

function quoteIdent(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Unsafe ident: ${name}`);
  return `"${name}"`;
}

function groupBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const map: Record<string, T[]> = {};
  for (const row of rows) {
    const k = String(row[key]);
    (map[k] ||= []).push(row);
  }
  return map;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
