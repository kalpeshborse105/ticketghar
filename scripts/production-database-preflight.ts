/**
 * Production test-catalogue reset PREFLIGHT (read-only).
 *
 * Purpose: Print preserve vs clear table counts and write
 *   docs/PRODUCTION_RESET_PREFLIGHT.json
 * Does not DELETE/UPDATE.
 *
 * Env: DATABASE_URL required.
 * Failure: exits 1 if required preserve tables missing or users count is 0.
 * Rollback: N/A (read-only).
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

const CLEAR_TABLES = [
  'ticket_scans',
  'tickets',
  'seat_inventory',
  'settlements',
  'orders',
  'event_reviews',
  'event_images',
  'ticket_types',
  'event_sessions',
  'events',
  'seats',
  'venue_sections',
  'venues',
] as const;

const PRESERVE_TABLES = [
  'users',
  'organizers',
  'districts',
  'talukas',
  'cities',
  'app_secrets',
  'app_runtime_config',
  'home_sections',
] as const;

const OPTIONAL_CLEAR = ['coupons', 'announcements', 'notification_log', 'audit_logs', 'partner_leads'] as const;

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

async function count(p: pg.Pool, table: string): Promise<number | null> {
  const exists = await p.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  if (!exists.rowCount) return null;
  const r = await p.query(`SELECT COUNT(*)::int AS c FROM public.${quote(table)}`);
  return r.rows[0].c as number;
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

  try {
    const clear: Record<string, number | null> = {};
    const preserve: Record<string, number | null> = {};
    const optional: Record<string, number | null> = {};

    for (const t of CLEAR_TABLES) clear[t] = await count(p, t);
    for (const t of PRESERVE_TABLES) preserve[t] = await count(p, t);
    for (const t of OPTIONAL_CLEAR) optional[t] = await count(p, t);

    const forbidden = ['bookings', 'booking_items', 'payments'];
    const unexpected: string[] = [];
    for (const t of forbidden) {
      if ((await count(p, t)) !== null) unexpected.push(t);
    }

    const adminUsers = (
      await p.query(
        `SELECT id, email, role, status FROM users
         WHERE role IN ('super_admin','admin','manager','operations','finance','scanner')
         ORDER BY id`
      )
    ).rows;

    const usersTotal = preserve.users ?? 0;
    const clearTotal = Object.values(clear).reduce<number>((a, n) => a + (n || 0), 0);

    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'preflight-readonly',
      host,
      warning:
        host.isProductionLikely
          ? 'Host looks PRODUCTION-like. Backup with pg_dump before any --apply.'
          : 'Non-production-like host.',
      clearTables: clear,
      preserveTables: preserve,
      optionalClearTables: optional,
      clearRowTotal: clearTotal,
      unexpectedLegacyTables: unexpected,
      adminLikeUsers: adminUsers.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
      })),
      fiveCities: ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Thane'],
      nextSteps: [
        'Take external pg_dump (docs/PRODUCTION_DATABASE_BACKUP_AND_RESTORE.md)',
        'Review docs/PRODUCTION_DATABASE_RESET_PLAN.md',
        'Dry-run: npx tsx scripts/production-database-reset.ts',
        'Staging apply only with explicit flags',
      ],
    };

    const outPath = path.join(process.cwd(), 'docs', 'PRODUCTION_RESET_PREFLIGHT.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(JSON.stringify({ host, clearRowTotal: clearTotal, preserve, clear, adminLikeUsers: report.adminLikeUsers.length }, null, 2));
    console.log('WROTE', outPath);

    if (usersTotal < 1) {
      console.error('FAIL: users table empty — refusing to recommend reset (would strand auth)');
      process.exit(1);
    }
    for (const t of PRESERVE_TABLES) {
      if (preserve[t] === null) {
        console.error(`FAIL: preserve table missing: ${t}`);
        process.exit(1);
      }
    }
  } finally {
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
