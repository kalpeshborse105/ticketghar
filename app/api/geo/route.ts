import { NextRequest, NextResponse } from 'next/server';

const KNOWN_MAHARASHTRA_CITIES: Record<string, string> = {
  pune: 'Pune',
  poona: 'Pune',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  thane: 'Thane',
  nagpur: 'Nagpur',
  nashik: 'Nashik',
  aurangabad: 'Chhatrapati Sambhaji Nagar',
  sambhajinagar: 'Chhatrapati Sambhaji Nagar',
  kolhapur: 'Kolhapur',
  solapur: 'Solapur',
  sangli: 'Sangli',
  satara: 'Satara',
  amravati: 'Amravati',
  nanded: 'Nanded',
  ratnagiri: 'Ratnagiri',
  jalgaon: 'Jalgaon',
};

export async function GET(req: NextRequest) {
  try {
    // 1. Check Cloudflare / Vercel geolocation headers
    const vercelCity = req.headers.get('x-vercel-ip-city');
    const cfCity = req.headers.get('cf-ipcity');
    const rawCity = vercelCity || cfCity;

    if (rawCity) {
      const normalized = rawCity.toLowerCase().trim();
      for (const [key, val] of Object.entries(KNOWN_MAHARASHTRA_CITIES)) {
        if (normalized.includes(key)) {
          return NextResponse.json({ city: val, detected: true, source: 'edge-header' });
        }
      }
    }

    // Default to Pune (cultural theater capital of Maharashtra)
    return NextResponse.json({
      city: 'Pune',
      detected: false,
      source: 'default',
    });
  } catch (error) {
    return NextResponse.json({
      city: 'Pune',
      detected: false,
      source: 'fallback',
    });
  }
}
