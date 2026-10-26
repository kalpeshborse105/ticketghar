/**
 * Idempotent venue location repair (Maharashtra).
 *
 * Default: DRY-RUN (no writes). Apply only with: --apply
 *
 * What it does:
 * 1) Link venues.city_id via cities.name (aliases for renamed cities)
 * 2) Set venues.district_id from cities.district_id when city is linked
 * 3) Apply high-confidence district corrections for known mis-maps
 * 4) Soft-flag zero-dependency suspected duplicate venues as unverified
 * 5) Never deletes/merges venues; never touches events/orders/tickets
 *
 * Usage:
 *   npx tsx scripts/repair-venue-locations.ts
 *   npx tsx scripts/repair-venue-locations.ts --apply
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

const APPLY = process.argv.includes('--apply');

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

function norm(s: string | null | undefined) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Free-text city → cities.name aliases (official renames / local spellings) */
const CITY_ALIASES: Record<string, string> = {
  ahmednagar: 'Ahilyanagar',
  ahmadnagar: 'Ahilyanagar',
  vasai: 'Vasai-Virar',
  'vasai virar': 'Vasai-Virar',
  aurangabad: 'Chhatrapati Sambhajinagar',
  osmanabad: 'Dharashiv',
};

/**
 * High-confidence venue-id district overrides (verified from address + city text).
 * Only used when name match is unique / id listed.
 */
const DISTRICT_OVERRIDES_BY_ID: Record<
  number,
  { districtName: string; reason: string; cityName?: string }
> = {
  2: { districtName: 'Mumbai Suburban', reason: 'Vile Parle East landmark', cityName: 'Mumbai' },
  4: { districtName: 'Thane', reason: 'Thane city text; was wrongly Pune', cityName: 'Thane' },
  5: { districtName: 'Pune', reason: 'Pavilion Mall is in Pune; was Mumbai City', cityName: 'Pune' },
  6: { districtName: 'Pune', reason: 'Westend Mall is in Pune; was Mumbai City', cityName: 'Pune' },
  7: {
    districtName: 'Mumbai Suburban',
    reason: 'R City Mall Ghatkopar is Mumbai Suburban',
    cityName: 'Mumbai',
  },
  9: { districtName: 'Mumbai Suburban', reason: 'Vile Parle East', cityName: 'Mumbai' },
  12: { districtName: 'Mumbai Suburban', reason: 'Same Dinanath landmark Vile Parle', cityName: 'Mumbai' },
};

/** Suspected same physical venue; keep both rows — soft-unverify zero-dep copy only */
const SUSPECTED_DUPES: { keepId: number; softId: number; note: string }[] = [
  { keepId: 2, softId: 12, note: 'Dinanath Mangeshkar Natyagruha Vile Parle — likely seed duplicate' },
  { keepId: 3, softId: 53, note: 'Yashwantrao Chavan Natyagruha Pune — likely seed duplicate' },
];

type Proposed = {
  venueId: number;
  name: string;
  field: 'city_id' | 'district_id' | 'verification_status';
  from: number | string | null;
  to: number | string | null;
  reason: string;
};

