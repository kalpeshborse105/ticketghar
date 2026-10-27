import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, ticketTypes, events, orders, users, eventSessions } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import {
  isRazorpayConfigured,
  getRazorpayClientAsync,
  getDbRazorpayCreds,
  clientFromCreds,
} from '@/src/lib/payments/razorpay.ts';
import {
  calculatePricing,
  extendHoldForCheckout,
  CHECKOUT_HOLD_EXTENSION_MINUTES,
  assertTicketSecretConfigured,
} from '@/src/lib/inventory-engine.ts';
import { cacheDel, sessionSeatsCacheKey } from '@/src/lib/redis.ts';
import { getCustomerSession } from '@/src/lib/auth-service.ts';

async function findIdempotentPendingOrder(params: {
  sessionId: number;
  seatIds: number[];
  holdToken: string;
}) {
  const { sessionId, seatIds, holdToken } = params;
  const sortedSeatIds = [...seatIds].sort((a, b) => a - b);

  const bound = await db
    .select({
      seatId: seatInventory.seatId,
      orderId: seatInventory.orderId,
      heldBy: seatInventory.heldByUserId,
      status: seatInventory.status,
    })
    .from(seatInventory)
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
        inArray(seatInventory.seatId, sortedSeatIds),
        eq(seatInventory.heldByUserId, holdToken)
      )
    );

  if (bound.length !== sortedSeatIds.length) {
    return null;
  }

  const orderIds = new Set(bound.map((b) => b.orderId).filter((id): id is number => id != null));
  if (orderIds.size !== 1) {
    return null;
  }

  const platformOrderId = [...orderIds][0];
  const [pendingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, platformOrderId),
        eq(orders.sessionId, sessionId),
        eq(orders.orderStatus, 'pending'),
        eq(orders.paymentStatus, 'pending')
      )
    )
    .limit(1);

  if (!pendingOrder?.razorpayOrderId) {
    return null;
  }

  return pendingOrder;
}

