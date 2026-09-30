// GET /api/admin/announcements - List all announcements
// POST /api/admin/announcements - Create announcement
// PATCH /api/admin/announcements - Update announcement
// DELETE /api/admin/announcements - Deactivate announcement

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { announcements, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const list = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    return NextResponse.json({ announcements: list });
  } catch (error: any) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      title,
      message,
      imageUrl,
      ctaLabel,
      ctaUrl,
      city,
      category,
      startsAt,
      endsAt,
      active = 1,
      actorId,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const [newAnnouncement] = await db
      .insert(announcements)
      .values({
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl?.trim() || null,
        ctaLabel: ctaLabel?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
        city: city?.trim() || null,
        category: category?.trim() || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        active: Number(active),
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'super_admin',
      action: 'ANNOUNCEMENT_CREATED',
      entityType: 'announcement',
      entityId: String(newAnnouncement.id),
      details: JSON.stringify({ title: newAnnouncement.title }),
    });

    return NextResponse.json({ success: true, announcement: newAnnouncement });
  } catch (error: any) {
    console.error('Failed to create announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create announcement' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { announcementId, active, title, message, imageUrl, ctaLabel, ctaUrl, startsAt, endsAt, actorId } = body;

    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (active !== undefined) updateData.active = Number(active);
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (ctaLabel !== undefined) updateData.ctaLabel = ctaLabel;
    if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl;
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;

    const [updated] = await db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, Number(announcementId)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'super_admin',
      action: 'ANNOUNCEMENT_UPDATED',
      entityType: 'announcement',
      entityId: String(announcementId),
      details: JSON.stringify(updateData),
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (error: any) {
    console.error('Failed to update announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
