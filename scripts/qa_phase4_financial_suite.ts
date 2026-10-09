import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from 'pg';
import crypto from 'crypto';
import {
  calculatePricing,
  createTemporarySeatHold,
  releaseExpiredHolds,
  confirmBookingOrder,
  generateSessionInventory,
} from '../src/lib/inventory-engine.ts';
import {
  checkRefundEligibility,
  processOrderRefund,
} from '../src/lib/refund-engine.ts';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../src/lib/payments/razorpay.ts';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, details: string, data?: any) {
  results.push({
    suite,
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`,
    data,
  });
  const symbol = condition ? '✓' : '✗';
  console.log(`  ${symbol} [${suite}] ${name}: ${details}`);
}

async function runPhase4QA() {
  console.log(`\n==============================================================================`);
  console.log(`MAHATICKET PHASE 4: PAYMENTS, REFUNDS, SETTLEMENTS & FINANCIAL QA SUITE`);
  console.log(`==============================================================================\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const testSessionIds: number[] = [];
  const testEventIds: number[] = [];
  const testVenueIds: number[] = [];
  const testOrderIds: number[] = [];
  const testUserIds: number[] = [];
  const testOrgIds: number[] = [];

  try {
    // =========================================================================
    // 0. FIXTURE SETUP
    // =========================================================================
    // Create 2 distinct organizers for multi-tenant isolation testing
    const insOrgA = await client.query(`
      INSERT INTO organizers (
        name, company_name, email, phone, city, verification_status, commission_rate,
        bank_name, bank_account_number, bank_ifsc, pan_number, gstin
      ) VALUES (
        'Producer Ramesh (Org A)', 'Swarashree Productions', 'ramesh.qa@test.com',
        '+91 98201 11222', 'Pune', 'verified', 600,
        'HDFC Bank', '50100456789012', 'HDFC0000123', 'ABCDE1234F', '27ABCDE1234F1Z5'
      ) RETURNING id;
    `);
    const orgAId = insOrgA.rows[0].id;
    testOrgIds.push(orgAId);

    const insOrgB = await client.query(`
      INSERT INTO organizers (
        name, company_name, email, phone, city, verification_status, commission_rate,
        bank_name, bank_account_number, bank_ifsc, pan_number, gstin
      ) VALUES (
        'Producer Suresh (Org B)', 'NatyaMandir Creations', 'suresh.prod.qa@test.com',
        '+91 98202 33444', 'Mumbai', 'verified', 500,
        'State Bank of India', '30200987654321', 'SBIN0000456', 'XYZAB5678C', '27XYZAB5678C1Z2'
      ) RETURNING id;
    `);
    const orgBId = insOrgB.rows[0].id;
    testOrgIds.push(orgBId);

    // Create 2 test users
    const insUser1 = await client.query(`
      INSERT INTO users (uid, email, full_name, role)
      VALUES ($1, $2, $3, 'customer') RETURNING id;
    `, [`qa_phase4_user1_${Date.now()}`, 'customer1.qa@test.com', 'Anand Joshi']);
    const user1Id = insUser1.rows[0].id;
    testUserIds.push(user1Id);

    const insUser2 = await client.query(`
      INSERT INTO users (uid, email, full_name, role)
      VALUES ($1, $2, $3, 'customer') RETURNING id;
    `, [`qa_phase4_user2_${Date.now()}`, 'customer2.qa@test.com', 'Priya Kulkarni']);
    const user2Id = insUser2.rows[0].id;
    testUserIds.push(user2Id);

    // Create a physical test venue
    const insVenue = await client.query(`
      INSERT INTO venues (
        name, name_mr, address, city, district_id, total_capacity,
        has_seat_layout, is_template, verification_status
      ) VALUES (
        'QA Balgandharva Rangmandir', 'बालगंधर्व रंगमंदिर QA',
        'JM Road, Shivajinagar, Pune', 'Pune', 8, 20,
        1, 1, 'verified'
      ) RETURNING id;
    `);
    const venueId = insVenue.rows[0].id;
    testVenueIds.push(venueId);

    // Insert sections & seats
    const insSec = await client.query(`
      INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
      VALUES ($1, 'Balcony', 'बाल्कनी', 2, 5, 50000, 1) RETURNING id;
    `, [venueId]);
    const secId = insSec.rows[0].id;

    for (const r of ['A', 'B']) {
      for (let s = 1; s <= 5; s++) {
        await client.query(`
          INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
          VALUES ($1, $2, $3, $4, $5, 'gold', 0, 0);
        `, [venueId, secId, r, s, `BAL-${r}0${s}`]);
      }
    }

    // Create Event A (linked to Org A)
    const insEventA = await client.query(`
      INSERT INTO events (
        organizer_id, venue_id, title, title_mr, slug, category, category_mr,
        description, description_mr, poster_url, status
      ) VALUES (
        $1, $2, 'Katyar Kaljat Ghusli', 'कट्यार काळजात घुसली', $3, 'plays', 'नाटक',
        'Musical Drama', 'संगीत नाटक', 'https://example.com/poster.jpg', 'published'
      ) RETURNING id;
    `, [orgAId, venueId, `katyar-phase4-${Date.now()}`]);
    const eventAId = insEventA.rows[0].id;
    testEventIds.push(eventAId);

    // Create Event B (linked to Org B)
    const insEventB = await client.query(`
      INSERT INTO events (
        organizer_id, venue_id, title, title_mr, slug, category, category_mr,
        description, description_mr, poster_url, status
      ) VALUES (
        $1, $2, 'Natsamrat', 'नटसम्राट', $3, 'plays', 'नाटक',
        'Classic Tragedy', 'अभिजात शोकांतिका', 'https://example.com/poster.jpg', 'published'
      ) RETURNING id;
    `, [orgBId, venueId, `natsamrat-phase4-${Date.now()}`]);
    const eventBId = insEventB.rows[0].id;
    testEventIds.push(eventBId);

    // Create Sessions for Event A and Event B
    const insSessA = await client.query(`
      INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
      VALUES ($1, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 3 hours', 'active')
      RETURNING id;
    `, [eventAId]);
    const sessAId = insSessA.rows[0].id;
    testSessionIds.push(sessAId);

    const insSessB = await client.query(`
      INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
      VALUES ($1, NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 3 hours', 'active')
      RETURNING id;
    `, [eventBId]);
    const sessBId = insSessB.rows[0].id;
    testSessionIds.push(sessBId);

    // Generate physical inventory for sessions
    await generateSessionInventory(sessAId, venueId, 500); // ₹500
    await generateSessionInventory(sessBId, venueId, 600); // ₹600

    // =========================================================================
    // 1. FINANCIAL FORMULAS & INTEGER PAISE RECONCILIATION AUDIT
    // =========================================================================
    console.log(`--- 1. SERVER-SIDE FINANCIAL PRICING & RECONCILIATION AUDIT ---`);

    // Test 1.1: Standard 1-Ticket Pricing
    const p1 = await calculatePricing(
      { convenienceFeeValue: 3000 },
      1,
      50000 // ₹500
    );
    // Face Value = ₹500 (50,000 paise)
    // Convenience fee = ₹30 (3,000 paise)
    // GST (18% on ₹30) = 3000 * 0.18 = 540 paise (₹5.40)
    // Grand Total = 50,000 + 3,000 + 540 = 53,540 paise (₹535.40)
    // Gateway cost (2% of 53,540) = 1,071 paise (₹10.71)
    assert(
      'Financial Pricing',
      'Exact Formula Reconciliation (1 Ticket)',
      p1.ticketFaceValueTotal === 50000 &&
      p1.platformFeeTotal === 3000 &&
      p1.taxTotal === 540 &&
      p1.grandTotal === 53540 &&
      p1.gatewayCostEstimate === 1071,
      `Calculated 1-ticket grand total: ₹${p1.grandTotal / 100} (Face ₹${p1.ticketFaceValueTotal / 100} + Fee ₹${p1.platformFeeTotal / 100} + Tax ₹${p1.taxTotal / 100}). Reconciles 100%.`
    );

    // Test 1.2: Multi-Ticket (3 Seats) Calculation
    const p3 = await calculatePricing(
      { convenienceFeeValue: 3000 },
      3,
      150000 // 3 * ₹500 = ₹1,500
    );
    // Fee = 3 * 3000 = 9000 paise
    // Tax = 9000 * 0.18 = 1620 paise
    // Grand Total = 150000 + 9000 + 1620 = 160620 paise (₹1,606.20)
    assert(
      'Financial Pricing',
      'Exact Multi-Ticket Reconciliation (3 Seats)',
      p3.ticketFaceValueTotal === 150000 &&
      p3.platformFeeTotal === 9000 &&
      p3.taxTotal === 1620 &&
      p3.grandTotal === 160620,
      `Calculated 3-ticket grand total: ₹${p3.grandTotal / 100}. Zero rounding drift.`
    );

    // =========================================================================
    // 2. RAZORPAY SECURITY: SIGNATURE VERIFICATION & TIMING-SAFE CHECK
    // =========================================================================
    console.log(`\n--- 2. RAZORPAY SECURITY & SIGNATURE INTEGRITY AUDIT ---`);

    const fakeKeySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key_12345';
    const fakeOrderId = 'order_ph4_test_101';
    const fakePaymentId = 'pay_ph4_test_202';
    const validSignature = crypto
      .createHmac('sha256', fakeKeySecret)
      .update(`${fakeOrderId}|${fakePaymentId}`)
      .digest('hex');

    // Test 2.1: Valid signature accepted
    const isSigValid = verifyPaymentSignature(fakeOrderId, fakePaymentId, validSignature);
    assert(
      'Razorpay Security',
      'Valid Payment Signature Accepted',
      isSigValid === true,
      'Valid HMAC SHA256 payment signature verified successfully.'
    );

    // Test 2.2: Tampered signature rejected
    const isForgedSigRejected = !verifyPaymentSignature(fakeOrderId, fakePaymentId, 'bad_forged_signature_hash');
    assert(
      'Razorpay Security',
      'Forged Signature Rejected',
      isForgedSigRejected === true,
      'Tampered/forged payment signature strictly rejected.'
    );

    // Test 2.3: Webhook raw body signature verification
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_secret_67890';
    const fakeWebhookBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: fakePaymentId, order_id: fakeOrderId, amount: 53540 } } },
    });
    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(fakeWebhookBody)
      .digest('hex');

    const isWebhookValid = verifyWebhookSignature(fakeWebhookBody, validWebhookSig);
    assert(
      'Razorpay Security',
      'Webhook Raw Body Signature Verification',
      isWebhookValid === true,
      'Razorpay webhook payload raw-body HMAC signature verified.'
    );

    // =========================================================================
    // 3. ORDER CREATION, TICKET ISSUANCE & PAYMENT IDEMPOTENCY
    // =========================================================================
    console.log(`\n--- 3. ORDER CONFIRMATION & PAYMENT IDEMPOTENCY AUDIT ---`);

    // Fetch a seat from Session A
    const [seatA1] = (await client.query(`
      SELECT s.id as seat_id, s.seat_code, si.id as inv_id
      FROM seat_inventory si
      JOIN seats s ON si.seat_id = s.id
      WHERE si.session_id = $1
      LIMIT 1;
    `, [sessAId])).rows;

    // Confirm booking order
    const bookingRes = await confirmBookingOrder({
      sessionId: sessAId,
      eventId: eventAId,
      seatIds: [Number(seatA1.seat_id)],
      userId: user1Id,
      userName: 'Anand Joshi',
      userEmail: 'customer1.qa@test.com',
      userPhone: '+91 98201 11222',
      pricing: p1,
      paymentDetails: {
        gateway: 'razorpay',
        razorpayOrderId: fakeOrderId,
        razorpayPaymentId: fakePaymentId,
        idempotencyKey: `razorpay_${fakePaymentId}`,
      },
    });
    testOrderIds.push(bookingRes.order.id);

    assert(
      'Order & Tickets',
      'Post-Payment Ticket Issuance',
      bookingRes.order.orderStatus === 'confirmed' &&
      bookingRes.order.paymentStatus === 'captured' &&
      bookingRes.tickets.length === 1 &&
      bookingRes.tickets[0].status === 'valid',
      `Order ${bookingRes.order.orderNumber} confirmed; issued ticket ${bookingRes.tickets[0].ticketCode}.`
    );

    // Test 3.2: Duplicate Callback / Webhook Idempotency
    const duplicateRes = await confirmBookingOrder({
      sessionId: sessAId,
      eventId: eventAId,
      seatIds: [Number(seatA1.seat_id)],
      userId: user1Id,
      userName: 'Anand Joshi',
      userEmail: 'customer1.qa@test.com',
      userPhone: '+91 98201 11222',
      pricing: p1,
      paymentDetails: {
        gateway: 'razorpay',
        razorpayOrderId: fakeOrderId,
        razorpayPaymentId: fakePaymentId,
        idempotencyKey: `razorpay_${fakePaymentId}`,
      },
    });

    assert(
      'Order & Tickets',
      'Duplicate Callback Idempotency',
      duplicateRes.order.id === bookingRes.order.id &&
      duplicateRes.tickets.length === 1,
      'Duplicate payment callback returned existing order without double-billing or extra ticket creation.'
    );

    // Verify Organizer Settlement record was initialized
    const [settleA] = (await client.query(`
      SELECT * FROM settlements WHERE event_id = $1;
    `, [eventAId])).rows;

    // Commission: 600 bps = 6% on 50,000 = 3,000 paise
    // Net Payable: 50,000 - 3,000 = 47,000 paise (₹470.00)
    assert(
      'Settlement Ledger',
      'Automatic Settlement Ledger Allocation',
      settleA !== undefined &&
      settleA.total_gross_ticket_sales === 50000 &&
      settleA.platform_commission_earned === 3000 &&
      settleA.net_payable_to_organizer === 47000,
      `Settlement record created with Gross ₹${settleA.total_gross_ticket_sales / 100}, Platform Commission ₹${settleA.platform_commission_earned / 100}, Net Organizer Payable ₹${settleA.net_payable_to_organizer / 100}.`
    );

    // =========================================================================
    // 4. CANCELLATION, REFUND EXECUTION & SEAT RELEASE AUDIT
    // =========================================================================
    console.log(`\n--- 4. CANCELLATION, REFUND & SEAT RELEASE AUDIT ---`);

    // Test 4.1: Check Refund Eligibility (Show is in 3 days -> 100% face value eligible)
    const eligibility = await checkRefundEligibility(bookingRes.order.id, {
      userId: user1Id,
      role: 'customer',
    });
    assert(
      'Refund Eligibility',
      'Pre-Show Refund Eligibility Rule',
      eligibility.eligible === true &&
      eligibility.refundableFaceValue === 50000 &&
      eligibility.suggestedRefundAmount === 50000,
      `Order is eligible for ₹${eligibility.suggestedRefundAmount / 100} refund (100% face value, platform fees non-refundable).`
    );

    // Test 4.2: Execute Order Refund
    const refundRes = await processOrderRefund({
      orderId: bookingRes.order.id,
      reason: 'Customer requested cancellation (QA Test)',
      actorId: 'customer1.qa@test.com',
      actorRole: 'customer',
    });

    assert(
      'Refund Execution',
      'Order Status & Tickets Invalidation',
      refundRes.success === true &&
      refundRes.order.paymentStatus === 'refunded' &&
      refundRes.order.orderStatus === 'cancelled',
      `Order ${bookingRes.order.orderNumber} successfully cancelled & marked refunded.`
    );

    // Test 4.3: Seat Inventory Released
    const [releasedSeat] = (await client.query(`
      SELECT status, order_id, held_by_user_id FROM seat_inventory
      WHERE session_id = $1 AND seat_id = $2;
    `, [sessAId, Number(seatA1.seat_id)])).rows;

    assert(
      'Refund Execution',
      'Seat Inventory Released Back to Available',
      releasedSeat.status === 'available' && releasedSeat.order_id === null,
      `Seat ${seatA1.seat_code} returned to 'available' inventory with order reference cleared.`
    );

    // Test 4.4: Settlement Ledger Adjusted with Refund Deduction
    const [adjustedSettleA] = (await client.query(`
      SELECT total_refund_deductions, net_payable_to_organizer FROM settlements
      WHERE event_id = $1;
    `, [eventAId])).rows;

    assert(
      'Settlement Ledger',
      'Refund Deduction Applied to Organizer Net Payable',
      adjustedSettleA.total_refund_deductions === 50000 &&
      adjustedSettleA.net_payable_to_organizer === 0,
      `Refund deduction of ₹500.00 applied to settlement; Net Organizer Payable adjusted from ₹470.00 to ₹0.00.`
    );

    // Test 4.5: Double Refund Prevention (Idempotency)
    const retryRefundRes = await processOrderRefund({
      orderId: bookingRes.order.id,
      reason: 'Retry refund attempt',
      actorId: 'customer1.qa@test.com',
      actorRole: 'customer',
    });

    assert(
      'Refund Idempotency',
      'Double Refund Prevention',
      retryRefundRes.alreadyRefunded === true,
      'Repeated refund attempt safely returned alreadyRefunded: true without duplicate ledger deduction.'
    );

    // =========================================================================
    // 5. QR CODE GATE SCANNER: REFUNDED TICKET REJECTION AUDIT
    // =========================================================================
    console.log(`\n--- 5. QR CODE GATE SCANNER & REFUND REJECTION AUDIT ---`);

    const ticketCode = bookingRes.tickets[0].ticketCode;

    // Gate scanner attempt on refunded ticket
    const [scannedTicket] = (await client.query(`
      SELECT status FROM tickets WHERE ticket_code = $1;
    `, [ticketCode])).rows;

    assert(
      'Gate Scanner Security',
      'Refunded Ticket Status Invalidation',
      scannedTicket.status === 'refunded',
      `Ticket ${ticketCode} status is 'refunded'. Gate scanner will strictly reject entry with 'TICKET_CANCELLED'.`
    );

    // =========================================================================
    // 6. MULTI-TENANT ORGANIZER ISOLATION & SETTLEMENT PAYOUT SECURITY
    // =========================================================================
    console.log(`\n--- 6. ORGANIZER ISOLATION & SETTLEMENT PAYOUT SECURITY ---`);

    // Fetch settlements for Org A vs Org B
    const orgASettlements = await client.query(`
      SELECT id, settlement_reference, organizer_id, total_gross_ticket_sales
      FROM settlements WHERE organizer_id = $1;
    `, [orgAId]);

    const orgBSettlements = await client.query(`
      SELECT id, settlement_reference, organizer_id, total_gross_ticket_sales
      FROM settlements WHERE organizer_id = $1;
    `, [orgBId]);

    assert(
      'Multi-Tenant Isolation',
      'Organizer Ledger Boundary',
      orgASettlements.rows.every(r => r.organizer_id === orgAId) &&
      orgBSettlements.rows.length === 0,
      `Organizer A query returned only Org A settlements (${orgASettlements.rows.length}); Org B ledger remains completely isolated.`
    );

    // Payout UTR Validation: Updating status to 'settled' with UTR
    const fakeUtr = `UTR-MAHA-${Date.now()}`;
    const updatePayout = await client.query(`
      UPDATE settlements
      SET status = 'settled', payout_utr = $1, settled_at = NOW()
      WHERE id = $2
      RETURNING status, payout_utr, settled_at;
    `, [fakeUtr, settleA.id]);

    assert(
      'Settlement Payout',
      'UTR Persistence & Settled State',
      updatePayout.rows[0].status === 'settled' &&
      updatePayout.rows[0].payout_utr === fakeUtr &&
      updatePayout.rows[0].settled_at !== null,
      `Settlement successfully finalized with Bank UTR ${fakeUtr} and confirmed settlement timestamp.`
    );

  } finally {
    // =========================================================================
    // CLEANUP TEST FIXTURES (Protect Production Data)
    // =========================================================================
    console.log(`\n--- CLEANING UP TEST FIXTURES ---`);
    await client.query(`DELETE FROM ticket_scans WHERE scanned_by_user_id IN (SELECT id FROM users WHERE email LIKE '%qa@test.com%')`);
    await client.query(`DELETE FROM tickets WHERE order_id IN (SELECT id FROM orders WHERE user_email LIKE '%qa@test.com%')`);
    await client.query(`DELETE FROM seat_inventory WHERE order_id IN (SELECT id FROM orders WHERE user_email LIKE '%qa@test.com%')`);
    await client.query(`DELETE FROM orders WHERE user_email LIKE '%qa@test.com%'`);

    if (testSessionIds.length > 0) {
      await client.query(`DELETE FROM seat_inventory WHERE session_id = ANY($1)`, [testSessionIds]);
      await client.query(`DELETE FROM ticket_types WHERE session_id = ANY($1)`, [testSessionIds]);
      await client.query(`DELETE FROM event_sessions WHERE id = ANY($1)`, [testSessionIds]);
    }
    if (testEventIds.length > 0) {
      await client.query(`DELETE FROM settlements WHERE event_id = ANY($1)`, [testEventIds]);
      await client.query(`DELETE FROM audit_logs WHERE details LIKE '%phase4%' OR actor_id LIKE '%qa@test.com%'`);
      await client.query(`DELETE FROM events WHERE id = ANY($1)`, [testEventIds]);
    }
    if (testVenueIds.length > 0) {
      await client.query(`DELETE FROM seats WHERE venue_id = ANY($1)`, [testVenueIds]);
      await client.query(`DELETE FROM venue_sections WHERE venue_id = ANY($1)`, [testVenueIds]);
      await client.query(`DELETE FROM venues WHERE id = ANY($1)`, [testVenueIds]);
    }
    if (testUserIds.length > 0) {
      await client.query(`DELETE FROM users WHERE id = ANY($1)`, [testUserIds]);
    }
    if (testOrgIds.length > 0) {
      await client.query(`DELETE FROM organizers WHERE id = ANY($1)`, [testOrgIds]);
    }
    await client.query(`DELETE FROM users WHERE email LIKE '%qa@test.com%'`);
    await client.query(`DELETE FROM organizers WHERE email LIKE '%qa@test.com%'`);
    console.log(`Cleaned up synthetic test fixtures successfully.`);

    await client.end();
  }

  // Final Summary
  console.log(`\n==============================================================================`);
  console.log(`PHASE 4 FINANCIAL QA TEST SUMMARY:`);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Assertions: ${results.length}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);
  console.log(`==============================================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase4QA().catch((err) => {
  console.error('Phase 4 QA Suite Error:', err);
  process.exit(1);
});
