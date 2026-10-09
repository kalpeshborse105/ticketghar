import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { talukas, districts } from '@/src/db/schema.ts';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtIdParam = searchParams.get('districtId');

    if (districtIdParam) {
      const districtId = parseInt(districtIdParam, 10);
      if (isNaN(districtId)) {
        return NextResponse.json({ error: 'Invalid district ID' }, { status: 400 });
      }

      const list = await db
        .select({
          id: talukas.id,
          name: talukas.name,
          nameMr: talukas.nameMr,
          districtId: talukas.districtId,
          isActive: talukas.isActive,
        })
        .from(talukas)
        .where(eq(talukas.districtId, districtId))
        .orderBy(asc(talukas.name));

      return NextResponse.json({
        success: true,
        count: list.length,
        talukas: list,
      });
    }

    const list = await db
      .select({
        id: talukas.id,
        name: talukas.name,
        nameMr: talukas.nameMr,
        districtId: talukas.districtId,
        districtName: districts.name,
        districtNameMr: districts.nameMr,
        isActive: talukas.isActive,
      })
      .from(talukas)
      .innerJoin(districts, eq(talukas.districtId, districts.id))
      .where(eq(talukas.isActive, 1))
      .orderBy(asc(districts.name), asc(talukas.name));

    return NextResponse.json({
      success: true,
      count: list.length,
      talukas: list,
    });
  } catch (error: any) {
    console.error('Error fetching talukas:', error);
    return NextResponse.json(
      { error: 'Failed to load talukas.' },
      { status: 500 }
    );
  }
}
