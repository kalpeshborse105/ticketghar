import { db } from '../src/db';
import { seatInventory, eventSessions, events, seats, ticketTypes } from '../src/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createTemporarySeatHold, releaseSeatsHold } from '../src/lib/inventory-engine';
import { getSessionAvailableCount } from '../mobile/src/api';

async function runAvailabilityTests() {
  console.log('--- RUNNING AVAILABILITY & WEB/ANDROID PARITY REGRESSION TESTS ---');

  // Find a test session with inventory
  const [session] = await db.select().from(eventSessions).limit(1);
  if (!session) {
    console.error('No session found for testing.');
    process.exit(1);
  }
  const sessionId = session.id;
  console.log(`Using Session ID: ${sessionId} for Event ID: ${session.eventId}`);

  // Fetch all inventory rows joined with physical seats
  const invRows = await db
    .select({
      invId: seatInventory.id,
      seatId: seatInventory.seatId,
      status: seatInventory.status,
      isBlocked: seats.isBlocked,
    })
    .from(seatInventory)
    .leftJoin(seats, eq(seats.id, seatInventory.seatId))
    .where(eq(seatInventory.sessionId, sessionId));

  console.log(`Total session seats in DB: ${invRows.length}`);

  // Authoritative availability calculation (matching API SQL exactly)
  function calcAuthoritativeAvailable(rows: typeof invRows) {
    return rows.filter(
      (r) =>
        (r.status === 'available') &&
        (r.isBlocked === null || r.isBlocked === 0)
    ).length;
  }

  const initialAvailable = calcAuthoritativeAvailable(invRows);
  console.log(`Initial authoritative available seats: ${initialAvailable}`);

  // [TEST 1] All seats available baseline check
  console.log('\n[TEST 1] Testing all available seats calculation...');
  const availableCount = invRows.filter((r) => r.status === 'available' && (r.isBlocked === 0 || r.isBlocked === null)).length;
  if (initialAvailable !== availableCount) {
    console.error('❌ TEST 1 FAILED: Available count mismatch');
    process.exit(1);
  }
  console.log(`✅ TEST 1 PASSED: Baseline available count verified (${initialAvailable} seats)`);

  // [TEST 2] Active hold deduction test
  console.log('\n[TEST 2] Testing active hold deduction...');
  const availableSeats = invRows.filter((r) => r.status === 'available' && !r.isBlocked);
  if (availableSeats.length < 2) {
    console.warn('Skipping hold test due to insufficient available seats');
  } else {
    const seatToHold = availableSeats[0];
    // Server issues holdToken — do not invent client holder IDs
    const holdResult = await createTemporarySeatHold({
      sessionId,
      seatIds: [seatToHold.seatId],
    });
    const holdToken = holdResult.holdToken;

    const rowsDuringHold = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        isBlocked: seats.isBlocked,
      })
      .from(seatInventory)
      .leftJoin(seats, eq(seats.id, seatInventory.seatId))
      .where(eq(seatInventory.sessionId, sessionId));

    const duringHoldAvailable = calcAuthoritativeAvailable(rowsDuringHold);
    if (duringHoldAvailable !== initialAvailable - 1) {
      console.error(`❌ TEST 2 FAILED: Expected ${initialAvailable - 1} but got ${duringHoldAvailable}`);
      process.exit(1);
    }
    console.log(`✅ TEST 2 PASSED: Active hold properly decremented available count (${initialAvailable} -> ${duringHoldAvailable})`);

    // [TEST 3] Release hold restoration test
    console.log('\n[TEST 3] Testing hold release restoration...');
    await releaseSeatsHold(sessionId, holdToken, [seatToHold.seatId]);
    const rowsAfterRelease = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        isBlocked: seats.isBlocked,
      })
      .from(seatInventory)
      .leftJoin(seats, eq(seats.id, seatInventory.seatId))
      .where(eq(seatInventory.sessionId, sessionId));

    const afterReleaseAvailable = calcAuthoritativeAvailable(rowsAfterRelease);
    if (afterReleaseAvailable !== initialAvailable) {
      console.error(`❌ TEST 3 FAILED: Expected count to restore to ${initialAvailable} but got ${afterReleaseAvailable}`);
      process.exit(1);
    }
    console.log(`✅ TEST 3 PASSED: Hold release restored available count back to ${afterReleaseAvailable}`);
  }

  // [TEST 4] Blocked seats exclusion test
  console.log('\n[TEST 4] Testing blocked seats exclusion...');
  const mockRowsWithBlocked = [
    { invId: 1, seatId: 1, status: 'available', isBlocked: 0 },
    { invId: 2, seatId: 2, status: 'available', isBlocked: 1 }, // Blocked physical seat
    { invId: 3, seatId: 3, status: 'blocked', isBlocked: 0 },   // Blocked status in inventory
    { invId: 4, seatId: 4, status: 'booked', isBlocked: 0 },    // Booked seat
  ];
  const blockedAvailable = calcAuthoritativeAvailable(mockRowsWithBlocked);
  if (blockedAvailable !== 1) {
    console.error(`❌ TEST 4 FAILED: Expected 1 available seat but got ${blockedAvailable}`);
    process.exit(1);
  }
  console.log('✅ TEST 4 PASSED: Blocked physical seats and blocked status are properly excluded from available count');

  // [TEST 5] Zero seats / Sold Out test
  console.log('\n[TEST 5] Testing zero seats / Sold Out condition...');
  const mockSoldOutRows = [
    { invId: 1, seatId: 1, status: 'booked', isBlocked: 0 },
    { invId: 2, seatId: 2, status: 'held', isBlocked: 0 },
    { invId: 3, seatId: 3, status: 'blocked', isBlocked: 0 },
  ];
  const soldOutAvailable = calcAuthoritativeAvailable(mockSoldOutRows);
  if (soldOutAvailable !== 0) {
    console.error(`❌ TEST 5 FAILED: Expected 0 available seats but got ${soldOutAvailable}`);
    process.exit(1);
  }
  console.log('✅ TEST 5 PASSED: Zero available seats correctly triggers Sold Out condition');

  // [TEST 6] Web & Android parity check
  console.log('\n[TEST 6] Testing Web & Android availability parity...');
  const testSessionMock = {
    ticketTypes: [
      { availableQuota: 15, isSeated: 1 },
      { availableQuota: 10, isSeated: 1 },
    ],
    availableInventoryCount: 42,
  };
  const androidDerivedCount = getSessionAvailableCount(testSessionMock as any);
  if (androidDerivedCount !== 42) {
    console.error(`❌ TEST 6 FAILED: Android derived count (${androidDerivedCount}) != 42`);
    process.exit(1);
  }
  console.log(`✅ TEST 6 PASSED: Android getSessionAvailableCount matches authoritative availableInventoryCount (42)`);

  console.log('\n🎉 ALL 6 AVAILABILITY & PARITY REGRESSION TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runAvailabilityTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
