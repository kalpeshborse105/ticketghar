/**
 * Ensure performance indexes for ultra-fast seat map loading:
 * 1. idx_seat_inventory_session_id
 * 2. idx_seats_venue_id
 * 3. idx_seats_section_id
 * 4. idx_event_sessions_event_id
 */
import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('⚡ Creating database indexes for high-speed seat map loading...');

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_seat_inventory_session_id ON seat_inventory (session_id);
    CREATE INDEX IF NOT EXISTS idx_seat_inventory_seat_id ON seat_inventory (seat_id);
    CREATE INDEX IF NOT EXISTS idx_seat_inventory_status ON seat_inventory (session_id, status);
    CREATE INDEX IF NOT EXISTS idx_seats_venue_id ON seats (venue_id);
    CREATE INDEX IF NOT EXISTS idx_seats_section_id ON seats (section_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_types_session_id ON ticket_types (session_id);
    CREATE INDEX IF NOT EXISTS idx_event_sessions_event_id ON event_sessions (event_id);
  `);

  console.log('✅ Indexes created successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Index creation error:', err);
  process.exit(1);
});
