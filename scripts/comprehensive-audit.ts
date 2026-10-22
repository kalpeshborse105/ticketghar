import 'dotenv/config';
import { pool } from '../src/db';

async function main() {
  console.log('=== MAHATICKET FULL SYSTEM & SCHEMA AUDIT ===\n');

  // 1. Table Counts & Existence
  console.log('--- 1. Tables & Row Counts ---');
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  const tables = tablesRes.rows.map(r => r.table_name);
  for (const t of tables) {
    try {
      const c = await pool.query(`SELECT count(*) FROM "${t}"`);
      console.log(`  Table: ${t.padEnd(25)} Rows: ${c.rows[0].count}`);
    } catch (e: any) {
      console.log(`  Table: ${t.padEnd(25)} Error: ${e.message}`);
    }
  }

  // 2. Foreign Key Constraints
  console.log('\n--- 2. Foreign Key Constraints ---');
  const fkRes = await pool.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log(`  Total Foreign Keys: ${fkRes.rows.length}`);
  fkRes.rows.forEach(r => {
    console.log(`  ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`);
  });

  // 3. RLS Status
  console.log('\n--- 3. Row Level Security (RLS) Status ---');
  const rlsRes = await pool.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  rlsRes.rows.forEach(r => {
    console.log(`  ${r.tablename.padEnd(25)} RLS Enabled: ${r.rowsecurity}`);
  });

  // 4. Data Integrity Checks:
  console.log('\n--- 4. Data Consistency & Integrity Checks ---');

  // 4.1 Orphaned events
  const orphanEvents = await pool.query(`
    SELECT e.id, e.title 
    FROM events e 
    LEFT JOIN venues v ON e.venue_id = v.id 
    LEFT JOIN organizers o ON e.organizer_id = o.id 
    WHERE v.id IS NULL OR o.id IS NULL;
  `);
  console.log(`  Events with invalid venue/organizer: ${orphanEvents.rows.length}`);

  // 4.2 Orphaned sessions
  const orphanSessions = await pool.query(`
    SELECT s.id, s.event_id 
    FROM event_sessions s 
    LEFT JOIN events e ON s.event_id = e.id 
    WHERE e.id IS NULL;
  `);
  console.log(`  Sessions with missing event: ${orphanSessions.rows.length}`);

  // 4.3 Orphaned ticket types
  const orphanTicketTypes = await pool.query(`
    SELECT tt.id, tt.event_id, tt.session_id 
    FROM ticket_types tt 
    LEFT JOIN events e ON tt.event_id = e.id 
    LEFT JOIN event_sessions s ON tt.session_id = s.id 
    WHERE e.id IS NULL OR s.id IS NULL;
  `);
  console.log(`  TicketTypes with missing event or session: ${orphanTicketTypes.rows.length}`);

  // 4.4 Orphaned seat inventory
  const orphanInv = await pool.query(`
    SELECT count(*) 
    FROM seat_inventory si 
    LEFT JOIN event_sessions es ON si.session_id = es.id 
    LEFT JOIN seats s ON si.seat_id = s.id 
    LEFT JOIN ticket_types tt ON si.ticket_type_id = tt.id 
    WHERE es.id IS NULL OR s.id IS NULL OR tt.id IS NULL;
  `);
  console.log(`  SeatInventory rows with missing session/seat/ticketType: ${orphanInv.rows[0].count}`);

  // 4.5 Orders with > 5 tickets
  const ordersOver5 = await pool.query(`
    SELECT id, order_number, ticket_count 
    FROM orders 
    WHERE ticket_count > 5;
  `);
  console.log(`  Orders exceeding 5-ticket limit: ${ordersOver5.rows.length}`);

  // 4.6 Duplicate tickets per seat in same session
  const dupeSeatTickets = await pool.query(`
    SELECT session_id, seat_id, COUNT(*) 
    FROM tickets 
    WHERE seat_id IS NOT NULL 
    GROUP BY session_id, seat_id 
    HAVING COUNT(*) > 1;
  `);
  console.log(`  Double-booked seats across tickets: ${dupeSeatTickets.rows.length}`);

  // 4.7 Orders without tickets
  const ordersNoTickets = await pool.query(`
    SELECT o.id, o.order_number, o.order_status, o.payment_status 
    FROM orders o 
    LEFT JOIN tickets t ON t.order_id = o.id 
    WHERE o.order_status = 'confirmed' AND t.id IS NULL;
  `);
  console.log(`  Confirmed orders missing tickets: ${ordersNoTickets.rows.length}`);

  console.log('\n=== AUDIT COMPLETE ===');
  process.exit(0);
}

main().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
