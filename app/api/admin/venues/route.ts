import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, venueSections, seats, auditLogs, eventSessions, events, tickets } from '@/src/db/schema.ts';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

// GET all venues
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const venueList = await db.select().from(venues).orderBy(desc(venues.id));

    // Attach sections count
    const enriched = await Promise.all(
      venueList.map(async (v) => {
        const sections = await db
          .select()
          .from(venueSections)
          .where(eq(venueSections.venueId, v.id));
        return {
          ...v,
          sections,
        };
      })
    );

    return NextResponse.json({ venues: enriched });
  } catch (error: any) {
    console.error('Failed to fetch venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

// POST create new venue with custom city and sections
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const {
      venueId,
      name,
      nameMr,
      address,
      city,
      districtId,
      cityId,
      verificationStatus = 'verified',
      isTemplate = 1,
      ownershipType = 'public_theatre',
      layoutConfig,
      totalCapacity = 500,
      hasSeatLayout = 1,
      customLayout = false,
      sections: customSections,
      balconyRows = 3,
      balconyCols = 8,
      balconyPrice = 400, // in rupees
      stallRows = 4,
      stallCols = 8,
      stallPrice = 300, // in rupees
    } = body;

    if (!name || !nameMr || !address || !city) {
      return NextResponse.json(
        { error: 'Name, Marathi Name, Address and City are required' },
        { status: 400 }
      );
    }

    let targetVenueId: number;
    let targetVenueRecord: any;

    if (venueId) {
      // Safety check: protect existing orders and tickets
      const sessionsAtVenue = await db
        .select({ id: eventSessions.id })
        .from(eventSessions)
        .innerJoin(events, eq(eventSessions.eventId, events.id))
        .where(eq(events.venueId, Number(venueId)));

      if (sessionsAtVenue.length > 0) {
        const sessionIds = sessionsAtVenue.map((s) => s.id);
        const existingTickets = await db
          .select({ id: tickets.id })
          .from(tickets)
          .where(inArray(tickets.sessionId, sessionIds))
          .limit(1);

        if (existingTickets.length > 0) {
          return NextResponse.json(
            {
              error:
                'या नाट्यगृहातील खेळांसाठी विक्री झालेली तिकिटे अस्तित्वात असल्याने आसन रचना थेट डिलीट/बदल करता येणार नाही.',
            },
            { status: 409 }
          );
        }
      }

      // UPDATE existing venue
      const [updatedVenue] = await db
        .update(venues)
        .set({
          name,
          nameMr,
          address,
          city: city.trim(),
          districtId: districtId ? Number(districtId) : undefined,
          cityId: cityId ? Number(cityId) : undefined,
          verificationStatus,
          isTemplate: Number(isTemplate),
          ownershipType,
          layoutConfig: typeof layoutConfig === 'string' ? layoutConfig : layoutConfig ? JSON.stringify(layoutConfig) : undefined,
          totalCapacity: Number(totalCapacity),
          hasSeatLayout: Number(hasSeatLayout),
        })
        .where(eq(venues.id, Number(venueId)))
        .returning();

      targetVenueId = updatedVenue.id;
      targetVenueRecord = updatedVenue;

      // Clear existing seats and sections to replace with new layout
      await db.delete(seats).where(eq(seats.venueId, targetVenueId));
      await db.delete(venueSections).where(eq(venueSections.venueId, targetVenueId));
    } else {
      // CREATE new venue
      const [newVenue] = await db
        .insert(venues)
        .values({
          name,
          nameMr,
          address,
          city: city.trim(),
          districtId: districtId ? Number(districtId) : undefined,
          cityId: cityId ? Number(cityId) : undefined,
          verificationStatus,
          isTemplate: Number(isTemplate),
          ownershipType,
          layoutConfig: typeof layoutConfig === 'string' ? layoutConfig : layoutConfig ? JSON.stringify(layoutConfig) : undefined,
          totalCapacity: Number(totalCapacity),
          hasSeatLayout: Number(hasSeatLayout),
        })
        .returning();

      targetVenueId = newVenue.id;
      targetVenueRecord = newVenue;
    }

    // Process custom sections from TheatreSeatDesigner
    if (hasSeatLayout === 1 && customLayout && Array.isArray(customSections) && customSections.length > 0) {
      for (const sec of customSections) {
        const [insertedSection] = await db
          .insert(venueSections)
          .values({
            venueId: targetVenueId,
            name: sec.name || 'Section',
            nameMr: sec.nameMr || 'विभाग',
            rowsCount: sec.rows?.length || 1,
            colsCount: sec.rows?.[0]?.seats?.length || 8,
            basePrice: Math.round(Number(sec.basePrice || 350) * 100),
            accessible: sec.rows?.some((r: any) => r.seats?.some((s: any) => s.isAccessible === 1)) ? 1 : 0,
          })
          .returning();

        const seatsToInsert: any[] = [];
        for (const row of sec.rows || []) {
          for (const seat of row.seats || []) {
            seatsToInsert.push({
              venueId: targetVenueId,
              sectionId: insertedSection.id,
              rowLabel: row.rowLabel || 'A',
              seatNumber: Number(seat.seatNumber),
              seatCode: seat.seatCode || `${sec.name.slice(0, 3).toUpperCase()}-${row.rowLabel}-${seat.seatNumber}`,
              tier: seat.tier || sec.tier || 'standard',
              isAccessible: Number(seat.isAccessible || 0),
              isBlocked: Number(seat.isBlocked || 0),
            });
          }
        }

        if (seatsToInsert.length > 0) {
          await db.insert(seats).values(seatsToInsert);
        }
      }
    } else if (hasSeatLayout === 1) {
      // Standard Balcony & Stall generation fallback
      const [balcony] = await db
        .insert(venueSections)
        .values({
          venueId: targetVenueId,
          name: 'Balcony',
          nameMr: 'बाल्कनी',
          rowsCount: Number(balconyRows),
          colsCount: Number(balconyCols),
          basePrice: Math.round(Number(balconyPrice) * 100),
          accessible: 0,
        })
        .returning();

      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const balconySeatsToInsert: any[] = [];
      for (let r = 0; r < Number(balconyRows); r++) {
        const row = rowLetters[r] || `R${r + 1}`;
        for (let c = 1; c <= Number(balconyCols); c++) {
          balconySeatsToInsert.push({
            venueId: targetVenueId,
            sectionId: balcony.id,
            rowLabel: row,
            seatNumber: c,
            seatCode: `BAL-${row}${c < 10 ? '0' + c : c}`,
            tier: 'platinum',
            isAccessible: 0,
            isBlocked: 0,
          });
        }
      }
      if (balconySeatsToInsert.length > 0) {
        await db.insert(seats).values(balconySeatsToInsert);
      }

      const [stall] = await db
        .insert(venueSections)
        .values({
          venueId: targetVenueId,
          name: 'Stall / Orchestra',
          nameMr: 'स्टॉल / आसन व्यवस्था',
          rowsCount: Number(stallRows),
          colsCount: Number(stallCols),
          basePrice: Math.round(Number(stallPrice) * 100),
          accessible: 1,
        })
        .returning();

      const stallSeatsToInsert: any[] = [];
      for (let r = 0; r < Number(stallRows); r++) {
        const row = rowLetters[r] || `R${r + 1}`;
        for (let c = 1; c <= Number(stallCols); c++) {
          stallSeatsToInsert.push({
            venueId: targetVenueId,
            sectionId: stall.id,
            rowLabel: row,
            seatNumber: c,
            seatCode: `STL-${row}${c < 10 ? '0' + c : c}`,
            tier: 'gold',
            isAccessible: r === 0 && c <= 2 ? 1 : 0,
            isBlocked: 0,
          });
        }
      }
      if (stallSeatsToInsert.length > 0) {
        await db.insert(seats).values(stallSeatsToInsert);
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      actorId: 'admin_user',
      actorRole: 'super_admin',
      action: venueId ? 'UPDATE_VENUE' : 'CREATE_VENUE',
      entityType: 'venue',
      entityId: String(targetVenueId),
      details: JSON.stringify({ name, city, address }),
    });

    return NextResponse.json({
      success: true,
      venue: targetVenueRecord,
      venueId: targetVenueId,
    });
  } catch (error: any) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create venue' },
      { status: 500 }
    );
  }
}
