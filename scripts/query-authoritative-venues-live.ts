/** READ-ONLY snapshot of authoritative theatres + Mumbai/Pune catalog FKs */
import { config } from 'dotenv';
import pg from 'pg';
import { loadAuthoritativeTheatres } from '../src/lib/venue-eligibility.ts';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function main() {
  const ids = loadAuthoritativeTheatres().authoritativeTheatreIds;
  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const venues = await p.query(
    `
    SELECT v.id, v.name, v.city, v.address, v.city_id, v.district_id, v.verification_status,
           c.name AS city_name, c.district_id AS city_catalog_district_id,
           d.name AS district_name, d.code AS district_code
    FROM venues v
    LEFT JOIN cities c ON c.id = v.city_id
    LEFT JOIN districts d ON d.id = v.district_id
    WHERE v.id = ANY($1::int[])
    ORDER BY v.id
  `,
    [ids]
  );
  console.log(JSON.stringify(venues.rows, null, 2));

  const cat = await p.query(`
    SELECT c.id, c.name, c.district_id, d.name AS district_name, d.code
    FROM cities c
    LEFT JOIN districts d ON d.id = c.district_id
    WHERE LOWER(c.name) IN ('mumbai','pune','thane','navi mumbai')
    ORDER BY c.id
  `);
  console.log('CATALOG', JSON.stringify(cat.rows, null, 2));

  const dups = await p.query(`
    SELECT lower(trim(name)) AS n, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
    FROM cities GROUP BY 1 HAVING COUNT(*) > 1
  `);
  console.log('DUP_CITIES', dups.rows);

  const dd = await p.query(`
    SELECT lower(trim(name)) AS n, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
    FROM districts GROUP BY 1 HAVING COUNT(*) > 1
  `);
  console.log('DUP_DISTRICTS', dd.rows);

  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
