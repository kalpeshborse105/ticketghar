import path from 'path';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const { db } = await import('../src/db/index.ts');
  const { events, eventSessions, venues, seatInventory, districts } = await import(
    '../src/db/schema.ts'
  );

  const distCount = await db.select().from(districts);
  const venueRows = await db.select().from(venues);
  const eventRows = await db.select().from(events).limit(5);
  console.log(
    JSON.stringify(
      {
        districts: distCount.length,
        venues: venueRows.length,
        eventsSample: eventRows.map((e) => ({ id: e.id, title: e.title, venueId: e.venueId })),
      },
      null,
      2
    )
  );

  if (eventRows[0]) {
    const sessions = await db
      .select()
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventRows[0].id));
    console.log('sessions for event', eventRows[0].id, sessions.length);
    if (sessions[0]) {
      const inv = await db
        .select()
        .from(seatInventory)
        .where(eq(seatInventory.sessionId, sessions[0].id));
      console.log('seat_inventory for session', sessions[0].id, inv.length);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
