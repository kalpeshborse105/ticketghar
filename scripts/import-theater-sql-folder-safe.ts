/**
 * Safe post-clear import from data/theater-sql.
 * - Inserts venue catalogue rows only (no seats/events/sessions).
 * - verification_status = verified for official NCPA; unverified for research candidates.
 * - Fixes schema types (int flags, NOT NULL capacity, text facilities).
 * - Maps Ahilyanagar → Ahmednagar, etc.
 * - Idempotent on lower(name)+lower(city).
 * Default: dry-run. Apply: --apply
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

const DISTRICT_ALIASES: Record<string, string> = {
  ahilyanagar: 'Ahmednagar',
  ahmednagar: 'Ahmednagar',
  'chhatrapati sambhaji nagar': 'Chhatrapati Sambhajinagar',
  'chhatrapati sambhajinagar': 'Chhatrapati Sambhajinagar',
  aurangabad: 'Chhatrapati Sambhajinagar',
  'mumbai city': 'Mumbai City',
  'mumbai suburban': 'Mumbai Suburban',
  mumbai: 'Mumbai City', // only when district column says Mumbai without City/Suburban — prefer City for Nariman Point; address can override later
};

type Row = {
  name: string;
  nameMr: string;
  address: string;
  city: string;
  districtName: string | null;
  sourceUrl: string | null;
  capacity: number | null;
  ownershipType: string;
  verificationStatus: 'verified' | 'unverified';
  facilities: string;
  originFile: string;
};

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

/** Split SQL VALUE tuples respecting quotes */
function extractTuples(sql: string): string[][] {
  const tuples: string[][] = [];
  // Find VALUES ... sections; take content between first VALUES and trailing )
  const valuesIdx = sql.search(/\bVALUES\b/i);
  if (valuesIdx < 0) return tuples;
  let i = valuesIdx + 6;
  while (i < sql.length) {
    while (i < sql.length && /\s|,/.test(sql[i])) i++;
    if (sql[i] !== '(') break;
    i++; // past (
    const fields: string[] = [];
    while (i < sql.length && sql[i] !== ')') {
      while (i < sql.length && /\s|,/.test(sql[i])) i++;
      if (sql[i] === ')') break;
      if (sql[i] === "'") {
        i++;
        let s = '';
        while (i < sql.length) {
          if (sql[i] === "'" && sql[i + 1] === "'") {
            s += "'";
            i += 2;
            continue;
          }
          if (sql[i] === "'") {
            i++;
            break;
          }
          s += sql[i++];
        }
        // skip ::casts
        while (i < sql.length && /[a-z0-9_:]/i.test(sql[i])) i++;
        fields.push(s);
      } else {
        let raw = '';
        while (i < sql.length && sql[i] !== ',' && sql[i] !== ')') {
          raw += sql[i++];
        }
        fields.push(raw.trim());
        while (i < sql.length && /[a-z0-9_:]/i.test(sql[i]) && sql[i] !== ',') {
          // absorb leftover cast if any stuck — usually already in raw
          break;
        }
      }
    }
    if (sql[i] === ')') i++;
    if (fields.length >= 3) tuples.push(fields);
    while (i < sql.length && /\s/.test(sql[i])) i++;
    if (sql[i] === ',') {
      i++;
      continue;
    }
    break;
  }
  return tuples;
}

