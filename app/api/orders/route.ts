import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets, ticketTypes, users } from '@/src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import QRCode from 'qrcode';
import { createClient } from '@/src/lib/supabase/server.ts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const email = searchParams.get('email');
    const ticketCode = searchParams.get('ticketCode');

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    // Guest ticket lookup by order number or ticket code (public access)
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
          .where(eq(orders.orderNumber, orderNumber));
      } else if (ticketCode) {
        // Look up order by ticket code
        const ticketRows = await db
          .select()
          .from(tickets)
          .where(eq(tickets.ticketCode, ticketCode))
          .limit(1);

        if (ticketRows.length === 0) {
          return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
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
          .where(eq(orders.id, ticketRows[0].orderId));
      }

      if (!orderRows || orderRows.length === 0) {
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

    // List user's orders - requires authentication
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required to list orders' },
        { status: 401 }
      );
    }

    // Get user from database using Supabase UID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.uid, authUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // User authenticated but not in our database yet
      return NextResponse.json({ orders: [] });
    }

    const dbUser = dbUsers[0];

    // Fetch orders for this user
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
      .where(eq(orders.userId, dbUser.id))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const enriched = await Promise.all(
      userOrders.map(async (row) => {
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
