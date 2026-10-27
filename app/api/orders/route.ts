import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets } from '@/src/db/schema.ts';
import { eq, desc, or, sql } from 'drizzle-orm';
import {
  resolveAuthCustomer,
  customerOwnsOrder,
  mintOrderPdfToken,
} from '@/src/lib/order-access';

/**
 * Authenticated customer's orders only.
 * email / phone / orderNumber / ticketCode query params are NOT authorization.
 */
export async function GET(request: Request) {
  try {
    const customer = await resolveAuthCustomer(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const ticketCode = searchParams.get('ticketCode');

    // Single-order lookup — still requires ownership
    if (orderNumber || ticketCode) {
      let orderRows;

      if (orderNumber) {
        orderRows = await db
          .select({
            order: orders,
            event: events,
            venue: venues,
            session: eventSessions,
          })
          .from(orders)
          .innerJoin(events, eq(orders.eventId, events.id))
          .innerJoin(venues, eq(events.venueId, venues.id))
          .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
          .where(eq(orders.orderNumber, orderNumber))
          .limit(1);
      } else if (ticketCode) {
        const ticketRows = await db
          .select()
          .from(tickets)
          .where(eq(tickets.ticketCode, ticketCode))
          .limit(1);

        if (ticketRows.length === 0) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        orderRows = await db
          .select({
            order: orders,
            event: events,
            venue: venues,
            session: eventSessions,
          })
          .from(orders)
          .innerJoin(events, eq(orders.eventId, events.id))
          .innerJoin(venues, eq(events.venueId, venues.id))
          .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
          .where(eq(orders.id, ticketRows[0].orderId))
          .limit(1);
      }

      if (!orderRows || orderRows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const item = orderRows[0];
      if (!customerOwnsOrder(customer, item.order)) {
        // Do not reveal that another customer's order exists
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const ticketList = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, item.order.id));

      const pdfToken = mintOrderPdfToken(item.order.id, item.order.userId);

      return NextResponse.json({
        order: {
          ...item.order,
          event: item.event,
          venue: item.venue,
          session: item.session,
          tickets: ticketList,
          pdfDownloadToken: pdfToken,
        },
      });
    }

    // List: session userId OR same verified session email (guest/login origin drift)
    const sessionEmail = String(customer.email || '').trim().toLowerCase();
    const ownershipFilter = sessionEmail
      ? or(
          eq(orders.userId, customer.id),
          sql`lower(${orders.userEmail}) = ${sessionEmail}`
        )
      : eq(orders.userId, customer.id);

    const userOrders = await db
      .select({
        order: orders,
        event: events,
        venue: venues,
        session: eventSessions,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
      .where(ownershipFilter)
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const enriched = await Promise.all(
      userOrders.map(async (row) => {
        const ticketList = await db
          .select()
          .from(tickets)
          .where(eq(tickets.orderId, row.order.id));

        return {
          ...row.order,
          event: { ...row.event, venue: row.venue },
          venue: row.venue,
          session: row.session,
          tickets: ticketList,
          pdfDownloadToken: mintOrderPdfToken(row.order.id, row.order.userId),
        };
      })
    );

    return NextResponse.json({ orders: enriched });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
