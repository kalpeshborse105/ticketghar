/**
 * Phase 4 hold safety — unit tests for pure helpers (no production DB required).
 *
 * Run: npx tsx scripts/test-phase4-hold-atomicity.ts
 *
 * DB-backed checks (manual / CI with test DB):
 * - createTemporarySeatHold rolls back when any seat in a multi-seat request fails
 * - create-order binds orderId only when holdToken + session + non-expired hold match
 * - releaseSeatsHold is idempotent and only clears rows for the given holdToken
 */

import {
  generateSecureHoldToken,
  isValidHoldTokenFormat,
  HOLD_TOKEN_PREFIX,
} from '../src/lib/hold-token.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('Phase 4 hold token unit tests\n');

const t1 = generateSecureHoldToken();
const t2 = generateSecureHoldToken();

assert(t1 !== t2, 'two generated tokens are unique');
assert(t1.startsWith(HOLD_TOKEN_PREFIX), 'token uses hold_ prefix');
assert(isValidHoldTokenFormat(t1), 'generated token passes format check');
assert(isValidHoldTokenFormat(t2), 'second token passes format check');
assert(!isValidHoldTokenFormat(''), 'empty string rejected');
assert(!isValidHoldTokenFormat('guest-session-123'), 'client guest id rejected as hold token');
assert(!isValidHoldTokenFormat('hold_tooshort'), 'malformed hold_ token rejected');
assert(!isValidHoldTokenFormat(`hold_${'a'.repeat(63)}`), 'wrong hex length rejected');

const legacyTestToken = `test_avail_hold_${Date.now()}`;
assert(
  !isValidHoldTokenFormat(legacyTestToken),
  'legacy script tokens are not treated as server hold tokens (expected)'
);

console.log('\nAll pure helper tests passed.');
console.log(
  '\nNote: Transactional multi-seat atomicity requires a test DATABASE_URL — not run here.'
);
