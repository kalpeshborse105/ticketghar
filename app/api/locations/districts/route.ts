import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { districts } from '@/src/db/schema.ts';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db
      .select()
      .from(districts)
      .where(eq(districts.isActive, 1))
      .orderBy(asc(districts.division), asc(districts.name));

    return NextResponse.json({
      success: true,
      count: list.length,
      districts: list,
    });
  } catch (error: any) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      { error: 'Failed to load Maharashtra districts.' },
      { status: 500 }
    );
  }
}
