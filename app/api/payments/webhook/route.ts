import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, auditLogs } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'ticketghar_rzp_webhook_secret_key_2026';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify signature if configured
    if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const event = payload.event;
    const payment = payload.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id || payload.order_id;
    const razorpayPaymentId = payment?.id || payload.payment_id;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true, ignored: 'Missing order_id' });
    }

    // Check order in database
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId));

    if (orderRows.length === 0) {
      return NextResponse.json({ received: true, message: 'Order not found in platform' });
    }

    const order = orderRows[0];

    // Idempotency check: If already captured or refunded, do not double-process
    if (event === 'payment.captured' || event === 'payment.authorized') {
      if (order.paymentStatus === 'captured') {
        return NextResponse.json({ received: true, status: 'already_captured' });
      }

      await db
        .update(orders)
        .set({
          paymentStatus: 'captured',
          orderStatus: 'confirmed',
          razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await db.insert(auditLogs).values({
        actorId: 'gateway-webhook',
        actorRole: 'payment_gateway',
        action: 'WEBHOOK_PAYMENT_CAPTURED',
        entityType: 'order',
        entityId: order.orderNumber,
        details: JSON.stringify({ razorpayPaymentId, event }),
      });
    } else if (event === 'payment.failed') {
      await db
        .update(orders)
        .set({
          paymentStatus: 'failed',
          orderStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