function parseNullInt(v: string): number | null {
  if (!v || /^null/i.test(v)) return null;
  const n = parseInt(v.replace(/::integer/i, '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function loadRowsFromFolder(dir: string): Row[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
  const rows: Row[] = [];

  for (const file of files) {
    const full = path.join(dir, file);
    const sql = fs.readFileSync(full, 'utf8');
    const tuples = extractTuples(sql);
    const isVerifiedFile = file.includes('verified_venue_catalogue');
    const isBmsRich =
      file.includes('bms_venue_candidates_first_5') ||
      (file.includes('bms') && sql.includes('ownership_type'));

    for (const f of tuples) {
      // Skip disabled false WHERE templates
      if (f.every((x) => !x || /^null$/i.test(x))) continue;

      let row: Row | null = null;

      if (isVerifiedFile && f.length >= 6) {
        // name, name_mr, address, city, state, capacity, ...
        row = {
          name: f[0],
          nameMr: f[1] || f[0],
          address: f[2],
          city: f[3],
          districtName: 'Mumbai City',
          sourceUrl: null,
          capacity: parseNullInt(f[5]),
          ownershipType: 'public_theatre',
          verificationStatus: 'verified',
          facilities: f[10] || f[9] || '[]',
          originFile: file,
        };
        const fac = f.find((x) => x.includes('official_source') || x.includes('http'));
        if (fac) row.facilities = fac.startsWith('[') ? fac : `[{"note":${JSON.stringify(fac)}}]`;
      } else if (file.includes('additional_taluka') || file.includes('remaining_districts') || file.includes('bms_venue_candidates_districts_21') || (file.includes('bms') && f.length <= 8)) {
        // district, venue_name, city, address, source_url, capacity, bool, review_status
        // OR district, name, address, city, state, capacity, platform, url, status, has_seat
        if (f.length >= 5 && f[4]?.includes('http')) {
          row = {
            name: f[1],
            nameMr: f[1],
            address: f[3],
            city: f[2],
            districtName: f[0],
            sourceUrl: f[4],
            capacity: parseNullInt(f[5] || ''),
            ownershipType: 'commercial_cinema',
            verificationStatus: 'unverified',
            facilities: JSON.stringify([
              {
                type: 'research_listing',
                url: f[4],
                review_status: f[7] || f[6] || 'unverified',
                origin: file,
              },
            ]),
            originFile: file,
          };
        } else if (f.length >= 8 && (f[6] === 'BookMyShow' || f[7]?.includes('http'))) {
          // district, name, address, city, state, capacity, platform, source_url, ...
          row = {
            name: f[1],
            nameMr: f[1],
            address: f[2],
            city: f[3],
            districtName: f[0],
            sourceUrl: f[7],
            capacity: parseNullInt(f[5]),
            ownershipType: 'commercial_cinema',
            verificationStatus: 'unverified',
            facilities: JSON.stringify([
              {
                type: 'booking_platform_listing',
                platform: f[6],
                url: f[7],
                origin: file,
              },
            ]),
            originFile: file,
          };
        } else if (isBmsRich && f.length >= 4) {
          row = {
            name: f[1],
            nameMr: f[1],
            address: f[2],
            city: f[3],
            districtName: f[0],
            sourceUrl: null,
            capacity: parseNullInt(f[5] || ''),
            ownershipType: f[8] || 'commercial_cinema',
            verificationStatus: 'unverified',
            facilities:
              f.find((x) => x.includes('BookMyShow') || x.includes('http')) ||
              JSON.stringify([{ type: 'research', origin: file }]),
            originFile: file,
          };
          if (!row.facilities.startsWith('[')) {
            row.facilities = JSON.stringify([{ type: 'raw', value: row.facilities, origin: file }]);
          }
        }
      } else if (file.includes('bms') && f.length >= 4) {
        row = {
          name: f[1],
          nameMr: f[1],
          address: f[2],
          city: f[3],
          districtName: f[0],
          sourceUrl: null,
          capacity: parseNullInt(f[5] || ''),
          ownershipType: 'commercial_cinema',
          verificationStatus: 'unverified',
          facilities: JSON.stringify([{ type: 'bms_candidate', origin: file, fields: f.length }]),
          originFile: file,
        };
        const urlField = f.find((x) => x.includes('http'));
        if (urlField) {
          row.sourceUrl = urlField.includes('http')
            ? urlField.match(/https?:\/\/[^"'\s]+/)?.[0] || null
            : null;
          if (urlField.trim().startsWith('[')) row.facilities = urlField;
          else if (row.sourceUrl) {
            row.facilities = JSON.stringify([
              { type: 'booking_platform_listing', platform: 'BookMyShow', url: row.sourceUrl, origin: file },
            ]);
          }
        }
      }

      if (row && row.name && row.city && row.address) {
        rows.push(row);
      }
    }
  }

  // Dedupe by name+city
  const seen = new Set<string>();
  const deduped: Row[] = [];
  for (const r of rows) {
    const k = `${r.name.trim().toLowerCase()}|${r.city.trim().toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }
  return deduped;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dir = path.join(process.cwd(), 'data', 'theater-sql');
  const rows = loadRowsFromFolder(dir);
  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', parsedRows: rows.length, sample: rows.slice(0, 3) }, null, 2));

  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const districts = (
      await p.query(`SELECT id, name FROM districts`)
    ).rows as { id: number; name: string }[];
    const distByName = new Map(districts.map((d) => [d.name.toLowerCase(), d]));

    const cities = (await p.query(`SELECT id, name, district_id FROM cities`)).rows as {
      id: number;
      name: string;
      district_id: number | null;
    }[];
    const cityByName = new Map<string, { id: number; name: string; district_id: number | null }[]>();
    for (const c of cities) {
      const k = c.name.toLowerCase();
      (cityByName.get(k) || cityByName.set(k, []).get(k)!).push(c);
    }

    function resolveDistrictId(districtName: string | null, city: string): number | null {
      if (districtName) {
        const alias =
          DISTRICT_ALIASES[districtName.trim().toLowerCase()] || districtName.trim();
        const hit = distByName.get(alias.toLowerCase());
        if (hit) return hit.id;
      }
      const cityHits = cityByName.get(city.trim().toLowerCase()) || [];
      if (cityHits.length === 1 && cityHits[0].district_id) return cityHits[0].district_id;
      return null;
    }

    function resolveCityId(city: string, districtId: number | null): number | null {
      const hits = cityByName.get(city.trim().toLowerCase()) || [];
      if (hits.length === 1) return hits[0].id;
      if (hits.length > 1 && districtId != null) {
        const m = hits.filter((h) => h.district_id === districtId);
        if (m.length === 1) return m[0].id;
      }
      return null; // never pick LIMIT 1 on ambiguous
    }

    if (!apply) {
      console.log('Dry-run only. Re-run with --apply to insert.');
      return;
    }

    let inserted = 0;
    let skipped = 0;
    const insertedVerified: { id: number; name: string; city: string }[] = [];

    const client = await p.connect();
    try {
      await client.query('BEGIN');
      for (const r of rows) {
        const exists = await client.query(
          `SELECT id FROM venues WHERE lower(trim(name))=lower(trim($1)) AND lower(trim(city))=lower(trim($2)) LIMIT 1`,
          [r.name, r.city]
        );
        if (exists.rowCount) {
          skipped++;
          continue;
        }
        const districtId = resolveDistrictId(r.districtName, r.city);
        const cityId = resolveCityId(r.city, districtId);
        const capacity = r.capacity != null && r.capacity > 0 ? r.capacity : 600;
        const fac =
          typeof r.facilities === 'string' ? r.facilities : JSON.stringify(r.facilities);

        const ins = await client.query(
          `INSERT INTO venues (
            name, name_mr, address, city, state, total_capacity,
            verification_status, has_seat_layout, is_template, ownership_type, facilities,
            city_id, district_id
          ) VALUES (
            $1,$2,$3,$4,'Maharashtra',$5,
            $6,0,1,$7,$8,
            $9,$10
          ) RETURNING id, name, city`,
          [
            r.name,
            r.nameMr || r.name,
            r.address,
            r.city,
            capacity,
            r.verificationStatus,
            r.ownershipType || 'public_theatre',
            fac,
            cityId,
            districtId,
          ]
        );
        inserted++;
        if (r.verificationStatus === 'verified') {
          insertedVerified.push(ins.rows[0]);
        }
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          'import-theater-sql-folder-safe.ts',
          'system',
          'theatre_sql_folder_import',
          'venues',
          'catalogue',
          JSON.stringify({ inserted, skipped, verified: insertedVerified.length }),
        ]
      );
      await client.query('COMMIT');
      console.log(JSON.stringify({ status: 'COMMITTED', inserted, skipped, insertedVerified }, null, 2));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
