/**
 * Phase 4 hold-token unit tests (no production DB).
 * Run: npx tsx scripts/test-phase4-hold-token.ts
 */
import assert from 'node:assert/strict';
import {
  generateSecureHoldToken,
  isValidHoldTokenFormat,
  HOLD_TOKEN_PREFIX,
} from '../src/lib/hold-token';

const a = generateSecureHoldToken();
const b = generateSecureHoldToken();
assert.ok(a.startsWith(HOLD_TOKEN_PREFIX));
assert.ok(isValidHoldTokenFormat(a));
assert.ok(isValidHoldTokenFormat(b));
assert.notEqual(a, b, 'tokens must be unique');
assert.equal(isValidHoldTokenFormat('guest-session-123'), false);
assert.equal(isValidHoldTokenFormat('hold_abc'), false);
assert.equal(isValidHoldTokenFormat('user_1'), false);
console.log('PASS: phase4 hold token format');
