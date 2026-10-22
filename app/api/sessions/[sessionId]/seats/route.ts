import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { seatInventory, seats, ticketTypes, venueSections, eventSessions, venues, events } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { releaseExpiredHolds, generateSessionInventory } from '@/src/lib/inventory-engine.ts';
import { cacheGet, cacheSet, sessionSeatsCacheKey } from '@/src/lib/redis.ts';

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

    // Fast cache (Redis / memory) — short TTL; DB remains authoritative after holds
    const cacheKey = sessionSeatsCacheKey(sessionId);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached), {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      } catch {
        /* ignore bad cache */
      }
    }

    // 1. Trigger expired holds release in background without blocking initial render
    releaseExpiredHolds(sessionId).catch((err) => {
      console.warn('Background hold expiration check warning:', err?.message);
    });

    // 2. Fetch session, ticket types, and inventory concurrently in parallel!
    const [sessionRows, ticketTypesResult, inventoryResult] = await Promise.all([
      db
        .select({
          session: eventSessions,
          event: events,
          venue: venues,
        })
        .from(eventSessions)
        .innerJoin(events, eq(eventSessions.eventId, events.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(eq(eventSessions.id, sessionId)),
      db
        .select()
        .from(ticketTypes)
        .where(eq(ticketTypes.sessionId, sessionId)),
      db
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
        .where(eq(seatInventory.sessionId, sessionId)),
    ]);

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { session, event, venue } = sessionRows[0];
    let ticketTypeList = ticketTypesResult;
    let inventoryRows = inventoryResult;

    // 3. Fetch sections for the venue
    const sections = await db
      .select()
      .from(venueSections)
      .where(eq(venueSections.venueId, venue.id));

    // If inventory is empty and venue has seat layout, generate from venue master template
    if (inventoryRows.length === 0 && venue.hasSeatLayout === 1) {
      await generateSessionInventory(sessionId, venue.id);

      // Re-fetch ticket types and inventory
      const [refetchedTypes, refetchedInv] = await Promise.all([
        db
          .select()
          .from(ticketTypes)
          .where(eq(ticketTypes.sessionId, sessionId)),
        db
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
          .where(eq(seatInventory.sessionId, sessionId)),
      ]);

      ticketTypeList = refetchedTypes;
      inventoryRows = refetchedInv;
    }

    // Real-time in-memory expiration filter (no waiting for db write locks)
    const nowMs = Date.now();
    for (let i = 0; i < inventoryRows.length; i++) {
      const row = inventoryRows[i];
      if (row.status === 'held' && row.holdExpiresAt) {
        const exp = new Date(row.holdExpiresAt).getTime();
        if (exp < nowMs) {
          row.status = 'available';
          row.heldByUserId = null;
          row.holdExpiresAt = null;
        }
      }
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

    let layoutConfig: any = null;
    try {
      layoutConfig =
        typeof venue.layoutConfig === 'string'
          ? JSON.parse(venue.layoutConfig || 'null')
          : venue.layoutConfig || null;
    } catch {
      layoutConfig = null;
    }

    const payload = {
      sessionId,
      session,
      event,
      venue: { ...venue, layoutConfig },
      layoutConfig,
      sections: sectionsWithPricing,
      seats: inventoryRows,
      ticketTypes: ticketTypeList,
    };

    // Cache layout briefly for smoother map loads (holds invalidate via redis helpers)
    await cacheSet(cacheKey, JSON.stringify(payload), 4).catch(() => undefined);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching seats for session from database:', error);
    return NextResponse.json(
      { error: 'Failed to load session seating layout. Please try again.', details: error.message },
      { status: 500 }
    );
  }
}

