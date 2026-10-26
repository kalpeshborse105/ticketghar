/**
 * Read-only audit: venue ↔ district ↔ city mapping + candidate reconciliation.
 * Never mutates. Safe against hosted Supabase (treat as production).
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

function norm(s: string | null | undefined) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic expected district from free-text city/address — for audit flags only */
function guessDistrictFromText(city: string, address: string, districts: { id: number; name: string }[]) {
  const hay = norm(`${city} ${address}`);
  const rules: [RegExp, string][] = [
    [/\bpune\b|पुणे|kothrud|shivajinagar|hinjewadi|hadapsar|bibwewadi|chinchwad|pimpri/, 'Pune'],
    [/\bthane\b|ठाणे|kalwa|mira road|bhiwandi/, 'Thane'],
    [/\bmumbai\b|मुंबई|vile parle|andheri|dadar|bandra|goregaon|powai|prabhadevi|nariman|ghatkopar/, 'Mumbai City'],
    [/\bnavi mumbai\b|वाशी|vashi|nerul|belapur|kharghar/, 'Thane'],
    [/\bnashik\b|नाशिक/, 'Nashik'],
    [/\bnagpur\b|नागपूर/, 'Nagpur'],
    [/\baurangabad\b|औरंगाबाद|chhatrapati sambhajinagar|sambhajinagar/, 'Aurangabad'],
    [/\bsatara\b/, 'Satara'],
    [/\bsangli\b/, 'Sangli'],
    [/\bsolapur\b/, 'Solapur'],
    [/\bkolhapur\b/, 'Kolhapur'],
    [/\bahmednagar\b|ahilyanagar|अहमदनगर/, 'Ahmednagar'],
    [/\bakola\b/, 'Akola'],
    [/\balibag\b|raigad\b/, 'Raigad'],
    [/\bamravati\b/, 'Amravati'],
    [/\bjalgaon\b/, 'Jalgaon'],
    [/\bwardha\b/, 'Wardha'],
    [/\bwashim\b/, 'Washim'],
    [/\bratnagiri\b/, 'Ratnagiri'],
    [/\bpalghar\b/, 'Palghar'],
  ];
  for (const [re, distName] of rules) {
    if (re.test(hay)) {
      const d = districts.find((x) => norm(x.name) === norm(distName));
      if (d) return d;
      // Mumbai Suburban vs City
      if (distName === 'Mumbai City') {
        const sub = districts.find((x) => /mumbai suburban/i.test(x.name));
        const cityD = districts.find((x) => /mumbai city/i.test(x.name));
        if (/andheri|goregaon|powai|ghatkopar|vile parle|borivali|malad|kandivali/.test(hay) && sub) return sub;
        if (cityD) return cityD;
      }
    }
  }
  return null;
}

