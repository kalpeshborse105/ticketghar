import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

async function verify() {
  const ev = await db.execute(sql`SELECT count(*) as count from events`);
  const st = await db.execute(sql`SELECT count(*) as count from seats`);
  const ses = await db.execute(sql`SELECT count(*) as count from event_sessions`);
  const ci = await db.execute(sql`SELECT count(*) as count from cities`);
  const tt = await db.execute(sql`SELECT count(*) as count from ticket_types`);
  const co = await db.execute(sql`SELECT count(*) as count from coupons`);
  const eventsList = await db.execute(sql`SELECT id, slug, title, category from events`);
  console.log('--- DATABASE STATUS ---');
  console.log('Events:', ev.rows[0]);
  console.log('Seats:', st.rows[0]);
  console.log('Sessions:', ses.rows[0]);
  console.log('Cities:', ci.rows[0]);
  console.log('Ticket Types:', tt.rows[0]);
  console.log('Coupons:', co.rows[0]);
  console.log('\n--- ACTIVE EVENTS ---');
  eventsList.rows.forEach(e => console.log(`- [${e.id}] ${e.title} (${e.slug}) [${e.category}]`));
  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
