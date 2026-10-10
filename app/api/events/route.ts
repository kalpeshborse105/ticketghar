import { NextResponse } from 'next/server';
import { db, pool } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes } from '@/src/db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const maxPrice = searchParams.get('maxPrice');
    const dateFilter = searchParams.get('date');
    const featuredOnly = searchParams.get('featured') === 'true';

    let allEventsList: any[] = [];

    // Fetch real rating aggregates from event_reviews table
    const reviewStatsMap: Record<number, { rating: number; count: number }> = {};
    try {
      const statsRes = await pool.query(`
        SELECT 
          event_id, 
          ROUND(AVG(rating)::numeric, 1) as avg_rating, 
          COUNT(*)::int as count 
        FROM public.event_reviews 
        GROUP BY event_id
      `);
      statsRes.rows.forEach((r: any) => {
        reviewStatsMap[Number(r.event_id)] = {
          rating: Number(r.avg_rating),
          count: Number(r.count),
        };
      });
    } catch {
      // Table may not exist yet or empty
    }

    // Base query from database
    const conditions = [eq(events.status, 'published')];

    if (category && category !== 'all') {
      conditions.push(eq(events.category, category));
    }

    if (featuredOnly) {
      conditions.push(eq(events.featured, 1));
    }

    const dbEvents = await db
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

    if (dbEvents.length > 0) {
      const eventIds = dbEvents.map((item) => item.event.id);

      // Batch fetch all active sessions for these event IDs in 1 query
      const allSessions = await db
        .select()
        .from(eventSessions)
        .where(and(inArray(eventSessions.eventId, eventIds), eq(eventSessions.status, 'active')))
        .orderBy(eventSessions.sessionStartTime);

      // Batch fetch all ticket prices for these event IDs in 1 query
      const allPrices = await db
        .select({ eventId: ticketTypes.eventId, price: ticketTypes.price })
        .from(ticketTypes)
        .where(inArray(ticketTypes.eventId, eventIds));

      // Group sessions and prices by eventId
      const sessionsByEventId: Record<number, any[]> = {};
      allSessions.forEach((s) => {
        if (!sessionsByEventId[s.eventId]) sessionsByEventId[s.eventId] = [];
        sessionsByEventId[s.eventId].push(s);
      });

      const pricesByEventId: Record<number, number[]> = {};
      allPrices.forEach((p) => {
        if (!pricesByEventId[p.eventId]) pricesByEventId[p.eventId] = [];
        pricesByEventId[p.eventId].push(p.price);
      });

      allEventsList = dbEvents.map((item) => {
        const evId = item.event.id;
        const sessions = sessionsByEventId[evId] || [];
        const prices = pricesByEventId[evId] || [];
        const minPrice = prices.length > 0 ? Math.min(...prices) : 30000;
        const stats = reviewStatsMap[evId];

        return {
          ...item.event,
          venue: item.venue,
          organizer: item.organizer,
          sessions,
          minPrice,
          rating: stats ? stats.rating : 0,
          ratingCount: stats ? stats.count : 0,
        };
      });
    }

    // Filter by category
    if (category && category !== 'all') {
      allEventsList = allEventsList.filter((item) => item.category === category);
    }

    // Filter by city if specified
    if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'महाराष्ट्र (all)') {
      allEventsList = allEventsList.filter(
        (item) => item.venue?.city && item.venue.city.toLowerCase() === city.toLowerCase()
      );
    }

    // Filter by text search if present
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      allEventsList = allEventsList.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.titleMr?.toLowerCase().includes(q) ||
          item.venue?.name?.toLowerCase().includes(q) ||
          item.venue?.nameMr?.toLowerCase().includes(q) ||
          (item.venue?.city && item.venue.city.toLowerCase().includes(q)) ||
          item.category?.toLowerCase().includes(q) ||
          (item.categoryMr && item.categoryMr.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.descriptionMr && item.descriptionMr.toLowerCase().includes(q))
      );
    }

    // Apply maxPrice filter if specified
    if (maxPrice && !isNaN(Number(maxPrice)) && Number(maxPrice) > 0) {
      const maxPricePaise = Number(maxPrice) * 100;
      allEventsList = allEventsList.filter((item) => (item.minPrice || 0) <= maxPricePaise);
    }

    // Apply date filter if specified
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      allEventsList = allEventsList.filter((item) => {
        if (!item.sessions || item.sessions.length === 0) return true;

        return item.sessions.some((s: any) => {
          const sDate = new Date(s.sessionStartTime);
          const sDateStr = sDate.toISOString().split('T')[0];

          if (dateFilter === 'today') {
            return sDateStr === todayStr;
          } else if (dateFilter === 'tomorrow') {
            return sDateStr === tomorrowStr;
          } else if (dateFilter === 'weekend') {
            const dayOfWeek = sDate.getDay();
            return dayOfWeek === 6 || dayOfWeek === 0;
          } else if (dateFilter === 'week') {
            const diffDays = (sDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            return diffDays >= -0.5 && diffDays <= 7.5;
          } else {
            return sDateStr === dateFilter;
          }
        });
      });
    }

    return NextResponse.json(
      { events: allEventsList },
      { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' } }
    );
  } catch (error: any) {
    console.error('Failed to fetch events from database:', error);
    return NextResponse.json({ error: 'Failed to fetch events', events: [] }, { status: 500 });
  }
}

