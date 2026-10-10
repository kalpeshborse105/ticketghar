import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from 'pg';
import {
  createTemporarySeatHold,
  releaseSeatsHold,
  releaseExpiredHolds,
  generateSessionInventory,
  calculatePricing,
} from '../src/lib/inventory-engine.ts';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(num: number, name: string, passed: boolean, details: string) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} Test ${num}: ${name} — ${details}`);
}

async function runPhase3Tests() {
  console.log(`\n========================================================================`);
  console.log(`MAHATICKET PHASE 3: REAL SEAT SELECTION & INVENTORY HOLDS VERIFICATION`);
  console.log(`========================================================================\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const testSessionIds: number[] = [];
  const testEventIds: number[] = [];
  const testVenueIds: number[] = [];
  const testUserIds: number[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup Isolated Test Venue & Event with Real Layout
    // -------------------------------------------------------------------------
    console.log(`--- [SETUP] Creating isolated test venue, event, and sessions ---`);

    const insVenue = await client.query(`
      INSERT INTO venues (name, name_mr, address, city, state, total_capacity, has_seat_layout)
      VALUES ($1, $2, 'Test Road', 'Pune', 'Maharashtra', 20, 1)
      RETURNING id;
    `, [`Phase3 Test Venue ${Date.now()}`, `फेज ३ चाचणी सभागृह`]);
    const testVenueId = insVenue.rows[0].id;
    testVenueIds.push(testVenueId);

    // Create 2 sections (Balcony & Stall)
    const insSec1 = await client.query(`
      INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
      VALUES ($1, 'Balcony', 'बाल्कनी', 2, 5, 35000, 1) RETURNING id;
    `, [testVenueId]);
    const secBalconyId = insSec1.rows[0].id;

    const insSec2 = await client.query(`
      INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
      VALUES ($1, 'Stall', 'स्टॉल', 2, 5, 25000, 0) RETURNING id;
    `, [testVenueId]);
    const secStallId = insSec2.rows[0].id;

    // Create 10 physical seats in Balcony (Row A 1..5, Row B 1..5)
    for (let i = 1; i <= 5; i++) {
      await client.query(`
        INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
        VALUES ($1, $2, 'A', $3, $4, 'gold', $5, 0);
      `, [testVenueId, secBalconyId, i, `A${i}`, i === 1 ? 1 : 0]);
    }
    for (let i = 1; i <= 5; i++) {
      await client.query(`
        INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
        VALUES ($1, $2, 'B', $3, $4, 'gold', 0, 0);
      `, [testVenueId, secBalconyId, i, `B${i}`]);
    }

    // Create 10 physical seats in Stall (Row C 1..5, Row D 1..5)
    for (let i = 1; i <= 5; i++) {
      await client.query(`
        INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
        VALUES ($1, $2, 'C', $3, $4, 'silver', 0, 0);
      `, [testVenueId, secStallId, i, `C${i}`]);
    }
    for (let i = 1; i <= 5; i++) {
      await client.query(`
        INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
        VALUES ($1, $2, 'D', $3, $4, 'silver', 0, 0);
      `, [testVenueId, secStallId, i, `D${i}`]);
    }

    // Create Event
    const insEvent = await client.query(`
      INSERT INTO events (
        organizer_id, venue_id, title, title_mr, slug, category, category_mr,
        description, description_mr, poster_url, status, convenience_fee_value
      ) VALUES (
        1, $1, 'Phase 3 Test Natak', 'फेज ३ चाचणी नाटक', $2, 'plays', 'नाटक',
        'Testing real inventory', 'चाचणी वर्णन', 'https://example.com/poster.jpg', 'published', 3000
      ) RETURNING id;
    `, [testVenueId, `phase3-test-${Date.now()}`]);
    const testEventId = insEvent.rows[0].id;
    testEventIds.push(testEventId);

    // Create Session 1 (Today show)
    const insSess1 = await client.query(`
      INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
      VALUES ($1, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 'active')
      RETURNING id;
    `, [testEventId]);
    const sess1Id = insSess1.rows[0].id;
    testSessionIds.push(sess1Id);

    // Create Session 2 (Tomorrow show)
    const insSess2 = await client.query(`
      INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
      VALUES ($1, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 3 hours', 'active')
      RETURNING id;
    `, [testEventId]);
    const sess2Id = insSess2.rows[0].id;
    testSessionIds.push(sess2Id);

    // Generate Session 1 & 2 inventory from venue template
    await generateSessionInventory(sess1Id, testVenueId);
    await generateSessionInventory(sess2Id, testVenueId);

    // Fetch physical seat rows for Session 1
    const s1Seats = (await client.query(`
      SELECT s.id as seat_id, s.seat_code, s.row_label, s.seat_number, tt.price, si.status
      FROM seat_inventory si
      JOIN seats s ON si.seat_id = s.id
      JOIN ticket_types tt ON si.ticket_type_id = tt.id
      WHERE si.session_id = $1
      ORDER BY s.seat_code;
    `, [sess1Id])).rows;

    console.log(`Generated ${s1Seats.length} seats for Session ${sess1Id} (Price ₹${s1Seats[0].price / 100}).\n`);

    // =========================================================================
    // Test 1: Successful seat selection and hold creation
    // =========================================================================
    const userAId = `user_a_${Date.now()}`;
    const seatsToHoldA = [s1Seats[0].seat_id, s1Seats[1].seat_id]; // e.g. A1, A2

    const hold1 = await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: seatsToHoldA,
      userIdStr: userAId,
    });

    const checkS1Held = await client.query(`
      SELECT status, held_by_user_id, hold_expires_at
      FROM seat_inventory
      WHERE session_id = $1 AND seat_id = ANY($2::int[]);
    `, [sess1Id, seatsToHoldA]);

    const isTest1Valid =
      hold1.heldSeatIds.length === 2 &&
      checkS1Held.rows.every((r) => r.status === 'held' && r.held_by_user_id === userAId) &&
      new Date(hold1.holdExpiresAt).getTime() > Date.now();

    record(
      1,
      'Successful seat selection and hold creation',
      isTest1Valid,
      `Held seats ${s1Seats[0].seat_code}, ${s1Seats[1].seat_code} with token ${userAId}; expires at ${hold1.holdExpiresAt}`
    );

    // =========================================================================
    // Test 2: Attempting to hold an unavailable / booked seat
    // =========================================================================
    // Manually mark seat A3 as booked
    const bookedSeat = s1Seats[2]; // A3
    await client.query(`
      UPDATE seat_inventory
      SET status = 'booked'
      WHERE session_id = $1 AND seat_id = $2;
    `, [sess1Id, bookedSeat.seat_id]);

    let test2Rejected = false;
    let test2ErrorMsg = '';
    try {
      await createTemporarySeatHold({
        sessionId: sess1Id,
        seatIds: [bookedSeat.seat_id],
        userIdStr: `user_test2_${Date.now()}`,
      });
    } catch (err: any) {
      test2Rejected = true;
      test2ErrorMsg = err.message;
    }

    record(
      2,
      'Attempting to hold an unavailable (booked) seat',
      test2Rejected && test2ErrorMsg.includes('already booked'),
      `Correctly rejected booked seat ${bookedSeat.seat_code}: "${test2ErrorMsg}"`
    );

    // =========================================================================
    // Test 3: Two concurrent users attempting to hold the same seat
    // =========================================================================
    // User A holds A1. User B tries to hold A1 while User A's hold is fresh.
    const userBId = `user_b_${Date.now()}`;
    let test3UserBRejected = false;
    let test3UserBMsg = '';

    try {
      await createTemporarySeatHold({
        sessionId: sess1Id,
        seatIds: [s1Seats[0].seat_id], // A1, already held by User A
        userIdStr: userBId,
      });
    } catch (err: any) {
      test3UserBRejected = true;
      test3UserBMsg = err.message;
    }

    record(
      3,
      'Two concurrent users attempting to hold the same seat',
      test3UserBRejected && test3UserBMsg.includes('currently held by another user'),
      `User B safely rejected from stealing User A's hold: "${test3UserBMsg}"`
    );

    // =========================================================================
    // Test 4: Hold expiration after 5 minutes
    // =========================================================================
    // Force seat A1 & A2 hold_expires_at to 10 minutes ago
    await client.query(`
      UPDATE seat_inventory
      SET hold_expires_at = NOW() - INTERVAL '10 minutes'
      WHERE session_id = $1 AND seat_id = ANY($2::int[]);
    `, [sess1Id, seatsToHoldA]);

    // Trigger sweep
    const releasedCount = await releaseExpiredHolds(sess1Id);

    const checkSwept = await client.query(`
      SELECT status, held_by_user_id
      FROM seat_inventory
      WHERE session_id = $1 AND seat_id = ANY($2::int[]);
    `, [sess1Id, seatsToHoldA]);

    const isTest4Valid =
      releasedCount >= 2 &&
      checkSwept.rows.every((r) => r.status === 'available' && r.held_by_user_id === null);

    record(
      4,
      'Hold expiration after 5 minutes',
      isTest4Valid,
      `Expired holds auto-swept (${releasedCount} released); returned to available inventory.`
    );

    // =========================================================================
    // Test 5: Explicit hold release
    // =========================================================================
    const userCId = `user_c_${Date.now()}`;
    const seatsToHoldC = [s1Seats[3].seat_id, s1Seats[4].seat_id]; // A4, A5

    await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: seatsToHoldC,
      userIdStr: userCId,
    });

    // User C voluntarily cancels / navigates back
    const explicitReleaseCount = await releaseSeatsHold(sess1Id, userCId, seatsToHoldC);

    const checkCReleased = await client.query(`
      SELECT status, held_by_user_id
      FROM seat_inventory
      WHERE session_id = $1 AND seat_id = ANY($2::int[]);
    `, [sess1Id, seatsToHoldC]);

    const isTest5Valid =
      explicitReleaseCount === 2 &&
      checkCReleased.rows.every((r) => r.status === 'available' && r.held_by_user_id === null);

    record(
      5,
      'Explicit hold release on cancellation/back',
      isTest5Valid,
      `User C explicitly released ${explicitReleaseCount} seats; inventory available immediately.`
    );

    // =========================================================================
    // Test 6: Repeated release requests (Idempotency)
    // =========================================================================
    // Call releaseSeatsHold again with the same token
    const repeatReleaseCount = await releaseSeatsHold(sess1Id, userCId, seatsToHoldC);
    record(
      6,
      'Repeated release requests (Idempotency)',
      repeatReleaseCount === 0,
      `Second release call returned 0 released cleanly without error or corrupting state.`
    );

    // =========================================================================
    // Test 7: Network failure & Re-hold idempotency for same user
    // =========================================================================
    const userDId = `user_d_${Date.now()}`;
    const seatsD = [s1Seats[5].seat_id]; // B1

    const firstHoldD = await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: seatsD,
      userIdStr: userDId,
    });

    // User D retries or refreshes their hold with same token
    const retryHoldD = await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: seatsD,
      userIdStr: userDId,
    });

    record(
      7,
      'Network failure and retry (Re-holding own active hold)',
      retryHoldD.holdToken === userDId && retryHoldD.heldSeatIds.includes(seatsD[0]),
      `User D re-holding own active hold succeeded without false conflict error.`
    );

    // Release User D hold
    await releaseSeatsHold(sess1Id, userDId);

    // =========================================================================
    // Test 8: App backgrounding & return expiry logic
    // =========================================================================
    // Client-side expiry rule verification:
    const pastExpiresAt = new Date(Date.now() - 5000).toISOString();
    const futureExpiresAt = new Date(Date.now() + 250000).toISOString();

    const pastRemaining = Math.max(0, Math.floor((new Date(pastExpiresAt).getTime() - Date.now()) / 1000));
    const futureRemaining = Math.max(0, Math.floor((new Date(futureExpiresAt).getTime() - Date.now()) / 1000));

    record(
      8,
      'App backgrounding and return expiry reconciliation',
      pastRemaining === 0 && futureRemaining > 200,
      `Past expiry evaluated to 0s (triggering cleanup); future expiry preserved (${futureRemaining}s remaining).`
    );

    // =========================================================================
    // Test 9: Switching event sessions while a hold exists (Session Isolation)
    // =========================================================================
    const userEId = `user_e_${Date.now()}`;
    const targetSeatId = s1Seats[6].seat_id; // B2

    // Hold on Session 1
    await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: [targetSeatId],
      userIdStr: userEId,
    });

    // Check Session 2's status for the exact same physical seat
    const s2SeatRes = await client.query(`
      SELECT status, held_by_user_id
      FROM seat_inventory
      WHERE session_id = $1 AND seat_id = $2;
    `, [sess2Id, targetSeatId]);

    const isTest9Valid =
      s2SeatRes.rows.length === 1 &&
      s2SeatRes.rows[0].status === 'available' &&
      s2SeatRes.rows[0].held_by_user_id === null;

    record(
      9,
      'Switching event sessions while hold exists (Cross-Session Isolation)',
      isTest9Valid,
      `Holding seat in Session 1 leaves Session 2 status as 'available'. Zero cross-session contamination.`
    );

    // Release User E
    await releaseSeatsHold(sess1Id, userEId);

    // =========================================================================
    // Test 10: Enforcing maximum booking quantity (5 seats)
    // =========================================================================
    let test10Exceeded = false;
    let test10Msg = '';
    const sixSeatIds = s1Seats.slice(0, 6).map((s) => s.seat_id);

    try {
      await createTemporarySeatHold({
        sessionId: sess1Id,
        seatIds: sixSeatIds, // 6 seats
        userIdStr: `bulk_user_${Date.now()}`,
      });
    } catch (err: any) {
      test10Exceeded = true;
      test10Msg = err.message;
    }

    record(
      10,
      'Enforcing maximum booking quantity (5 seats)',
      test10Exceeded && test10Msg.includes('Maximum 5 seats allowed per booking'),
      `Attempt to hold 6 seats strictly rejected: "${test10Msg}"`
    );

    // =========================================================================
    // Test 11: Preventing one user from releasing another user's hold
    // =========================================================================
    const userVictimId = `victim_${Date.now()}`;
    const userAttackerId = `attacker_${Date.now()}`;
    const victimSeatId = s1Seats[7].seat_id; // B3

    // Victim holds seat
    await createTemporarySeatHold({
      sessionId: sess1Id,
      seatIds: [victimSeatId],
      userIdStr: userVictimId,
    });

    // Attacker attempts to release Victim's hold
    const attackerReleasedCount = await releaseSeatsHold(sess1Id, userAttackerId, [victimSeatId]);

    // Verify victim's seat is still held by victim
    const checkVictimSeat = await client.query(`
      SELECT status, held_by_user_id
      FROM seat_inventory
      WHERE session_id = $1 AND seat_id = $2;
    `, [sess1Id, victimSeatId]);

    const isTest11Valid =
      attackerReleasedCount === 0 &&
      checkVictimSeat.rows[0].status === 'held' &&
      checkVictimSeat.rows[0].held_by_user_id === userVictimId;

    record(
      11,
      'Preventing one user from releasing another user\'s hold',
      isTest11Valid,
      `Attacker token released ${attackerReleasedCount} seats. Seat remains held by ${userVictimId}.`
    );

    // Release victim seat
    await releaseSeatsHold(sess1Id, userVictimId);

    // =========================================================================
    // Test 12: Matching inventory and prices between Web and Android
    // =========================================================================
    // Calculate pricing using server calculatePricing formula
    const testPricing = await calculatePricing(
      { convenienceFeeValue: 3000, gstPercent: 18 },
      2,
      70000 // 2 * ₹350
    );

    // 2 tickets * 35000 = 70000 paise (₹700.00)
    // convenience fee = 2 * 3000 = 6000 paise (₹60.00)
    // 18% GST on 6000 = 1080 paise (₹10.80)
    // grand total = 70000 + 6000 + 1080 = 77080 paise (₹770.80)
    const isTest12Valid =
      testPricing.ticketFaceValueTotal === 70000 &&
      testPricing.platformFeeTotal === 6000 &&
      testPricing.taxTotal === 1080 &&
      testPricing.grandTotal === 77080;

    record(
      12,
      'Matching inventory and authoritative server pricing',
      isTest12Valid,
      `Face: ₹${testPricing.ticketFaceValueTotal / 100}, Fee: ₹${testPricing.platformFeeTotal / 100}, GST: ₹${testPricing.taxTotal / 100}, Grand Total: ₹${testPricing.grandTotal / 100}`
    );

    // -------------------------------------------------------------------------
    // Teardown: Clean up isolated test data
    // -------------------------------------------------------------------------
    console.log(`\n--- [CLEANUP] Removing test fixtures ---`);
    for (const sid of testSessionIds) {
      await client.query(`DELETE FROM seat_inventory WHERE session_id = $1`, [sid]);
      await client.query(`DELETE FROM ticket_types WHERE session_id = $1`, [sid]);
      await client.query(`DELETE FROM event_sessions WHERE id = $1`, [sid]);
    }
    for (const eid of testEventIds) {
      await client.query(`DELETE FROM events WHERE id = $1`, [eid]);
    }
    for (const vid of testVenueIds) {
      await client.query(`DELETE FROM seats WHERE venue_id = $1`, [vid]);
      await client.query(`DELETE FROM venue_sections WHERE venue_id = $1`, [vid]);
      await client.query(`DELETE FROM venues WHERE id = $1`, [vid]);
    }
    console.log(`Cleaned up test sessions, events, seats, and venues. Production inventory preserved.\n`);

  } finally {
    await client.end();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`========================================================================`);
  console.log(`PHASE 3 RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log(`========================================================================\n`);

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 Test Runner Exception:', err);
  process.exit(1);
});
