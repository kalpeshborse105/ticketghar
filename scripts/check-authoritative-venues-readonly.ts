/** READ-ONLY: confirm allowlisted theatre IDs exist and eligibility flags. */
import { config } from 'dotenv';
import pg from 'pg';
import {
  isEligibleForNewEvent,
  loadAuthoritativeTheatres,
} from '../src/lib/venue-eligibility.ts';

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
  const r = await p.query(
    `SELECT id, name, verification_status, city_id, district_id
     FROM venues WHERE id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );
  console.log(`found ${r.rowCount} of ${ids.length} authoritative IDs`);
  for (const row of r.rows) {
    const e = isEligibleForNewEvent({
      venueId: row.id,
      verificationStatus: row.verification_status,
      catalog,
    });
    console.log(
      JSON.stringify({
        id: row.id,
        name: row.name,
        vs: row.verification_status,
        city_id: row.city_id,
        district_id: row.district_id,
        eligible: e.ok,
      })
    );
  }
  const missing = ids.filter((id) => !r.rows.some((x) => Number(x.id) === Number(id)));
  console.log('missing', missing);
  await p.end();
  if (missing.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
