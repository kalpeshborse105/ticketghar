/**
 * Ensure every venue has BMS-style sections + seats + aisle layoutConfig.
 * Idempotent: skips venues that already have sections.
 * Run: npx tsx scripts/seed-theater-layouts.ts
 */
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const TIERS = [
  {
    name: 'Balcony',
    nameMr: 'बाल्कनी',
    rows: ['A', 'B', 'C'],
    cols: 10,
    aisleAfter: [5],
    basePriceRupees: 500,
    tier: 'gold',
  },
  {
    name: 'Stall A',
    nameMr: 'प्रथम वर्ग',
    rows: ['D', 'E', 'F', 'G'],
    cols: 12,
    aisleAfter: [4, 8],
    basePriceRupees: 400,
    tier: 'platinum',
    walkwayAfterRow: 'F',
  },
  {
    name: 'Stall B',
    nameMr: 'द्वितीय वर्ग',
    rows: ['H', 'J', 'K'],
    cols: 12,
    aisleAfter: [4, 8],
    basePriceRupees: 300,
    tier: 'silver',
  },
];

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const c = await pool.connect();

  try {
    const venues = await c.query<{ id: number; name: string }>(
      `SELECT id, name FROM venues ORDER BY id`
    );
    let built = 0;
    let skipped = 0;

    for (const v of venues.rows) {
      const secCount = await c.query(
        `SELECT count(*)::int AS n FROM venue_sections WHERE venue_id = $1`,
        [v.id]
      );
      if (secCount.rows[0].n > 0) {
        skipped++;
        continue;
      }

      const layoutSections: any[] = [];

      for (const t of TIERS) {
        const secIns = await c.query(
          `INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
           VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING id`,
          [v.id, t.name, t.nameMr, t.rows.length, t.cols, t.basePriceRupees * 100]
        );
        const sectionId = secIns.rows[0].id;
        const rowDefs: any[] = [];

        for (const row of t.rows) {
          rowDefs.push({
            rowLabel: row,
            seats: Array.from({ length: t.cols }, (_, i) => ({
              seatNumber: i + 1,
              status: 'available',
            })),
            aisleAfter: t.aisleAfter,
          });
          for (let n = 1; n <= t.cols; n++) {
            const code = `${row}${String(n).padStart(2, '0')}`;
            await c.query(
              `INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
               VALUES ($1,$2,$3,$4,$5,$6,0,0)`,
              [v.id, sectionId, row, n, code, t.tier]
            );
          }
        }

        layoutSections.push({
          name: t.name,
          nameMr: t.nameMr,
          basePrice: t.basePriceRupees,
          color: t.tier === 'gold' ? '#F59E0B' : t.tier === 'platinum' ? '#EA580C' : '#64748B',
          walkwayAfterRow: (t as any).walkwayAfterRow || '',
          rows: rowDefs,
        });
      }

      await c.query(
        `UPDATE venues SET has_seat_layout = 1, layout_config = $1, total_capacity = $2 WHERE id = $3`,
        [
          JSON.stringify({ sections: layoutSections }),
          TIERS.reduce((sum, t) => sum + t.rows.length * t.cols, 0),
          v.id,
        ]
      );
      built++;
      console.log(`Layout built: ${v.name} (#${v.id})`);
    }

    console.log(`Done. built=${built} skipped_existing=${skipped} total_venues=${venues.rows.length}`);
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
