// GET /api/admin/coupons - List all coupons
// POST /api/admin/coupons - Create new coupon
// PATCH /api/admin/coupons - Update coupon
// DELETE /api/admin/coupons - Deactivate coupon

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { coupons, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return NextResponse.json({ coupons: list });
  } catch (error: any) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      minOrderValue = 0,
      maxDiscount = 10000,
      usageLimit = 0,
      perUserLimit = 1,
      startsAt,
      endsAt,
      eventId,
      city,
      active = 1,
      actorId,
    } = body;

    if (!code || !discountType || !discountValue) {
      return NextResponse.json(
        { error: 'Code, discount type, and discount value are required' },
        { status: 400 }
      );
    }

    const [newCoupon] = await db
      .insert(coupons)
      .values({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue),
        maxDiscount: Number(maxDiscount),
        usageLimit: Number(usageLimit) || null,
        perUserLimit: Number(perUserLimit) || 1,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        eventId: eventId ? Number(eventId) : null,
        city: city?.trim() || null,
        active: Number(active),
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'super_admin',
      action: 'COUPON_CREATED',
      entityType: 'coupon',
      entityId: String(newCoupon.id),
      details: JSON.stringify({ code: newCoupon.code, discountValue: newCoupon.discountValue }),
    });

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (error: any) {
    console.error('Failed to create coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { couponId, active, usageLimit, perUserLimit, startsAt, endsAt, actorId } = body;

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (active !== undefined) updateData.active = Number(active);
    if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit) || null;
    if (perUserLimit !== undefined) updateData.perUserLimit = Number(perUserLimit);
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;

    const [updated] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, Number(couponId)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'super_admin',
      action: 'COUPON_UPDATED',
      entityType: 'coupon',
      entityId: String(couponId),
      details: JSON.stringify(updateData),
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    console.error('Failed to update coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}
