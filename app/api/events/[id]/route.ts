import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes, venueSections } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const eventRows = await db
      .select({
        event: events,
        venue: venues,
        organizer: organizers,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(organizers, eq(events.organizerId, organizers.id))
      .where(eq(events.id, eventId));

    if (eventRows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const item = eventRows[0];

    // Fetch sessions
    const sessions = await db
      .select()
      .from(eventSessions)
      .where(and(eq(eventSessions.eventId, eventId), eq(eventSessions.status, 'active')))
      .orderBy(eventSessions.sessionStartTime);

    // Fetch ticket types for all sessions
    const sessionDetails = await Promise.all(
      sessions.map(async (sess) => {
        const types = await db
          .select({
            id: ticketTypes.id,
            eventId: ticketTypes.eventId,
            sessionId: ticketTypes.sessionId,
            sectionId: ticketTypes.sectionId,
            name: ticketTypes.name,
            nameMr: ticketTypes.nameMr,
            price: ticketTypes.price,
            totalQuota: ticketTypes.totalQuota,
            availableQuota: ticketTypes.availableQuota,
            isSeated: ticketTypes.isSeated,
          })
          .from(ticketTypes)
          .where(eq(ticketTypes.sessionId, sess.id));

        return {
          ...sess,
          ticketTypes: types,
        };
      })
    );

    // Fetch venue sections
    const sections = await db
      .select()
      .from(venueSections)
      .where(eq(venueSections.venueId, item.venue.id));

    return NextResponse.json({
      event: {
        ...item.event,
        venue: {
          ...item.venue,
          sections,
        },
        organizer: item.organizer,
        sessions: sessionDetails,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event detail from database:', error);
    return NextResponse.json({ error: 'Failed to fetch event detail' }, { status: 500 });
  }
}

