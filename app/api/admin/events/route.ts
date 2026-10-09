import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes, auditLogs } from '@/src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';
import { generateSessionInventory } from '@/src/lib/inventory-engine.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    // Allow organizers to scope to their own events
    const organizerIdParam = searchParams.get('organizerId');

    // Also auto-detect from session: if caller is an organizer, enforce their organizerId
    const session = verifyAdminSession(request);
    let filterOrganizerId: number | null = null;

    if (session.valid && session.role === 'organizer') {
      filterOrganizerId = Number(session.user?.organizerId || 0);
    } else if (organizerIdParam) {
      filterOrganizerId = parseInt(organizerIdParam, 10);
    }

    const query = db
      .select({
        event: events,
        venue: venues,
        organizer: organizers,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(organizers, eq(events.organizerId, organizers.id))
      .orderBy(desc(events.createdAt));

    const list = filterOrganizerId
      ? await db
          .select({ event: events, venue: venues, organizer: organizers })
          .from(events)
          .innerJoin(venues, eq(events.venueId, venues.id))
          .innerJoin(organizers, eq(events.organizerId, organizers.id))
          .where(eq(events.organizerId, filterOrganizerId))
          .orderBy(desc(events.createdAt))
      : await query;

    const formatted = list.map((item) => ({
      ...item.event,
      venue: item.venue,
      organizer: item.organizer,
      event: item.event,
    }));

    return NextResponse.json({ events: formatted });
  } catch (error: any) {
    console.error('Error fetching admin events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const session = verifyAdminSession(request);
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
      trailerUrl,
      galleryUrls,
      convenienceFeeValue,
      status,
      sessionStartTime,
      ticketPrice,
      castCrew,
    } = body;

    let finalOrganizerId = organizerId ? parseInt(String(organizerId), 10) : 1;
    let initialStatus = status || 'published';

    // Server-side RBAC: organizers can only create events for their own account, and status defaults to submitted
    if (session.valid && session.role === 'organizer') {
      finalOrganizerId = Number(session.user?.organizerId || 1);
      if (initialStatus === 'published') {
        initialStatus = 'submitted';
      }
    }

    const finalVenueId = venueId ? parseInt(String(venueId), 10) : 1;

    if (!title || !titleMr || !category) {
      return NextResponse.json(
        { error: 'Missing required event fields (title, Marathi title, category).' },
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
        organizerId: finalOrganizerId,
        venueId: finalVenueId,
        language: language || 'Marathi',
        ageGuidance: ageGuidance || 'U',
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 150,
        description: description || title,
        descriptionMr: descriptionMr || titleMr,
        posterUrl: posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
        bannerUrl: bannerUrl || null,
        trailerUrl: trailerUrl || null,
        galleryUrls: typeof galleryUrls === 'string' ? galleryUrls : galleryUrls ? JSON.stringify(galleryUrls) : null,
        castCrew: typeof castCrew === 'string' ? castCrew : castCrew ? JSON.stringify(castCrew) : null,
        convenienceFeeValue: convenienceFeeValue ? parseInt(convenienceFeeValue, 10) : 3000,
        status: initialStatus,
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

      // Safely generate seated inventory from venue layout template
      try {
        await generateSessionInventory(
          sess.id,
          finalVenueId,
          ticketPrice ? parseInt(ticketPrice, 10) / 100 : undefined
        );
      } catch (invErr) {
        console.warn('Notice generating venue session inventory:', invErr);
      }
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
    const session = verifyAdminSession(request);
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

    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, Number(eventId)))
      .limit(1);

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Server-side ownership verification: Organizers cannot modify other organizers' events
    if (session.valid && session.role === 'organizer') {
      if (existingEvent.organizerId !== session.user?.organizerId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to modify this event.' },
          { status: 403 }
        );
      }
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
    
    // Organizers cannot self-publish or promote to featured
    if (status !== undefined) {
      if (session.valid && session.role === 'organizer') {
        if (status === 'published' && existingEvent.status !== 'published') {
          updatePayload.status = 'submitted'; // Requires super_admin approval
        } else {
          updatePayload.status = status;
        }
      } else {
        updatePayload.status = status;
      }
    }

    if (featured !== undefined && (!session.valid || session.role !== 'organizer')) {
      updatePayload.featured = featured;
    }

    const [updated] = await db
      .update(events)
      .set(updatePayload)
      .where(eq(events.id, Number(eventId)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || (session.user?.email || 'admin'),
      actorRole: session.role || 'super_admin',
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
    const session = verifyAdminSession(request);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, parseInt(eventId, 10)))
      .limit(1);

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Server-side ownership verification: Organizers can only unpublish their own events
    if (session.valid && session.role === 'organizer') {
      if (existingEvent.organizerId !== session.user?.organizerId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to delete this event.' },
          { status: 403 }
        );
      }
    }

    // Unpublish / archive rather than hard deleting to protect booking relations
    const [archived] = await db
      .update(events)
      .set({ status: 'unpublish' })
      .where(eq(events.id, parseInt(eventId, 10)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: session.user?.email || 'admin',
      actorRole: session.role || 'super_admin',
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
