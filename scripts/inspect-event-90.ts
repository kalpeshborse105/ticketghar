import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  const eventRes = await db.execute(sql`SELECT id, title, title_mr, venue_id, created_at FROM events WHERE id = 90`);
  console.log('Event 90:', eventRes.rows);

  const sessionsRes = await db.execute(
    sql`SELECT id, event_id, session_start_time, status, created_at FROM event_sessions WHERE event_id = 90 ORDER BY session_start_time ASC`
  );
  console.log('Event 90 Sessions:', sessionsRes.rows);
}

main().catch(console.error);
