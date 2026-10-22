import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, ticketTypes, events } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { isRazorpayConfigured, getRazorpayClient } from '@/src/lib/payments/razorpay.ts';
import { calculatePricing } from '@/src/lib/inventory-engine.ts';
import { cacheDel, sessionSeatsCacheKey } from '@/src/lib/redis.ts';

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

    // Check if Razorpay is configured
    if (!isRazorpayConfigured()) {
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
      return NextResponse.json(
        { error: 'One or more selected seats are not available. Please refresh the seat map.' },
        { status: 409 }
      );
    }

    // Verify seats or auto-hold them for payment checkout
    const now = new Date();
    const tenMinutes = new Date(Date.now() + 10 * 60 * 1000);
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
            holdExpiresAt: tenMinutes,
          })
          .where(eq(seatInventory.id, seat.invId));
        seat.status = 'held';
        seat.holdExpires = tenMinutes;
      }
    }

    // Invalidate seat map cache so all clients see the extended hold immediately
    await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);

    const eventId = holdSeats[0].eventId;

    // Get event details for pricing calculation
    const [eventRecord] = await db.select().from(events).where(eq(events.id, eventId));

    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Calculate server-authoritative pricing from DB
    const faceValueTotal = holdSeats.reduce((sum, seat) => sum + seat.price, 0);
    const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal, couponCode);

    // Amount must be in paise (smallest currency unit)
    const amountInPaise = pricing.grandTotal;

    if (amountInPaise <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    // Create Razorpay order
    const razorpayClient = getRazorpayClient();

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
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt: receiptId,
      holdExpiresAt: tenMinutes.toISOString(),
      pricing,
    });
  } catch (error: any) {
    console.error('Create order error:', error);

    // Handle Razorpay-specific errors
    if (error.statusCode) {
      return NextResponse.json(
        {
          error: 'Payment gateway error',
          details: error.error?.description || error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
