import 'dotenv/config';
import { pool } from '../src/db';

async function main() {
  const o = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position");
  console.log('Orders columns:', o.rows.map(r => `${r.column_name} (${r.data_type})`));
  
  const t = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tickets' ORDER BY ordinal_position");
  console.log('Tickets columns:', t.rows.map(r => `${r.column_name} (${r.data_type})`));
  
  const s = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_scans' ORDER BY ordinal_position");
  console.log('ticket_scans columns:', s.rows.map(r => `${r.column_name} (${r.data_type})`));

  process.exit(0);
}
main().catch(console.error);
