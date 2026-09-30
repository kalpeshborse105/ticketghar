// GET /api/announcements - Public endpoint for active announcements (no auth required)
import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { announcements } from '@/src/db/schema.ts';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const city = url.searchParams.get('city');

    const now = new Date();

    // Get active announcements that are within display period and match city (or global)
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.active, 1),
          or(
            and(
              lte(announcements.startsAt, now),
              gte(announcements.endsAt, now)
            ),
            and(
              isNull(announcements.startsAt),
              isNull(announcements.endsAt)
            )
          ),
          city ? or(eq(announcements.city, city), isNull(announcements.city)) : undefined
        )
      );

    return NextResponse.json({ announcements: activeAnnouncements });
  } catch (error: any) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}
