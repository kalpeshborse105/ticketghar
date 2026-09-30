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

    if (holdSeats.length === 0) {
      return NextResponse.json({ error: 'No seats found for the specified session and seat IDs' }, { status: 404 });
    }

    if (holdSeats.length !== seatIds.length) {
      return NextResponse.json({ error: 'Some requested seats do not exist' }, { status: 400 });
    }

    // Verify seats are held (not available or booked)
    const now = new Date();
    for (const seat of holdSeats) {
      if (seat.status === 'booked') {
        return NextResponse.json({ error: 'One or more seats are already booked' }, { status: 409 });
      }
      if (seat.status === 'available') {
        return NextResponse.json(
          { error: 'Seats are not held. Please hold seats before creating payment order' },
          { status: 400 }
        );
      }
      if (seat.status === 'held' && seat.holdExpires && new Date(seat.holdExpires) < now) {
        return NextResponse.json({ error: 'Hold has expired. Please select seats again' }, { status: 410 });
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
