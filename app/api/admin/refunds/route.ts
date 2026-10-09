import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, tickets, events, eventSessions } from '@/src/db/schema.ts';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';
import { processOrderRefund, checkRefundEligibility } from '@/src/lib/refund-engine.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const session = verifyAdminSession(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // 'all' | 'captured' | 'refunded' | 'failed'

    let whereClause = undefined;
    if (status !== 'all') {
      whereClause = eq(orders.paymentStatus, status);
    }

    const orderRows = await db
      .select({
        order: orders,
        event: events,
        session: eventSessions,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const formatted = orderRows.map((r) => ({
      id: r.order.id,
      orderNumber: r.order.orderNumber,
      userEmail: r.order.userEmail,
      userName: r.order.userName,
      userPhone: r.order.userPhone,
      eventTitle: r.event.title,
      eventTitleMr: r.event.titleMr,
      sessionStartTime: r.session.sessionStartTime,
      ticketCount: r.order.ticketCount,
      ticketFaceValueTotal: r.order.ticketFaceValueTotal,
      platformFeeTotal: r.order.platformFeeTotal,
      taxTotal: r.order.taxTotal,
      grandTotal: r.order.grandTotal,
      paymentStatus: r.order.paymentStatus,
      orderStatus: r.order.orderStatus,
      razorpayOrderId: r.order.razorpayOrderId,
      razorpayPaymentId: r.order.razorpayPaymentId,
      createdAt: r.order.createdAt,
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error: any) {
    console.error('Error fetching admin refund orders:', error);
    return NextResponse.json({ error: 'Failed to fetch refund orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const session = verifyAdminSession(request);
    if (session.valid && session.role === 'organizer') {
      return NextResponse.json(
        { error: 'Forbidden: Organizers cannot execute financial refunds directly. Please contact MahaTicket Finance Support.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, reason, isOrganizerInitiated, refundAmountPaise, refundUtr } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const result = await processOrderRefund({
      orderId: Number(orderId),
      reason: reason || 'Administrative refund processed by SuperAdmin/Finance',
      isOrganizerInitiated: Boolean(isOrganizerInitiated),
      refundAmountPaise: refundAmountPaise !== undefined ? Number(refundAmountPaise) : undefined,
      actorId: session.user?.email || 'super-admin',
      actorRole: session.role || 'super_admin',
      refundUtr,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin refund processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process admin refund' },
      { status: 400 }
    );
  }
}
