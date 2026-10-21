import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users, events, eventSessions, seatInventory, ticketTypes, orders, tickets } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { confirmBookingOrder, calculatePricing } from '@/src/lib/inventory-engine.ts';
import { verifyPaymentSignature, isRazorpayConfigured } from '@/src/lib/payments/razorpay.ts';

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
    let priceRows = await db
      .select({ price: ticketTypes.price })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), inArray(seatInventory.seatId, seatIds)));

    if (priceRows.length === 0) {
      // Graceful fallback for synthetic or mismatched mobile seat IDs:
      // Query ticket types for the session to compute face value
      const sessionTickets = await db
        .select({ price: ticketTypes.price })
        .from(ticketTypes)
        .where(eq(ticketTypes.sessionId, sessionId))
        .limit(1);

      const unitPrice = sessionTickets[0]?.price || 35000;
      priceRows = seatIds.map(() => ({ price: unitPrice }));
    }

    const faceValueTotal = priceRows.reduce((sum, r) => sum + r.price, 0);
    if (faceValueTotal <= 0) {
      return NextResponse.json({ error: 'Unable to price selected seats from inventory quota.' }, { status: 400 });
    }

    const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal, couponCode);

    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const allowDirectConfirm = !isProd && process.env.ALLOW_DIRECT_CONFIRM === 'true';

    // Normalize payment details (supporting both mobile and web field names)
    const incomingGateway = paymentDetails?.gateway;
    const incomingOrderId = paymentDetails?.razorpayOrderId || paymentDetails?.orderId || null;
    const incomingPaymentId = paymentDetails?.razorpayPaymentId || paymentDetails?.paymentId || null;
    const incomingSignature = paymentDetails?.razorpaySignature || paymentDetails?.signature || null;

    let targetGateway: string;

    if (incomingGateway === 'razorpay' || incomingOrderId || incomingPaymentId || incomingSignature) {
      targetGateway = 'razorpay';
    } else if (incomingGateway === 'direct_confirm' || !paymentDetails) {
      if (!allowDirectConfirm) {
        return NextResponse.json(
          { error: 'Direct confirmation is disabled. Valid Razorpay payment verification is required.' },
          { status: 402 }
        );
      }
      targetGateway = 'direct_confirm';
    } else {
      return NextResponse.json(
        { error: `Unsupported or invalid payment gateway: ${incomingGateway}` },
        { status: 400 }
      );
    }

    const resolvedPayment = {
      gateway: targetGateway,
      razorpayOrderId: incomingOrderId,
      razorpayPaymentId: incomingPaymentId,
      razorpaySignature: incomingSignature,
      idempotencyKey: paymentDetails?.idempotencyKey || `idem_${Date.now()}_${targetUserId}`,
    };

    // 1. Mandatory server-side verification for Razorpay payments
    if (resolvedPayment.gateway === 'razorpay') {
      if (!resolvedPayment.razorpayOrderId || !resolvedPayment.razorpayPaymentId || !resolvedPayment.razorpaySignature) {
        return NextResponse.json(
          { error: 'Incomplete Razorpay payment details. Order ID, payment ID, and cryptographic signature are all required.' },
          { status: 400 }
        );
      }

      // Safe failure: missing, placeholder, or invalid credentials must NEVER bypass verification
      if (!isRazorpayConfigured()) {
        console.error('Razorpay verification requested but gateway is not configured on server.');
        return NextResponse.json(
          { error: 'Razorpay payment gateway is not configured on server. Cannot verify payment.' },
          { status: 503 }
        );
      }

      let isSignatureValid = false;
      try {
        isSignatureValid = verifyPaymentSignature(
          resolvedPayment.razorpayOrderId,
          resolvedPayment.razorpayPaymentId,
          resolvedPayment.razorpaySignature
        );
      } catch (err: any) {
        console.error('Signature verification error:', err);
        return NextResponse.json(
          { error: `Payment verification failed: ${err.message || 'Signature error'}` },
          { status: 400 }
        );
      }

      if (!isSignatureValid) {
        console.error('Invalid Razorpay signature for payment:', resolvedPayment.razorpayPaymentId);
        return NextResponse.json(
          { error: 'Invalid payment signature. Payment verification failed on server.' },
          { status: 400 }
        );
      }
    }

    // 2. Idempotency Check: only reachable after signature has been proven authentic (or in allowed dev direct confirm)
    if (resolvedPayment.razorpayPaymentId) {
      const existingOrderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.razorpayPaymentId, resolvedPayment.razorpayPaymentId))
        .limit(1);

      if (existingOrderRows.length > 0) {
        const existingOrder = existingOrderRows[0];

        // Authorization check: Verify user owns this booking
        if (existingOrder.userId !== targetUserId && existingOrder.userEmail.toLowerCase() !== userEmail.trim().toLowerCase()) {
          return NextResponse.json(
            { error: 'Unauthorized: Booking order belongs to another customer.' },
            { status: 403 }
          );
        }

        const existingTickets = await db
          .select()
          .from(tickets)
          .where(eq(tickets.orderId, existingOrder.id));

        return NextResponse.json({
          success: true,
          order: existingOrder,
          tickets: existingTickets,
          event: eventRecord,
          pricing: {
            faceValueTotal: existingOrder.ticketFaceValueTotal,
            convenienceFee: existingOrder.platformFeeTotal,
            gst: existingOrder.taxTotal,
            discount: existingOrder.discountTotal,
            grandTotal: existingOrder.grandTotal,
          },
          payment: {
            mode: 'razorpay',
            paymentId: existingOrder.razorpayPaymentId,
          },
          message: 'Booking already confirmed (idempotent)',
        });
      }
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
