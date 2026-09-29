import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, venueSections, seats, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';

// GET all venues
export async function GET() {
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
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      nameMr,
      address,
      city,
      totalCapacity = 500,
      hasSeatLayout = 1,
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

    // Insert venue
    const [newVenue] = await db
      .insert(venues)
      .values({
        name,
        nameMr,
        address,
        city: city.trim(),
        totalCapacity: Number(totalCapacity),
        hasSeatLayout: Number(hasSeatLayout),
      })
      .returning();

    // If seated venue, create Balcony and Stall sections
    if (hasSeatLayout === 1) {
      // 1. Balcony Section
      const [balcony] = await db
        .insert(venueSections)
        .values({
          venueId: newVenue.id,
          name: 'Balcony',
          nameMr: 'बाल्कनी',
          rowsCount: Number(balconyRows),
          colsCount: Number(balconyCols),
          basePrice: Math.round(Number(balconyPrice) * 100),
          accessible: 0,
        })
        .returning();

      // Create Balcony seats
      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const balconySeatsToInsert: any[] = [];
      for (let r = 0; r < Number(balconyRows); r++) {
        const row = rowLetters[r] || `R${r + 1}`;
        for (let c = 1; c <= Number(balconyCols); c++) {
          balconySeatsToInsert.push({
            venueId: newVenue.id,
            sectionId: balcony.id,
            rowLabel: row,
            seatNumber: c,
            seatCode: `BAL-${row}${c < 10 ? '0' + c : c}`,
            tier: 'platinum',
            isAccessible: 0,
          });
        }
      }
      if (balconySeatsToInsert.length > 0) {
        await db.insert(seats).values(balconySeatsToInsert);
      }

      // 2. Stall Section
      const [stall] = await db
        .insert(venueSections)
        .values({
          venueId: newVenue.id,
          name: 'Stall / Orchestra',
          nameMr: 'स्टॉल / आसन व्यवस्था',
          rowsCount: Number(stallRows),
          colsCount: Number(stallCols),
          basePrice: Math.round(Number(stallPrice) * 100),
          accessible: 1,
        })
        .returning();

      // Create Stall seats
      const stallSeatsToInsert: any[] = [];
      for (let r = 0; r < Number(stallRows); r++) {
        const row = rowLetters[r] || `R${r + 1}`;
        for (let c = 1; c <= Number(stallCols); c++) {
          stallSeatsToInsert.push({
            venueId: newVenue.id,
            sectionId: stall.id,
            rowLabel: row,
            seatNumber: c,
            seatCode: `STL-${row}${c < 10 ? '0' + c : c}`,
            tier: 'gold',
            isAccessible: r === 0 && c <= 2 ? 1 : 0,
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
      action: 'CREATE_VENUE',
      entityType: 'venue',
      entityId: String(newVenue.id),
      details: JSON.stringify({ name, city, address }),
    });

    return NextResponse.json({
      success: true,
      venue: newVenue,
    });
  } catch (error: any) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create venue' },
      { status: 500 }
    );
  }
}
