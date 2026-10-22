import { db } from '../src/db';
import { seatInventory, eventSessions, events, seats } from '../src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  createTemporarySeatHold,
  releaseSeatsHold,
  releaseExpiredHolds,
} from '../src/lib/inventory-engine';
import { cacheGet, cacheSet, cacheDel, sessionSeatsCacheKey } from '../src/lib/redis';

async function runHoldAndReleaseTests() {
  console.log('--- RUNNING HOLD, CONCURRENCY & CACHE REGRESSION TESTS ---');

  // Find a test session
  const [session] = await db
    .select()
    .from(eventSessions)
    .limit(1);

  if (!session) {
    console.error('No event session found for testing.');
    process.exit(1);
  }

  const sessionId = session.id;
  console.log(`Using Session ID: ${sessionId}`);

  // Fetch available seats joined with physical seat
  const availableInventory = await db
    .select({
      invId: seatInventory.id,
      seatId: seatInventory.seatId,
      status: seatInventory.status,
      seatCode: seats.seatCode,
    })
    .from(seatInventory)
    .innerJoin(seats, eq(seats.id, seatInventory.seatId))
    .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')))
    .limit(4);

  if (availableInventory.length < 2) {
    console.error('Not enough available seats for testing.');
    process.exit(1);
  }

  const seat1 = availableInventory[0];
  const seat2 = availableInventory[1];
  console.log(`Testing with Seat 1: ${seat1.seatCode} (Physical seatId: ${seat1.seatId}), Seat 2: ${seat2.seatCode} (Physical seatId: ${seat2.seatId})`);

  // [TEST 1] Create hold on Seat 1
  console.log('\n[TEST 1] Creating temporary hold on Seat 1...');
  const userToken1 = `test_hold_user_${Date.now()}`;
  const hold1 = await createTemporarySeatHold({
    sessionId,
    seatIds: [seat1.seatId],
    userIdStr: userToken1,
  });
  if (!hold1?.heldSeatIds || hold1.heldSeatIds.length === 0) {
    console.error('❌ TEST 1 FAILED: Could not create hold on Seat 1');
    process.exit(1);
  }
  console.log('✅ TEST 1 PASSED: Seat 1 held successfully with token:', userToken1);

  // [TEST 2] Concurrent hold on the same Seat 1 by another user must be rejected
  console.log('\n[TEST 2] Testing concurrent hold attempt on already held Seat 1...');
  const userToken2 = `test_hold_attacker_${Date.now()}`;
  let hold2Failed = false;
  try {
    const hold2 = await createTemporarySeatHold({
      sessionId,
      seatIds: [seat1.seatId],
      userIdStr: userToken2,
    });
    if ((hold2 as any)?.heldSeatIds) {
      console.error('❌ TEST 2 FAILED: Second user was able to hold already held seat!');
      process.exit(1);
    }
  } catch (err: any) {
    hold2Failed = true;
    console.log('✅ TEST 2 PASSED: Concurrent hold attempt safely rejected with error:', err.message);
  }
  if (!hold2Failed) {
    console.error('❌ TEST 2 FAILED: Expected concurrent hold to throw/fail');
    process.exit(1);
  }

  // [TEST 3] Cache check & invalidation verification
  console.log('\n[TEST 3] Testing cache invalidation upon release...');
  const cacheKey = sessionSeatsCacheKey(sessionId);
  // Populate cache mock
  await cacheSet(cacheKey, JSON.stringify([{ id: seat1.seatId, status: 'held' }]), 60);
  const cachedBefore = await cacheGet(cacheKey);
  console.log('Cache populated before release:', !!cachedBefore);

  // Release hold
  const releasedCount = await releaseSeatsHold(sessionId, userToken1, [seat1.seatId]);
  console.log(`Released seats count: ${releasedCount}`);

  const cachedAfter = await cacheGet(cacheKey);
  if (cachedAfter !== null) {
    console.error('❌ TEST 3 FAILED: Cache was not invalidated after release!');
    process.exit(1);
  }
  console.log('✅ TEST 3 PASSED: Hold released and cache automatically invalidated (cachedAfter is null)');

  // Verify seat status is back to available in DB
  const [recheckedSeat] = await db.select().from(seatInventory).where(eq(seatInventory.id, seat1.invId));
  if (recheckedSeat.status !== 'available') {
    console.error('❌ TEST 3 FAILED: Seat status is not available in DB after release:', recheckedSeat.status);
    process.exit(1);
  }
  console.log('✅ Database state confirmed: Seat is back to "available"');

  // [TEST 4] Test partial hold rollback
  console.log('\n[TEST 4] Testing atomic partial hold rollback...');
  // Hold seat 1 again
  await createTemporarySeatHold({
    sessionId,
    seatIds: [seat1.seatId],
    userIdStr: userToken1,
  });
  // Now attempt to hold [seat1.seatId, seat2.seatId] with userToken2
  // Since seat1 is held, whole transaction must fail/rollback and seat2 must NOT be held
  let batchFailed = false;
  try {
    await createTemporarySeatHold({
      sessionId,
      seatIds: [seat1.seatId, seat2.seatId],
      userIdStr: userToken2,
    });
  } catch (err: any) {
    batchFailed = true;
    console.log('Batch hold rejected as expected:', err.message);
  }

  if (!batchFailed) {
    console.error('❌ TEST 4 FAILED: Batch hold succeeded when one seat was unavailable');
    process.exit(1);
  }

  const [recheckedSeat2] = await db.select().from(seatInventory).where(eq(seatInventory.id, seat2.invId));
  if (recheckedSeat2.status !== 'available') {
    console.error('❌ TEST 4 FAILED: Seat 2 was partially held despite seat 1 failing!');
    process.exit(1);
  }
  console.log('✅ TEST 4 PASSED: Atomic rollback confirmed! Seat 2 remains "available" after failed batch hold');

  // Cleanup: Release seat 1
  await releaseSeatsHold(sessionId, userToken1, [seat1.seatId]);

  console.log('\n🎉 ALL HOLD, CONCURRENCY, CACHE & ROLLBACK TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runHoldAndReleaseTests().catch(err => {
  console.error('Unhandled error in tests:', err);
  process.exit(1);
});
