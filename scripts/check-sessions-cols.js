import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]*/gi, '$1').replace(/\?&/, '?').replace(/[?&]$/, ''),
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'event_sessions';");
  console.log('event_sessions columns:', r.rows.map(x => x.column_name));
  await pool.end();
}
run();
