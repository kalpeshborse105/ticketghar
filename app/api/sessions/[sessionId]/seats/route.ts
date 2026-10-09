import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, seats, ticketTypes, venueSections, eventSessions, venues, events } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { releaseExpiredHolds } from '@/src/lib/inventory-engine.ts';

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

    // 4. Fetch seat inventory with seat and ticket type details
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
      })
      .from(seatInventory)
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(eq(seatInventory.sessionId, sessionId));

    // If inventory is empty, auto-generate standard layout so users are never blocked
    if (inventoryRows.length === 0) {
      const venueSeats = await db.select().from(seats).where(eq(seats.venueId, venue.id));
      let currentTTs = await db.select().from(ticketTypes).where(eq(ticketTypes.sessionId, sessionId));

      if (currentTTs.length === 0) {
        const [defaultTT] = await db
          .insert(ticketTypes)
          .values({
            eventId: event.id,
            sessionId: session.id,
            name: 'General Admission / प्रवेशिका',
            nameMr: 'प्रवेशिका',
            price: 35000,
            totalQuota: 100,
            availableQuota: 100,
            isSeated: 1,
          })
          .returning();
        currentTTs = [defaultTT];
      }

      if (venueSeats.length > 0 && currentTTs.length > 0) {
        const invValues = venueSeats.map((s) => ({
          sessionId: session.id,
          seatId: s.id,
          ticketTypeId: currentTTs[0].id,
          status: 'available',
        }));
        await db.insert(seatInventory).values(invValues);

        // Re-fetch
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
          })
          .from(seatInventory)
          .innerJoin(seats, eq(seatInventory.seatId, seats.id))
          .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
          .where(eq(seatInventory.sessionId, sessionId));
      }
    }

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
    console.error('Error fetching seats for session, using Stitch layout fallback:', error);
    const { STITCH_EVENTS, STITCH_VENUES, generateStitchSeats } = await import('@/src/lib/stitch-data.ts');
    const mockSeats = generateStitchSeats(Number(rawSessionId) || 101);
    const mockEvent = STITCH_EVENTS[0];
    const mockVenue = STITCH_VENUES[0];

    return NextResponse.json({
      sessionId: Number(rawSessionId) || 101,
      session: mockEvent.sessions?.[0] || { id: 101, eventId: 1, sessionStartTime: '2026-10-12T17:00:00.000Z', status: 'active' },
      event: mockEvent,
      venue: mockVenue,
      sections: [
        { id: 1, name: 'Balcony', nameMr: 'बालकनी', basePrice: 50000 },
        { id: 2, name: 'Stall', nameMr: 'स्टॉल', basePrice: 30000 },
      ],
      seats: mockSeats,
      ticketTypes: [
        { id: 1, name: 'Balcony', nameMr: 'बालकनी', price: 50000 },
        { id: 2, name: 'Stall', nameMr: 'स्टॉल', price: 30000 },
      ],
    });
  }
}

