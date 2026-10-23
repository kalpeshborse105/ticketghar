import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, auditLogs, tickets, seatInventory } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/src/lib/payments/razorpay.ts';
import { cacheDel, sessionSeatsCacheKey } from '@/src/lib/redis.ts';

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
      // Guard: Late payment.failed must NEVER cancel an already captured payment or confirmed order
      if (order.paymentStatus === 'captured' || order.orderStatus === 'confirmed') {
        console.warn(`[Webhook] Ignored late payment.failed for confirmed/captured order #${order.orderNumber}`);
        return NextResponse.json({ received: true, ignored: 'Late failure ignored for confirmed order' });
      }

      if (order.paymentStatus === 'failed') {
        return NextResponse.json({ received: true, status: 'already_failed' });
      }

      await db
        .update(orders)
        .set({
          paymentStatus: 'failed',
          orderStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      // Release inventory ONLY for this specific pending order and ONLY if seats are still in 'held' status
      await db
        .update(seatInventory)
        .set({
          status: 'available',
          heldByUserId: null,
          holdExpiresAt: null,
          orderId: null,
        })
        .where(
          and(
            eq(seatInventory.orderId, order.id),
            eq(seatInventory.status, 'held')
          )
        );

      if (order.sessionId) {
        await cacheDel(sessionSeatsCacheKey(order.sessionId)).catch(() => undefined);
      }

      await db.insert(auditLogs).values({
        actorId: 'gateway-webhook',
        actorRole: 'payment_gateway',
        action: 'WEBHOOK_PAYMENT_FAILED',
        entityType: 'order',
        entityId: order.orderNumber,
        details: JSON.stringify({ razorpayOrderId, event }),
      });
    } else if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload.payload?.refund?.entity;
      const refundAmount = refundEntity?.amount || order.grandTotal;

      if (order.paymentStatus === 'refunded') {
        return NextResponse.json({ received: true, status: 'already_refunded' });
      }

      await db
        .update(orders)
        .set({
          paymentStatus: 'refunded',
          orderStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await db
        .update(tickets)
        .set({
          status: 'refunded',
        })
        .where(eq(tickets.orderId, order.id));

      await db
        .update(seatInventory)
        .set({
          status: 'available',
          heldByUserId: null,
          holdExpiresAt: null,
          orderId: null,
        })
        .where(eq(seatInventory.orderId, order.id));

      await db.insert(auditLogs).values({
        actorId: 'gateway-webhook',
        actorRole: 'payment_gateway',
        action: 'WEBHOOK_REFUND_PROCESSED',
        entityType: 'order',
        entityId: order.orderNumber,
        details: JSON.stringify({ refundEntity, refundAmount, event }),
      });
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
