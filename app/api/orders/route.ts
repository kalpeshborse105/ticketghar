import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets, ticketTypes, users } from '@/src/db/schema.ts';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { createClient } from '@/src/lib/supabase/server.ts';
import { getCustomerSession } from '@/src/lib/auth-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const email = searchParams.get('email');
    const ticketCode = searchParams.get('ticketCode');

    // Get authenticated user via cookie session or Supabase
    const customerSession = await getCustomerSession();
    let authUser: { id: string | number; email?: string } | null = customerSession;

    if (!authUser) {
      try {
        const supabase = await createClient();
        const {
          data: { user: supaUser },
        } = await supabase.auth.getUser();
        if (supaUser) {
          authUser = { id: supaUser.id, email: supaUser.email };
        }
      } catch {
        // non-blocking
      }
    }

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

    const phone = searchParams.get('phone');
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      const phoneOrders = await db
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
        .where(eq(orders.userPhone, cleanPhone))
        .orderBy(desc(orders.createdAt))
        .limit(50);

      const enriched = await Promise.all(
        phoneOrders.map(async (row) => {
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
    }

    // List user's orders - requires authentication
    if (!authUser || !authUser.email) {
      return NextResponse.json(
        { error: 'Authentication required to list orders' },
        { status: 401 }
      );
    }

    const cleanUserEmail = authUser.email.trim().toLowerCase();

    // Find orders for this user by userId or userEmail
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
      .where(
        authUser.id && typeof authUser.id === 'number'
          ? or(sql`lower(${orders.userEmail}) = ${cleanUserEmail}`, eq(orders.userId, authUser.id))
          : sql`lower(${orders.userEmail}) = ${cleanUserEmail}`
      )
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
