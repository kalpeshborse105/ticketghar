/**
 * READ-ONLY full-catalog venue location FK audit.
 * Flags missing mappings, invalid FKs, duplicate catalog names, city/district mismatches.
 * Does NOT propose auto-maps for all venues from names alone.
 *
 * npx tsx scripts/audit-all-venue-location-fks.ts
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { resolveUniqueCity } from './lib/authoritative-location-plan.ts';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function main() {
  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });

  const districts = (
    await p.query(`SELECT id, name, code FROM districts ORDER BY id`)
  ).rows;
  const cities = (
    await p.query(`SELECT id, name, district_id, taluka_id FROM cities ORDER BY id`)
  ).rows;
  const talukas = (
    await p.query(`SELECT id, name, district_id FROM talukas ORDER BY id`)
  ).rows;
  const venues = (
    await p.query(
      `SELECT id, name, city, address, city_id, district_id, verification_status FROM venues ORDER BY id`
    )
  ).rows;

  const districtIds = new Set(districts.map((d) => Number(d.id)));
  const cityIds = new Set(cities.map((c) => Number(c.id)));
  const talukaIds = new Set(talukas.map((t) => Number(t.id)));

  const duplicateCities = Object.values(
    cities.reduce((acc: Record<string, number[]>, c) => {
      const k = String(c.name).toLowerCase().trim();
      (acc[k] ||= []).push(c.id);
      return acc;
    }, {})
  ).filter((ids) => ids.length > 1);

  const duplicateDistricts = Object.values(
    districts.reduce((acc: Record<string, number[]>, d) => {
      const k = String(d.name).toLowerCase().trim();
      (acc[k] ||= []).push(d.id);
      return acc;
    }, {})
  ).filter((ids) => ids.length > 1);

  const missingCityId: number[] = [];
  const missingDistrictId: number[] = [];
  const invalidCityFk: number[] = [];
  const invalidDistrictFk: number[] = [];
  const cityDistrictMismatch: Array<{
    venueId: number;
    city_id: number;
    district_id: number;
    cityCatalogDistrictId: number;
  }> = [];
  const invalidTalukaOnCity: number[] = [];
  const ambiguousFreeTextCity: Array<{ venueId: number; city: string; reason: string }> =
    [];

  for (const c of cities) {
    if (c.taluka_id != null && !talukaIds.has(Number(c.taluka_id))) {
      invalidTalukaOnCity.push(c.id);
    }
    if (c.district_id != null && !districtIds.has(Number(c.district_id))) {
      invalidTalukaOnCity.push(c.id); // reuse bucket naming in report as invalidCityDistrict
    }
  }

  for (const v of venues) {
    if (v.city_id == null) missingCityId.push(v.id);
    else if (!cityIds.has(Number(v.city_id))) invalidCityFk.push(v.id);

    if (v.district_id == null) missingDistrictId.push(v.id);
    else if (!districtIds.has(Number(v.district_id))) invalidDistrictFk.push(v.id);

    if (v.city_id != null && v.district_id != null) {
      const city = cities.find((c) => Number(c.id) === Number(v.city_id));
      if (
        city?.district_id != null &&
        Number(city.district_id) !== Number(v.district_id)
      ) {
        cityDistrictMismatch.push({
          venueId: v.id,
          city_id: Number(v.city_id),
          district_id: Number(v.district_id),
          cityCatalogDistrictId: Number(city.district_id),
        });
      }
    }

    // Informational only: free-text uniqueness (not an auto-map)
    const textRes = resolveUniqueCity(v.city, cities);
    if (!textRes.ok && /Ambiguous/i.test(textRes.reason)) {
      ambiguousFreeTextCity.push({
        venueId: v.id,
        city: v.city,
        reason: textRes.reason,
      });
    }
  }

  const out = {
    sourceLabel: 'LIVE_DATABASE_READONLY_AUDIT',
    generatedAt: new Date().toISOString(),
    catalog: {
      districts: districts.length,
      cities: cities.length,
      talukas: talukas.length,
      venues: venues.length,
      duplicateCityNameGroups: duplicateCities.length,
      duplicateDistrictNameGroups: duplicateDistricts.length,
    },
    findings: {
      missingCityIdCount: missingCityId.length,
      missingDistrictIdCount: missingDistrictId.length,
      invalidCityFkCount: invalidCityFk.length,
      invalidDistrictFkCount: invalidDistrictFk.length,
      cityDistrictMismatchCount: cityDistrictMismatch.length,
      ambiguousFreeTextCityCount: ambiguousFreeTextCity.length,
      missingCityIdSample: missingCityId.slice(0, 40),
      missingDistrictIdSample: missingDistrictId.slice(0, 40),
      invalidCityFk,
      invalidDistrictFk,
      cityDistrictMismatch,
      ambiguousFreeTextCity: ambiguousFreeTextCity.slice(0, 40),
      duplicateCities,
      duplicateDistricts,
    },
    note: 'Audit only — no automatic name→FK mapping. Use prepare-authoritative-location-repair.ts for allowlisted IDs.',
  };

  const outPath = path.join(process.cwd(), 'docs', 'VENUE_LOCATION_FK_AUDIT.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.catalog, null, 2));
  console.log(JSON.stringify({
    missingCityId: out.findings.missingCityIdCount,
    missingDistrictId: out.findings.missingDistrictIdCount,
    invalidCityFk: out.findings.invalidCityFkCount,
    invalidDistrictFk: out.findings.invalidDistrictFkCount,
    mismatches: out.findings.cityDistrictMismatchCount,
    ambiguousText: out.findings.ambiguousFreeTextCityCount,
  }, null, 2));
  console.log('Wrote', outPath);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
