import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { homeSections } from '@/src/db/schema';
import { asc, eq } from 'drizzle-orm';

// Public endpoint for Web and Android App to read live section customizations
export async function GET() {
  try {
    const list = await db
      .select()
      .from(homeSections)
      .where(eq(homeSections.isVisible, 1))
      .orderBy(asc(homeSections.sortOrder));

    return NextResponse.json({ success: true, sections: list });
  } catch (err: any) {
    console.error('Error fetching home sections:', err);
    return NextResponse.json(
      { success: false, error: err.message, sections: [] },
      { status: 500 }
    );
  }
}
