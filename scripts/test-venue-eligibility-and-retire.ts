/**
 * Offline tests: authoritative eligibility + retire plan (no DB writes).
 */
import assert from 'assert';
import {
  isEligibleForNewEvent,
  isAuthoritativeTheatreId,
  resetAuthoritativeTheatresCache,
  loadAuthoritativeTheatres,
} from '../src/lib/venue-eligibility.ts';
import {
  assertRetentionIntact,
  buildRetirePlan,
} from './lib/retire-obsolete-venues-core.ts';

resetAuthoritativeTheatresCache();
const catalog = loadAuthoritativeTheatres();
assert.ok(catalog.authoritativeTheatreIds.includes(62));
assert.ok(catalog.authoritativeTheatreIds.includes(55));
assert.ok(catalog.authoritativeTheatreIds.includes(59));
assert.ok(!catalog.authoritativeTheatreIds.includes(8), 'seed-updated #8 must not be auto-allowlisted');
assert.ok(!catalog.authoritativeTheatreIds.includes(9), 'seed-updated #9 must not be auto-allowlisted');
assert.ok(isAuthoritativeTheatreId(62, catalog));
assert.ok(!isAuthoritativeTheatreId(1, catalog));
assert.ok(!isAuthoritativeTheatreId(8, catalog));

assert.ok(
  isEligibleForNewEvent({
    venueId: 62,
    verificationStatus: 'verified',
    catalog,
  }).ok
);
assert.ok(
  !isEligibleForNewEvent({
    venueId: 62,
    verificationStatus: 'unverified',
    catalog,
  }).ok
);
assert.ok(
  !isEligibleForNewEvent({
    venueId: 1,
    verificationStatus: 'verified',
    catalog,
  }).ok
);
assert.ok(
  !isEligibleForNewEvent({
    venueId: 0,
    verificationStatus: 'verified',
    catalog,
  }).ok
);
assert.ok(
  !isEligibleForNewEvent({
    venueId: 53,
    verificationStatus: 'verified',
    catalog,
  }).ok,
  'pending owner confirm must not be auto-eligible'
);

const venues = [
  { id: 62, name: 'Bharat', verification_status: 'verified', orders: 0, tickets: 0, scans: 0, reviews: 0, events: 0 },
  { id: 1, name: 'Bal', verification_status: 'verified', orders: 38, tickets: 10, scans: 0, reviews: 0, events: 24 },
  { id: 40, name: 'Old Zero', verification_status: 'verified', orders: 0, tickets: 0, scans: 0, reviews: 0, events: 0 },
  { id: 53, name: 'Pending', verification_status: 'verified', orders: 0, tickets: 0, scans: 0, reviews: 0, events: 0 },
  { id: 41, name: 'Already', verification_status: 'unverified', orders: 0, tickets: 0, scans: 0, reviews: 0, events: 0 },
];

const plan = buildRetirePlan({
  venues,
  authoritativeIds: [62],
  pendingOwnerConfirmIds: [53],
  protectedPreserveIds: [1],
  obsoleteIds: [40, 1, 53, 62, 41, 999],
});

assert.deepStrictEqual(plan.retireCandidates, [40]);
assert.ok(plan.skipProtected.some((s) => s.id === 1));
assert.ok(plan.skipPendingOwner.some((s) => s.id === 53));
assert.ok(plan.skipUnknown.some((s) => s.id === 62));
assert.ok(plan.skipUnknown.some((s) => s.id === 999));
assert.ok(plan.skipAlreadyRetired.includes(41));

const retentionOk = assertRetentionIntact({
  beforeAuth: [{ id: 62, name: 'Bharat', verification_status: 'verified' }],
  afterAuth: [{ id: 62, name: 'Bharat', verification_status: 'verified' }],
});
assert.strictEqual(retentionOk.length, 0);

const retentionFail = assertRetentionIntact({
  beforeAuth: [{ id: 62, name: 'Bharat', verification_status: 'verified' }],
  afterAuth: [{ id: 62, name: 'Bharat', verification_status: 'unverified' }],
});
assert.ok(retentionFail.length > 0);

console.log('test-venue-eligibility-and-retire: ALL OK');
