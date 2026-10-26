/**
 * Offline tests for venue-location repair core (no DB writes).
 */
import assert from 'assert';
import {
  buildRepairPlan,
  detectStaleBaseline,
  findDistrictByName,
  isMumbaiFamilyCityText,
  resolveCityRow,
  resolveCityTargetName,
  validateApprovalAgainstPlan,
  CITY_ALIASES,
  DISTRICT_CORRECTIONS,
} from './lib/venue-location-repair-core.ts';

const cities = [
  { id: 1, name: 'Mumbai', district_id: 17 },
  { id: 2, name: 'Pune', district_id: 26 },
  { id: 5, name: 'Thane', district_id: 33 },
  { id: 10, name: 'Ahilyanagar', district_id: 1 },
  { id: 49, name: 'Vasai-Virar', district_id: 24 },
  { id: 13, name: 'Navi Mumbai', district_id: 33 },
];

const districts = [
  { id: 17, name: 'Mumbai City', code: 'MH-MC' },
  { id: 18, name: 'Mumbai Suburban', code: 'MH-MS' },
  { id: 26, name: 'Pune', code: 'MH-PU' },
  { id: 33, name: 'Thane', code: 'MH-TH' },
  { id: 1, name: 'Ahmednagar', code: 'MH-AH' },
  { id: 24, name: 'Palghar', code: 'MH-PL' },
];

// --- renamed cities ---
assert.strictEqual(resolveCityTargetName('Ahmednagar'), 'Ahilyanagar');
assert.strictEqual(resolveCityTargetName('Vasai'), 'Vasai-Virar');
assert.ok(CITY_ALIASES.ahmednagar);

const ahilya = resolveCityRow('Ahmednagar', cities);
assert.ok(ahilya.ok && ahilya.city.id === 10);

// --- ambiguous city: refuse first-match ---
const amb = resolveCityRow('Mumbai', [
  { id: 1, name: 'Mumbai', district_id: 17 },
  { id: 99, name: 'Mumbai', district_id: 18 },
]);
assert.ok(!amb.ok);
assert.match((amb as any).reason, /Ambiguous/);

// unique Mumbai OK for city_id
const mum = resolveCityRow('Mumbai', cities);
assert.ok(mum.ok && mum.city.id === 1);

// --- Mumbai City vs Suburban never from city text alone ---
assert.ok(isMumbaiFamilyCityText('Mumbai'));
assert.ok(!isMumbaiFamilyCityText('Pune'));

const mumbaiNullDistrict = buildRepairPlan({
  cities,
  districts,
  venues: [
    {
      id: 100,
      name: 'Mystery Mumbai Hall',
      city: 'Mumbai',
      address: 'Somewhere, Mumbai',
      district_id: null,
      city_id: null,
      verification_status: 'verified',
    },
  ],
});
assert.ok(mumbaiNullDistrict.proposed.some((p) => p.field === 'city_id' && p.to === 1));
assert.ok(
  !mumbaiNullDistrict.proposed.some((p) => p.field === 'district_id'),
  'must not invent Mumbai City vs Suburban district'
);
assert.ok(
  mumbaiNullDistrict.unresolved.some((u) => /Mumbai City vs Mumbai Suburban/i.test(u.reason))
);

// --- district mismatch with address evidence ---
const focusPlan = buildRepairPlan({
  cities,
  districts,
  venues: [
    {
      id: 5,
      name: 'PVR INOX: The Pavillion Mall',
      city: 'Pune',
      address: 'Senapati Bapat Road, Shivajinagar, Pune',
      district_id: 17,
      city_id: null,
      verification_status: 'verified',
    },
    {
      id: 7,
      name: 'PVR INOX: R City Mall',
      city: 'Mumbai',
      address: 'LBS Marg, Ghatkopar West, Mumbai',
      district_id: 17,
      city_id: null,
      verification_status: 'verified',
    },
    {
      id: 4,
      name: 'Dr. Kashinath Ghanekar Natyagruha',
      city: 'Thane',
      address: 'Ghodbunder Road, Hiranandani Meadows, Thane West',
      district_id: 26,
      city_id: null,
      verification_status: 'verified',
    },
    {
      id: 2,
      name: 'Dinanath Mangeshkar Natyagruha',
      city: 'Mumbai',
      address: 'Vile Parle East, Mumbai',
      district_id: 26,
      city_id: null,
      verification_status: 'verified',
    },
  ],
});

