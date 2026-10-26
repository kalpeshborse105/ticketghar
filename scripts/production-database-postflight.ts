/**
 * Post-reset validation (read-only).
 *
 * Purpose: Assert catalogue/commerce tables empty (or at expected floors),
 * preserve tables still populated, location masters intact.
 *
 * Env: DATABASE_URL
 * Failure: exit 1 on invariant breach.
 * Rollback: N/A
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

function classifyHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.includes('supabase')) {
    return { hostFamily: 'supabase-pooler', isProductionLikely: true, hostname };
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return { hostFamily: 'localhost', isProductionLikely: false, hostname };
  }
  return { hostFamily: hostname, isProductionLikely: true, hostname };
}

function quote(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad table ${name}`);
  return `"${name}"`;
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

  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: host.hostFamily === 'localhost' ? undefined : { rejectUnauthorized: false },
  });

  const mustBeZero = [
    'venues',
    'venue_sections',
    'seats',
    'events',
    'event_sessions',
    'ticket_types',
    'seat_inventory',
    'orders',
    'tickets',
    'ticket_scans',
    'settlements',
    'event_reviews',
    'event_images',
  ];

  const mustRemainPositive = ['users', 'districts', 'talukas', 'cities', 'app_secrets'];

  const counts: Record<string, number> = {};
  const failures: string[] = [];

  try {
    for (const t of [...mustBeZero, ...mustRemainPositive, 'organizers', 'home_sections', 'app_runtime_config']) {
      const r = await p.query(`SELECT COUNT(*)::int AS c FROM public.${quote(t)}`);
      counts[t] = r.rows[0].c as number;
    }

    for (const t of mustBeZero) {
      if (counts[t] !== 0) failures.push(`${t} expected 0 got ${counts[t]}`);
    }
    for (const t of mustRemainPositive) {
      if (counts[t] < 1) failures.push(`${t} expected >=1 got ${counts[t]}`);
    }
    if (counts.districts !== 36) {
      failures.push(`districts expected 36 got ${counts.districts}`);
    }

    const five = ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Thane'];
    const cityRows = (
      await p.query(`SELECT name FROM cities WHERE name = ANY($1::text[]) ORDER BY name`, [five])
    ).rows.map((r) => r.name as string);
    const missingCities = five.filter((c) => !cityRows.includes(c));
    if (missingCities.length) failures.push(`missing city catalog rows: ${missingCities.join(',')}`);

    const report = {
      generatedAt: new Date().toISOString(),
      host,
      counts,
      fiveCitiesPresent: cityRows,
      ok: failures.length === 0,
      failures,
      note: 'If ok=false, do not import theatres until reset is completed or restored.',
    };

    const out = path.join(process.cwd(), 'docs', 'PRODUCTION_RESET_POSTFLIGHT.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    console.log('WROTE', out);

    if (failures.length) process.exit(1);
  } finally {
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
