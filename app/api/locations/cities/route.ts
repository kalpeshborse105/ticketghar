import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { cities, districts, talukas } from '@/src/db/schema.ts';
import { eq, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtIdParam = searchParams.get('districtId');
    const talukaIdParam = searchParams.get('talukaId');
    const popularOnly = searchParams.get('popular') === '1';

    const conditions = [eq(cities.isActive, 1)];

    if (districtIdParam) {
      const districtId = parseInt(districtIdParam, 10);
      if (!isNaN(districtId)) {
        conditions.push(eq(cities.districtId, districtId));
      }
    }

    if (talukaIdParam) {
      const talukaId = parseInt(talukaIdParam, 10);
      if (!isNaN(talukaId)) {
        conditions.push(eq(cities.talukaId, talukaId));
      }
    }

    if (popularOnly) {
      conditions.push(eq(cities.isPopular, 1));
    }

    const list = await db
      .select({
        id: cities.id,
        name: cities.name,
        nameMr: cities.nameMr,
        districtId: cities.districtId,
        talukaId: cities.talukaId,
        isPopular: cities.isPopular,
        sortOrder: cities.sortOrder,
        districtName: districts.name,
        districtNameMr: districts.nameMr,
      })
      .from(cities)
      .leftJoin(districts, eq(cities.districtId, districts.id))
      .where(and(...conditions))
      .orderBy(asc(cities.sortOrder), asc(cities.name));

    return NextResponse.json({
      success: true,
      count: list.length,
      cities: list,
    });
  } catch (error: any) {
    console.error('Error fetching locations cities:', error);
    return NextResponse.json(
      { error: 'Failed to load Maharashtra cities.' },
      { status: 500 }
    );
  }
}
