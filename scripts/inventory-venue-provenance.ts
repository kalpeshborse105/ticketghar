/**
 * READ-ONLY venue provenance inventory.
 * Classifies venues using script manifests + created_at + FK deps.
 * Never writes.
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

/** Exact names from scripts that INSERT/UPSERT "new real" theatres today */
const SCRIPT_MANIFEST_NAMES = [
  // scripts/upsert-real-pune-venues.ts
  'Bharat Natya Rang Mandir',
  'Ram Krishna More Auditorium',
  'Vithal Tupe Sabhagruh',
  'Sudarshan Rangmanch',
  'Lokshahir Annabhau Sathe Natyagruha',
  'Nehru Memorial Hall',
  'Shivaji Mandir',
  'Prabodhankar Thackeray Natya Mandir',
  // scripts/apply-approved-cleanup-and-venues.ts NCPA batch
  'Jamshed Bhabha Theatre (NCPA)',
  'Tata Theatre (NCPA)',
  'NCPA Experimental Theatre',
  'Godrej Dance Theatre (NCPA)',
];

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
    return { hostFamily: 'supabase-pooler', isProductionLikely: true };
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return { hostFamily: 'localhost', isProductionLikely: false };
  }
  return { hostFamily: hostname, isProductionLikely: true };
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

  const venues = (
    await p.query(`
      SELECT
        v.id, v.name, v.name_mr, v.city, v.address, v.district_id, v.city_id,
        v.verification_status, v.is_template, v.ownership_type, v.total_capacity,
        v.created_at,
        c.name AS city_catalog_name,
        d.name AS district_catalog_name,
        (SELECT COUNT(*)::int FROM events e WHERE e.venue_id = v.id) AS events,
        (SELECT COUNT(*)::int FROM orders o
           JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS orders,
        (SELECT COUNT(*)::int FROM tickets t
           JOIN orders o ON o.id = t.order_id
           JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS tickets,
        (SELECT COUNT(*)::int FROM ticket_scans ts
           JOIN tickets t ON t.id = ts.ticket_id
           JOIN orders o ON o.id = t.order_id
           JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS scans,
        (SELECT COUNT(*)::int FROM event_reviews r
           JOIN events e ON e.id = r.event_id WHERE e.venue_id = v.id) AS reviews,
        (SELECT COUNT(*)::int FROM seats s WHERE s.venue_id = v.id) AS seats,
        (SELECT COUNT(*)::int FROM venue_sections vs WHERE vs.venue_id = v.id) AS sections
      FROM venues v
      LEFT JOIN cities c ON c.id = v.city_id
      LEFT JOIN districts d ON d.id = v.district_id
      ORDER BY v.created_at NULLS LAST, v.id
    `)
  ).rows;

  const manifestNorm = new Set(SCRIPT_MANIFEST_NAMES.map((n) => n.toLowerCase().trim()));

  // Cluster by calendar day of created_at (UTC)
  const byDay = new Map<string, number[]>();
  for (const v of venues) {
    const day = v.created_at
      ? new Date(v.created_at).toISOString().slice(0, 10)
      : 'null';
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(v.id);
  }

  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const latestDay = days.filter((d) => d[0] !== 'null').at(-1)?.[0] ?? null;

  type Bucket =
    | 'authoritative_new_manifest'
    | 'created_on_latest_day_not_in_manifest'
    | 'older_with_protected_history'
    | 'older_zero_dep_candidate_retire'
    | 'origin_unknown';

  const classified = venues.map((v) => {
    const inManifest = manifestNorm.has(String(v.name).toLowerCase().trim());
    const day = v.created_at
      ? new Date(v.created_at).toISOString().slice(0, 10)
      : null;
    const protectedDeps =
      Number(v.orders) > 0 ||
      Number(v.tickets) > 0 ||
      Number(v.scans) > 0 ||
      Number(v.reviews) > 0;

    let bucket: Bucket;
    let evidence: string;

    if (inManifest) {
      bucket = 'authoritative_new_manifest';
      evidence = 'Exact name match to upsert-real-pune-venues / apply-approved NCPA manifest';
    } else if (latestDay && day === latestDay && !protectedDeps) {
      bucket = 'created_on_latest_day_not_in_manifest';
      evidence = `created_at day=${latestDay} but name not in script manifests — needs owner confirm`;
    } else if (protectedDeps) {
      bucket = 'older_with_protected_history';
      evidence = 'Has orders/tickets/scans/reviews — must preserve venue row';
    } else if (day && latestDay && day < latestDay) {
      bucket = 'older_zero_dep_candidate_retire';
      evidence = 'Older created_at than latest batch; zero protected booking deps — retire candidate (not auto-delete)';
    } else {
      bucket = 'origin_unknown';
      evidence = 'Could not establish provenance from manifests/created_at/deps';
    }

    return {
      id: v.id,
      name: v.name,
      city: v.city,
      address: v.address,
      created_at: v.created_at,
      verification_status: v.verification_status,
      city_id: v.city_id,
      district_id: v.district_id,
      city_catalog_name: v.city_catalog_name,
      district_catalog_name: v.district_catalog_name,
      events: v.events,
      orders: v.orders,
      tickets: v.tickets,
      scans: v.scans,
      reviews: v.reviews,
      seats: v.seats,
      sections: v.sections,
      bucket,
      evidence,
    };
  });

  const byBucket: Record<string, typeof classified> = {};
  for (const row of classified) {
    (byBucket[row.bucket] ||= []).push(row);
  }

  const out = {
    sourceLabel: 'LIVE_DATABASE_READONLY_SNAPSHOT',
    generatedAt: new Date().toISOString(),
    host,
    note: 'Authoritative NEW = script-manifest name match only. Higher ID / nicer name is NOT evidence.',
    createdAtDayClusters: Object.fromEntries(days),
    latestCreatedAtDay: latestDay,
    counts: {
      venues: venues.length,
      byBucket: Object.fromEntries(
        Object.entries(byBucket).map(([k, rows]) => [k, rows.length])
      ),
    },
    authoritativeNewTheatreIds: (byBucket.authoritative_new_manifest || []).map((r) => r.id),
    obsoleteRetireCandidates: (byBucket.older_zero_dep_candidate_retire || []).map((r) => r.id),
    protectedPreserve: (byBucket.older_with_protected_history || []).map((r) => r.id),
    needsOwnerConfirm: (byBucket.created_on_latest_day_not_in_manifest || []).map(
      (r) => r.id
    ),
    originUnknown: (byBucket.origin_unknown || []).map((r) => r.id),
    byBucket,
    venues: classified,
  };

  const outPath = path.join(process.cwd(), 'docs', 'VENUE_PROVENANCE_INVENTORY.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.counts, null, 2));
  console.log('authoritativeNewTheatreIds', out.authoritativeNewTheatreIds);
  console.log('obsoleteRetireCandidates count', out.obsoleteRetireCandidates.length);
  console.log('protectedPreserve', out.protectedPreserve);
  console.log('needsOwnerConfirm', out.needsOwnerConfirm);
  console.log('originUnknown', out.originUnknown);
  console.log('Wrote', outPath);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
