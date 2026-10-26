/**
 * Offline tests for authoritative location plan + SQL assertions.
 */
import assert from 'assert';
import {
  addressSupportsMumbaiCity,
  buildAuthoritativeLocationPlan,
  cityDistrictCompatible,
  renderAuthoritativeRepairSql,
  resolveUniqueCity,
} from './lib/authoritative-location-plan.ts';

const cities = [
  { id: 1, name: 'Mumbai', district_id: 17 },
  { id: 2, name: 'Pune', district_id: 26 },
];
const districts = [
  { id: 17, name: 'Mumbai City', code: 'MH-MC' },
  { id: 18, name: 'Mumbai Suburban', code: 'MH-MS' },
  { id: 26, name: 'Pune', code: 'MH-PU' },
];

assert.ok(resolveUniqueCity('Pune', cities).ok);
assert.ok(!resolveUniqueCity('Mumbai', [
  { id: 1, name: 'Mumbai', district_id: 17 },
  { id: 99, name: 'Mumbai', district_id: 18 },
]).ok);

assert.ok(addressSupportsMumbaiCity('NCPA, Nariman Point, Mumbai'));
assert.ok(addressSupportsMumbaiCity('Dadar West, Mumbai'));
assert.ok(!addressSupportsMumbaiCity('Somewhere, Mumbai'));

assert.ok(cityDistrictCompatible(cities[0], 17));
assert.ok(!cityDistrictCompatible(cities[0], 18));

const venues = [
  {
    id: 59,
    name: 'NCPA',
    city: 'Mumbai',
    address: 'NCPA, Nariman Point, Mumbai',
    city_id: null,
    district_id: null,
    verification_status: 'verified',
  },
  {
    id: 55,
    name: 'Nehru',
    city: 'Pune',
    address: 'Camp, Pune',
    city_id: null,
    district_id: 26,
    verification_status: 'verified',
  },
  {
    id: 99,
    name: 'Mystery Mumbai',
    city: 'Mumbai',
    address: 'Unknown Road',
    city_id: null,
    district_id: null,
    verification_status: 'verified',
  },
];

const plan = buildAuthoritativeLocationPlan({
  venues,
  cities,
  districts,
  authoritativeIds: [59, 55, 99],
});

assert.ok(plan.updates.some((u) => u.venueId === 59 && u.field === 'district_id' && u.to === 17));
assert.ok(plan.updates.some((u) => u.venueId === 59 && u.field === 'city_id' && u.to === 1));
assert.ok(plan.updates.some((u) => u.venueId === 55 && u.field === 'city_id' && u.to === 2));
assert.ok(!plan.updates.some((u) => u.venueId === 99));
assert.ok(plan.unresolved.some((u) => u.includes('#99')));

const sql = renderAuthoritativeRepairSql({
  authoritativeIds: [59, 55],
  venues: venues.filter((v) => v.id === 59 || v.id === 55),
  updates: plan.updates.filter((u) => u.venueId === 59 || u.venueId === 55),
  finalByVenue: {
    59: plan.finalByVenue[59],
    55: plan.finalByVenue[55],
  },
  generatedAt: '2026-10-26T00:00:00.000Z',
});

assert.match(sql, /PRECONDITIONS/);
assert.match(sql, /POSTCONDITIONS/);
assert.match(sql, /ROLLBACK/);
assert.match(sql, /Precondition failed for venue #%'/);
assert.match(sql, /Postcondition failed for venue #%'/);
assert.match(sql, /City\/district catalog mismatch/);
assert.match(sql, /AND city_id IS NULL/);
assert.match(sql, /SET city_id = 1/);
assert.match(sql, /SET district_id = 17/);
assert.ok(!sql.trimEnd().endsWith('COMMIT;'));
assert.ok(sql.includes('ROLLBACK;'));

// Incompatible: refuse linking Mumbai city when district would be Suburban
const bad = buildAuthoritativeLocationPlan({
  venues: [
    {
      id: 7,
      name: 'R City',
      city: 'Mumbai',
      address: 'Ghatkopar West, Mumbai',
      city_id: null,
      district_id: null,
      verification_status: 'verified',
    },
  ],
  cities,
  districts,
  authoritativeIds: [7],
});
// Ghatkopar is NOT in Mumbai City evidence list → unresolved, no district from "Mumbai" alone
assert.ok(bad.unresolved.some((u) => /#7/.test(u)));
assert.strictEqual(bad.updates.length, 0);

console.log('test-authoritative-location-plan: ALL OK');