const p5 = focusPlan.proposed.find((p) => p.venueId === 5 && p.field === 'district_id');
assert.ok(p5 && p5.to === 26 && p5.from === 17);

const p7 = focusPlan.proposed.find((p) => p.venueId === 7 && p.field === 'district_id');
assert.ok(p7 && p7.to === 18);

const p4 = focusPlan.proposed.find((p) => p.venueId === 4 && p.field === 'district_id');
assert.ok(p4 && p4.to === 33);

const p2 = focusPlan.proposed.find((p) => p.venueId === 2 && p.field === 'district_id');
assert.ok(p2 && p2.to === 18);

// NCPA Nariman Point → Mumbai City (address evidence)
const ncpaPlan = buildRepairPlan({
  cities,
  districts,
  venues: [
    {
      id: 59,
      name: 'Jamshed Bhabha Theatre (NCPA)',
      city: 'Mumbai',
      address: 'NCPA, Nariman Point, Mumbai',
      district_id: null,
      city_id: null,
      verification_status: 'verified',
    },
  ],
});
const ncpaD = ncpaPlan.proposed.find((p) => p.venueId === 59 && p.field === 'district_id');
assert.ok(ncpaD && ncpaD.to === 17);
assert.ok(!ncpaPlan.unresolved.some((u) => u.venueId === 59));

// correction without address evidence → unresolved, no district change
const noEvidence = buildRepairPlan({
  cities,
  districts,
  venues: [
    {
      id: 7,
      name: 'PVR INOX: R City Mall',
      city: 'Mumbai',
      address: 'Unknown Road, Mumbai',
      district_id: 17,
      city_id: null,
      verification_status: 'verified',
    },
  ],
});
assert.ok(!noEvidence.proposed.some((p) => p.venueId === 7 && p.field === 'district_id'));
assert.ok(noEvidence.unresolved.some((u) => u.venueId === 7));

// --- same name different cities are distinct ---
assert.notStrictEqual('kalidas|nashik', 'kalidas|thane');

// --- duplicate pairs: plan must NOT propose verification_status ---
assert.ok(!('verification_status' in (DISTRICT_CORRECTIONS[0] as any)));
assert.ok(focusPlan.proposed.every((p) => p.field === 'city_id' || p.field === 'district_id'));

// --- district catalog uniqueness ---
assert.ok(findDistrictByName('Pune', districts)?.id === 26);
assert.strictEqual(findDistrictByName('NotADistrict', districts), null);

// --- approval / stale baseline ---
const plan = focusPlan.proposed;
const goodApproval = {
  approvedAt: '2026-10-26T00:00:00.000Z',
  approvedBy: 'tester',
  baselineGeneratedAt: '2026-10-26T00:00:00.000Z',
  backupConfirmed: true,
  productionConfirm: 'I_CONFIRM_PRODUCTION_WRITE' as const,
  changes: plan
    .filter((p) => p.venueId === 5)
    .map((p) => ({ venueId: p.venueId, field: p.field, from: p.from, to: p.to })),
};
const vOk = validateApprovalAgainstPlan(goodApproval, plan, {
  hostIsProduction: true,
  productionFlag: true,
});
assert.ok(vOk.ok);

const vNoProd = validateApprovalAgainstPlan(goodApproval, plan, {
  hostIsProduction: true,
  productionFlag: false,
});
assert.ok(!vNoProd.ok);

const stale = detectStaleBaseline(
  [{ venueId: 5, field: 'district_id', from: 17, to: 26 }],
  [
    {
      id: 5,
      name: 'x',
      city: 'Pune',
      address: 'Pune',
      district_id: 99,
      city_id: null,
      verification_status: 'verified',
    },
  ]
);
assert.ok(stale.length > 0);

const idempotent = detectStaleBaseline(
  [{ venueId: 5, field: 'district_id', from: 26, to: 26 }],
  [
    {
      id: 5,
      name: 'x',
      city: 'Pune',
      address: 'Pune',
      district_id: 26,
      city_id: 2,
      verification_status: 'verified',
    },
  ]
);
assert.strictEqual(idempotent.length, 0);

// rollback semantics: validateApproval fails closed without backup
const noBackup = validateApprovalAgainstPlan(
  { ...goodApproval, backupConfirmed: false },
  plan,
  { hostIsProduction: false, productionFlag: false }
);
assert.ok(!noBackup.ok);

console.log('test-venue-location-repair-logic: ALL OK');
