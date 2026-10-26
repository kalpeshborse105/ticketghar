import assert from 'assert';
import { buildAutoTheatreLayout } from '../src/lib/theatre-auto-layout.ts';
import { loadAuthoritativeTheatres } from '../src/lib/venue-eligibility.ts';

const built = buildAutoTheatreLayout({ totalSeats: 500, seatsPerRow: 20 });
assert.strictEqual(built.totalSeats, 500);
assert.strictEqual(built.sections.length, 3);
assert.ok(built.sections.some((s) => s.name === 'Gold'));
assert.ok(built.sections.some((s) => s.name === 'Silver'));
assert.ok(built.sections.some((s) => s.name === 'Balcony'));

const small = buildAutoTheatreLayout({ totalSeats: 10, seatsPerRow: 5 });
assert.strictEqual(small.totalSeats, 10);

// Admin scope: allowlist must be exactly the ten IDs
const cat = loadAuthoritativeTheatres();
assert.deepStrictEqual(cat.authoritativeTheatreIds, [55, 56, 59, 60, 61, 62, 63, 64, 65, 66]);

function filterByScope(
  rows: Array<{ id: number; authoritativeNew?: boolean }>,
  scope: string
) {
  if (scope === 'authoritative') return rows.filter((r) => r.authoritativeNew);
  return rows;
}

const sample = [
  { id: 1, authoritativeNew: false },
  { id: 66, authoritativeNew: true },
  { id: 55, authoritativeNew: true },
];
const authOnly = filterByScope(sample, 'authoritative');
assert.strictEqual(authOnly.length, 2);
assert.ok(authOnly.every((r) => [55, 66].includes(r.id)));
assert.ok(!authOnly.some((r) => r.id === 1));

console.log('test-theatre-auto-layout: ALL OK');