async function main() {
  const host = (() => {
    try {
      return new URL(poolUrl().replace(/^postgresql?/i, 'http')).hostname;
    } catch {
      return '(unparsed)';
    }
  })();
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(
    `DB: ${host.includes('supabase') ? 'supabase-pooler (PRODUCTION unless confirmed staging)' : host}`
  );

  const p = new pg.Pool({ connectionString: poolUrl(), ssl: { rejectUnauthorized: false } });
  const client = await p.connect();

  try {
    const districts = (
      await client.query(`SELECT id, name, code FROM districts`)
    ).rows as { id: number; name: string; code: string }[];
    const distByName = new Map(districts.map((d) => [norm(d.name), d]));

    const cities = (
      await client.query(`SELECT id, name, district_id FROM cities`)
    ).rows as { id: number; name: string; district_id: number | null }[];
    const cityByName = new Map(cities.map((c) => [norm(c.name), c]));

    const venues = (
      await client.query(`
        SELECT id, name, city, address, district_id, city_id, verification_status
        FROM venues ORDER BY id
      `)
    ).rows as {
      id: number;
      name: string;
      city: string;
      address: string;
      district_id: number | null;
      city_id: number | null;
      verification_status: string;
    }[];

    const proposed: Proposed[] = [];
    const unresolved: { venueId: number; name: string; city: string; reason: string }[] = [];
    let unchanged = 0;

    function resolveCityRow(cityText: string) {
      const n = norm(cityText);
      const alias = CITY_ALIASES[n];
      if (alias) return cityByName.get(norm(alias)) || null;
      return cityByName.get(n) || null;
    }

    for (const v of venues) {
      let nextCityId = v.city_id;
      let nextDistrictId = v.district_id;
      let touched = false;

      const cityRow = resolveCityRow(v.city);
      if (!cityRow) {
        unresolved.push({
          venueId: v.id,
          name: v.name,
          city: v.city,
          reason: 'No matching cities row (and no alias)',
        });
      } else if (v.city_id !== cityRow.id) {
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'city_id',
          from: v.city_id,
          to: cityRow.id,
          reason: `Match city text "${v.city}" → cities.id=${cityRow.id} (${cityRow.name})`,
        });
        nextCityId = cityRow.id;
        touched = true;
      }

      // High-confidence district override by venue id (wrong Mumbai↔Pune etc.)
      const override = DISTRICT_OVERRIDES_BY_ID[v.id];
      if (override) {
        const d = distByName.get(norm(override.districtName));
        if (d && v.district_id !== d.id) {
          proposed.push({
            venueId: v.id,
            name: v.name,
            field: 'district_id',
            from: v.district_id,
            to: d.id,
            reason: override.reason,
          });
          nextDistrictId = d.id;
          touched = true;
        }
      } else if (cityRow?.district_id != null && v.district_id == null) {
        // Only fill missing district from city — never auto-flip City↔Suburban for "Mumbai"
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'district_id',
          from: v.district_id,
          to: cityRow.district_id,
          reason: `Fill null district from city ${cityRow.name}`,
        });
        nextDistrictId = cityRow.district_id;
        touched = true;
      } else if (
        cityRow?.district_id != null &&
        v.district_id != null &&
        v.district_id !== cityRow.district_id &&
        norm(v.city) !== 'mumbai'
      ) {
        // Non-Mumbai: if city FK district disagrees with venue district, align to city
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'district_id',
          from: v.district_id,
          to: cityRow.district_id,
          reason: `Align district to city.district_id for ${cityRow.name}`,
        });
        nextDistrictId = cityRow.district_id;
        touched = true;
      }

      if (!touched) unchanged += 1;
      void nextDistrictId;
      void nextCityId;
    }

    // Soft-flag suspected duplicates with zero event deps
    for (const duo of SUSPECTED_DUPES) {
      const deps = await client.query(
        `SELECT
           (SELECT COUNT(*)::int FROM events WHERE venue_id=$1) AS events,
           (SELECT COUNT(*)::int FROM orders o JOIN events e ON e.id=o.event_id WHERE e.venue_id=$1) AS orders
        `,
        [duo.softId]
      );
      const soft = venues.find((v) => v.id === duo.softId);
      if (!soft) continue;
      if (Number(deps.rows[0].events) === 0 && Number(deps.rows[0].orders) === 0) {
        if (soft.verification_status !== 'unverified') {
          proposed.push({
            venueId: duo.softId,
            name: soft.name,
            field: 'verification_status',
            from: soft.verification_status,
            to: 'unverified',
            reason: `Suspected duplicate of venue #${duo.keepId}; zero events/orders. ${duo.note}`,
          });
        }
      } else {
        unresolved.push({
          venueId: duo.softId,
          name: soft.name,
          city: soft.city,
          reason: `Suspected duplicate of #${duo.keepId} but has deps — manual merge review only`,
        });
      }
    }

    const summary = {
      mode: APPLY ? 'apply' : 'dry-run',
      hostFamily: host,
      venuesAudited: venues.length,
      proposedChanges: proposed.length,
      unchangedVenuesApprox: unchanged,
      unresolved: unresolved.length,
      byField: {
        city_id: proposed.filter((p) => p.field === 'city_id').length,
        district_id: proposed.filter((p) => p.field === 'district_id').length,
        verification_status: proposed.filter((p) => p.field === 'verification_status').length,
      },
    };

    console.log('\nSummary:', summary);
    console.log('\nSample proposed (first 25):');
    console.log(JSON.stringify(proposed.slice(0, 25), null, 2));
    if (unresolved.length) {
      console.log('\nUnresolved:', JSON.stringify(unresolved, null, 2));
    }

    const out = {
      generatedAt: new Date().toISOString(),
      summary,
      proposed,
      unresolved,
      suspectedDuplicates: SUSPECTED_DUPES,
      cityAliases: CITY_ALIASES,
      districtOverridesById: DISTRICT_OVERRIDES_BY_ID,
    };
    const outPath = path.join(process.cwd(), 'docs', 'VENUE_LOCATION_REPAIR_DRY_RUN.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`\nWrote ${outPath}`);

    if (!APPLY) {
      console.log('\nNo DB writes. Re-run with --apply after review.');
      return;
    }

    if (host.includes('supabase')) {
      console.log(
        '\nWARNING: Target looks like hosted Supabase (production). Proceeding because --apply was explicit.'
      );
    }

    await client.query('BEGIN');
    let applied = 0;
    for (const ch of proposed) {
      if (ch.field === 'city_id') {
        await client.query(`UPDATE venues SET city_id = $1 WHERE id = $2`, [ch.to, ch.venueId]);
      } else if (ch.field === 'district_id') {
        await client.query(`UPDATE venues SET district_id = $1 WHERE id = $2`, [ch.to, ch.venueId]);
      } else if (ch.field === 'verification_status') {
        await client.query(`UPDATE venues SET verification_status = $1 WHERE id = $2`, [
          ch.to,
          ch.venueId,
        ]);
      }
      applied += 1;
    }

    // Audit log rows (best-effort)
    try {
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          'repair-venue-locations',
          'venue_location_repair',
          'venues',
          0,
          JSON.stringify({ applied, proposedCount: proposed.length, at: new Date().toISOString() }),
        ]
      );
    } catch {
      /* schema may differ; non-fatal */
    }

    await client.query('COMMIT');
    console.log(`\nAPPLIED ${applied} field updates. COMMIT OK.`);

    const after = await client.query(`
      SELECT
        COUNT(*)::int AS venues,
        COUNT(*) FILTER (WHERE city_id IS NULL)::int AS null_city_id,
        COUNT(*) FILTER (WHERE district_id IS NULL)::int AS null_district_id
      FROM venues
    `);
    console.log('After:', after.rows[0]);
  } catch (e) {
    if (APPLY) {
      try {
        await client.query('ROLLBACK');
        console.error('ROLLBACK');
      } catch {
        /* */
      }
    }
    throw e;
  } finally {
    client.release();
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
