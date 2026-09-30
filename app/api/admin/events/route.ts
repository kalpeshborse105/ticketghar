import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes, auditLogs } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const list = await db
      .select({
        event: events,
        venue: venues,
        organizer: organizers,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(organizers, eq(events.organizerId, organizers.id))
      .orderBy(desc(events.createdAt));

    return NextResponse.json({ events: list });
  } catch (error: any) {
    console.error('Error fetching admin events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const {
      title,
      titleMr,
      category,
      categoryMr,
      organizerId,
      venueId,
      language,
      ageGuidance,
      durationMinutes,
      description,
      descriptionMr,
      posterUrl,
      bannerUrl,
      convenienceFeeValue,
      status,
      sessionStartTime,
      ticketPrice,
      castCrew,
    } = body;

    if (!title || !titleMr || !category || !organizerId || !venueId) {
      return NextResponse.json(
        { error: 'Missing required event fields (title, Marathi title, category, organizer, venue).' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now()}`;

    const [newEvent] = await db
      .insert(events)
      .values({
        title,
        titleMr,
        slug,
        category,
        categoryMr: categoryMr || 'कार्यक्रम',
        organizerId: parseInt(organizerId, 10),
        venueId: parseInt(venueId, 10),
        language: language || 'Marathi',
        ageGuidance: ageGuidance || 'U',
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 150,
        description: description || title,
        descriptionMr: descriptionMr || titleMr,
        posterUrl: posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
        bannerUrl: bannerUrl || null,
        castCrew: typeof castCrew === 'string' ? castCrew : castCrew ? JSON.stringify(castCrew) : null,
        convenienceFeeValue: convenienceFeeValue ? parseInt(convenienceFeeValue, 10) : 3000,
        status: status || 'published',
      })
      .returning();

    // Create session if time provided
    if (sessionStartTime) {
      const startTime = new Date(sessionStartTime);
      const endTime = new Date(startTime.getTime() + (newEvent.durationMinutes || 150) * 60000);

      const [sess] = await db
        .insert(eventSessions)
        .values({
          eventId: newEvent.id,
          sessionStartTime: startTime,
          sessionEndTime: endTime,
          status: 'active',
        })
        .returning();

      // Create ticket tier
      await db.insert(ticketTypes).values({
        eventId: newEvent.id,
        sessionId: sess.id,
        name: 'General Admission / प्रवेशिका',
        nameMr: 'प्रवेशिका',
        price: ticketPrice ? parseInt(ticketPrice, 10) : 35000,
        totalQuota: 200,
        availableQuota: 200,
        isSeated: 0,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      actorId: 'admin',
      actorRole: 'content_manager',
      action: 'EVENT_CREATED',
      entityType: 'event',
      entityId: String(newEvent.id),
      details: JSON.stringify({ title: newEvent.title, status: newEvent.status }),
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const {
      eventId,
      title,
      titleMr,
      description,
      descriptionMr,
      posterUrl,
      bannerUrl,
      castCrew,
      status,
      featured,
      actorId,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (titleMr !== undefined) updatePayload.titleMr = titleMr;
    if (description !== undefined) updatePayload.description = description;
    if (descriptionMr !== undefined) updatePayload.descriptionMr = descriptionMr;
    if (posterUrl !== undefined) updatePayload.posterUrl = posterUrl;
    if (bannerUrl !== undefined) updatePayload.bannerUrl = bannerUrl;
    if (castCrew !== undefined) {
      updatePayload.castCrew = typeof castCrew === 'string' ? castCrew : castCrew ? JSON.stringify(castCrew) : null;
    }
    if (status !== undefined) updatePayload.status = status;
    if (featured !== undefined) updatePayload.featured = featured;

    const [updated] = await db
      .update(events)
      .set(updatePayload)
      .where(eq(events.id, eventId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'super_admin',
      action: 'EVENT_STATUS_UPDATED',
      entityType: 'event',
      entityId: String(eventId),
      details: JSON.stringify(updatePayload),
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Unpublish / archive rather than hard deleting to protect booking relations
    const [archived] = await db
      .update(events)
      .set({ status: 'unpublish' })
      .where(eq(events.id, parseInt(eventId, 10)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: 'admin',
      actorRole: 'super_admin',
      action: 'EVENT_UNPUBLISHED',
      entityType: 'event',
      entityId: String(eventId),
      details: JSON.stringify({ status: 'unpublish' }),
    });

    return NextResponse.json({ success: true, event: archived });
  } catch (error: any) {
    console.error('Error archiving event:', error);
    return NextResponse.json({ error: 'Failed to archive event' }, { status: 500 });
  }
}
