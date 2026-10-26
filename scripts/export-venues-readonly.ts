import { config } from 'dotenv';
import fs from 'fs';
import pg from 'pg';

config({ override: true });

async function main() {
  const raw = process.env.DATABASE_URL || '';
  const url = raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const venues = (
    await p.query(`
      SELECT id, name, name_mr, city, address, total_capacity, verification_status,
             ownership_type, has_seat_layout, is_template, district_id, city_id
      FROM venues
      ORDER BY city, name
    `)
  ).rows;

  const fuzzy: any[] = [];
  for (let i = 0; i < venues.length; i++) {
    for (let j = i + 1; j < venues.length; j++) {
      const a = venues[i];
      const b = venues[j];
      const na = String(a.name).toLowerCase().replace(/[^a-z0-9]/g, '');
      const nb = String(b.name).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        (na.length > 10 && nb.includes(na.slice(0, 12))) ||
        (nb.length > 10 && na.includes(nb.slice(0, 12))) ||
        (na.slice(0, 14) === nb.slice(0, 14) && na !== nb)
      ) {
        fuzzy.push({
          a: { id: a.id, name: a.name, city: a.city, capacity: a.total_capacity },
          b: { id: b.id, name: b.name, city: b.city, capacity: b.total_capacity },
        });
      }
    }
  }

  const payload = { generatedAt: new Date().toISOString(), venueCount: venues.length, fuzzyPairs: fuzzy, venues };
  fs.writeFileSync('docs/DB_AUDIT_VENUES_RAW.json', JSON.stringify(payload, null, 2), 'utf8');
  console.log(`venues=${venues.length} fuzzyPairs=${fuzzy.length}`);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
