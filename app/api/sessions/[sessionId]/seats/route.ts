import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, seats, ticketTypes, venueSections, eventSessions, venues, events } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { releaseExpiredHolds, generateSessionInventory } from '@/src/lib/inventory-engine.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  let rawSessionId = '101';
  try {
    const resolvedParams = await params;
    rawSessionId = resolvedParams.sessionId;
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

    // 4. Fetch ticket types for this session
    let ticketTypeList = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.sessionId, sessionId));

    // 5. Fetch seat inventory with seat and ticket type details
    let inventoryRows = await db
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
        ticketTypeName: ticketTypes.name,
        ticketTypeNameMr: ticketTypes.nameMr,
      })
      .from(seatInventory)
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(eq(seatInventory.sessionId, sessionId));

    // If inventory is empty and venue has seat layout, generate from venue master template
    if (inventoryRows.length === 0 && venue.hasSeatLayout === 1) {
      await generateSessionInventory(sessionId, venue.id);

      // Re-fetch ticket types and inventory
      ticketTypeList = await db
        .select()
        .from(ticketTypes)
        .where(eq(ticketTypes.sessionId, sessionId));

      inventoryRows = await db
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
          ticketTypeName: ticketTypes.name,
          ticketTypeNameMr: ticketTypes.nameMr,
        })
        .from(seatInventory)
        .innerJoin(seats, eq(seatInventory.seatId, seats.id))
        .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
        .where(eq(seatInventory.sessionId, sessionId));
    }

    // Combine venueSections with session ticketTypes for authoritative session pricing
    const sectionsWithPricing = sections.map((sec) => {
      const tt = ticketTypeList.find((t) => t.sectionId === sec.id);
      const effectivePrice = tt ? tt.price : sec.basePrice;
      return {
        ...sec,
        basePrice: effectivePrice,
        price: effectivePrice,
        ticketTypeId: tt?.id,
        ticketTypeName: tt?.name,
        ticketTypeNameMr: tt?.nameMr,
      };
    });

    return NextResponse.json({
      sessionId,
      session,
      event,
      venue,
      sections: sectionsWithPricing,
      seats: inventoryRows,
      ticketTypes: ticketTypeList,
    });
  } catch (error: any) {
    console.error('Error fetching seats for session from database:', error);
    return NextResponse.json(
      { error: 'Failed to load session seating layout. Please try again.', details: error.message },
      { status: 500 }
    );
  }
}

