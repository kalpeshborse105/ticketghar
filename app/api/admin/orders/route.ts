import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets } from '@/src/db/schema.ts';
import { inArray, eq, desc } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const session = verifyAdminSession(request);
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);

    const baseQuery = db
      .select({
        order: orders,
        event: events,
        venue: venues,
        session: eventSessions,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id));

    const orderRows = (session.valid && session.role === 'organizer')
      ? await baseQuery
          .where(eq(events.organizerId, Number(session.user?.organizerId || 0)))
          .orderBy(desc(orders.createdAt))
          .limit(limitParam)
      : await baseQuery
          .orderBy(desc(orders.createdAt))
          .limit(limitParam);

    const orderIds = orderRows.map((r) => r.order.id);
    const allTickets = orderIds.length > 0
      ? await db.select().from(tickets).where(inArray(tickets.orderId, orderIds))
      : [];

    const ticketsByOrder = new Map<number, any[]>();
    for (const t of allTickets) {
      const list = ticketsByOrder.get(t.orderId) || [];
      list.push(t);
      ticketsByOrder.set(t.orderId, list);
    }

    const enriched = orderRows.map((row) => ({
      ...row.order,
      event: row.event,
      venue: row.venue,
      session: row.session,
      tickets: ticketsByOrder.get(row.order.id) || [],
    }));

    return NextResponse.json({ orders: enriched });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin orders' },
      { status: 500 }
    );
  }
}
