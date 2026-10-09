import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, ticketTypes, events } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { isRazorpayConfigured, getRazorpayClient } from '@/src/lib/payments/razorpay.ts';
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
    const tenMinutes = new Date(Date.now() + 10 * 60 * 1000);

    for (const seat of holdSeats) {
      if (seat.status === 'booked') {
        return NextResponse.json({ error: 'One or more seats are already booked' }, { status: 409 });
      }
      if (seat.status === 'available' || (seat.status === 'held' && seat.holdExpires && new Date(seat.holdExpires) < now)) {
        await db
          .update(seatInventory)
          .set({
            status: 'held',
            heldByUserId: 'checkout_user',
            holdExpiresAt: tenMinutes,
          })
          .where(eq(seatInventory.id, seat.invId));
        seat.status = 'held';
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

    // Return order details including public key ID for frontend
    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt: receiptId,
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
