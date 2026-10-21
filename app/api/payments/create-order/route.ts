import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, ticketTypes, events } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { isRazorpayReady, getRazorpayClientAsync } from '@/src/lib/payments/razorpay.ts';
import { calculatePricing } from '@/src/lib/inventory-engine.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, seatIds, couponCode } = body;

    // Validate required fields
    if (!sessionId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and seatIds' },
        { status: 400 }
      );
    }

    if (seatIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 tickets allowed per transaction to prevent bulk hoarding.' },
        { status: 400 }
      );
    }

    // Check if Razorpay is configured (env or DB runtime config)
    if (!(await isRazorpayReady())) {
      return NextResponse.json(
        {
          configured: false,
          error: 'Razorpay payment gateway is not configured. Please contact support.',
        },
        { status: 503 }
      );
    }

    // Verify the hold exists and get event details
    const holdSeats = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        heldBy: seatInventory.heldByUserId,
        holdExpires: seatInventory.holdExpiresAt,
        ticketTypeId: seatInventory.ticketTypeId,
        price: ticketTypes.price,
        eventId: ticketTypes.eventId,
      })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), inArray(seatInventory.seatId, seatIds)));

    if (holdSeats.length < seatIds.length) {
      const missingCount = seatIds.length - holdSeats.length;
      const existingIds = holdSeats.map((s) => s.seatId);
      const availableExtras = await db
        .select({
          invId: seatInventory.id,
          seatId: seatInventory.seatId,
          status: seatInventory.status,
          heldBy: seatInventory.heldByUserId,
          holdExpires: seatInventory.holdExpiresAt,
          ticketTypeId: seatInventory.ticketTypeId,
          price: ticketTypes.price,
          eventId: ticketTypes.eventId,
        })
        .from(seatInventory)
        .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
        .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')))
        .limit(missingCount + existingIds.length);

      for (const extra of availableExtras) {
        if (!existingIds.includes(extra.seatId) && holdSeats.length < seatIds.length) {
          holdSeats.push(extra);
          existingIds.push(extra.seatId);
        }
      }
    }

    if (holdSeats.length === 0) {
      return NextResponse.json({ error: 'No seats found for the specified session' }, { status: 404 });
    }

    // Verify seats or auto-hold them for payment checkout
    const now = new Date();
    // Match inventory-engine HOLD_DURATION_MINUTES = 5
    const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const userHoldToken = body.holdToken || body.userIdStr;

    for (const seat of holdSeats) {
      if (seat.status === 'booked') {
        return NextResponse.json({ error: 'One or more seats are already booked' }, { status: 409 });
      }

      const isExpired = seat.holdExpires && new Date(seat.holdExpires) < now;

      // Reject if held by a different active customer
      if (seat.status === 'held' && !isExpired) {
        if (!userHoldToken || (seat.heldBy && seat.heldBy !== userHoldToken)) {
          return NextResponse.json(
            { error: 'One or more seats are currently held by another customer' },
            { status: 409 }
          );
        }
      }

      // Extend or acquire hold for checkout
      if (seat.status === 'available' || isExpired || (seat.status === 'held' && (!seat.heldBy || seat.heldBy === userHoldToken))) {
        await db
          .update(seatInventory)
          .set({
            status: 'held',
            heldByUserId: userHoldToken || seat.heldBy || 'checkout_user',
            holdExpiresAt,
          })
          .where(eq(seatInventory.id, seat.invId));
        seat.status = 'held';
        seat.holdExpires = holdExpiresAt;
      }
    }

    const eventId = holdSeats[0].eventId;

    // Get event details for pricing calculation
    const [eventRecord] = await db.select().from(events).where(eq(events.id, eventId));

    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Calculate server-authoritative pricing from DB
    const faceValueTotal = holdSeats.reduce((sum, seat) => sum + seat.price, 0);
    const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal, couponCode);

    // Amount must be in paise (smallest currency unit); Razorpay minimum is 100 paise
    const amountInPaise = pricing.grandTotal;

    if (!Number.isFinite(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Invalid order amount. Minimum payable amount is ₹1.00 (100 paise).' },
        { status: 400 }
      );
    }

    // Create Razorpay order (DB runtime keys preferred over bad Vercel env)
    const { client: razorpayClient, keyId } = await getRazorpayClientAsync();

    const receiptId = `rcpt_${sessionId}_${Date.now()}`;

    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        session_id: sessionId.toString(),
        event_id: eventId.toString(),
        seat_count: seatIds.length.toString(),
      },
    });

    console.log('Razorpay order created:', razorpayOrder.id);

    // Return order details including public key ID and authoritative hold expiry for frontend
    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId,
      receipt: receiptId,
      holdExpiresAt: holdExpiresAt.toISOString(),
      pricing,
    });
  } catch (error: any) {
    console.error('Create order error:', error);

    const detail =
      error?.error?.description ||
      error?.error?.reason ||
      error?.message ||
      'Unknown payment gateway error';
    const isAuthFail = /authenti/i.test(String(detail));

    // Handle Razorpay-specific errors
    if (error.statusCode || isAuthFail) {
      return NextResponse.json(
        {
          error: isAuthFail
            ? 'Razorpay keys invalid on server (Authentication failed). Update RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET on production.'
            : 'Payment gateway error',
          details: detail,
          configured: !isAuthFail,
        },
        { status: error.statusCode || 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
