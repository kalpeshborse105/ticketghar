import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, auditLogs } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/src/lib/payments/razorpay.ts';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // CRITICAL: Always verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!signature) {
        console.error('Webhook signature missing in production');
        return NextResponse.json({ error: 'Signature required' }, { status: 401 });
      }

      if (!process.env.PAYMENT_WEBHOOK_SECRET) {
        console.error('PAYMENT_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
      }

      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      // In development, log warning if signature is missing but allow processing
      if (!signature) {
        console.warn('Webhook signature missing in development mode');
      } else if (process.env.PAYMENT_WEBHOOK_SECRET) {
        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('Invalid webhook signature in development mode');
        }
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
