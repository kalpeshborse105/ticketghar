import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { cities, venues } from '@/src/db/schema.ts';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const catalog = await db
      .select({
        id: cities.id,
        name: cities.name,
        nameMr: cities.nameMr,
        districtId: cities.districtId,
        isPopular: cities.isPopular,
      })
      .from(cities)
      .where(eq(cities.isActive, 1))
      .orderBy(asc(cities.sortOrder), asc(cities.name));

    if (catalog.length > 0) {
      return NextResponse.json({
        cities: ['महाराष्ट्र (All)', ...catalog.map((c) => c.name)],
        catalog,
      });
    }

    const dbVenues = await db.select({ city: venues.city }).from(venues);
    const fromVenues = Array.from(
      new Set(dbVenues.map((v) => v.city.trim()).filter(Boolean))
    ).sort();

    return NextResponse.json({
      cities: ['महाराष्ट्र (All)', ...fromVenues],
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      {
        error: 'Something went wrong. Please try again.',
        cities: ['महाराष्ट्र (All)', 'Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Thane'],
      },
      { status: 503 }
    );
  }
}
