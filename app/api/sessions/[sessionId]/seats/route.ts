import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, seats, ticketTypes, venueSections, eventSessions, venues, events } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { releaseExpiredHolds } from '@/src/lib/inventory-engine.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: rawSessionId } = await params;
    const sessionId = parseInt(rawSessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // 1. Release any expired holds in real time
    await releaseExpiredHolds(sessionId);

    // 2. Fetch session and its event + venue info
    const sessionRows = await db
      .select({
        session: eventSessions,
        event: events,
        venue: venues,
      })
      .from(eventSessions)
      .innerJoin(events, eq(eventSessions.eventId, events.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(eventSessions.id, sessionId));

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { session, event, venue } = sessionRows[0];

    // 3. Fetch sections for the venue
    const sections = await db
      .select()
      .from(venueSections)
      .where(eq(venueSections.venueId, venue.id));

    // 4. Fetch seat inventory with seat and ticket type details
    const inventoryRows = await db
      .select({
        inventoryId: seatInventory.id,
        status: seatInventory.status,
        heldByUserId: seatInventory.heldByUserId,
        holdExpiresAt: seatInventory.holdExpiresAt,
        seatId: seats.id,
        rowLabel: seats.rowLabel,
        seatNumber: seats.seatNumber,
        seatCode: seats.seatCode,
        tier: seats.tier,
        isAccessible: seats.isAccessible,
        sectionId: seats.sectionId,
        ticketTypeId: ticketTypes.id,
        price: ticketTypes.price,
      })
      .from(seatInventory)
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(eq(seatInventory.sessionId, sessionId));

    // If no individual seat rows (for general admission), return ticket types quotas
    const ticketTypeList = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.sessionId, sessionId));

    return NextResponse.json({
      sessionId,
      session,
      event,
      venue,
      sections,
      seats: inventoryRows,
      ticketTypes: ticketTypeList,
    });
  } catch (error: any) {
    console.error('Error fetching seats for session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seats for session' },
      { status: 500 }
    );
  }
}
