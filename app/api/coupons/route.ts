import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { coupons } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db
      .select()
      .from(coupons)
      .where(eq(coupons.active, 1));

    return NextResponse.json({ coupons: list });
  } catch (error: any) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { code, amount } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Valid coupon code is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const rows = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, cleanCode), eq(coupons.active, 1)));

    if (rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'अवैध कूपन कोड (Invalid coupon code)' },
        { status: 404 }
      );
    }

    const coupon = rows[0];
    const subtotal = amount || 0;

    if (subtotal < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `या कूपनसाठी किमान ₹${(coupon.minOrderValue / 100).toFixed(0)} चे तिकीट आवश्यक आहे (Min order ₹${coupon.minOrderValue / 100})`,
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((subtotal * coupon.discountValue) / 10000);
      discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount,
      discountFormatted: `₹${(discount / 100).toFixed(0)}`,
      message: `कूपन लागू झाले! ₹${(discount / 100).toFixed(0)} सूट (Coupon applied successfully!)`,
    });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
