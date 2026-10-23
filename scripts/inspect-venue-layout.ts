import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  const seatsRes = await db.execute(
    sql`SELECT DISTINCT section_id, row_label, COUNT(*)::int as count, MIN(seat_number::int) as min_seat, MAX(seat_number::int) as max_seat FROM seats WHERE venue_id = 3 GROUP BY section_id, row_label ORDER BY section_id, row_label`
  );
  console.log('Seats by row for venue 3:', seatsRes.rows);

  const sectionsRes = await db.execute(
    sql`SELECT id, name, name_mr, price, base_price FROM venue_sections WHERE venue_id = 3`
  );
  console.log('Sections for venue 3:', sectionsRes.rows);
}

main().catch(console.error);