async function main() {
  const hostHint = (() => {
    try {
      return new URL(poolUrl().replace(/^postgresql?/i, 'http')).hostname;
    } catch {
      return '(unparsed)';
    }
  })();
  console.log('DB host family:', hostHint.includes('supabase') ? 'supabase-pooler (treat as PRODUCTION)' : hostHint);

  const p = new pg.Pool({ connectionString: poolUrl(), ssl: { rejectUnauthorized: false } });

  const counts = await p.query(`
    SELECT
      (SELECT COUNT(*)::int FROM venues) AS venues,
      (SELECT COUNT(*)::int FROM venues WHERE city_id IS NULL) AS null_city_id,
      (SELECT COUNT(*)::int FROM venues WHERE district_id IS NULL) AS null_district_id,
      (SELECT COUNT(*)::int FROM districts) AS districts,
      (SELECT COUNT(*)::int FROM cities) AS cities,
      (SELECT COUNT(*)::int FROM talukas) AS talukas
  `);
  console.log('counts', counts.rows[0]);

  const districts = (await p.query(`SELECT id, code, name, name_mr FROM districts ORDER BY id`)).rows as {
    id: number;
    code: string;
    name: string;
    name_mr: string;
  }[];

  const cities = (
    await p.query(`SELECT id, name, name_mr, district_id, taluka_id FROM cities ORDER BY id`)
  ).rows as { id: number; name: string; name_mr: string; district_id: number | null; taluka_id: number | null }[];

  const venues = (
    await p.query(`
      SELECT v.id, v.name, v.name_mr, v.city, v.address, v.district_id, v.city_id,
             v.verification_status, v.is_template, v.total_capacity,
             d.name AS district_name, c.name AS city_fk_name, c.district_id AS city_district_id
      FROM venues v
      LEFT JOIN districts d ON d.id = v.district_id
      LEFT JOIN cities c ON c.id = v.city_id
      ORDER BY v.id
    `)
  ).rows;

  const targets = [
    'pavilion',
    'pavillion',
    'westend',
    'ghanekar',
    'dinanath',
    'r city',
    'yashwantrao',
    'bal gandharva',
  ];
  const named = venues.filter((v: any) =>
    targets.some((t) => norm(v.name).includes(t) || norm(v.name_mr).includes(t))
  );
  console.log('\n=== Named audit targets ===');
  for (const v of named) {
    const guess = guessDistrictFromText(v.city, v.address, districts);
    console.log(
      JSON.stringify({
        id: v.id,
        name: v.name,
        city_text: v.city,
        district_id: v.district_id,
        district_name: v.district_name,
        city_id: v.city_id,
        city_fk: v.city_fk_name,
        expected_district: guess?.name || null,
        mismatch:
          guess && v.district_id && guess.id !== v.district_id
            ? true
            : guess && !v.district_id
              ? 'missing_district'
              : false,
      })
    );
  }

  // District vs free-text city mismatches (heuristic)
  const incorrectDistrict: any[] = [];
  const missingCityLink: any[] = [];
  const cityDistrictConflict: any[] = [];

  for (const v of venues) {
    if (v.city_id == null) {
      missingCityLink.push({ id: v.id, name: v.name, city: v.city });
    }
    const guess = guessDistrictFromText(v.city, v.address, districts);
    if (guess && v.district_id && guess.id !== Number(v.district_id)) {
      incorrectDistrict.push({
        id: v.id,
        name: v.name,
        city_text: v.city,
        stored_district: v.district_name,
        expected_district: guess.name,
        stored_district_id: v.district_id,
        expected_district_id: guess.id,
      });
    }
    if (v.city_id && v.city_district_id && v.district_id && Number(v.city_district_id) !== Number(v.district_id)) {
      cityDistrictConflict.push({
        id: v.id,
        name: v.name,
        venue_district: v.district_name,
        city_fk: v.city_fk_name,
        city_district_id: v.city_district_id,
      });
    }
  }

  console.log('\nincorrect_district_heuristic', incorrectDistrict.length);
  console.log(JSON.stringify(incorrectDistrict.slice(0, 30), null, 2));
  console.log('\nnull_city_id', missingCityLink.length);
  console.log('city_vs_venue_district_conflict', cityDistrictConflict.length);

  // Duplicate detection
  const byKey = new Map<string, any[]>();
  for (const v of venues) {
    const key = `${norm(v.name)}|${norm(v.city)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(v);
  }
  const exactDupes = [...byKey.entries()].filter(([, arr]) => arr.length > 1);
  console.log('\nexact_name_city_dupes', exactDupes.length);

  // Fuzzy same-name different city spelling
  const byNameOnly = new Map<string, any[]>();
  for (const v of venues) {
    const key = norm(v.name)
      .replace(/\bnatya\s*gruha\b/g, 'natyagruha')
      .replace(/\bnatya\s*griha\b/g, 'natyagruha')
      .replace(/\brang\s*mandir\b/g, 'rangmandir');
    if (!byNameOnly.has(key)) byNameOnly.set(key, []);
    byNameOnly.get(key)!.push(v);
  }
  const fuzzyNameDupes = [...byNameOnly.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([k, arr]) => ({
      key: k,
      ids: arr.map((x) => x.id),
      cities: arr.map((x) => x.city),
      names: arr.map((x) => x.name),
    }));
  console.log('\nfuzzy_same_normalized_name', fuzzyNameDupes.length);
  console.log(JSON.stringify(fuzzyNameDupes, null, 2));

  // Candidate reconciliation
  const candPath = path.join(process.cwd(), 'data', 'maharashtra_venues_candidates.json');
  let candidates: any[] = [];
  if (fs.existsSync(candPath)) {
    const raw = JSON.parse(fs.readFileSync(candPath, 'utf8'));
    candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  }
  console.log('\ncandidates_file_count', candidates.length);

  const classifications = {
    already_exists_correct: 0,
    already_exists_bad_mapping: 0,
    alternate_spelling: 0,
    duplicate_candidate: 0,
    new_ready: 0,
    new_missing_location: 0,
    unverified: 0,
    in_live_db_flag: 0,
    not_in_live_db: 0,
  };

  const reconciliation: any[] = [];
  for (const c of candidates) {
    const inDb = !!c.in_live_db || venues.some((v: any) => v.id === c.live_venue_id);
    if (c.in_live_db) classifications.in_live_db_flag += 1;
    else classifications.not_in_live_db += 1;

    const live = c.live_venue_id
      ? venues.find((v: any) => v.id === c.live_venue_id)
      : venues.find((v: any) => norm(v.name) === norm(c.name) && norm(v.city) === norm(c.city));

    let classification = 'unverified';
    if (live) {
      const guess = guessDistrictFromText(live.city, live.address, districts);
      const bad =
        (guess && live.district_id && guess.id !== Number(live.district_id)) || live.city_id == null;
      classification = bad ? 'already_exists_bad_mapping' : 'already_exists_correct';
      if (bad) classifications.already_exists_bad_mapping += 1;
      else classifications.already_exists_correct += 1;
    } else if (!c.district && !c.city) {
      classification = 'new_missing_location';
      classifications.new_missing_location += 1;
    } else if (!inDb) {
      classification = 'new_ready';
      classifications.new_ready += 1;
    } else {
      classifications.unverified += 1;
    }

    reconciliation.push({
      candidate_id: c.candidate_id,
      name: c.name,
      candidate_district: c.district,
      candidate_city: c.city,
      matched_venue_id: live?.id ?? c.live_venue_id ?? null,
      matched_city_id: live?.city_id ?? null,
      existing_district_id: live?.district_id ?? null,
      expected_district_id: live
        ? guessDistrictFromText(live.city, live.address, districts)?.id ?? null
        : null,
      match_method: live ? (c.live_venue_id ? 'live_venue_id' : 'name+city') : 'none',
      confidence: live ? 'high' : 'low',
      classification,
      required_action:
        classification === 'already_exists_bad_mapping'
          ? 'repair_location_fks'
          : classification === 'new_ready'
            ? 'manual_review_import'
            : 'none',
    });
  }

  console.log('\nclassification_counts', classifications);

  // Cities with unique names that collide across districts? (schema has name UNIQUE globally)
  const cityDupRisk = cities.filter((c) => !c.district_id);
  console.log('cities_without_district', cityDupRisk.length);

  const outDir = path.join(process.cwd(), 'docs');
  const report = {
    generatedAt: new Date().toISOString(),
    hostFamily: hostHint,
    counts: counts.rows[0],
    namedTargets: named,
    incorrectDistrictHeuristic: incorrectDistrict,
    missingCityLinkCount: missingCityLink.length,
    missingCityLinkSample: missingCityLink.slice(0, 40),
    cityDistrictConflict,
    exactNameCityDupes: exactDupes.map(([k, arr]) => ({ key: k, ids: arr.map((x) => x.id) })),
    fuzzySameNormalizedName: fuzzyNameDupes,
    candidateClassifications: classifications,
    reconciliationSample: reconciliation.slice(0, 50),
    reconciliationFullPath: 'docs/VENUE_LOCATION_RECONCILIATION.json',
  };

  fs.writeFileSync(path.join(outDir, 'VENUE_LOCATION_AUDIT.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(outDir, 'VENUE_LOCATION_RECONCILIATION.json'),
    JSON.stringify({ generatedAt: report.generatedAt, classifications, reconciliation }, null, 2)
  );
  console.log('\nWrote docs/VENUE_LOCATION_AUDIT.json and docs/VENUE_LOCATION_RECONCILIATION.json');

  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
