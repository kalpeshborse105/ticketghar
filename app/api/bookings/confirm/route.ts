import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users, events, eventSessions, seatInventory, ticketTypes } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { confirmBookingOrder, calculatePricing } from '@/src/lib/inventory-engine.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      eventId,
      seatIds,
      userName,
      userEmail,
      userPhone,
      couponCode,
      paymentDetails,
    } = body;

    if (!sessionId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking confirmation fields. Session ID and at least one seat ID are required.' },
        { status: 400 }
      );
    }

    if (!userName || !userEmail || !userPhone) {
      return NextResponse.json(
        { error: 'Customer name, email and phone number are required.' },
        { status: 400 }
      );
    }

    // Authoritatively resolve eventId from the session to prevent client ID mismatch
    const [sessionRecord] = await db
      .select({ eventId: eventSessions.eventId })
      .from(eventSessions)
      .where(eq(eventSessions.id, sessionId));

    if (!sessionRecord) {
      return NextResponse.json({ error: `Event session #${sessionId} not found.` }, { status: 404 });
    }

    const effectiveEventId = sessionRecord.eventId || eventId;
    const [eventRecord] = await db.select().from(events).where(eq(events.id, effectiveEventId));
    if (!eventRecord) {
      return NextResponse.json({ error: `Event #${effectiveEventId} not found.` }, { status: 404 });
    }

    let existingUser = await db
      .select()
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
        .returning();
      targetUserId = newUser.id;
    }

    // Always recompute face value from DB — never trust client-only totals
    const priceRows = await db
      .select({ price: ticketTypes.price })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), inArray(seatInventory.seatId, seatIds)));

    if (priceRows.length === 0) {
      return NextResponse.json(
        { error: `Selected seat IDs [${seatIds.join(', ')}] were not found in session #${sessionId} inventory.` },
        { status: 400 }
      );
    }

    const faceValueTotal = priceRows.reduce((sum, r) => sum + r.price, 0);
    if (faceValueTotal <= 0) {
      return NextResponse.json({ error: 'Unable to price selected seats from inventory quota.' }, { status: 400 });
    }

    const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal, couponCode);

    // Normalize payment details (supporting both mobile and web field names)
    let resolvedPayment = paymentDetails ? {
      gateway: paymentDetails.gateway || (paymentDetails.paymentId || paymentDetails.razorpayPaymentId ? 'razorpay' : 'direct_confirm'),
      razorpayOrderId: paymentDetails.razorpayOrderId || paymentDetails.orderId || null,
      razorpayPaymentId: paymentDetails.razorpayPaymentId || paymentDetails.paymentId || null,
      razorpaySignature: paymentDetails.razorpaySignature || paymentDetails.signature || null,
      idempotencyKey: paymentDetails.idempotencyKey || `idem_${Date.now()}_${targetUserId}`,
    } : null;

    if (!resolvedPayment) {
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
      const allowDirectConfirm = !isProd && process.env.ALLOW_DIRECT_CONFIRM === 'true';
      
      if (!allowDirectConfirm) {
        return NextResponse.json(
          { error: 'Payment details required. Payment must be completed before confirmation.' },
          { status: 402 }
        );
      }

      console.warn('Direct confirm allowed by ALLOW_DIRECT_CONFIRM=true env variable');
      resolvedPayment = {
        gateway: 'direct_confirm',
        razorpayOrderId: null,
        razorpayPaymentId: null,
        razorpaySignature: null,
        idempotencyKey: `idem_${Date.now()}_${targetUserId}`,
      };
    }

    const result = await confirmBookingOrder({
      sessionId,
      eventId: effectiveEventId,
      seatIds,
      userId: targetUserId,
      userName: userName.trim(),
      userEmail: userEmail.trim().toLowerCase(),
      userPhone: userPhone.trim(),
      pricing,
      paymentDetails: resolvedPayment,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      tickets: result.tickets,
      event: result.event,
      pricing: {
        ...result.pricing,
        faceValueTotal: result.pricing.ticketFaceValueTotal,
        convenienceFee: result.pricing.platformFeeTotal,
        gst: result.pricing.taxTotal,
        discount: result.pricing.discountTotal,
      },
      payment: {
        mode: resolvedPayment.gateway || 'direct_confirm',
        paymentId: resolvedPayment.razorpayPaymentId,
      },
    });
  } catch (error: any) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}
