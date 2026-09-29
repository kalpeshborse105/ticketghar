import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets, ticketTypes } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const email = searchParams.get('email');

    if (orderNumber) {
      const orderRows = await db
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
        .where(eq(orders.orderNumber, orderNumber));

      if (orderRows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const item = orderRows[0];
      const ticketList = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, item.order.id));

      const ticketsWithQr = await Promise.all(
        ticketList.map(async (tk) => {
          const qrDataUrl = await QRCode.toDataURL(tk.qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 280,
            color: { dark: '#0F172A', light: '#FFFFFF' },
          });
          return {
            ...tk,
            qrDataUrl,
          };
        })
      );

      return NextResponse.json({
        order: {
          ...item.order,
          event: item.event,
          venue: item.venue,
          session: item.session,
          tickets: ticketsWithQr,
        },
      });
    }

    // Default: list recent orders
    const allOrders = await db
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
      .orderBy(desc(orders.createdAt))
      .limit(30);

    const enriched = await Promise.all(
      allOrders.map(async (row) => {
        const ticketList = await db
          .select()
          .from(tickets)
          .where(eq(tickets.orderId, row.order.id));

        const ticketsWithQr = await Promise.all(
          ticketList.map(async (tk) => {
            const qrDataUrl = await QRCode.toDataURL(tk.qrPayload, {
              errorCorrectionLevel: 'M',
              margin: 2,
              width: 240,
              color: { dark: '#0F172A', light: '#FFFFFF' },
            });
            return {
              ...tk,
              qrDataUrl,
            };
          })
        );

        return {
          ...row.order,
          event: row.event,
          venue: row.venue,
          session: row.session,
          tickets: ticketsWithQr,
        };
      })
    );

    return NextResponse.json({ orders: enriched });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
