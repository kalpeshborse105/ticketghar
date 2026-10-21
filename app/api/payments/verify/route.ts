import { NextResponse } from 'next/server';
import { verifyPaymentSignatureAsync } from '@/src/lib/payments/razorpay.ts';
import { confirmBookingOrder, calculatePricing } from '@/src/lib/inventory-engine.ts';
import { db } from '@/src/db/index.ts';
import { users, events, seatInventory, ticketTypes } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      sessionId,
      eventId,
      seatIds,
      userName,
      userEmail,
      userPhone,
      couponCode,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification parameters' },
        { status: 400 }
      );
    }

    if (!sessionId || !eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing booking details' },
        { status: 400 }
      );
    }

    if (!userName || !userEmail || !userPhone) {
      return NextResponse.json(
        { error: 'Customer name, email and phone number are required' },
        { status: 400 }
      );
    }

    // CRITICAL: Verify payment signature before proceeding (DB or env secret)
    let signatureValid = false;
    try {
      signatureValid = await verifyPaymentSignatureAsync(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
    } catch (error: any) {
      console.error('Signature verification error:', error);
      return NextResponse.json(
        { error: 'Payment verification failed', details: error.message },
        { status: 400 }
      );
    }

    if (!signatureValid) {
      console.error('Invalid payment signature', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json(
        { error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    console.log('Payment signature verified successfully', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // Get event record
    const [eventRecord] = await db.select().from(events).where(eq(events.id, eventId));
    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get or create user
    let existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail.trim().toLowerCase()));

    let targetUserId: number;
    if (existingUser.length > 0) {
      targetUserId = existingUser[0].id;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          uid: `user-registered-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          email: userEmail.trim().toLowerCase(),
          fullName: userName.trim(),
          phoneNumber: userPhone.trim(),
          role: 'customer',
          preferredLanguage: 'mr',
          city: 'Pune',
        })
        .returning({ id: users.id });
      targetUserId = newUser.id;
    }

    // Recalculate pricing from DB (server-authoritative, never trust client)
    const priceRows = await db
      .select({ price: ticketTypes.price })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), inArray(seatInventory.seatId, seatIds)));

    const faceValueTotal = priceRows.reduce((sum, r) => sum + r.price, 0);
    if (faceValueTotal <= 0) {
      return NextResponse.json({ error: 'Unable to price selected seats' }, { status: 400 });
    }

    const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal, couponCode);

    // Confirm booking with verified payment details
    const result = await confirmBookingOrder({
      sessionId,
      eventId,
      seatIds,
      userId: targetUserId,
      userName: userName.trim(),
      userEmail: userEmail.trim().toLowerCase(),
      userPhone: userPhone.trim(),
      pricing,
      paymentDetails: {
        gateway: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        idempotencyKey: `razorpay_${razorpay_payment_id}`,
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      order: result.order,
      tickets: result.tickets,
      event: result.event,
      pricing: result.pricing,
      payment: {
        configured: true,
        mode: 'razorpay',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
