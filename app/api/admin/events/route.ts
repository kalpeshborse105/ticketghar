import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, venues, organizers, eventSessions, ticketTypes, auditLogs } from '@/src/db/schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';
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

    // Lite venue/organizer columns — full venue JSON was bloating admin loads
    const venueCols = {
      id: venues.id,
      name: venues.name,
      nameMr: venues.nameMr,
      city: venues.city,
      address: venues.address,
      totalCapacity: venues.totalCapacity,
      verificationStatus: venues.verificationStatus,
    };
    const organizerCols = {
      id: organizers.id,
      name: organizers.name,
      companyName: organizers.companyName,
      email: organizers.email,
      phone: organizers.phone,
      city: organizers.city,
      verificationStatus: organizers.verificationStatus,
    };

    const list = filterOrganizerId
      ? await db
          .select({ event: events, venue: venueCols, organizer: organizerCols })
          .from(events)
          .innerJoin(venues, eq(events.venueId, venues.id))
          .innerJoin(organizers, eq(events.organizerId, organizers.id))
          .where(eq(events.organizerId, filterOrganizerId))
          .orderBy(desc(events.createdAt))
      : await db
          .select({ event: events, venue: venueCols, organizer: organizerCols })
          .from(events)
          .innerJoin(venues, eq(events.venueId, venues.id))
          .innerJoin(organizers, eq(events.organizerId, organizers.id))
          .orderBy(desc(events.createdAt));

    const eventIds = list.map((item) => item.event.id);
    const sessionsByEvent: Record<number, typeof eventSessions.$inferSelect[]> = {};
    if (eventIds.length > 0) {
      const allSessions = await db
        .select({
          id: eventSessions.id,
          eventId: eventSessions.eventId,
          sessionStartTime: eventSessions.sessionStartTime,
          sessionEndTime: eventSessions.sessionEndTime,
          status: eventSessions.status,
        })
        .from(eventSessions)
        .where(inArray(eventSessions.eventId, eventIds))
        .orderBy(eventSessions.sessionStartTime);
      for (const s of allSessions) {
        if (!sessionsByEvent[s.eventId]) sessionsByEvent[s.eventId] = [];
        sessionsByEvent[s.eventId].push(s as any);
      }
    }

    const formatted = list.map((item) => ({
      ...item.event,
      venue: item.venue,
      organizer: item.organizer,
      event: item.event,
      sessions: sessionsByEvent[item.event.id] || [],
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

    // Add showtime to an existing event (same theatre)
    if (body?.action === 'addSession') {
      const eventId = Number(body.eventId);
      if (!Number.isFinite(eventId) || eventId <= 0) {
        return NextResponse.json({ error: 'eventId required' }, { status: 400 });
      }
      const [existing] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
      if (!existing) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      if (session.valid && session.role === 'organizer') {
        if (existing.organizerId !== session.user?.organizerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      if (!body.sessionStartTime) {
        return NextResponse.json({ error: 'sessionStartTime required' }, { status: 400 });
      }
      const startTime = new Date(body.sessionStartTime);
      if (Number.isNaN(startTime.getTime())) {
        return NextResponse.json({ error: 'Invalid sessionStartTime' }, { status: 400 });
      }
      const endTime = body.sessionEndTime
        ? new Date(body.sessionEndTime)
        : new Date(startTime.getTime() + (existing.durationMinutes || 150) * 60000);
      const [sess] = await db
        .insert(eventSessions)
        .values({
          eventId,
          sessionStartTime: startTime,
          sessionEndTime: endTime,
          status: 'active',
        })
        .returning();
      try {
        await generateSessionInventory(sess.id, existing.venueId);
      } catch (invErr) {
        console.warn('Inventory gen after addSession:', invErr);
      }
      return NextResponse.json({ success: true, session: sess });
    }

    // Clone show details onto another verified theatre + first showtime
    if (body?.action === 'addVenueShow') {
      const sourceEventId = Number(body.eventId);
      const newVenueId = Number(body.venueId);
      if (!Number.isFinite(sourceEventId) || !Number.isFinite(newVenueId)) {
        return NextResponse.json({ error: 'eventId and venueId required' }, { status: 400 });
      }
      const [source] = await db.select().from(events).where(eq(events.id, sourceEventId)).limit(1);
      if (!source) {
        return NextResponse.json({ error: 'Source event not found' }, { status: 404 });
      }
      if (session.valid && session.role === 'organizer') {
        if (source.organizerId !== session.user?.organizerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const [venueRow] = await db
        .select({ id: venues.id, verificationStatus: venues.verificationStatus })
        .from(venues)
        .where(eq(venues.id, newVenueId))
        .limit(1);
      if (!venueRow) {
        return NextResponse.json({ error: `Venue #${newVenueId} not found` }, { status: 400 });
      }
      if (!body.sessionStartTime) {
        return NextResponse.json({ error: 'sessionStartTime required' }, { status: 400 });
      }
      const startTime = new Date(body.sessionStartTime);
      if (Number.isNaN(startTime.getTime())) {
        return NextResponse.json({ error: 'Invalid sessionStartTime' }, { status: 400 });
      }
      const endTime = new Date(startTime.getTime() + (source.durationMinutes || 150) * 60000);
      const slug =
        source.slug.replace(/-\d+$/, '') + `-${newVenueId}-${Date.now()}`;
      let initialStatus = source.status === 'published' ? 'published' : source.status || 'draft';
      if (session.valid && session.role === 'organizer' && initialStatus === 'published') {
        initialStatus = 'submitted';
      }
      const [newEvent] = await db
        .insert(events)
        .values({
          title: source.title,
          titleMr: source.titleMr,
          slug,
          category: source.category,
          categoryMr: source.categoryMr,
          organizerId: source.organizerId,
          venueId: newVenueId,
          language: source.language,
          ageGuidance: source.ageGuidance,
          durationMinutes: source.durationMinutes,
          description: source.description,
          descriptionMr: source.descriptionMr,
          posterUrl: source.posterUrl,
          bannerUrl: source.bannerUrl,
          trailerUrl: source.trailerUrl,
          galleryUrls: source.galleryUrls,
          castCrew: source.castCrew,
          tag: source.tag,
          convenienceFeeValue: source.convenienceFeeValue,
          status: initialStatus,
        })
        .returning();
      const [sess] = await db
        .insert(eventSessions)
        .values({
          eventId: newEvent.id,
          sessionStartTime: startTime,
          sessionEndTime: endTime,
          status: 'active',
        })
        .returning();
      try {
        await generateSessionInventory(sess.id, newVenueId);
      } catch (invErr) {
        console.warn('Inventory gen after addVenueShow:', invErr);
      }
      return NextResponse.json({ success: true, event: newEvent, session: sess });
    }

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
      tag,
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

    if (!venueId) {
      return NextResponse.json(
        { error: 'venueId is required. Select a theatre from the catalogue.' },
        { status: 400 }
      );
    }
    const finalVenueId = parseInt(String(venueId), 10);
    if (!Number.isFinite(finalVenueId) || finalVenueId <= 0) {
      return NextResponse.json({ error: 'Invalid venueId.' }, { status: 400 });
    }

    const [venueRow] = await db
      .select({
        id: venues.id,
        verificationStatus: venues.verificationStatus,
        city: venues.city,
        cityId: venues.cityId,
        districtId: venues.districtId,
        name: venues.name,
      })
      .from(venues)
      .where(eq(venues.id, finalVenueId))
      .limit(1);

    if (!venueRow) {
      return NextResponse.json({ error: `Venue #${finalVenueId} not found.` }, { status: 400 });
    }

    // Full venue catalogue allowed for event attachment (admin + organizer).
    // Public venue browse still prefers verified theatres separately.

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
        tag: tag || null,
        convenienceFeeValue: convenienceFeeValue ? parseInt(convenienceFeeValue, 10) : 3000,
        status: initialStatus,
      })
      .returning();

    // Always create at least one showtime (BookMyShow workflow needs session + seats)
    {
      const startTime = sessionStartTime
        ? new Date(sessionStartTime)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); // next Saturday
            d.setHours(18, 0, 0, 0);
            return d;
          })();
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

      // Always use theatre section basePrice (seat map). ticketPrice = GA fallback only.
      try {
        const inv = await generateSessionInventory(sess.id, finalVenueId);
        if (!inv || inv.createdCount === 0) {
          const gaPaise = ticketPrice ? parseInt(String(ticketPrice), 10) : 35000;
          await db.insert(ticketTypes).values({
            eventId: newEvent.id,
            sessionId: sess.id,
            name: 'General Admission',
            nameMr: 'सामान्य प्रवेश',
            price: Number.isFinite(gaPaise) && gaPaise > 0 ? gaPaise : 35000,
            totalQuota: 200,
            availableQuota: 200,
            isSeated: 0,
          });
        }
      } catch (invErr) {
        console.warn('Notice generating venue session inventory:', invErr);
        const gaPaise = ticketPrice ? parseInt(String(ticketPrice), 10) : 35000;
        await db.insert(ticketTypes).values({
          eventId: newEvent.id,
          sessionId: sess.id,
          name: 'General Admission',
          nameMr: 'सामान्य प्रवेश',
          price: Number.isFinite(gaPaise) && gaPaise > 0 ? gaPaise : 35000,
          totalQuota: 200,
          availableQuota: 200,
          isSeated: 0,
        });
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
      rejectionReason,
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
    if (body.galleryUrls !== undefined) {
      updatePayload.galleryUrls =
        typeof body.galleryUrls === 'string'
          ? body.galleryUrls
          : body.galleryUrls
            ? JSON.stringify(body.galleryUrls)
            : null;
    }
    if (body.venueId !== undefined) {
      const nextVenueId = Number(body.venueId);
      const [nextVenue] = await db
        .select({
          id: venues.id,
          verificationStatus: venues.verificationStatus,
        })
        .from(venues)
        .where(eq(venues.id, nextVenueId))
        .limit(1);
      if (!nextVenue) {
        return NextResponse.json({ error: `Venue #${nextVenueId} not found.` }, { status: 400 });
      }
      updatePayload.venueId = nextVenueId;
    }
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.categoryMr !== undefined) updatePayload.categoryMr = body.categoryMr;
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
    if (body.tag !== undefined) {
      updatePayload.tag = body.tag || null;
    }

    // Persist rejection reason when rejecting; clear when approving/publishing
    if (rejectionReason !== undefined) {
      updatePayload.rejectionReason =
        typeof rejectionReason === 'string' && rejectionReason.trim()
          ? rejectionReason.trim().slice(0, 2000)
          : null;
    } else if (status === 'rejected' && !updatePayload.rejectionReason) {
      updatePayload.rejectionReason = 'Rejected by admin';
    } else if (status === 'published' || status === 'approved') {
      updatePayload.rejectionReason = null;
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
