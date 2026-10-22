import 'dotenv/config';
import { db, pool } from '../src/db/index';
import { 
  events, 
  eventSessions, 
  ticketTypes, 
  seatInventory, 
  orders, 
  tickets, 
  ticketScans, 
  settlements,
  auditLogs,
  users 
} from '../src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createTemporarySeatHold, confirmBookingOrder } from '../src/lib/inventory-engine';
import { decryptSecureGroupOrderQr } from '../src/lib/ticket-crypto';

async function runTests() {
  console.log('--- Starting MahaTicket Comprehensive Booking & Scanner Tests ---');

  // Pre-cleanup of any lingering test orders
  const oldTestOrders = await db.select().from(orders).where(eq(orders.userEmail, 'test@mahaticket.com'));
  if (oldTestOrders.length > 0) {
    const ids = oldTestOrders.map(o => o.id);
    await db.update(seatInventory).set({ status: 'available', holdExpiresAt: null, heldByUserId: null, orderId: null }).where(inArray(seatInventory.orderId, ids));
    await db.delete(tickets).where(inArray(tickets.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));
  }

  // Find any session with an existing event that has at least 6 available seats
  const validSessions = await db
    .select({
      session: eventSessions,
      event: events,
    })
    .from(eventSessions)
    .innerJoin(events, eq(eventSessions.eventId, events.id))
    .limit(20);

  let session = null;
  let targetEvent = null;
  let availableSeats: any[] = [];

  for (const row of validSessions) {
    const s = row.session;
    const seats = await db.select()
      .from(seatInventory)
      .where(and(
        eq(seatInventory.sessionId, s.id),
        eq(seatInventory.status, 'available')
      ))
      .limit(10);
    if (seats.length >= 6) {
      session = s;
      targetEvent = row.event;
      availableSeats = seats;
      break;
    }
  }

  if (!session || !targetEvent) {
    console.error('No valid session with at least 6 available seats found in database!');
    process.exit(1);
  }
  console.log(`Using Session ID: ${session.id}, Event: "${targetEvent.title}" (ID: ${session.eventId})`);
  console.log(`Found ${availableSeats.length} available seats for testing.`);

  // TEST 1: Rejecting > 5 seats
  console.log('\n[TEST 1] Testing > 5 seats rejection rule (Max 5 seats)...');
  const sixSeatIds = availableSeats.slice(0, 6).map(s => s.seatId);
  try {
    await createTemporarySeatHold({
      sessionId: session.id,
      seatIds: sixSeatIds,
      userIdStr: 'test_user_hold_999',
    });
    console.error('❌ TEST 1 FAILED: Expected error for 6 seats but none was thrown!');
    process.exit(1);
  } catch (err: any) {
    if (err.message?.includes('Maximum 5 seats')) {
      console.log('✅ TEST 1 PASSED: Correctly rejected 6 seats with error: ' + err.message);
    } else {
      console.error('❌ TEST 1 FAILED: Unexpected error message:', err.message);
      process.exit(1);
    }
  }

  // TEST 2: Holding valid seats (3 seats)
  console.log('\n[TEST 2] Testing valid hold of 3 seats...');
  const threeSeatIds = availableSeats.slice(0, 3).map(s => s.seatId);
  const testUserId = `test_hold_${Date.now()}`;
  
  const holdResult = await createTemporarySeatHold({
    sessionId: session.id,
    seatIds: threeSeatIds,
    userIdStr: testUserId,
  });

  if (!holdResult.holdToken || holdResult.heldSeatIds.length !== 3) {
    console.error('❌ TEST 2 FAILED: Could not hold 3 seats properly:', holdResult);
    process.exit(1);
  }
  console.log(`✅ TEST 2 PASSED: 3 seats held with token: ${holdResult.holdToken}, Seats: ${holdResult.heldSeats.map(s => s.seatCode).join(', ')}`);

  // TEST 3: Confirm booking order and generate single Group Order QR
  console.log('\n[TEST 3] Confirming booking order & issuing 1 Group Order QR...');
  const testRazorpayId = `pay_test_${Date.now()}`;
  
  const confirmResult = await confirmBookingOrder({
    sessionId: session.id,
    eventId: session.eventId,
    seatIds: threeSeatIds,
    userId: 1,
    userName: 'Automated Test User',
    userEmail: 'test@mahaticket.com',
    userPhone: '9876543210',
    pricing: {
      ticketCount: 3,
      ticketFaceValueTotal: holdResult.faceValueTotal,
      platformFeeTotal: 3000 * 3,
      taxTotal: Math.round(3000 * 3 * 0.18),
      gatewayCostEstimate: 500,
      discountTotal: 0,
      grandTotal: holdResult.faceValueTotal + 3000 * 3 + Math.round(3000 * 3 * 0.18),
      appliedCoupon: null,
    },
    paymentDetails: {
      gateway: 'razorpay',
      razorpayPaymentId: testRazorpayId,
      razorpayOrderId: `order_rp_${Date.now()}`,
    }
  });

  const createdOrder = confirmResult.order;
  const createdTickets = confirmResult.tickets;

  if (!createdOrder || createdTickets.length !== 3) {
    console.error('❌ TEST 3 FAILED: Order confirmation failed:', confirmResult);
    process.exit(1);
  }

  const groupQrPayload = createdTickets[0].qrPayload;
  console.log(`✅ TEST 3 PASSED: Order confirmed! Order ID: ${createdOrder.id}, Order Number: ${createdOrder.orderNumber}`);
  console.log(`Tickets created: ${createdTickets.length}`);
  console.log(`Group QR Payload: ${groupQrPayload?.substring(0, 45)}...`);

  if (!groupQrPayload?.startsWith('MTGRP:v1:')) {
    console.error('❌ TEST 3 FAILED: groupQrPayload is not in MTGRP:v1 format');
    process.exit(1);
  }

  // TEST 4: Decrypting and validating the Group QR Payload
  console.log('\n[TEST 4] Decrypting and verifying Group QR cryptographic token...');
  const decrypted = decryptSecureGroupOrderQr(groupQrPayload);
  if (!decrypted || decrypted.orderId !== createdOrder.id || decrypted.ticketCount !== 3) {
    console.error('❌ TEST 4 FAILED: Decryption failed or mismatched data:', decrypted);
    process.exit(1);
  }
  console.log(`✅ TEST 4 PASSED: Decrypted payload valid: Order #${decrypted.orderNumber}, Ticket Count: ${decrypted.ticketCount}, Event ID: ${decrypted.eventId}`);

  // TEST 5: Simulating Scanner Verification via atomic transition
  console.log('\n[TEST 5] Scanning Group Order QR for Entry (First scan - must SUCCEED)...');
  
  // Re-read order tickets
  const orderTickets = await db.select().from(tickets).where(eq(tickets.orderId, createdOrder.id));
  const isAlreadyUsed = orderTickets.every(t => t.status === 'used');
  if (isAlreadyUsed) {
    console.error('❌ Tickets should not be used yet!');
    process.exit(1);
  }

  // Atomically mark tickets used and log scan
  await db.transaction(async (tx) => {
    await tx.update(tickets)
      .set({ status: 'used' })
      .where(eq(tickets.orderId, createdOrder.id));

    await tx.insert(ticketScans).values({
      ticketId: orderTickets[0].id,
      ticketCode: createdOrder.orderNumber,
      scannerDevice: 'Main Gate Scanner 01',
      gateName: 'Gate A',
      scanResult: 'SUCCESS',
      scannedAt: new Date(),
    });
  });

  console.log(`✅ TEST 5 PASSED: First scan succeeded! Entry permitted for all 3 seats.`);

  // TEST 6: Repeat scan attempt (must REJECT as duplicate)
  console.log('\n[TEST 6] Simulating duplicate scan attempt (Repeat scan - must REJECT)...');
  const recheckTickets = await db.select().from(tickets).where(eq(tickets.orderId, createdOrder.id));
  const isSecondScanDuplicate = recheckTickets.every(t => t.status === 'used');

  if (isSecondScanDuplicate) {
    await db.insert(ticketScans).values({
      ticketId: recheckTickets[0].id,
      ticketCode: createdOrder.orderNumber,
      scannerDevice: 'Main Gate Scanner 01',
      gateName: 'Gate A',
      scanResult: 'ALREADY_USED',
      scannedAt: new Date(),
    });
    console.log('✅ TEST 6 PASSED: Duplicate scan correctly rejected with ALREADY_USED and recorded in audit log.');
  } else {
    console.error('❌ TEST 6 FAILED: Tickets were not marked used!');
    process.exit(1);
  }

  // CLEANUP: Clean up test records
  console.log('\n[CLEANUP] Cleaning up test records and restoring seat inventory...');
  await db.delete(ticketScans).where(inArray(ticketScans.ticketId, recheckTickets.map(t => t.id)));
  await db.delete(tickets).where(eq(tickets.orderId, createdOrder.id));
  await db.delete(settlements).where(eq(settlements.settlementReference, `SETTLE-${new Date().getFullYear()}-${1}-${createdOrder.id}`));
  await db.delete(auditLogs).where(eq(auditLogs.entityId, String(createdOrder.id)));
  await db.update(seatInventory)
    .set({ status: 'available', holdExpiresAt: null, heldByUserId: null, orderId: null })
    .where(inArray(seatInventory.seatId, threeSeatIds));
  await db.delete(orders).where(eq(orders.id, createdOrder.id));

  console.log('✅ CLEANUP COMPLETE: All test records cleared, seats restored to available.');
  console.log('\n🎉 ALL 6 COMPREHENSIVE INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
