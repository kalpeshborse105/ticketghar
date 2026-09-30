import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, events, venues, eventSessions, tickets } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const session = verifyAdminSession(request);
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);

    const orderRows = await db
      .select({
        order: orders,
        event: events,
        venue: venues,
        session: eventSessions,
      })
      .from(orders)
      .leftJoin(events, eq(orders.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
      .orderBy(desc(orders.createdAt))
      .limit(limitParam);

    const enriched = await Promise.all(
      orderRows.map(async (row) => {
        const ticketList = await db
          .select()
          .from(tickets)
          .where(eq(tickets.orderId, row.order.id));

        return {
          ...row.order,
          event: row.event,
          venue: row.venue,
          session: row.session,
          tickets: ticketList,
        };
      })
    );

    return NextResponse.json({ orders: enriched });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin orders' },
      { status: 500 }
    );
  }
}
