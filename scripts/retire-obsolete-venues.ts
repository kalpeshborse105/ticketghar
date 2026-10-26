/**
 * Retire obsolete theatres from NEW event selection.
 *
 * Default: DRY-RUN (no writes).
 * Apply: --apply --i-confirm-retire --baseline=docs/VENUE_PROVENANCE_INVENTORY.json
 * Production hosts also need: --i-confirm-production
 *
 * Action: SET verification_status='unverified' for exact obsolete IDs with zero
 * protected deps. NEVER deletes venues/orders/tickets/scans. NEVER touches
 * authoritative theatres or pending-owner-confirm IDs.
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import {
  assertRetentionIntact,
  buildRetirePlan,
  VenueDepRow,
} from './lib/retire-obsolete-venues-core.ts';

config({ override: true });

const APPLY = process.argv.includes('--apply');
const CONFIRM_RETIRE = process.argv.includes('--i-confirm-retire');
const PRODUCTION_FLAG = process.argv.includes('--i-confirm-production');
const baselineArg = process.argv.find((a) => a.startsWith('--baseline='));
const BASELINE_PATH =
  baselineArg?.slice('--baseline='.length) ||
  path.join(process.cwd(), 'docs', 'VENUE_PROVENANCE_INVENTORY.json');

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
    return { hostFamily: 'supabase-pooler', isProductionLikely: true };
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return { hostFamily: 'localhost', isProductionLikely: false };
  }
  return { hostFamily: hostname, isProductionLikely: true };
}

async function main() {
  const authFile = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'authoritative_theatres.json'), 'utf8')
  ) as {
    authoritativeTheatreIds: number[];
    pendingOwnerConfirmIds: number[];
    protectedPreserveIds: number[];
  };

  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Missing baseline inventory ${BASELINE_PATH}. Run: npx tsx scripts/inventory-venue-provenance.ts`
    );
  }
  const inventory = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    obsoleteRetireCandidates: number[];
    authoritativeNewTheatreIds: number[];
  };

  const hostRaw = (() => {
    try {
      return new URL(poolUrl().replace(/^postgresql?/i, 'http')).hostname;
    } catch {
      return '(unparsed)';
    }
  })();
  const host = classifyHost(hostRaw);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('HOST', host);

  if (APPLY) {
    if (!CONFIRM_RETIRE) {
      throw new Error('--apply requires --i-confirm-retire');
    }
    if (host.isProductionLikely && !PRODUCTION_FLAG) {
      throw new Error('Production-like host requires --i-confirm-production');
    }
  }

  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const client = await p.connect();

  try {
    const venues = (
      await client.query(`
        SELECT
          v.id, v.name, v.verification_status,
          (SELECT COUNT(*)::int FROM events e WHERE e.venue_id = v.id) AS events,
          (SELECT COUNT(*)::int FROM orders o
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS orders,
          (SELECT COUNT(*)::int FROM tickets t
             JOIN orders o ON o.id = t.order_id
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS tickets,
          (SELECT COUNT(*)::int FROM ticket_scans ts
             JOIN tickets t ON t.id = ts.ticket_id
             JOIN orders o ON o.id = t.order_id
             JOIN events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS scans,
          (SELECT COUNT(*)::int FROM event_reviews r
             JOIN events e ON e.id = r.event_id WHERE e.venue_id = v.id) AS reviews
        FROM venues v
        ORDER BY v.id
      `)
    ).rows as VenueDepRow[];

    // Cross-check allowlist IDs still exist with expected names
    for (const id of authFile.authoritativeTheatreIds) {
      const row = venues.find((v) => v.id === id);
      if (!row) throw new Error(`Authoritative venue #${id} missing — abort`);
    }

    const plan = buildRetirePlan({
      venues,
      authoritativeIds: authFile.authoritativeTheatreIds,
      pendingOwnerConfirmIds: authFile.pendingOwnerConfirmIds || [],
      protectedPreserveIds: authFile.protectedPreserveIds || [],
      obsoleteIds: inventory.obsoleteRetireCandidates || [],
    });

    // Soft-unpublish published events on retire candidates with zero protected deps
    const eventsToUnpublish = (
      await client.query(
        `
        SELECT e.id, e.title, e.status, e.venue_id
        FROM events e
        WHERE e.venue_id = ANY($1::int[])
          AND e.status = 'published'
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
          AND NOT EXISTS (
                SELECT 1 FROM tickets t
                JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
              )
          AND NOT EXISTS (
                SELECT 1 FROM ticket_scans ts
                JOIN tickets t ON t.id = ts.ticket_id
                JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
              )
          AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
        ORDER BY e.id
      `,
        [plan.retireCandidates]
      )
    ).rows;

    const summary = {
      sourceLabel: 'LIVE_DATABASE_READONLY_OR_APPLY',
      generatedAt: new Date().toISOString(),
      host,
      mode: APPLY ? 'apply' : 'dry-run',
      retainAuthoritative: plan.retainAuthoritative,
      retireVenueIds: plan.retireCandidates,
      skipProtected: plan.skipProtected,
      skipPendingOwner: plan.skipPendingOwner,
      skipAlreadyRetired: plan.skipAlreadyRetired,
      skipUnknown: plan.skipUnknown,
      eventsToUnpublish: eventsToUnpublish.map((e) => ({
        id: e.id,
        title: e.title,
        venue_id: e.venue_id,
      })),
      counts: {
        retireVenues: plan.retireCandidates.length,
        unpublishEvents: eventsToUnpublish.length,
        protectedSkipped: plan.skipProtected.length,
      },
    };

    const outPath = path.join(process.cwd(), 'docs', 'VENUE_RETIRE_DRY_RUN.json');
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary.counts, null, 2));
    console.log('Wrote', outPath);

    if (!APPLY) {
      console.log('No DB writes (dry-run).');
      return;
    }

    const beforeAuth = (
      await client.query(
        `SELECT id, name, verification_status FROM venues WHERE id = ANY($1::int[]) ORDER BY id`,
        [plan.retainAuthoritative]
      )
    ).rows;

    await client.query('BEGIN');
    try {
      let retired = 0;
      for (const id of plan.retireCandidates) {
        const r = await client.query(
          `UPDATE venues SET verification_status = 'unverified'
           WHERE id = $1 AND verification_status <> 'unverified'
           RETURNING id`,
          [id]
        );
        retired += r.rowCount || 0;
      }

      let unpublished = 0;
      for (const ev of eventsToUnpublish) {
        const r = await client.query(
          `UPDATE events SET status = 'unpublished'
           WHERE id = $1 AND status = 'published'
           RETURNING id`,
          [ev.id]
        );
        unpublished += r.rowCount || 0;
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          'retire-obsolete-venues',
          'super_admin',
          'venue_retire_unverified',
          'venues',
          'batch',
          JSON.stringify({
            retired,
            unpublished,
            retireVenueIds: plan.retireCandidates,
            eventIds: eventsToUnpublish.map((e) => e.id),
            at: new Date().toISOString(),
          }),
        ]
      );

      const afterAuth = (
        await client.query(
          `SELECT id, name, verification_status FROM venues WHERE id = ANY($1::int[]) ORDER BY id`,
          [plan.retainAuthoritative]
        )
      ).rows;
      const retentionErrors = assertRetentionIntact({ beforeAuth, afterAuth });
      if (retentionErrors.length) {
        throw new Error(`Retention check failed:\n- ${retentionErrors.join('\n- ')}`);
      }

      await client.query('COMMIT');
      console.log(`APPLIED retired=${retired} unpublished_events=${unpublished}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('ROLLBACK OK');
      throw e;
    }
  } finally {
    client.release();
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
