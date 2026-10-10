import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes, venueSections } from '@/src/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

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

    // Fetch rating stats from event_reviews
    let rating = 0;
    let ratingCount = 0;
    try {
      const statsRes = await db.execute(sql`
        SELECT 
          ROUND(AVG(rating)::numeric, 1) as avg_rating, 
          COUNT(*)::int as count 
        FROM public.event_reviews 
        WHERE event_id = ${eventId}
      `);
      if (statsRes.rows && statsRes.rows.length > 0) {
        const row: any = statsRes.rows[0];
        rating = row.avg_rating ? Number(row.avg_rating) : 0;
        ratingCount = row.count ? Number(row.count) : 0;
      }
    } catch {
      // Ignore if table not created
    }

    // Fetch real event photos from event_images table and galleryUrls
    let fetchedImages: any[] = [];
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS public.event_images (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          caption TEXT,
          caption_mr TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_cover INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      const imgRes = await db.execute(sql`
        SELECT id, image_url, caption, caption_mr, sort_order, is_cover 
        FROM public.event_images 
        WHERE event_id = ${eventId}
        ORDER BY sort_order ASC, id ASC
      `);
      if (imgRes.rows && imgRes.rows.length > 0) {
        fetchedImages = imgRes.rows.map((r: any) => ({
          id: r.id,
          url: r.image_url,
          caption: r.caption,
          captionMr: r.caption_mr,
        }));
      }
    } catch (e) {
      console.warn('event_images fetch warning:', e);
    }

    let parsedGalleryUrls: string[] = [];
    if (item.event.galleryUrls) {
      try {
        const parsed =
          typeof item.event.galleryUrls === 'string'
            ? JSON.parse(item.event.galleryUrls)
            : item.event.galleryUrls;
        if (Array.isArray(parsed)) {
          parsedGalleryUrls = parsed.filter(Boolean);
        }
      } catch {}
    }

    const combinedImageUrls = Array.from(
      new Set([...fetchedImages.map((img) => img.url), ...parsedGalleryUrls])
    );

    return NextResponse.json({
      event: {
        ...item.event,
        venue: {
          ...item.venue,
          sections,
        },
        organizer: item.organizer,
        sessions: sessionDetails,
        rating,
        ratingCount,
        images: combinedImageUrls,
        galleryImages: fetchedImages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event detail from database:', error);
    return NextResponse.json({ error: 'Failed to fetch event detail' }, { status: 500 });
  }
}

