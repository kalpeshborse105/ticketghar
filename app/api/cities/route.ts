import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues } from '@/src/db/schema.ts';

// Standard Maharashtra cultural & theatrical hubs
const DEFAULT_CITIES = [
  'Pune',
  'Mumbai',
  'Thane',
  'Nagpur',
  'Nashik',
  'Chhatrapati Sambhaji Nagar',
  'Kolhapur',
  'Solapur',
  'Sangli',
  'Satara',
  'Amravati',
  'Nanded',
  'Ratnagiri',
  'Jalgaon',
  'Akola',
  'Latur',
  'Ahmednagar',
];

export async function GET() {
  try {
    // Fetch any cities present in the database venues
    const dbVenues = await db.select({ city: venues.city }).from(venues);
    const dbCities = dbVenues.map((v) => v.city.trim()).filter(Boolean);

    // Merge and deduplicate
    const citySet = new Set<string>([...DEFAULT_CITIES, ...dbCities]);
    const sortedCities = Array.from(citySet).sort();

    return NextResponse.json({
      cities: ['महाराष्ट्र (All)', ...sortedCities],
    });
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({
      cities: ['महाराष्ट्र (All)', ...DEFAULT_CITIES],
    });
  }
}
