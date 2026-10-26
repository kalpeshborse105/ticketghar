/**
 * READ-ONLY: inspect authoritative theatre FKs and write a reviewed SQL file.
 * Does NOT apply updates. Owner must run the SQL after review.
 *
 * npx tsx scripts/prepare-authoritative-location-repair.ts
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { loadAuthoritativeTheatres } from '../src/lib/venue-eligibility.ts';
import {
  findDistrictByName,
  isMumbaiFamilyCityText,
  resolveCityRow,
} from './lib/venue-location-repair-core.ts';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

/** Address-evidenced district for authoritative IDs only */
const AUTH_DISTRICT: Record<number, string> = {
  55: 'Pune', // Camp, Pune
  56: 'Mumbai City', // Dadar West
  59: 'Mumbai City', // Nariman Point NCPA
  60: 'Mumbai City',
  61: 'Mumbai City',
  62: 'Pune', // Sadashiv Peth
  63: 'Pune', // Chinchwad / PCMC — cities catalog uses Pune for upsert text
  64: 'Pune',
  65: 'Pune',
  66: 'Pune', // Bibwewadi
};

async function main() {
  const catalog = loadAuthoritativeTheatres();
  const ids = catalog.authoritativeTheatreIds;
  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });

  const cities = (
    await p.query(`SELECT id, name, district_id FROM cities ORDER BY id`)
  ).rows;
  const districts = (
    await p.query(`SELECT id, name, code FROM districts ORDER BY id`)
  ).rows;
  const venues = (
    await p.query(
      `SELECT id, name, city, address, city_id, district_id, verification_status
       FROM venues WHERE id = ANY($1::int[]) ORDER BY id`,
      [ids]
    )
  ).rows;

  const updates: Array<{
    venueId: number;
    field: 'city_id' | 'district_id';
    from: number | null;
    to: number;
    reason: string;
  }> = [];
  const unresolved: string[] = [];
  const reportRows: unknown[] = [];

  for (const v of venues) {
    const cityRes = resolveCityRow(v.city, cities);
    let nextCityId = v.city_id == null ? null : Number(v.city_id);
    let nextDistrictId = v.district_id == null ? null : Number(v.district_id);

    if (cityRes.ok) {
      if (nextCityId !== Number(cityRes.city.id)) {
        updates.push({
          venueId: v.id,
          field: 'city_id',
          from: v.city_id,
          to: cityRes.city.id,
          reason: `Unique cities.id=${cityRes.city.id} (${cityRes.city.name}) from text "${v.city}"`,
        });
        nextCityId = cityRes.city.id;
      }
    } else {
      unresolved.push(`#${v.id} city: ${cityRes.reason}`);
    }

    const wantDistrict = AUTH_DISTRICT[v.id];
    if (wantDistrict) {
      const dist = findDistrictByName(wantDistrict, districts);
      if (!dist) {
        unresolved.push(`#${v.id} district "${wantDistrict}" not unique in districts`);
      } else if (nextDistrictId !== Number(dist.id)) {
        updates.push({
          venueId: v.id,
          field: 'district_id',
          from: v.district_id,
          to: dist.id,
          reason: `Address/provenance → ${wantDistrict} (districts.id=${dist.id})`,
        });
        nextDistrictId = dist.id;
      }
    } else if (
      cityRes.ok &&
      cityRes.city.district_id != null &&
      !isMumbaiFamilyCityText(v.city) &&
      nextDistrictId == null
    ) {
      updates.push({
        venueId: v.id,
        field: 'district_id',
        from: null,
        to: cityRes.city.district_id,
        reason: `Fill from cities.district_id for ${cityRes.city.name}`,
      });
    }

    // Compatibility: city.district_id must match venue.district_id when both set
    if (cityRes.ok && nextCityId && nextDistrictId) {
      if (
        cityRes.city.district_id != null &&
        Number(cityRes.city.district_id) !== Number(nextDistrictId) &&
        !isMumbaiFamilyCityText(v.city)
      ) {
        unresolved.push(
          `#${v.id} city ${cityRes.city.name} belongs to district ${cityRes.city.district_id} but repair wants ${nextDistrictId}`
        );
      }
    }

    reportRows.push({
      id: v.id,
      name: v.name,
      city_text: v.city,
      address: v.address,
      verification_status: v.verification_status,
      city_id: v.city_id,
      district_id: v.district_id,
      proposedCityId: nextCityId,
      proposedDistrictId: nextDistrictId,
    });
  }

  const missing = ids.filter((id) => !venues.some((v) => Number(v.id) === id));
  if (missing.length) unresolved.push(`Missing venue IDs in DB: ${missing.join(',')}`);

  const sqlLines = [
    '-- AUTHORITATIVE THEATRE LOCATION REPAIR (IDs 55,56,59-66)',
    '-- Generated READ-ONLY plan — DO NOT run until owner reviews.',
    '-- Does not change verification_status, names, events, tickets, orders.',
    'BEGIN;',
    '',
  ];

  for (const u of updates) {
    sqlLines.push(
      `-- ${u.reason}`,
      `UPDATE venues SET ${u.field} = ${u.to}`,
      `WHERE id = ${u.venueId}`,
      `  AND ${u.field} IS NOT DISTINCT FROM ${u.from === null ? 'NULL' : u.from}`,
      `  AND id IN (${ids.join(',')});`,
      ''
    );
  }

  sqlLines.push(
    '-- Assert all 10 rows still exist',
    `DO $$ BEGIN`,
    `  IF (SELECT COUNT(*) FROM venues WHERE id IN (${ids.join(',')})) <> ${ids.length} THEN`,
    `    RAISE EXCEPTION 'Authoritative venue count changed — rolling back';`,
    `  END IF;`,
    `END $$;`,
    '',
    '-- Review then COMMIT; or ROLLBACK;',
    'ROLLBACK; -- change to COMMIT after owner approval',
    ''
  );

  const outSql = path.join(process.cwd(), 'docs', 'AUTHORITATIVE_LOCATION_REPAIR.sql');
  const outJson = path.join(process.cwd(), 'docs', 'AUTHORITATIVE_LOCATION_REPAIR_PLAN.json');
  fs.writeFileSync(outSql, sqlLines.join('\n'));
  fs.writeFileSync(
    outJson,
    JSON.stringify(
      {
        sourceLabel: 'LIVE_DATABASE_READONLY_PLAN',
        generatedAt: new Date().toISOString(),
        applied: false,
        authoritativeIds: ids,
        updates,
        unresolved,
        venues: reportRows,
      },
      null,
      2
    )
  );

  console.log('updates', updates.length);
  console.log('unresolved', unresolved.length);
  console.log('Wrote', outSql);
  console.log('Wrote', outJson);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
