import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from 'pg';
import crypto from 'crypto';
import { POST as confirmRoute } from '../app/api/bookings/confirm/route.ts';
import { POST as createOrderRoute } from '../app/api/payments/create-order/route.ts';
import { verifyPaymentSignature, isRazorpayConfigured } from '../src/lib/payments/razorpay.ts';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details: string) {
  testResults.push({ id, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} Test ${id}: ${name} — ${details}`);
}

async function runPhase41SecurityTests() {
  console.log(`\n========================================================================`);
  console.log(`MAHATICKET PHASE 4.1: SECURITY VERIFICATION & HOLD SYNC AUDIT SUITE`);
  console.log(`========================================================================\n`);

  const originalKeyId = process.env.RAZORPAY_KEY_ID;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowDirect = process.env.ALLOW_DIRECT_CONFIRM;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  let testVenueId: number;
  let testEventId: number;
  let testSessionId: number;
  let testSeatIds: number[] = [];
  let testUserAId: number;
  let testUserBId: number;

  try {
    // -------------------------------------------------------------------------
    // Setup Isolated Test Fixtures
    // -------------------------------------------------------------------------
    console.log(`--- [SETUP] Creating isolated test database fixtures ---`);

    const insVenue = await client.query(`
      INSERT INTO venues (name, name_mr, address, city, state, total_capacity, has_seat_layout)
      VALUES ($1, $2, 'Security Test Lane', 'Pune', 'Maharashtra', 20, 1)
      RETURNING id;
    `, [`Phase41 Security Venue ${Date.now()}`, 'सुरक्षा चाचणी सभागृह']);
    testVenueId = insVenue.rows[0].id;

    const insSec = await client.query(`
      INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
      VALUES ($1, 'Stalls', 'स्टॉल्स', 2, 5, 25000, 1) RETURNING id;
    `, [testVenueId]);
    const secId = insSec.rows[0].id;

    for (let i = 1; i <= 5; i++) {
      await client.query(`
        INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
        VALUES ($1, $2, 'A', $3, $4, 'gold', 0, 0);
      `, [testVenueId, secId, i, `P41-A${i}`]);
    }

    const insEvent = await client.query(`
      INSERT INTO events (
        organizer_id, venue_id, title, title_mr, slug, category, category_mr,
        description, description_mr, poster_url, status, convenience_fee_value, gst_percent
      ) VALUES (
        1, $1, 'Phase 4.1 Security Natak', 'फेज ४.१ सुरक्षा चाचणी नाटक', $2, 'plays', 'नाटक',
        'Testing secure payments', 'चाचणी वर्णन', 'https://example.com/poster.jpg', 'published', 3000, 18
      ) RETURNING id;
    `, [testVenueId, `phase41-test-${Date.now()}`]);
    testEventId = insEvent.rows[0].id;

    const insSess = await client.query(`
      INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
      VALUES ($1, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 'active')
      RETURNING id;
    `, [testEventId]);
    testSessionId = insSess.rows[0].id;

    const { generateSessionInventory } = await import('../src/lib/inventory-engine.ts');
    await generateSessionInventory(testSessionId, testVenueId);

    const seatsRes = await client.query(`
      SELECT s.id as seat_id FROM seat_inventory si
      JOIN seats s ON si.seat_id = s.id
      WHERE si.session_id = $1
      ORDER BY s.id LIMIT 5;
    `, [testSessionId]);
    testSeatIds = seatsRes.rows.map((r: any) => r.seat_id);

    const insUserA = await client.query(`
      INSERT INTO users (uid, email, full_name, phone_number, role)
      VALUES ($1, 'victim.customer@test.com', 'Victim User', '9822111111', 'customer') RETURNING id;
    `, [`usr_sec_a_${Date.now()}`]);
    testUserAId = insUserA.rows[0].id;

    const insUserB = await client.query(`
      INSERT INTO users (uid, email, full_name, phone_number, role)
      VALUES ($1, 'attacker.customer@test.com', 'Attacker User', '9822222222', 'customer') RETURNING id;
    `, [`usr_sec_b_${Date.now()}`]);
    testUserBId = insUserB.rows[0].id;

    console.log(`Isolated fixtures ready (Session #${testSessionId}, Seats: ${testSeatIds.join(',')})\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Missing Razorpay credentials causes safe failure (HTTP 503)
    // -------------------------------------------------------------------------
    console.log(`--- [TASK A] Testing Signature Verification Security ---`);
    process.env.RAZORPAY_KEY_ID = '';
    process.env.RAZORPAY_KEY_SECRET = '';

    const req1 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: 'order_test_missing_creds',
          paymentId: 'pay_test_missing_creds',
          signature: 'sig_test_missing_creds',
        },
      }),
    });

    const res1 = await confirmRoute(req1);
    const body1 = await res1.json();
    record(
      1,
      'Missing Razorpay Credentials Safe Failure',
      res1.status === 503 && body1.error?.includes('not configured'),
      `Status ${res1.status}: "${body1.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Placeholder credentials causes safe failure (HTTP 503)
    // -------------------------------------------------------------------------
    process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder_key';
    process.env.RAZORPAY_KEY_SECRET = 'placeholder_secret';

    const req2 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: 'order_test_placeholder',
          paymentId: 'pay_test_placeholder',
          signature: 'sig_test_placeholder',
        },
      }),
    });

    const res2 = await confirmRoute(req2);
    const body2 = await res2.json();
    record(
      2,
      'Placeholder Credentials Safe Failure',
      res2.status === 503 && body2.error?.includes('not configured'),
      `Status ${res2.status}: "${body2.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Forged / Invalid HMAC signature is rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const testSecret = 'rzp_mock_secret_key_secure_98765';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_validmockkey123';
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const fakeOrderId = 'order_fake_order_123';
    const fakePaymentId = 'pay_fake_payment_456';
    const forgedSignature = 'forged_fake_signature_abc789';

    const req3 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: fakeOrderId,
          paymentId: fakePaymentId,
          signature: forgedSignature,
        },
      }),
    });

    const res3 = await confirmRoute(req3);
    const body3 = await res3.json();
    record(
      3,
      'Forged Signature Rejection',
      res3.status === 400 && body3.error?.includes('Invalid payment signature'),
      `Status ${res3.status}: "${body3.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Missing signature in payment details is rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const req4 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: fakeOrderId,
          paymentId: fakePaymentId,
          // signature omitted
        },
      }),
    });

    const res4 = await confirmRoute(req4);
    const body4 = await res4.json();
    record(
      4,
      'Missing Signature Parameter Rejection',
      res4.status === 400 && body4.error?.includes('Incomplete Razorpay payment details'),
      `Status ${res4.status}: "${body4.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Production Direct-Confirm Bypass Prevention (HTTP 402)
    // -------------------------------------------------------------------------
    (process.env as any).NODE_ENV = 'production';
    process.env.ALLOW_DIRECT_CONFIRM = 'false';

    const req5 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'direct_confirm',
        },
      }),
    });

    const res5 = await confirmRoute(req5);
    const body5 = await res5.json();
    record(
      5,
      'Production Direct-Confirm Bypass Prevention',
      res5.status === 402 && body5.error?.includes('Direct confirmation is disabled'),
      `Status ${res5.status}: "${body5.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Unsupported Gateway Rejection (HTTP 400)
    // -------------------------------------------------------------------------
    (process.env as any).NODE_ENV = 'development';

    const req6 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'unsupported_bitcoin_gateway',
        },
      }),
    });

    const res6 = await confirmRoute(req6);
    const body6 = await res6.json();
    record(
      6,
      'Unsupported Gateway Rejection',
      res6.status === 400 && body6.error?.includes('Unsupported or invalid payment gateway'),
      `Status ${res6.status}: "${body6.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Valid HMAC signature allows legitimate booking confirmation
    // -------------------------------------------------------------------------
    const validOrderId = `order_valid_${Date.now()}`;
    const validPaymentId = `pay_valid_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${validOrderId}|${validPaymentId}`)
      .digest('hex');

    const req7 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: validOrderId,
          paymentId: validPaymentId,
          signature: validSignature,
        },
      }),
    });

    const res7 = await confirmRoute(req7);
    const body7 = await res7.json();
    record(
      7,
      'Valid Signature Booking Confirmation',
      res7.status === 200 && body7.success === true && body7.order?.orderNumber,
      `Status ${res7.status}: Order #${body7.order?.orderNumber}, Tickets: ${body7.tickets?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Unauthorized user cannot claim or retrieve another customer's order (HTTP 403)
    // -------------------------------------------------------------------------
    const req8 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Attacker User',
        userEmail: 'attacker.customer@test.com',
        userPhone: '9822222222',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: validOrderId,
          paymentId: validPaymentId,
          signature: validSignature,
        },
      }),
    });

    const res8 = await confirmRoute(req8);
    const body8 = await res8.json();
    record(
      8,
      'Unauthorized Cross-User Order Access Prevention',
      res8.status === 403 && body8.error?.includes('Unauthorized'),
      `Status ${res8.status}: "${body8.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Idempotent confirmation returns existing order for original owner
    // -------------------------------------------------------------------------
    const req9 = new Request('http://localhost/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        eventId: testEventId,
        seatIds: [testSeatIds[0]],
        userName: 'Victim User',
        userEmail: 'victim.customer@test.com',
        userPhone: '9822111111',
        paymentDetails: {
          gateway: 'razorpay',
          orderId: validOrderId,
          paymentId: validPaymentId,
          signature: validSignature,
        },
      }),
    });

    const res9 = await confirmRoute(req9);
    const body9 = await res9.json();
    record(
      9,
      'Idempotent Confirmation for Original Owner',
      res9.status === 200 && body9.success === true && body9.message?.includes('idempotent'),
      `Status ${res9.status}: Order #${body9.order?.orderNumber} (${body9.message})`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Hold Expiry Synchronization in create-order
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // TEST 10: Hold Expiry Synchronization in create-order
    // -------------------------------------------------------------------------
    console.log(`\n--- [TASK B] Testing Hold Expiry Synchronization ---`);

    // Mock Razorpay SDK orders.create during tests to avoid charging real providers
    const Razorpay = (await import('razorpay')).default;
    const origAddResources = (Razorpay as any).prototype.addResources;
    (Razorpay as any).prototype.addResources = function () {
      origAddResources.apply(this, arguments);
      this.orders.create = async (opts: any) => ({
        id: `order_mock_${Date.now()}`,
        amount: opts.amount,
        currency: opts.currency,
        receipt: opts.receipt,
        status: 'created',
      });
    };

    // First acquire hold for seat 1 with userHoldToken
    const userHoldToken = `hold_token_customer_${Date.now()}`;
    await client.query(`
      UPDATE seat_inventory
      SET status = 'held', held_by_user_id = $1, hold_expires_at = NOW() + INTERVAL '5 minutes'
      WHERE session_id = $2 AND seat_id = $3;
    `, [userHoldToken, testSessionId, testSeatIds[1]]);

    const nowBefore = Date.now();

    const req10 = new Request('http://localhost/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        seatIds: [testSeatIds[1]],
        holdToken: userHoldToken,
      }),
    });

    const res10 = await createOrderRoute(req10);
    const body10 = await res10.json();

    let holdSyncPassed = false;
    let holdExpiryDiffMinutes = 0;
    if (res10.status === 200 && body10.holdExpiresAt) {
      const expiryMs = new Date(body10.holdExpiresAt).getTime();
      holdExpiryDiffMinutes = (expiryMs - nowBefore) / (1000 * 60);
      // Expected: ~10 minutes from now (between 9.5 and 10.5 minutes)
      holdSyncPassed = holdExpiryDiffMinutes >= 9.5 && holdExpiryDiffMinutes <= 10.5;
    }

    record(
      10,
      'Authoritative Extended holdExpiresAt in create-order Response',
      holdSyncPassed,
      `Status ${res10.status}: holdExpiresAt = ${body10.holdExpiresAt} (~${holdExpiryDiffMinutes.toFixed(2)} min)`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Other customer cannot hijack active hold in create-order
    // -------------------------------------------------------------------------
    const attackerToken = `hold_token_attacker_${Date.now()}`;
    const req11 = new Request('http://localhost/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        seatIds: [testSeatIds[1]], // Held by userHoldToken
        holdToken: attackerToken,
      }),
    });

    const res11 = await createOrderRoute(req11);
    const body11 = await res11.json();
    record(
      11,
      'Active Hold Hijack Prevention in create-order',
      res11.status === 409 && body11.error?.includes('currently held by another customer'),
      `Status ${res11.status}: "${body11.error}"`
    );

    // Restore Razorpay SDK prototype
    (Razorpay as any).prototype.addResources = origAddResources;

    // -------------------------------------------------------------------------
    // TEST 12: verifyPaymentSignature cryptographic unit tests
    // -------------------------------------------------------------------------
    const validAlgoCheck = verifyPaymentSignature(validOrderId, validPaymentId, validSignature);
    const tamperedOrderIdCheck = verifyPaymentSignature('order_tampered', validPaymentId, validSignature);
    const tamperedPaymentIdCheck = verifyPaymentSignature(validOrderId, 'pay_tampered', validSignature);
    const emptyParamCheck = verifyPaymentSignature('', validPaymentId, validSignature);

    const algoPass = validAlgoCheck === true &&
                     tamperedOrderIdCheck === false &&
                     tamperedPaymentIdCheck === false &&
                     emptyParamCheck === false;

    record(
      12,
      'Cryptographic HMAC SHA256 Constant-Time Verification',
      algoPass,
      `Valid=${validAlgoCheck}, TamperedOrder=${!tamperedOrderIdCheck}, TamperedPay=${!tamperedPaymentIdCheck}, Empty=${!emptyParamCheck}`
    );

  } finally {
    // Restore environment variables
    process.env.RAZORPAY_KEY_ID = originalKeyId;
    process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.ALLOW_DIRECT_CONFIRM = originalAllowDirect;

    // Clean up test data
    console.log(`\n--- [CLEANUP] Removing test fixtures ---`);
    if (testSessionId!) {
      await client.query(`DELETE FROM tickets WHERE session_id = $1`, [testSessionId]);
      await client.query(`UPDATE seat_inventory SET order_id = NULL WHERE session_id = $1`, [testSessionId]);
      await client.query(`DELETE FROM orders WHERE session_id = $1`, [testSessionId]);
      await client.query(`DELETE FROM seat_inventory WHERE session_id = $1`, [testSessionId]);
      await client.query(`DELETE FROM ticket_types WHERE session_id = $1`, [testSessionId]);
      await client.query(`DELETE FROM event_sessions WHERE id = $1`, [testSessionId]);
    }
    if (testEventId!) {
      await client.query(`DELETE FROM settlements WHERE event_id = $1`, [testEventId]);
      await client.query(`DELETE FROM events WHERE id = $1`, [testEventId]);
    }
    if (testVenueId!) {
      await client.query(`DELETE FROM seats WHERE venue_id = $1`, [testVenueId]);
      await client.query(`DELETE FROM venue_sections WHERE venue_id = $1`, [testVenueId]);
      await client.query(`DELETE FROM venues WHERE id = $1`, [testVenueId]);
    }
    if (testUserAId!) {
      await client.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testUserAId, testUserBId!]);
    }
    await client.end();
  }

  console.log(`\n========================================================================`);
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log(`========================================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase41SecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
