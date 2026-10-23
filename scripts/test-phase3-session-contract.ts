/**
 * Phase 3: verify events API contract exposes homeSessionId (live host, read-only).
 * Run: npx tsx scripts/test-phase3-session-contract.ts
 */
import assert from 'node:assert/strict';

const BASE = process.env.MAHATICKET_API_BASE || 'https://mahaticket.kalpkrutinfotech.com';

async function main() {
  const res = await fetch(`${BASE}/api/events?limit=5`, {
    headers: { Accept: 'application/json' },
  });
  assert.equal(res.ok, true, `events HTTP ${res.status}`);
  const data = (await res.json()) as { events?: any[] };
  assert.ok(Array.isArray(data.events) && data.events.length > 0, 'events non-empty');

  for (const ev of data.events!) {
    assert.ok('homeSessionId' in ev, `event ${ev.id} missing homeSessionId`);
    if (ev.homeSessionId != null && Array.isArray(ev.sessions) && ev.sessions.length > 0) {
      const ids = ev.sessions.map((s: any) => s.id);
      assert.ok(
        ids.includes(ev.homeSessionId),
        `homeSessionId ${ev.homeSessionId} not in sessions for event ${ev.id}`
      );
      if (ev.homeSession?.id) {
        assert.equal(ev.homeSession.id, ev.homeSessionId);
      }
    }
  }

  console.log('PASS: phase3 homeSessionId contract on', BASE);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
