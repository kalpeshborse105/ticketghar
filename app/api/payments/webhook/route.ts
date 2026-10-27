import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, auditLogs, tickets, seatInventory, events, users } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/src/lib/payments/razorpay.ts';
import { cacheDel, sessionSeatsCacheKey } from '@/src/lib/redis.ts';
import {
  calculatePricing,
  confirmBookingOrder,
  assertTicketSecretConfigured,
} from '@/src/lib/inventory-engine.ts';
import { ticketTypes } from '@/src/db/schema.ts';
import { inArray } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    assertTicketSecretConfigured();
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret =
      process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

    // CRITICAL: Always verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!signature) {
        console.error('Webhook signature missing in production');
        return NextResponse.json({ error: 'Signature required' }, { status: 401 });
      }

      if (!webhookSecret) {
        console.error('PAYMENT_WEBHOOK_SECRET / RAZORPAY_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
      }

      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      if (!signature) {
        console.warn('Webhook signature missing in development mode');
      } else if (webhookSecret) {
        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('Invalid webhook signature in development mode');
        }
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const event = payload.event;
    const payment = payload.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id || payload.order_id;
    const razorpayPaymentId = payment?.id || payload.payment_id;
    const paymentAmountPaise =
      typeof payment?.amount === 'number' ? payment.amount : null;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true, ignored: 'Missing order_id' });
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId));

    if (orderRows.length === 0) {
      return NextResponse.json({ received: true, message: 'Order not found in platform' });
    }

    const order = orderRows[0];

    if (event === 'payment.captured' || event === 'payment.authorized') {
      if (order.paymentStatus === 'captured' && order.orderStatus === 'confirmed') {
        const existingTickets = await db
          .select({ id: tickets.id })
          .from(tickets)
          .where(eq(tickets.orderId, order.id))
          .limit(1);
        if (existingTickets.length > 0) {
          return NextResponse.json({ received: true, status: 'already_captured' });
        }
        // Confirmed without tickets — fall through to mint
      }

      if (
        paymentAmountPaise != null &&
        Number(order.grandTotal) > 0 &&
        paymentAmountPaise !== Number(order.grandTotal)
      ) {
        await db.insert(auditLogs).values({
          actorId: 'gateway-webhook',
          actorRole: 'payment_gateway',
          action: 'WEBHOOK_AMOUNT_MISMATCH',
          entityType: 'order',
          entityId: order.orderNumber,
          details: JSON.stringify({
            expectedPaise: order.grandTotal,
            paymentAmountPaise,
            razorpayPaymentId,
            event,
          }),
        });
        return NextResponse.json(
          { received: true, error: 'amount_mismatch', reconciliationRequired: true },
          { status: 409 }
        );
      }

      // Bind payment id; do not claim success without tickets
      await db
        .update(orders)
        .set({
          paymentStatus: 'captured',
          razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      const boundSeats = await db
        .select({
          seatId: seatInventory.seatId,
          status: seatInventory.status,
        })
        .from(seatInventory)
        .where(eq(seatInventory.orderId, order.id));

      let seatIds = boundSeats.map((s) => s.seatId);

      // If hold expired and orderId cleared, cannot invent seats — mark for reconciliation
      if (seatIds.length === 0) {
        await db
          .update(orders)
          .set({
            orderStatus: 'pending',
            paymentStatus: 'captured',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        await db.insert(auditLogs).values({
          actorId: 'gateway-webhook',
          actorRole: 'payment_gateway',
          action: 'WEBHOOK_PAYMENT_RECONCILIATION_REQUIRED',
          entityType: 'order',
          entityId: order.orderNumber,
          details: JSON.stringify({
            razorpayPaymentId,
            event,
            reason: 'no_seats_bound_to_order',
          }),
        });

        return NextResponse.json({
          received: true,
          reconciliationRequired: true,
          status: 'captured_pending_inventory',
        });
      }

      const [eventRecord] = await db.select().from(events).where(eq(events.id, order.eventId));
      if (!eventRecord) {
        return NextResponse.json({ received: true, error: 'event_missing' }, { status: 500 });
      }

      const priceRows = await db
        .select({ price: ticketTypes.price })
        .from(seatInventory)
        .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
        .where(
          and(
            eq(seatInventory.sessionId, order.sessionId),
            inArray(seatInventory.seatId, seatIds)
          )
        );
      const faceValueTotal = priceRows.reduce((sum, r) => sum + r.price, 0);
      const pricing = await calculatePricing(eventRecord, seatIds.length, faceValueTotal);

      const [userRow] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);

      try {
        await confirmBookingOrder({
          sessionId: order.sessionId,
          eventId: order.eventId,
          seatIds,
          userId: order.userId,
          userName: order.userName || userRow?.fullName || 'Customer',
          userEmail: order.userEmail || userRow?.email || '',
          userPhone: order.userPhone || userRow?.phoneNumber || '',
          pricing,
          paymentDetails: {
            gateway: 'razorpay',
            razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId || undefined,
            idempotencyKey: razorpayPaymentId
              ? `razorpay_wh_${razorpayPaymentId}`
              : `razorpay_wh_order_${order.id}`,
          },
        });
      } catch (confirmErr: any) {
        console.error('[Webhook] confirmBookingOrder failed:', confirmErr?.message || confirmErr);
        await db
          .update(orders)
          .set({
            paymentStatus: 'captured',
            orderStatus: 'pending',
            razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        await db.insert(auditLogs).values({
          actorId: 'gateway-webhook',
          actorRole: 'payment_gateway',
          action: 'WEBHOOK_CONFIRM_FAILED',
          entityType: 'order',
          entityId: order.orderNumber,
          details: JSON.stringify({
            razorpayPaymentId,
            error: String(confirmErr?.message || confirmErr),
          }),
        });

        return NextResponse.json({
          received: true,
          reconciliationRequired: true,
          status: 'confirm_failed',
        });
      }

      if (order.sessionId) {
        await cacheDel(sessionSeatsCacheKey(order.sessionId)).catch(() => undefined);
      }

      await db.insert(auditLogs).values({
        actorId: 'gateway-webhook',
        actorRole: 'payment_gateway',
        action: 'WEBHOOK_PAYMENT_CAPTURED',
        entityType: 'order',
        entityId: order.orderNumber,
        details: JSON.stringify({ razorpayPaymentId, event, ticketsMinted: true }),
      });
    } else if (event === 'payment.failed') {
      if (order.paymentStatus === 'captured' || order.orderStatus === 'confirmed') {
        console.warn(
          `[Webhook] Ignored late payment.failed for confirmed/captured order #${order.orderNumber}`
        );
        return NextResponse.json({
          received: true,
          ignored: 'Late failure ignored for confirmed order',
        });
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

      await db
        .update(seatInventory)
        .set({
          status: 'available',
          heldByUserId: null,
          holdExpiresAt: null,
          orderId: null,
        })
        .where(and(eq(seatInventory.orderId, order.id), eq(seatInventory.status, 'held')));

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

      await db.update(tickets).set({ status: 'refunded' }).where(eq(tickets.orderId, order.id));

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
