import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, eventSessions, events, districts, cities } from '@/src/db/schema.ts';
import { eq, and, gte, sql } from 'drizzle-orm';
import { isAuthoritativeTheatreId, loadAuthoritativeTheatres } from '@/src/lib/venue-eligibility.ts';

/**
 * Public venues list — DB only.
 * Never invents venue rows or fake IDs. Does not merge a hardcoded catalog.
 * Default: verified venues that are event-eligible (authoritative allowlist).
 * Pass ?allVerified=1 to list every verified venue (browse), still no invented rows.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedCity = (searchParams.get('city') || 'महाराष्ट्र (All)').trim();
    const allVerified = searchParams.get('allVerified') === '1';
    const catalog = loadAuthoritativeTheatres();

    const dbVenues = await db
      .select({
        id: venues.id,
        name: venues.name,
        nameMr: venues.nameMr,
        address: venues.address,
        city: venues.city,
        cityId: venues.cityId,
        districtId: venues.districtId,
        facilities: venues.facilities,
        totalCapacity: venues.totalCapacity,
        latitude: venues.latitude,
        longitude: venues.longitude,
        verificationStatus: venues.verificationStatus,
        districtName: districts.name,
        cityCatalogName: cities.name,
      })
      .from(venues)
      .leftJoin(districts, eq(venues.districtId, districts.id))
      .leftJoin(cities, eq(venues.cityId, cities.id))
      .where(eq(venues.verificationStatus, 'verified'));

    const now = new Date();
    const showCountMap: Record<number, number> = {};
    try {
      const showCounts = await db
        .select({
          venueId: events.venueId,
          count: sql<number>`count(*)::int`,
        })
        .from(eventSessions)
        .innerJoin(events, eq(eventSessions.eventId, events.id))
        .where(
          and(
            gte(eventSessions.sessionStartTime, now),
            eq(events.status, 'published')
          )
        )
        .groupBy(events.venueId);

      showCounts.forEach((sc) => {
        if (sc.venueId) showCountMap[sc.venueId] = Number(sc.count);
      });
    } catch {
      /* show counts optional */
    }

    let mapped = dbVenues.map((v) => {
      let parsedFacilities: string[] = [];
      if (v.facilities) {
        try {
          parsedFacilities =
            typeof v.facilities === 'string' ? JSON.parse(v.facilities) : v.facilities;
        } catch {
          parsedFacilities = [];
        }
      }
      const eligible = isAuthoritativeTheatreId(v.id, catalog);
      return {
        id: v.id,
        name: v.name,
        nameMr: v.nameMr,
        address: v.address,
        city: v.cityCatalogName || v.city,
        cityId: v.cityId,
        districtId: v.districtId,
        districtName: v.districtName,
        totalCapacity: v.totalCapacity,
        latitude: v.latitude,
        longitude: v.longitude,
        verificationStatus: v.verificationStatus,
        locationMapped: !!(v.cityId && v.districtId),
        eligibleForEvents: eligible,
        showCount: showCountMap[v.id] || 0,
        facilitiesList: parsedFacilities,
      };
    });

    if (!allVerified) {
      mapped = mapped.filter((v) => v.eligibleForEvents);
    }

    const MARATHI_TO_ENG_CITY: Record<string, string> = {
      पुणे: 'Pune',
      मुंबई: 'Mumbai',
      ठाणे: 'Thane',
      नागपूर: 'Nagpur',
      नाशिक: 'Nashik',
      संभाजीनगर: 'Chhatrapati Sambhaji Nagar',
      'छत्रपती संभाजीनगर': 'Chhatrapati Sambhaji Nagar',
      औरंगाबाद: 'Chhatrapati Sambhaji Nagar',
      कोल्हापूर: 'Kolhapur',
      सोलापूर: 'Solapur',
      सांगली: 'Sangli',
      सातारा: 'Satara',
      अमरावती: 'Amravati',
      नांदेड: 'Nanded',
      रत्नागिरी: 'Ratnagiri',
      जळगाव: 'Jalgaon',
    };

    let filteredVenues = mapped;
    if (
      selectedCity &&
      selectedCity !== 'महाराष्ट्र (All)' &&
      selectedCity !== 'Maharashtra' &&
      selectedCity.toLowerCase() !== 'all'
    ) {
      const normalizedTarget = (MARATHI_TO_ENG_CITY[selectedCity] || selectedCity).toLowerCase();
      filteredVenues = mapped.filter((v) => {
        if (!v.city) return false;
        const venueCity = v.city.toLowerCase();
        return (
          venueCity === normalizedTarget ||
          venueCity.includes(normalizedTarget) ||
          normalizedTarget.includes(venueCity)
        );
      });
    }

    return NextResponse.json(
      {
        success: true,
        city: selectedCity,
        totalCount: filteredVenues.length,
        venues: filteredVenues,
        meta: {
          source: 'database',
          inventedCatalog: false,
          filter: allVerified ? 'verified' : 'authoritative_verified',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error: any) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch venues',
        venues: [],
      },
      { status: 500 }
    );
  }
}
