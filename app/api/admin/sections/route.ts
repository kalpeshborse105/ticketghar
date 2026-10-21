import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { homeSections } from '@/src/db/schema';
import { asc, eq } from 'drizzle-orm';

// Admin endpoint: List all sections (including hidden)
export async function GET() {
  try {
    const list = await db
      .select()
      .from(homeSections)
      .orderBy(asc(homeSections.sortOrder));

    return NextResponse.json({ success: true, sections: list });
  } catch (err: any) {
    console.error('Admin sections fetch error:', err);
    return NextResponse.json(
      { success: false, error: err.message, sections: [] },
      { status: 500 }
    );
  }
}

// Admin endpoint: Update section titles, subtitles, badges, visibility, or sort order
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { success: false, error: 'sections array is required' },
        { status: 400 }
      );
    }

    for (const sec of sections) {
      if (!sec.sectionKey) continue;

      await db
        .insert(homeSections)
        .values({
          sectionKey: sec.sectionKey,
          titleEn: sec.titleEn || '',
          titleMr: sec.titleMr || '',
          subtitleEn: sec.subtitleEn || '',
          subtitleMr: sec.subtitleMr || '',
          badgeEn: sec.badgeEn || '',
          badgeMr: sec.badgeMr || '',
          sortOrder: typeof sec.sortOrder === 'number' ? sec.sortOrder : 0,
          isVisible: sec.isVisible !== undefined ? (sec.isVisible ? 1 : 0) : 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: homeSections.sectionKey,
          set: {
            titleEn: sec.titleEn,
            titleMr: sec.titleMr,
            subtitleEn: sec.subtitleEn,
            subtitleMr: sec.subtitleMr,
            badgeEn: sec.badgeEn,
            badgeMr: sec.badgeMr,
            sortOrder: sec.sortOrder,
            isVisible: sec.isVisible !== undefined ? (sec.isVisible ? 1 : 0) : 1,
            updatedAt: new Date(),
          },
        });
    }

    const updated = await db
      .select()
      .from(homeSections)
      .orderBy(asc(homeSections.sortOrder));

    return NextResponse.json({
      success: true,
      message: 'Sections updated successfully',
      sections: updated,
    });
  } catch (err: any) {
    console.error('Admin sections save error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