export async function POST(request: Request) {
  try {
    assertTicketSecretConfigured();
    const body = await request.json();
    const { sessionId, seatIds, couponCode, holdToken: bodyHoldToken } = body;
    const holdToken = String(bodyHoldToken || body.userIdStr || '').trim();

    if (!sessionId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and seatIds' },
        { status: 400 }
      );
    }

    if (!holdToken) {
      return NextResponse.json(
        { error: 'Missing holdToken. Reserve seats before checkout.' },
        { status: 400 }
      );
    }

    if (seatIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 tickets allowed per transaction to prevent bulk hoarding.' },
        { status: 400 }
      );
    }

    const sortedSeatIds = [...seatIds].map(Number).sort((a, b) => a - b);

    try {
      await getRazorpayClientAsync();
    } catch {
      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          {
            configured: false,
            error: 'Razorpay payment gateway is not configured. Please contact support.',
          },
          { status: 503 }
        );
      }
    }

    const existingPending = await findIdempotentPendingOrder({
      sessionId,
      seatIds: sortedSeatIds,
      holdToken,
    });

    if (existingPending) {
      let publicKeyId = process.env.RAZORPAY_KEY_ID || '';
      try {
        const { keyId } = await getRazorpayClientAsync();
        publicKeyId = keyId;
      } catch {
        /* use env fallback */
      }

      return NextResponse.json({
        orderId: existingPending.razorpayOrderId,
        platformOrderId: existingPending.id,
        orderNumber: existingPending.orderNumber,
        amount: existingPending.grandTotal,
        currency: 'INR',
        keyId: publicKeyId,
        idempotent: true,
        holdExpiresAt: existingPending.holdExpiresAt?.toISOString?.() || null,
      });
    }

    // Authoritative session → event binding (do not trust client eventId)
    const [sessionRow] = await db
      .select({
        id: eventSessions.id,
        eventId: eventSessions.eventId,
        status: eventSessions.status,
        sessionStartTime: eventSessions.sessionStartTime,
      })
      .from(eventSessions)
      .where(eq(eventSessions.id, Number(sessionId)))
      .limit(1);

    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (['cancelled', 'completed', 'sold_out'].includes(String(sessionRow.status || ''))) {
      return NextResponse.json(
        { error: 'This show session is not open for booking.' },
        { status: 409 }
      );
    }

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
      .where(
        and(eq(seatInventory.sessionId, sessionId), inArray(seatInventory.seatId, sortedSeatIds))
      );

    if (holdSeats.length < sortedSeatIds.length) {
      return NextResponse.json(
        { error: 'One or more selected seats are not available. Please refresh the seat map.' },
        { status: 409 }
      );
    }

    // Seats / ticket types must belong to the same event as the session
    const mismatched = holdSeats.some((s) => Number(s.eventId) !== Number(sessionRow.eventId));
    if (mismatched) {
      return NextResponse.json(
        { error: 'Selected seats do not belong to this event session.' },
        { status: 409 }
      );
    }

    const now = new Date();
    for (const seat of holdSeats) {
      if (seat.status === 'booked') {
        return NextResponse.json({ error: 'One or more seats are already booked' }, { status: 409 });
      }
      const isExpired = seat.holdExpires && new Date(seat.holdExpires) < now;
      if (seat.status === 'held' && !isExpired && seat.heldBy !== holdToken) {
        return NextResponse.json(
          { error: 'One or more seats are currently held by another customer' },
          { status: 409 }
        );
      }
      if (seat.status === 'available' || isExpired) {
        return NextResponse.json(
          { error: 'Seat hold expired or missing. Please select seats again.' },
          { status: 409 }
        );
      }
      if (seat.status === 'held' && seat.heldBy !== holdToken) {
        return NextResponse.json(
          { error: 'One or more seats are currently held by another customer' },
          { status: 409 }
        );
      }
    }

    const eventId = holdSeats[0].eventId;
    const [eventRecord] = await db.select().from(events).where(eq(events.id, eventId));

    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const faceValueTotal = holdSeats.reduce((sum, seat) => sum + seat.price, 0);
    const pricing = await calculatePricing(
      eventRecord,
      sortedSeatIds.length,
      faceValueTotal,
      couponCode
    );

    const amountInPaise = pricing.grandTotal;
    if (amountInPaise <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const customer = await getCustomerSession(authHeader).catch(() => null);

    let targetUserId: number | null = customer?.id ?? null;
    let targetUserEmail = body.userEmail ? String(body.userEmail).trim().toLowerCase() : '';
    let targetUserName = body.userName ? String(body.userName).trim() : '';
    let targetUserPhone = body.userPhone ? String(body.userPhone).trim() : '';

    if (customer) {
      // Logged-in session wins — never reassign order.userId via a different booking email
      targetUserId = customer.id;
      if (!targetUserEmail) targetUserEmail = customer.email?.toLowerCase() || '';
      if (!targetUserName) targetUserName = customer.fullName || '';
      if (!targetUserPhone && customer.phoneNumber) targetUserPhone = String(customer.phoneNumber);
    } else if (targetUserEmail && targetUserEmail.includes('@')) {
      // Guest checkout only: attach/create by booking email
      const existingUser = await db
        .select({ id: users.id, fullName: users.fullName, phoneNumber: users.phoneNumber })
        .from(users)
        .where(eq(users.email, targetUserEmail))
        .limit(1);

      if (existingUser.length > 0) {
        targetUserId = existingUser[0].id;
        if (!targetUserName && existingUser[0].fullName) targetUserName = existingUser[0].fullName;
        if (!targetUserPhone && existingUser[0].phoneNumber) {
          targetUserPhone = existingUser[0].phoneNumber;
        }
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
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            'Customer account required. Sign in or provide a valid booking email to continue.',
        },
        { status: 401 }
      );
    }

    const checkoutHoldExpiresAt = new Date(
      Date.now() + CHECKOUT_HOLD_EXTENSION_MINUTES * 60 * 1000
    );
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
        ticketCount: sortedSeatIds.length,
        ticketFaceValueTotal: pricing.ticketFaceValueTotal,
        platformFeeTotal: pricing.platformFeeTotal,
        taxTotal: pricing.taxTotal,
        gatewayCostEstimate: pricing.gatewayCostEstimate || 0,
        discountTotal: pricing.discountTotal || 0,
        grandTotal: pricing.grandTotal,
        currency: 'INR',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        idempotencyKey: body.idempotencyKey || `order_${sessionId}_${holdToken.slice(-16)}_${sortedSeatIds.join('-')}`,
        holdExpiresAt: checkoutHoldExpiresAt,
      })
      .returning();

    let holdExpiresAt: Date;
    try {
      const extended = await extendHoldForCheckout({
        sessionId,
        seatIds: sortedSeatIds,
        holdToken,
        pendingOrderId: pendingOrder.id,
      });
      holdExpiresAt = extended.holdExpiresAt;
    } catch (holdErr: any) {
      await db.delete(orders).where(eq(orders.id, pendingOrder.id));
      const msg = holdErr?.message || 'Unable to reserve seats for checkout';
      const status = /held by another|already booked|expired|missing/i.test(msg) ? 409 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const receiptId = `rcpt_${sessionId}_${pendingOrder.id}`;
    const orderPayload = {
      amount: amountInPaise,
      currency: 'INR' as const,
      receipt: receiptId,
      notes: {
        session_id: sessionId.toString(),
        event_id: eventId.toString(),
        seat_count: sortedSeatIds.length.toString(),
        hold_token: holdToken,
        platform_order_id: String(pendingOrder.id),
      },
    };

    let { client: razorpayClient, keyId: publicKeyId, source } = await getRazorpayClientAsync();
    let razorpayOrder: any;
    try {
      razorpayOrder = await razorpayClient.orders.create(orderPayload);
    } catch (firstErr: any) {
      const desc = String(firstErr?.error?.description || firstErr?.message || '');
      if (/authenti/i.test(desc)) {
        const dbCreds = await getDbRazorpayCreds();
        if (dbCreds && dbCreds.source === 'db') {
          console.warn('[OrderCreated] Env Razorpay auth failed — retrying with DB secrets');
          razorpayClient = clientFromCreds(dbCreds);
          publicKeyId = dbCreds.keyId;
          source = 'db';
          razorpayOrder = await razorpayClient.orders.create(orderPayload);
        } else {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

    await db
      .update(orders)
      .set({
        razorpayOrderId: razorpayOrder.id,
        idempotencyKey: `order_rzp_${razorpayOrder.id}`,
        holdExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, pendingOrder.id));

    await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);

    console.log('[OrderCreated] Razorpay order via', source, razorpayOrder?.id);

    return NextResponse.json({
      orderId: razorpayOrder.id,
      platformOrderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      amount: amountInPaise,
      currency: 'INR',
      keyId: publicKeyId,
      receipt: receiptId,
      holdExpiresAt: holdExpiresAt.toISOString(),
      pricing,
    });
  } catch (error: any) {
    console.error('Create order error:', error);

    if (error.statusCode) {
      const details = error.error?.description || error.message || 'Payment gateway error';
      return NextResponse.json(
        {
          error: /authenti/i.test(String(details))
            ? 'Razorpay Authentication failed — server KEY_ID/KEY_SECRET mismatch'
            : 'Payment gateway error',
          details,
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
