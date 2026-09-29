import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users, events, eventSessions } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
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

    if (!sessionId || !eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking confirmation fields.' },
        { status: 400 }
      );
    }

    if (!userName || !userEmail || !userPhone) {
      return NextResponse.json(
        { error: 'Customer name, email and phone number are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Event
    const [eventRecord] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2. Find or register customer in users table
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

    // 3. Compute verified pricing from DB authoritative seat prices
    const { faceValueTotal } = body.holdSummary || { faceValueTotal: 0 };
    const pricing = await calculatePricing(
      eventRecord,
      seatIds.length,
      faceValueTotal,
      couponCode
    );

    // 4. Execute atomic confirmation
    const result = await confirmBookingOrder({
      sessionId,
      eventId,
      seatIds,
      userId: targetUserId,
      userName: userName.trim(),
      userEmail: userEmail.trim().toLowerCase(),
      userPhone: userPhone.trim(),
      pricing,
      paymentDetails: paymentDetails || {
        gateway: 'Razorpay / UPI',
        razorpayOrderId: `rzp_ord_${Date.now()}`,
        razorpayPaymentId: `rzp_pay_${Date.now()}`,
        idempotencyKey: `idem_${Date.now()}_${targetUserId}`,
      },
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      tickets: result.tickets,
      event: result.event,
      pricing: result.pricing,
    });
  } catch (error: any) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}
