import { NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/src/lib/payments/razorpay.ts';
import { confirmBookingOrder, calculatePricing } from '@/src/lib/inventory-engine.ts';
import { db } from '@/src/db/index.ts';
import { users, events, seatInventory, ticketTypes, orders, tickets, venues, eventSessions } from '@/src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { cacheDel, sessionSeatsCacheKey } from '@/src/lib/redis.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userName,
      userEmail,
      userPhone,
      couponCode,
    } = body;

    // Validate required payment credentials
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification parameters (order_id, payment_id, signature)' },
        { status: 400 }
      );
    }

    // 1. Verify payment signature cryptographically
    let signatureValid = false;
    try {
      signatureValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    } catch (error: any) {
      console.error('[Verify] Signature verification error:', error);
      return NextResponse.json(
        { error: 'Payment verification failed', details: error.message },
        { status: 400 }
      );
    }

    if (!signatureValid) {
      console.error('[Verify] Invalid payment signature:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json(
        { error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // 2. Load authoritative persisted pending order from DB (never trust client)
    const storedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpay_order_id))
      .limit(1);

    if (storedOrders.length === 0) {
      console.error('[Verify] No pending order found for Razorpay order ID:', razorpay_order_id);
      return NextResponse.json(
        { error: 'No matching pending order found. Please contact support with payment ID.' },
        { status: 404 }
      );
    }

    const pendingOrder = storedOrders[0];

    // 3. Idempotency Check: if already confirmed and captured, return existing confirmed booking immediately
    if (pendingOrder.orderStatus === 'confirmed' && pendingOrder.paymentStatus === 'captured') {
      const existingTickets = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, pendingOrder.id));

      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, pendingOrder.eventId));

      const [existingSession] = await db
        .select()
        .from(eventSessions)
        .where(eq(eventSessions.id, pendingOrder.sessionId));

      let existingVenue = null;
      if (existingEvent?.venueId) {
        const [v] = await db.select().from(venues).where(eq(venues.id, existingEvent.venueId));
        existingVenue = v;
      }

      console.log('[Verify] Idempotent return: order already captured and confirmed:', pendingOrder.orderNumber);

      return NextResponse.json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        order: {
          ...pendingOrder,
          event: existingEvent,
          session: existingSession,
          venue: existingVenue,
          tickets: existingTickets,
        },
        tickets: existingTickets,
        event: existingEvent,
        session: existingSession,
        venue: existingVenue,
        payment: {
          configured: true,
          mode: 'razorpay',
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
        },
      });
    }

    // 4. Reject if order was explicitly cancelled or expired
    if (pendingOrder.orderStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'This order hold has expired or was cancelled. Please book seats again.' },
        { status: 409 }
      );
    }

    const authoritativeSessionId = pendingOrder.sessionId;
    const authoritativeEventId = pendingOrder.eventId;

    // 5. Authoritatively resolve seats bound to this order
    let boundSeatRows = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        orderId: seatInventory.orderId,
      })
      .from(seatInventory)
      .where(
        and(
          eq(seatInventory.sessionId, authoritativeSessionId),
          eq(seatInventory.orderId, pendingOrder.id)
        )
      );

    // Fallback to body.seatIds only if orderId link was pending
    let effectiveSeatIds = boundSeatRows.map((s) => s.seatId);
    if (effectiveSeatIds.length === 0 && Array.isArray(body.seatIds) && body.seatIds.length > 0) {
      effectiveSeatIds = body.seatIds;
    }

    if (effectiveSeatIds.length === 0) {
      return NextResponse.json(
        { error: 'No seats associated with this pending order' },
        { status: 400 }
      );
    }

    // 6. Get event record
    const [eventRecord] = await db.select().from(events).where(eq(events.id, authoritativeEventId));
    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 7. Get or update user identity
    const customerEmail = (userEmail || pendingOrder.userEmail || '').trim().toLowerCase();
    const customerName = (userName || pendingOrder.userName || 'Customer').trim();
    const customerPhone = (userPhone || pendingOrder.userPhone || '').trim();

    let targetUserId = pendingOrder.userId;
    if (customerEmail) {
      const existingUser = await db
        .select({ id: users.id, fullName: users.fullName, phoneNumber: users.phoneNumber })
        .from(users)
        .where(eq(users.email, customerEmail))
        .limit(1);

      if (existingUser.length > 0) {
        targetUserId = existingUser[0].id;
        const updates: any = {};
        if (customerName && (!existingUser[0].fullName || existingUser[0].fullName === 'Customer' || existingUser[0].fullName.includes('@'))) {
          updates.fullName = customerName;
        }
        if (customerPhone && !existingUser[0].phoneNumber) {
          updates.phoneNumber = customerPhone;
        }
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await db.update(users).set(updates).where(eq(users.id, targetUserId));
        }
      }
    }

    // 8. Re-price seats authoritatively from ticket_types
    const priceRows = await db
      .select({ price: ticketTypes.price })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(
        and(
          eq(seatInventory.sessionId, authoritativeSessionId),
          inArray(seatInventory.seatId, effectiveSeatIds)
        )
      );

    const faceValueTotal = priceRows.reduce((sum, r) => sum + r.price, 0);
    const pricing = await calculatePricing(eventRecord, effectiveSeatIds.length, faceValueTotal, couponCode);

    // 9. Confirm booking in guarded state transition
    const result = await confirmBookingOrder({
      sessionId: authoritativeSessionId,
      eventId: authoritativeEventId,
      seatIds: effectiveSeatIds,
      userId: targetUserId,
      userName: customerName,
      userEmail: customerEmail,
      userPhone: customerPhone,
      pricing,
      paymentDetails: {
        gateway: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        idempotencyKey: `razorpay_${razorpay_payment_id}`,
      },
    });

    // Invalidate seat map cache so all clients see the booked seats
    await cacheDel(sessionSeatsCacheKey(authoritativeSessionId)).catch(() => undefined);

    const richOrder = {
      ...result.order,
      event: result.event,
      venue: result.venue,
      session: result.session,
      tickets: result.tickets,
      pricing: result.pricing,
    };

    console.log('[Verify] Booking confirmed successfully for order:', result.order?.orderNumber);

    return NextResponse.json({
      success: true,
      verified: true,
      order: richOrder,
      tickets: result.tickets,
      event: result.event,
      session: result.session,
      venue: result.venue,
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
