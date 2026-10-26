/**
 * Idempotent venue location repair (Maharashtra).
 *
 * Default: DRY-RUN (no writes).
 * Apply ONLY with:
 *   --apply
 *   --approval=<reviewed approval JSON>
 *   --baseline=<reviewed dry-run JSON>
 *   and for production hosts also: --i-confirm-production
 *
 * Never modifies events, orders, tickets, scans, seat layouts, or verification_status.
 * Never merges/deletes venues.
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import {
  ApprovalArtifact,
  ProposedChange,
  buildRepairPlan,
  detectStaleBaseline,
  SUSPECTED_DUPLICATE_PAIRS,
  validateApprovalAgainstPlan,
  validateBaselineAgainstPlan,
  VenueRow,
} from './lib/venue-location-repair-core.ts';

config({ override: true });

const APPLY = process.argv.includes('--apply');
const PRODUCTION_FLAG = process.argv.includes('--i-confirm-production');
const approvalArg = process.argv.find((a) => a.startsWith('--approval='));
const baselineArg = process.argv.find((a) => a.startsWith('--baseline='));
const APPROVAL_PATH = approvalArg ? approvalArg.slice('--approval='.length) : '';
const BASELINE_PATH = baselineArg ? baselineArg.slice('--baseline='.length) : '';

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

function classifyHost(hostname: string): {
  hostFamily: string;
  isProductionLikely: boolean;
} {
  const h = hostname.toLowerCase();
  if (h.includes('supabase') || h.includes('pooler.supabase')) {
    return {
      hostFamily: 'supabase-pooler (treat as PRODUCTION unless owner confirms staging)',
      isProductionLikely: true,
    };
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return { hostFamily: 'localhost', isProductionLikely: false };
  }
  return { hostFamily: hostname, isProductionLikely: true };
}

async function loadDuplicateDeps(client: pg.PoolClient, venueId: number) {
  const r = await client.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM events WHERE venue_id=$1) AS events,
      (SELECT COUNT(*)::int FROM event_sessions es
         JOIN events e ON e.id=es.event_id WHERE e.venue_id=$1) AS sessions,
      (SELECT COUNT(*)::int FROM orders o
         JOIN events e ON e.id=o.event_id WHERE e.venue_id=$1) AS orders,
      (SELECT COUNT(*)::int FROM tickets t
         JOIN orders o ON o.id=t.order_id
         JOIN events e ON e.id=o.event_id WHERE e.venue_id=$1) AS tickets,
      (SELECT COUNT(*)::int FROM ticket_scans ts
         JOIN tickets t ON t.id=ts.ticket_id
         JOIN orders o ON o.id=t.order_id
         JOIN events e ON e.id=o.event_id WHERE e.venue_id=$1) AS scans,
      (SELECT COUNT(*)::int FROM event_reviews r
         JOIN events e ON e.id=r.event_id WHERE e.venue_id=$1) AS reviews,
      (SELECT COUNT(*)::int FROM seats WHERE venue_id=$1) AS seats,
      (SELECT COUNT(*)::int FROM venue_sections WHERE venue_id=$1) AS sections,
      (SELECT COUNT(*)::int FROM seat_inventory si
         JOIN seats s ON s.id=si.seat_id WHERE s.venue_id=$1) AS seat_inventory
    `,
    [venueId]
  );
  return r.rows[0] as Record<string, number>;
}

async function main() {
  const hostRaw = (() => {
    try {
      return new URL(poolUrl().replace(/^postgresql?/i, 'http')).hostname;
    } catch {
      return '(unparsed)';
    }
  })();
  const { hostFamily, isProductionLikely } = classifyHost(hostRaw);

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`DB host classification: ${hostFamily}`);
  console.log(`HEAD tip for docs: run git rev-parse HEAD locally (do not trust stale JSON alone)`);

  if (APPLY) {
    if (!APPROVAL_PATH) {
      throw new Error('--apply requires --approval=path/to/VENUE_LOCATION_REPAIR_APPROVAL.json');
    }
    if (!BASELINE_PATH) {
      throw new Error(
        '--apply requires --baseline=path/to/VENUE_LOCATION_REPAIR_DRY_RUN.json (the reviewed dry-run)'
      );
    }
    if (!fs.existsSync(APPROVAL_PATH)) {
      throw new Error(`Approval file not found: ${APPROVAL_PATH}`);
    }
    if (!fs.existsSync(BASELINE_PATH)) {
      throw new Error(`Baseline dry-run file not found: ${BASELINE_PATH}`);
    }
  }

  const p = new pg.Pool({ connectionString: poolUrl(), ssl: { rejectUnauthorized: false } });
  const client = await p.connect();

  try {
    const districts = (
      await client.query(`SELECT id, name, code FROM districts ORDER BY id`)
    ).rows;
    const cities = (
      await client.query(`SELECT id, name, district_id FROM cities ORDER BY id`)
    ).rows;
    const venues = (
      await client.query(`
        SELECT id, name, city, address, district_id, city_id, verification_status
        FROM venues ORDER BY id
      `)
    ).rows as VenueRow[];

    const counts = {
      venues: venues.length,
      null_city_id: venues.filter((v) => v.city_id == null).length,
      null_district_id: venues.filter((v) => v.district_id == null).length,
      districts: districts.length,
      cities: cities.length,
    };

    const plan = buildRepairPlan({ venues, cities, districts });

    const duplicateReviews = [];
    for (const pair of SUSPECTED_DUPLICATE_PAIRS) {
      const keepDeps = await loadDuplicateDeps(client, pair.keepId);
      const otherDeps = await loadDuplicateDeps(client, pair.otherId);
      duplicateReviews.push({
        ...pair,
        recommendation: 'manual_review_only' as const,
        keepDeps,
        otherDeps,
        autoAction: 'none — verification_status not changed by this script',
      });
    }

    const generatedAt = new Date().toISOString();
    const summary = {
      mode: APPLY ? 'apply' : 'dry-run',
      generatedAt,
      hostFamily,
      isProductionLikely,
      sourceLabel: 'LIVE_DATABASE_READONLY_SNAPSHOT',
      counts,
      proposedChanges: plan.proposed.length,
      unresolved: plan.unresolved.length,
      byField: {
        city_id: plan.proposed.filter((p) => p.field === 'city_id').length,
        district_id: plan.proposed.filter((p) => p.field === 'district_id').length,
        verification_status: 0,
      },
      byEvidence: {
        verified: plan.proposed.filter((p) => p.evidenceLevel === 'verified').length,
        heuristic: plan.proposed.filter((p) => p.evidenceLevel === 'heuristic').length,
      },
    };

    const out = {
      generatedAt,
      sourceLabel: 'LIVE_DATABASE_READONLY_SNAPSHOT',
      note: 'Not authoritative after DB drift — re-run dry-run before apply. Never treat an older committed snapshot as current.',
      gitHint: 'Verify with: git rev-parse HEAD && git status -sb',
      summary,
      proposed: plan.proposed,
      unresolved: plan.unresolved,
      focusReview: plan.focusReview,
      duplicateReviews,
      approvalInstructions: {
        copyChangesFrom: 'proposed[]',
        writeTo: 'docs/VENUE_LOCATION_REPAIR_APPROVAL.json',
        requiredFields: [
          'approvedAt',
          'approvedBy',
          'baselineGeneratedAt (= this generatedAt)',
          'backupConfirmed: true',
          'productionConfirm: I_CONFIRM_PRODUCTION_WRITE (production hosts)',
          'changes: Exact venueId/field/from/to subset of proposed',
        ],
        applyCommand:
          'npx tsx scripts/repair-venue-locations.ts --apply --approval=docs/VENUE_LOCATION_REPAIR_APPROVAL.json --baseline=docs/VENUE_LOCATION_REPAIR_DRY_RUN.json --i-confirm-production',
      },
    };

    // Dry-run writes the reviewed artifact. Apply must NOT overwrite the reviewed baseline.
    if (!APPLY) {
      const outPath = path.join(process.cwd(), 'docs', 'VENUE_LOCATION_REPAIR_DRY_RUN.json');
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log('\nSummary:', summary);
      console.log(`Wrote ${outPath}`);
      console.log(`Proposed: ${plan.proposed.length} | Unresolved: ${plan.unresolved.length}`);
      console.log('\nFocus venues #2,#12,#3,#53,#4,#5,#6,#7:');
      console.log(JSON.stringify(plan.focusReview, null, 2));
      console.log('\nDuplicate reviews (manual only):');
      console.log(JSON.stringify(duplicateReviews, null, 2));
      console.log('\nNo DB writes (dry-run).');
      return;
    }

    // -------- APPLY path --------
    const approval = JSON.parse(fs.readFileSync(APPROVAL_PATH, 'utf8')) as ApprovalArtifact;
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
      generatedAt: string;
      proposed: ProposedChange[];
    };

    const baselineErrors = validateBaselineAgainstPlan(approval, baseline, plan.proposed);
    if (baselineErrors.length) {
      throw new Error(`Baseline rejected:\n- ${baselineErrors.join('\n- ')}`);
    }

    const validation = validateApprovalAgainstPlan(approval, plan.proposed, {
      hostIsProduction: isProductionLikely,
      productionFlag: PRODUCTION_FLAG,
    });
    if (!validation.ok) {
      throw new Error(`Approval rejected:\n- ${validation.errors.join('\n- ')}`);
    }

    const stale = detectStaleBaseline(approval.changes, venues);
    if (stale.length) {
      throw new Error(`Stale approval / DB drifted:\n- ${stale.join('\n- ')}`);
    }

    await client.query('BEGIN');
    let applied = 0;
    const appliedLog: unknown[] = [];

    try {
      for (const ch of approval.changes) {
        const live = await client.query(
          `SELECT id, city_id, district_id FROM venues WHERE id=$1 FOR UPDATE`,
          [ch.venueId]
        );
        if (!live.rows[0]) throw new Error(`Venue #${ch.venueId} vanished`);
        const row = live.rows[0];
        const current = ch.field === 'city_id' ? row.city_id : row.district_id;
        const curN = current == null ? null : Number(current);
        const fromN = ch.from == null ? null : Number(ch.from);
        if (curN !== fromN) {
          throw new Error(
            `Race/stale inside txn venue #${ch.venueId} ${ch.field}: live=${curN} expected from=${fromN}`
          );
        }
        if (curN === Number(ch.to)) {
          appliedLog.push({ ...ch, status: 'already_applied' });
          continue;
        }

        if (ch.field === 'city_id') {
          await client.query(`UPDATE venues SET city_id=$1 WHERE id=$2`, [ch.to, ch.venueId]);
        } else if (ch.field === 'district_id') {
          await client.query(`UPDATE venues SET district_id=$1 WHERE id=$2`, [ch.to, ch.venueId]);
        } else {
          throw new Error(`Refusing unknown field: ${(ch as any).field}`);
        }
        applied += 1;
        appliedLog.push({ ...ch, status: 'updated', old: fromN, new: ch.to });
      }

      try {
        await client.query(
          `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            approval.approvedBy || 'repair-venue-locations',
            'super_admin',
            'venue_location_repair_apply',
            'venues',
            'batch',
            JSON.stringify({
              applied,
              changes: appliedLog,
              baselineGeneratedAt: approval.baselineGeneratedAt,
              baselinePath: BASELINE_PATH,
              at: new Date().toISOString(),
            }),
          ]
        );
      } catch (e: any) {
        throw new Error(`audit_logs insert failed — rolling back: ${e?.message || e}`);
      }

      await client.query('COMMIT');
      console.log(`\nAPPLIED ${applied} updates. COMMIT OK.`);
      console.log(JSON.stringify(appliedLog, null, 2));

      const applyReportPath = path.join(
        process.cwd(),
        'docs',
        'VENUE_LOCATION_REPAIR_APPLY_REPORT.json'
      );
      fs.writeFileSync(
        applyReportPath,
        JSON.stringify(
          {
            sourceLabel: 'LIVE_DATABASE_APPLY_REPORT',
            appliedAt: new Date().toISOString(),
            baselineGeneratedAt: approval.baselineGeneratedAt,
            applied,
            appliedLog,
            livePlanSummary: summary,
          },
          null,
          2
        )
      );
      console.log(`Wrote ${applyReportPath}`);
    } catch (inner) {
      await client.query('ROLLBACK');
      console.error('ROLLBACK OK');
      throw inner;
    }
  } catch (e) {
    throw e;
  } finally {
    client.release();
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
