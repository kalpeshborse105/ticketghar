import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, ticketTypes, events, orders, users } from '@/src/db/schema.ts';
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

    // Create Razorpay order (TEST MODE verified)
    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        session_id: sessionId.toString(),
        event_id: eventId.toString(),
        seat_count: seatIds.length.toString(),
        hold_token: userHoldToken || '',
      },
    });

    // 1. Resolve customer identity for persisted platform order
    let targetUserId = 1;
    let targetUserEmail = body.userEmail ? String(body.userEmail).trim().toLowerCase() : '';
    let targetUserName = body.userName ? String(body.userName).trim() : '';
    let targetUserPhone = body.userPhone ? String(body.userPhone).trim() : '';

    if (targetUserEmail) {
      const existingUser = await db
        .select({ id: users.id, fullName: users.fullName, phoneNumber: users.phoneNumber })
        .from(users)
        .where(eq(users.email, targetUserEmail))
        .limit(1);

      if (existingUser.length > 0) {
        targetUserId = existingUser[0].id;
        if (!targetUserName && existingUser[0].fullName) targetUserName = existingUser[0].fullName;
        if (!targetUserPhone && existingUser[0].phoneNumber) targetUserPhone = existingUser[0].phoneNumber;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            uid: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            email: targetUserEmail,
            fullName: targetUserName || 'Customer',
            phoneNumber: targetUserPhone || null,
            role: 'customer',
            preferredLanguage: 'mr',
            city: 'Pune',
          })
          .returning({ id: users.id });
        targetUserId = newUser.id;
      }
    } else {
      // Find default or first customer
      const [firstCust] = await db.select({ id: users.id, email: users.email }).from(users).limit(1);
      if (firstCust) {
        targetUserId = firstCust.id;
        targetUserEmail = targetUserEmail || firstCust.email;
      }
    }

    // 2. Persist authoritative pending platform order with unique order number & idempotency key
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `MT-${new Date().getFullYear()}-${randomSuffix}`;

    const [pendingOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: targetUserId,
        userEmail: targetUserEmail || 'guest@mahaticket.kalpkrutinfotech.com',
        userPhone: targetUserPhone || '',
        userName: targetUserName || 'Customer',
        eventId,
        sessionId,
        ticketCount: seatIds.length,
        ticketFaceValueTotal: pricing.ticketFaceValueTotal,
        platformFeeTotal: pricing.platformFeeTotal,
        taxTotal: pricing.taxTotal,
        gatewayCostEstimate: pricing.gatewayCostEstimate || 0,
        discountTotal: pricing.discountTotal || 0,
        grandTotal: pricing.grandTotal,
        currency: 'INR',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        razorpayOrderId: razorpayOrder.id,
        idempotencyKey: `order_rzp_${razorpayOrder.id}`,
        holdExpiresAt: tenMinutes,
      })
      .returning();

    // 3. Bind the seat inventory rows directly to this pending order
    await db
      .update(seatInventory)
      .set({
        status: 'held',
        heldByUserId: userHoldToken || seatInventory.heldByUserId,
        holdExpiresAt: tenMinutes,
        orderId: pendingOrder.id,
      })
      .where(
        and(
          eq(seatInventory.sessionId, sessionId),
          inArray(seatInventory.seatId, seatIds)
        )
      );

    console.log('[OrderCreated] Bound Razorpay order to DB order:', {
      orderId: razorpayOrder.id,
      platformOrderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      amount: amountInPaise,
    });

    // Return order details including public key ID and authoritative hold expiry for frontend
    return NextResponse.json({
      orderId: razorpayOrder.id,
      platformOrderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
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
