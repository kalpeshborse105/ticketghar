/**
 * Soft-unpublish events with ZERO upcoming sessions AND ZERO orders.
 * Does NOT delete rows (orders/tickets history preserved elsewhere).
 * Dry-run: npx tsx scripts/unpublish-stale-zero-order-events.ts
 * Apply:   npx tsx scripts/unpublish-stale-zero-order-events.ts --apply
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

const APPLY = process.argv.includes('--apply');

const raw = process.env.DATABASE_URL || '';
const url = raw
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

async function main() {
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  const { rows } = await p.query(`
    SELECT e.id, e.title, e.status
    FROM events e
    WHERE e.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = e.id AND s.session_start_time > NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM orders o WHERE o.event_id = e.id
      )
    ORDER BY e.id
  `);

  console.log(`Candidates: ${rows.length}`);
  rows.forEach((r) => console.log(`  id=${r.id} [${r.status}] ${r.title}`));

  if (!APPLY) {
    console.log('Dry-run only. Re-run with --apply to set status=unpublished.');
    await p.end();
    return;
  }

  if (rows.length === 0) {
    console.log('Nothing to update.');
    await p.end();
    return;
  }

  const ids = rows.map((r) => r.id);
  const res = await p.query(
    `UPDATE events SET status = 'unpublished' WHERE id = ANY($1::int[]) RETURNING id, title, status`,
    [ids]
  );
  console.log(`Updated ${res.rowCount} events → unpublished`);
  res.rows.forEach((r) => console.log(`  ✓ ${r.id} ${r.title}`));
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
