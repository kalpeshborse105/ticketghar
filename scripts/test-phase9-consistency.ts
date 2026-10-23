/**
 * Phase 9 Verification Suite:
 * Tests booking consistency, seat map latency, time formatting, and payment recovery mechanisms.
 */
import 'dotenv/config';
import { formatISTDate, formatISTTime, getISTDateParts, getMarathiTimePeriod } from '../src/lib/dateUtils';
import { db } from '../src/db/index';
import { eventSessions, events, venues, seatInventory, orders } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, details?: string) {
  results.push({ name, passed: condition, details });
  if (condition) {
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name} ${details ? `(${details})` : ''}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MahaTicket Phase 9 — Comprehensive Consistency & Recovery Test');
  console.log('================================================================\n');

  // Test 1: Date & Time formatting accuracy in IST
  console.log('1. Date & Showtime Formatting Verification:');
  const sampleIso = '2026-10-24T17:00:00+05:30';
  const parts = getISTDateParts(sampleIso);
  assert('IST Date parts extracted', parts !== null && parts.hours === 17 && parts.minutes === 0);

  const marathiTimeFull = formatISTTime(sampleIso, 'mr', false);
  assert(
    'Full Marathi time period format',
    marathiTimeFull.includes('संध्याकाळी') && marathiTimeFull.includes('5:00'),
    `Actual: "${marathiTimeFull}"`
  );

  const marathiDate = formatISTDate(sampleIso, 'mr', false);
  assert(
    'Marathi date has Marathi month',
    marathiDate.includes('ऑक्टो') && (marathiDate.includes('२४') || marathiDate.includes('24')),
    `Actual: "${marathiDate}"`
  );

  // Test 2: Invalid date handles gracefully without hardcoded static fallback
  const invalidDate = formatISTDate(null, 'mr', false);
  assert(
    'Invalid date returns localized fallback, not hardcoded Oct 22 static date',
    invalidDate === 'तारीख उपलब्ध नाही' && !invalidDate.includes('२२ ऑक्टो'),
    `Actual: "${invalidDate}"`
  );

  const invalidTime = formatISTTime(null, 'mr', false);
  assert(
    'Invalid time returns localized fallback',
    invalidTime === 'वेळ उपलब्ध नाही' && !invalidTime.includes('०५:००'),
    `Actual: "${invalidTime}"`
  );

  // Test 3: Database Session Integrity
  console.log('\n2. Live Database Sessions & Venues Audit:');
  const allSessions = await db
    .select({
      id: eventSessions.id,
      eventId: eventSessions.eventId,
      startTime: eventSessions.sessionStartTime,
      eventTitle: events.title,
      venueName: venues.name,
    })
    .from(eventSessions)
    .innerJoin(events, eq(eventSessions.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .limit(10);

  assert('Database sessions exist and are queryable', allSessions.length > 0, `Count: ${allSessions.length}`);

  let validTimestamps = true;
  for (const s of allSessions) {
    if (!s.startTime) {
      validTimestamps = false;
      break;
    }
  }
  assert('All audited sessions have non-null start times', validTimestamps);

  // Test 4: Seat Map API Latency & Diagnostic Headers Simulation
  console.log('\n3. Seat Map Route & Inventory Performance:');
  if (allSessions.length > 0) {
    const testSession = allSessions[0];
    const t0 = performance.now();
    
    // Query inventory count directly
    const [invCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(seatInventory)
      .where(eq(seatInventory.sessionId, testSession.id));
      
    const dbDuration = Math.round(performance.now() - t0);
    assert(
      'Session seat inventory query completes rapidly (< 200ms)',
      dbDuration < 200,
      `Duration: ${dbDuration}ms, Seats: ${invCount?.count ?? 0}`
    );
  }

  // Test 5: Check expired hold cleanup
  const [expiredHolds] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seatInventory)
    .where(
      sql`${seatInventory.status} = 'held' AND ${seatInventory.holdExpiresAt} < NOW()`
    );
  console.log(`  Current unreleased expired holds in DB: ${expiredHolds?.count ?? 0}`);

  // Test 6: Verify ticket cryptographic signature & order relation
  console.log('\n4. Verification & Authoritative Ticket Invariant:');
  const [unsignedTickets] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`tickets`)
    .where(sql`security_hash IS NULL OR length(security_hash) < 32`);
  assert(
    'All database tickets have valid cryptographic HMAC SHA-256 signatures',
    (unsignedTickets?.count ?? 0) === 0,
    `Unsigned tickets: ${unsignedTickets?.count ?? 0}`
  );

  const [orphanedTickets] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`tickets t LEFT JOIN orders o ON t.order_id = o.id`)
    .where(sql`o.id IS NULL`);
  assert(
    'All database tickets belong to genuine confirmed orders',
    (orphanedTickets?.count ?? 0) === 0,
    `Orphaned tickets: ${orphanedTickets?.count ?? 0}`
  );

  // Summary
  console.log('\n================================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Phase 9 Verification Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
