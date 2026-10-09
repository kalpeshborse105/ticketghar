import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, venueSections, seats, auditLogs, eventSessions, events, tickets, districts, cities } from '@/src/db/schema.ts';
import { desc, eq, inArray, and, ne, sql, asc } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';

// GET all venues with sections, seats, and district/city details
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const venueList = await db
      .select({
        venue: venues,
        districtName: districts.name,
        districtNameMr: districts.nameMr,
        cityNameMr: cities.nameMr,
      })
      .from(venues)
      .leftJoin(districts, eq(venues.districtId, districts.id))
      .leftJoin(cities, eq(venues.cityId, cities.id))
      .orderBy(desc(venues.id));

    // Attach sections and seats
    const enriched = await Promise.all(
      venueList.map(async (row) => {
        const v = row.venue;
        const sectionRows = await db
          .select()
          .from(venueSections)
          .where(eq(venueSections.venueId, v.id))
          .orderBy(asc(venueSections.id));

        const sectionsWithSeats = await Promise.all(
          sectionRows.map(async (sec) => {
            const secSeats = await db
              .select()
              .from(seats)
              .where(eq(seats.sectionId, sec.id))
              .orderBy(asc(seats.rowLabel), asc(seats.seatNumber));

            return {
              ...sec,
              seats: secSeats,
            };
          })
        );

        let parsedLayoutConfig: any = v.layoutConfig;
        if (typeof parsedLayoutConfig === 'string') {
          try {
            parsedLayoutConfig = JSON.parse(parsedLayoutConfig);
          } catch {
            parsedLayoutConfig = {};
          }
        }

        return {
          ...v,
          districtName: row.districtName,
          districtNameMr: row.districtNameMr,
          cityNameMr: row.cityNameMr,
          layoutConfig: parsedLayoutConfig,
          sections: sectionsWithSeats,
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

// POST create or update venue with duplicate validation and layout preservation
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const adminSession = verifyAdminSession(request);
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

    const trimmedName = (name || '').trim();
    const trimmedNameMr = (nameMr || '').trim();
    const trimmedAddress = (address || '').trim();
    const trimmedCity = (city || '').trim();

    if (!trimmedName || !trimmedNameMr || !trimmedAddress || !trimmedCity) {
      return NextResponse.json(
        { error: 'Name, Marathi Name, Address and City are required' },
        { status: 400 }
      );
    }

    // 1. DUPLICATE VALIDATION
    // Check if another venue already exists with identical name or address in this city
    const existingSameName = await db
      .select({ id: venues.id, name: venues.name, city: venues.city, address: venues.address })
      .from(venues)
      .where(
        and(
          sql`LOWER(TRIM(${venues.city})) = LOWER(${trimmedCity})`,
          sql`(LOWER(TRIM(${venues.name})) = LOWER(${trimmedName}) OR LOWER(TRIM(${venues.nameMr})) = LOWER(${trimmedNameMr}))`,
          venueId ? ne(venues.id, Number(venueId)) : sql`1=1`
        )
      )
      .limit(1);

    if (existingSameName.length > 0) {
      return NextResponse.json(
        {
          error: `या शहरात "${existingSameName[0].name}" नावाचे नाट्यगृह आधीच नोंदणीकृत आहे (ID: ${existingSameName[0].id}). कृपया वेगळे नाव द्या.`,
        },
        { status: 409 }
      );
    }

    // Look up matching city and district IDs if not explicitly passed
    let resolvedDistrictId = districtId ? Number(districtId) : null;
    let resolvedCityId = cityId ? Number(cityId) : null;

    if (!resolvedCityId || !resolvedDistrictId) {
      const matchCity = await db
        .select({ id: cities.id, districtId: cities.districtId })
        .from(cities)
        .where(sql`LOWER(TRIM(${cities.name})) = LOWER(${trimmedCity})`)
        .limit(1);

      if (matchCity.length > 0) {
        resolvedCityId = resolvedCityId || matchCity[0].id;
        resolvedDistrictId = resolvedDistrictId || matchCity[0].districtId;
      }
    }

    let targetVenueId: number;
    let targetVenueRecord: any;

    // Prepare layout config JSON
    let finalLayoutConfig = layoutConfig;
    if (customLayout && Array.isArray(customSections)) {
      finalLayoutConfig = {
        sections: customSections.map((s: any) => ({
          name: s.name,
          nameMr: s.nameMr,
          basePrice: s.basePrice,
          tier: s.tier,
          walkwayAfterRow: s.walkwayAfterRow || null,
          rows: s.rows?.map((r: any) => ({
            rowLabel: r.rowLabel,
            aisleAfter: r.aisleAfter || [],
          })) || [],
        })),
      };
    }

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
                'या नाट्यगृहातील खेळांसाठी विक्री झालेली तिकिटे अस्तित्वात असल्याने आसन रचना थेट डिलीट/बदल करता येणार नाही. (Historical tickets protected).',
            },
            { status: 409 }
          );
        }
      }

      // UPDATE existing venue
      const [updatedVenue] = await db
        .update(venues)
        .set({
          name: trimmedName,
          nameMr: trimmedNameMr,
          address: trimmedAddress,
          city: trimmedCity,
          districtId: resolvedDistrictId || undefined,
          cityId: resolvedCityId || undefined,
          verificationStatus,
          isTemplate: Number(isTemplate),
          ownershipType,
          layoutConfig: finalLayoutConfig ? (typeof finalLayoutConfig === 'string' ? finalLayoutConfig : JSON.stringify(finalLayoutConfig)) : undefined,
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
          name: trimmedName,
          nameMr: trimmedNameMr,
          address: trimmedAddress,
          city: trimmedCity,
          districtId: resolvedDistrictId || null,
          cityId: resolvedCityId || null,
          verificationStatus,
          isTemplate: Number(isTemplate),
          ownershipType,
          layoutConfig: finalLayoutConfig ? (typeof finalLayoutConfig === 'string' ? finalLayoutConfig : JSON.stringify(finalLayoutConfig)) : '{}',
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
              seatCode: seat.seatCode || `${sec.name.slice(0, 3).toUpperCase()}-${row.rowLabel}-${seat.seatNumber.toString().padStart(2, '0')}`,
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
      actorId: adminSession.user?.email || 'admin_user',
      actorRole: adminSession.role || 'super_admin',
      action: venueId ? 'UPDATE_VENUE' : 'CREATE_VENUE',
      entityType: 'venue',
      entityId: String(targetVenueId),
      details: JSON.stringify({ name: trimmedName, city: trimmedCity, address: trimmedAddress }),
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

// PATCH quick update for verification status, template, or ownership
export async function PATCH(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const adminSession = verifyAdminSession(request);
    const body = await request.json();
    const { id, verificationStatus, isTemplate, ownershipType, totalCapacity } = body;

    if (!id) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (verificationStatus !== undefined) updates.verificationStatus = verificationStatus;
    if (isTemplate !== undefined) updates.isTemplate = Number(isTemplate);
    if (ownershipType !== undefined) updates.ownershipType = ownershipType;
    if (totalCapacity !== undefined) updates.totalCapacity = Number(totalCapacity);

    const [updated] = await db
      .update(venues)
      .set(updates)
      .where(eq(venues.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    await db.insert(auditLogs).values({
      actorId: adminSession.user?.email || 'admin_user',
      actorRole: adminSession.role || 'super_admin',
      action: 'UPDATE_VENUE_STATUS',
      entityType: 'venue',
      entityId: String(id),
      details: JSON.stringify(updates),
    });

    return NextResponse.json({ success: true, venue: updated });
  } catch (error: any) {
    console.error('Error updating venue status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update venue' }, { status: 500 });
  }
}

// DELETE venue safely if no active events or sold tickets
export async function DELETE(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const adminSession = verifyAdminSession(request);
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    const venueId = parseInt(idParam, 10);
    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    // Check if events exist for this venue
    const linkedEvents = await db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(eq(events.venueId, venueId));

    if (linkedEvents.length > 0) {
      return NextResponse.json(
        {
          error: `या नाट्यगृहावर कार्यक्रम जोडलेले आहेत (${linkedEvents.length} events). कृपया आधी कार्यक्रम हटवा किंवा बदला.`,
        },
        { status: 409 }
      );
    }

    // Delete seats & sections then venue
    await db.delete(seats).where(eq(seats.venueId, venueId));
    await db.delete(venueSections).where(eq(venueSections.venueId, venueId));
    const [deleted] = await db.delete(venues).where(eq(venues.id, venueId)).returning();

    await db.insert(auditLogs).values({
      actorId: adminSession.user?.email || 'admin_user',
      actorRole: adminSession.role || 'super_admin',
      action: 'DELETE_VENUE',
      entityType: 'venue',
      entityId: String(venueId),
      details: JSON.stringify({ name: deleted?.name }),
    });

    return NextResponse.json({ success: true, message: 'नाट्यगृह यशस्वीरीत्या हटवले.' });
  } catch (error: any) {
    console.error('Error deleting venue:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete venue' }, { status: 500 });
  }
}
