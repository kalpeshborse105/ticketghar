/**
 * READ-ONLY: build reviewed SQL for authoritative theatre FK repair.
 * Does NOT apply. Ends with ROLLBACK by default.
 *
 * npx tsx scripts/prepare-authoritative-location-repair.ts
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { loadAuthoritativeTheatres } from '../src/lib/venue-eligibility.ts';
import {
  buildAuthoritativeLocationPlan,
  renderAuthoritativeRepairSql,
  VenueSnap,
} from './lib/authoritative-location-plan.ts';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

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
  ).rows as VenueSnap[];

  const plan = buildAuthoritativeLocationPlan({
    venues,
    cities,
    districts,
    authoritativeIds: ids,
  });

  const generatedAt = new Date().toISOString();
  const sql = renderAuthoritativeRepairSql({
    authoritativeIds: ids,
    venues,
    updates: plan.updates,
    finalByVenue: plan.finalByVenue,
    generatedAt,
  });

  const outSql = path.join(process.cwd(), 'docs', 'AUTHORITATIVE_LOCATION_REPAIR.sql');
  const outJson = path.join(process.cwd(), 'docs', 'AUTHORITATIVE_LOCATION_REPAIR_PLAN.json');
  fs.writeFileSync(outSql, sql);
  fs.writeFileSync(
    outJson,
    JSON.stringify(
      {
        sourceLabel: 'LIVE_DATABASE_READONLY_PLAN',
        generatedAt,
        applied: false,
        authoritativeIds: ids,
        updateCount: plan.updates.length,
        updates: plan.updates,
        unresolved: plan.unresolved,
        finalByVenue: plan.finalByVenue,
        venuesBefore: venues,
        note: 'SQL defaults to ROLLBACK. Do not COMMIT without owner review.',
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        updates: plan.updates.length,
        unresolved: plan.unresolved.length,
        fieldChanges: plan.updates.map(
          (u) => `#${u.venueId} ${u.field} ${u.from}→${u.to}`
        ),
      },
      null,
      2
    )
  );
  console.log('Wrote', outSql);
  console.log('Wrote', outJson);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
