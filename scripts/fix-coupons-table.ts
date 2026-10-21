/**
 * Fix coupons table schema in database:
 * 1. Ensure `used_count` column exists
 * 2. Ensure standard coupons exist: NATAK10, MAHA20, MAHA50
 */
import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';
import { coupons } from '../src/db/schema.ts';

async function main() {
  console.log('🔧 Checking and updating coupons table...');
  
  await db.execute(sql`
    ALTER TABLE IF EXISTS coupons 
    ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
  `);
  console.log('✓ added used_count column');

  // Verify columns
  const res = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'coupons';
  `);
  console.log('Coupons columns:', res.rows.map((r: any) => r.column_name));

  // Seed coupons
  const defaultCoupons = [
    {
      code: 'NATAK10',
      discountType: 'percentage',
      discountValue: 1000, // 10%
      minOrderValue: 20000, // ₹200
      maxDiscount: 10000, // ₹100
      active: 1,
      usedCount: 0,
    },
    {
      code: 'MAHA20',
      discountType: 'percentage',
      discountValue: 2000, // 20%
      minOrderValue: 30000, // ₹300
      maxDiscount: 20000, // ₹200
      active: 1,
      usedCount: 0,
    },
    {
      code: 'MAHA50',
      discountType: 'flat',
      discountValue: 5000, // ₹50 flat
      minOrderValue: 25000, // ₹250
      maxDiscount: 5000, // ₹50
      active: 1,
      usedCount: 0,
    },
  ];

  for (const c of defaultCoupons) {
    await db.execute(sql`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, active, used_count)
      VALUES (${c.code}, ${c.discountType}, ${c.discountValue}, ${c.minOrderValue}, ${c.maxDiscount}, ${c.active}, ${c.usedCount})
      ON CONFLICT (code) DO UPDATE SET 
        discount_type = EXCLUDED.discount_type,
        discount_value = EXCLUDED.discount_value,
        min_order_value = EXCLUDED.min_order_value,
        max_discount = EXCLUDED.max_discount,
        active = EXCLUDED.active,
        used_count = COALESCE(coupons.used_count, 0);
    `);
    console.log(`✓ Upserted coupon: ${c.code}`);
  }

  console.log('✅ Coupons table successfully updated and seeded!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal coupon fix error:', err);
  process.exit(1);
});
