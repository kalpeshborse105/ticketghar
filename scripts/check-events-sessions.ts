import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });
const url = (process.env.DATABASE_URL || '').replace(/([?&])sslmode=[^&]*/gi, '$1').replace(/\?&/, '?').replace(/[?&]$/, '');
const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  const ev = await p.query("SELECT id, title, slug, status, venue_id FROM events WHERE slug LIKE '%vasantotsav%' OR slug LIKE '%sur-nava%'");
  console.log('Events found:', ev.rows);
  if (ev.rows.length) {
    for (const r of ev.rows) {
      const sess = await p.query("SELECT id, event_id, session_start_time, status FROM event_sessions WHERE event_id = $1", [r.id]);
      console.log(`Sessions for event ${r.id} (${r.slug}):`, sess.rows);
      if (sess.rows.length > 0) {
        const sessIds = sess.rows.map(s => s.id);
        const tt = await p.query("SELECT id, session_id, name, price, available_quota FROM ticket_types WHERE session_id = ANY($1)", [sessIds]);
        console.log(`Ticket types for event ${r.id}:`, tt.rows);
      }
    }
  }
  await p.end();
}
run().catch(console.error);
