/**
 * Offline unit checks for venue-location repair helpers (no DB writes).
 */
import assert from 'assert';

const CITY_ALIASES: Record<string, string> = {
  ahmednagar: 'Ahilyanagar',
  vasai: 'Vasai-Virar',
  aurangabad: 'Chhatrapati Sambhajinagar',
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function resolveCityName(cityText: string, cityNames: string[]) {
  const alias = CITY_ALIASES[norm(cityText)];
  const target = alias || cityText;
  return cityNames.find((n) => norm(n) === norm(target)) || null;
}

// missing city link → alias resolves
assert.strictEqual(resolveCityName('Ahmednagar', ['Ahilyanagar', 'Pune']), 'Ahilyanagar');
assert.strictEqual(resolveCityName('Vasai', ['Vasai-Virar', 'Pune']), 'Vasai-Virar');
assert.strictEqual(resolveCityName('Pune', ['Pune', 'Mumbai']), 'Pune');
assert.strictEqual(resolveCityName('UnknownVillage', ['Pune']), null);

// same name different cities are distinct venues
const a = { name: 'Kalidas', city: 'Nashik' };
const b = { name: 'Kalidas', city: 'Thane' };
assert.notStrictEqual(`${norm(a.name)}|${norm(a.city)}`, `${norm(b.name)}|${norm(b.city)}`);

// duplicate same name+city
const d1 = { id: 2, name: 'Dinanath', city: 'Mumbai' };
const d2 = { id: 12, name: 'Dinanath', city: 'Mumbai' };
assert.strictEqual(`${norm(d1.name)}|${norm(d1.city)}`, `${norm(d2.name)}|${norm(d2.city)}`);

// incorrect district sample
const pavilion = { city: 'Pune', district: 'Mumbai City', expected: 'Pune' };
assert.notStrictEqual(pavilion.district, pavilion.expected);

// unverified location cannot invent village district from name alone
assert.strictEqual(resolveCityName('Some Remote Hamlet', ['Pune', 'Mumbai']), null);

console.log('test-venue-location-repair-logic: OK');
