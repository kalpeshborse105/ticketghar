/**
 * Production TEST CATALOGUE reset — default DRY-RUN.
 *
 * Purpose: Delete development theatres/events/orders/tickets/… while preserving
 * users, organizers, location masters, app_secrets, app_runtime_config, home_sections.
 *
 * Env: DATABASE_URL
 * Default: prints expected DELETE counts; no writes.
 * Apply: --apply --confirm=I_CLEAR_TEST_CATALOGUE
 *   + --i-confirm-staging  OR  --i-confirm-production (supabase host)
 *
 * Failure: aborts transaction; no partial commit.
 * Recovery: restore from external pg_dump (see BACKUP doc). In-TX backup tables are NOT used.
 *
 * Does NOT call payment providers. Does NOT delete app_secrets or users.
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

const DELETE_ORDER = [
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

const PRESERVE = [
  'users',
  'organizers',
  'districts',
  'talukas',
  'cities',
  'app_secrets',
  'app_runtime_config',
  'home_sections',
] as const;

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
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const confirm = args.find((a) => a.startsWith('--confirm='))?.slice('--confirm='.length);
  const stagingOk = args.includes('--i-confirm-staging');
  const productionOk = args.includes('--i-confirm-production');
  const clearOptional = args.includes('--also-clear-optional-marketing');

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

  const client = await p.connect();
  try {
    const expected: Record<string, number> = {};
    for (const t of DELETE_ORDER) {
      const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.${quote(t)}`);
      expected[t] = r.rows[0].c as number;
    }
    const preserveBefore: Record<string, number> = {};
    for (const t of PRESERVE) {
      const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.${quote(t)}`);
      preserveBefore[t] = r.rows[0].c as number;
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? 'APPLY' : 'DRY_RUN',
          host,
          expectedDeletes: expected,
          expectedDeleteTotal: Object.values(expected).reduce((a, b) => a + b, 0),
          preserveBefore,
          optionalMarketing: clearOptional,
        },
        null,
        2
      )
    );

    if (!apply) {
      console.log('Dry-run only. Re-run with --apply --confirm=I_CLEAR_TEST_CATALOGUE and staging/production flag.');
      return;
    }

    if (confirm !== 'I_CLEAR_TEST_CATALOGUE') {
      throw new Error('Refusing apply: need --confirm=I_CLEAR_TEST_CATALOGUE');
    }
    if (host.isProductionLikely && !productionOk) {
      throw new Error('Refusing apply on production-like host without --i-confirm-production');
    }
    if (!host.isProductionLikely && host.hostFamily !== 'localhost' && !stagingOk && !productionOk) {
      throw new Error('Refusing apply: pass --i-confirm-staging or --i-confirm-production');
    }
    if (host.hostFamily === 'localhost' && !stagingOk && !productionOk) {
      // localhost still needs an explicit flag to avoid accidents
      throw new Error('Refusing apply on localhost without --i-confirm-staging');
    }
    if (preserveBefore.users < 1) {
      throw new Error('Refusing apply: users count is 0');
    }

    await client.query('BEGIN');

    const deleted: Record<string, number> = {};
    for (const t of DELETE_ORDER) {
      const r = await client.query(`DELETE FROM public.${quote(t)}`);
      deleted[t] = r.rowCount ?? 0;
    }

    if (clearOptional) {
      for (const t of ['coupons', 'announcements', 'notification_log'] as const) {
        const r = await client.query(`DELETE FROM public.${quote(t)}`);
        deleted[t] = r.rowCount ?? 0;
      }
    }

    // Preserve invariants
    for (const t of PRESERVE) {
      const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.${quote(t)}`);
      const after = r.rows[0].c as number;
      if (after !== preserveBefore[t]) {
        throw new Error(`Preserve invariant failed for ${t}: ${preserveBefore[t]} -> ${after}`);
      }
    }

    const venuesLeft = (await client.query(`SELECT COUNT(*)::int AS c FROM public.venues`)).rows[0].c;
    const ordersLeft = (await client.query(`SELECT COUNT(*)::int AS c FROM public.orders`)).rows[0].c;
    if (venuesLeft !== 0 || ordersLeft !== 0) {
      throw new Error(`Post-delete expected 0 venues/orders; got venues=${venuesLeft} orders=${ordersLeft}`);
    }

    await client.query(
      `INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'production-database-reset.ts',
        'system',
        'test_catalogue_reset',
        'database',
        'catalogue',
        JSON.stringify({ deleted, host, at: new Date().toISOString() }),
      ]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'COMMITTED', deleted }, null, 2));
    console.log('Next: npx tsx scripts/production-database-postflight.ts');
    console.log('Then update data/authoritative_theatres.json after real theatre import.');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('ABORTED (rolled back if in transaction):', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await p.end();
  }
}

main();
