import { db } from '../src/db/index';
import { seatInventory, ticketTypes, eventSessions } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const sessions = await db.select().from(eventSessions);
  for (const s of sessions) {
    const [inv] = await db
      .select({
        total: sql<number>`count(*)::int`,
        avail: sql<number>`count(*) filter (where status = 'available')::int`,
      })
      .from(seatInventory)
      .where(eq(seatInventory.sessionId, s.id));
    const tts = await db.select().from(ticketTypes).where(eq(ticketTypes.sessionId, s.id));
    const ttTotal = tts.reduce((acc, t) => acc + (t.availableQuota || 0), 0);
    console.log(
      `SESSION ${s.id}: seat_inventory available=${inv.avail}/${inv.total}, ticket_types availableQuota sum=${ttTotal}`
    );
  }
}
main().catch(console.error);
