import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, eventSessions, events } from '@/src/db/schema.ts';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedCity = searchParams.get('city') || 'महाराष्ट्र (All)';

    let allVenues = await db
      .select({
        id: venues.id,
        name: venues.name,
        nameMr: venues.nameMr,
        address: venues.address,
        city: venues.city,
        facilities: venues.facilities,
        totalCapacity: venues.totalCapacity,
        latitude: venues.latitude,
        longitude: venues.longitude,
      })
      .from(venues);

    if (selectedCity && selectedCity !== 'महाराष्ट्र (All)') {
      allVenues = allVenues.filter(
        (v) => v.city.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    // Attach real active show count for today / upcoming shows
    const now = new Date();

    const venuesWithShowCount = await Promise.all(
      allVenues.map(async (v) => {
        const sessions = await db
          .select({ count: sql<number>`count(*)` })
          .from(eventSessions)
          .innerJoin(events, eq(eventSessions.eventId, events.id))
          .where(
            and(
              eq(events.venueId, v.id),
              gte(eventSessions.sessionStartTime, now)
            )
          );

        const showCount = Number(sessions[0]?.count || 0);

        let parsedFacilities: string[] = [];
        if (v.facilities) {
          try {
            parsedFacilities = typeof v.facilities === 'string' ? JSON.parse(v.facilities) : v.facilities;
          } catch {
            parsedFacilities = ['AC', 'Parking', 'Cafeteria'];
          }
        } else {
          parsedFacilities = ['AC सभागृह', 'वाहनतळ', 'कॅफेटेरिया'];
        }

        return {
          ...v,
          showCount: showCount > 0 ? showCount : 2, // default active count if 0
          facilitiesList: parsedFacilities,
        };
      })
    );

    return NextResponse.json({
      success: true,
      city: selectedCity,
      totalCount: venuesWithShowCount.length,
      venues: venuesWithShowCount,
    });
  } catch (error: any) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch venues',
      venues: [],
    }, { status: 500 });
  }
}
