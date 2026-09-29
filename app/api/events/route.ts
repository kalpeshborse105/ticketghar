import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes } from '@/src/db/schema.ts';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featuredOnly = searchParams.get('featured') === 'true';

    // Base query
    const conditions = [eq(events.status, 'published')];

    if (category && category !== 'all') {
      conditions.push(eq(events.category, category));
    }

    if (featuredOnly) {
      conditions.push(eq(events.featured, 1));
    }

    const eventList = await db
      .select({
        event: events,
        venue: venues,
        organizer: organizers,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(organizers, eq(events.organizerId, organizers.id))
      .where(and(...conditions))
      .orderBy(desc(events.featured), desc(events.createdAt));

    // Filter by city if specified
    let filtered = eventList;
    if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'महाराष्ट्र (all)') {
      filtered = filtered.filter(
        (item) => item.venue.city.toLowerCase() === city.toLowerCase()
      );
    }

    // Filter by text search if present
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.event.title.toLowerCase().includes(q) ||
          item.event.titleMr.toLowerCase().includes(q) ||
          item.venue.name.toLowerCase().includes(q) ||
          item.venue.nameMr.toLowerCase().includes(q) ||
          item.event.category.toLowerCase().includes(q)
      );
    }

    // Attach upcoming sessions and min price for each event
    const enrichedEvents = await Promise.all(
      filtered.map(async (item) => {
        const sessions = await db
          .select()
          .from(eventSessions)
          .where(and(eq(eventSessions.eventId, item.event.id), eq(eventSessions.status, 'active')))
          .orderBy(eventSessions.sessionStartTime);

        // Fetch min price
        const prices = await db
          .select({ price: ticketTypes.price })
          .from(ticketTypes)
          .where(eq(ticketTypes.eventId, item.event.id));

        const minPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : 30000;

        return {
          ...item.event,
          venue: item.venue,
          organizer: item.organizer,
          sessions,
          minPrice,
        };
      })
    );

    return NextResponse.json({ events: enrichedEvents });
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events. Please try again later.' },
      { status: 500 }
    );
  }
}
