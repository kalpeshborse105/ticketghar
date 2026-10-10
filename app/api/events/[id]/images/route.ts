import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { eventImages } from '@/src/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

// Ensure table exists
async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS public.event_images (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        caption_mr TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_cover INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn('ensureTable error:', e);
  }
}

// GET /api/events/[id]/images
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();
    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const rows = await db.execute(sql`
      SELECT id, event_id, image_url, caption, caption_mr, sort_order, is_cover, created_at
      FROM public.event_images
      WHERE event_id = ${eventId}
      ORDER BY sort_order ASC, id ASC
    `);

    return NextResponse.json({
      success: true,
      eventId,
      images: rows.rows || [],
    });
  } catch (error: any) {
    console.error('Error fetching event images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event images' },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/images - Add photo to event gallery (for Admin/Organizer)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();
    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl, caption, captionMr, sortOrder, isCover } = body;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Valid imageUrl is required' },
        { status: 400 }
      );
    }

    const inserted = await db.execute(sql`
      INSERT INTO public.event_images (event_id, image_url, caption, caption_mr, sort_order, is_cover)
      VALUES (
        ${eventId},
        ${imageUrl.trim()},
        ${caption || null},
        ${captionMr || null},
        ${sortOrder || 0},
        ${isCover ? 1 : 0}
      )
      RETURNING id, event_id, image_url, caption, caption_mr, sort_order, is_cover, created_at
    `);

    return NextResponse.json({
      success: true,
      message: 'Image added successfully',
      image: inserted.rows?.[0] || null,
    });
  } catch (error: any) {
    console.error('Error adding event image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add event image' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/images?imageId=X - Remove photo from event gallery
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const { searchParams } = new URL(req.url);
    const imageIdStr = searchParams.get('imageId');
    const imageId = imageIdStr ? parseInt(imageIdStr, 10) : NaN;

    if (isNaN(imageId)) {
      return NextResponse.json(
        { success: false, error: 'Valid imageId query param is required' },
        { status: 400 }
      );
    }

    await db.execute(sql`
      DELETE FROM public.event_images
      WHERE id = ${imageId} AND event_id = ${eventId}
    `);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      deletedImageId: imageId,
    });
  } catch (error: any) {
    console.error('Error deleting event image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event image' },
      { status: 500 }
    );
  }
}
