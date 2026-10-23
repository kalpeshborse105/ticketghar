import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

interface IntegrityReport {
  connected: boolean;
  timestamp: string;
  duplicateInventoryRows: number;
  inconsistentSeatRelations: number;
  expiredHoldsActive: number;
  confirmedOrdersMissingTickets: number;
  duplicateTicketsForSeat: number;
  duplicateOrdersForInventory: number;
  quotaMismatches: number;
  paymentsRequiringReconciliation: number;
  details: Record<string, any[]>;
}

export async function runDbIntegrityCheck(): Promise<IntegrityReport> {
  const report: IntegrityReport = {
    connected: false,
    timestamp: new Date().toISOString(),
    duplicateInventoryRows: 0,
    inconsistentSeatRelations: 0,
    expiredHoldsActive: 0,
    confirmedOrdersMissingTickets: 0,
    duplicateTicketsForSeat: 0,
    duplicateOrdersForInventory: 0,
    quotaMismatches: 0,
    paymentsRequiringReconciliation: 0,
    details: {},
  };

  try {
    // 1. Connectivity
    const ping = await db.execute(sql`SELECT 1 as alive`);
    if (ping) report.connected = true;

    // 2. Duplicate inventory rows for (session_id, seat_id)
    const dupInv = await db.execute(sql`
      SELECT session_id, seat_id, count(*)::int as cnt
      FROM seat_inventory
      GROUP BY session_id, seat_id
      HAVING count(*) > 1
    `);
    const dupInvRows = (dupInv as any)?.rows || (dupInv as any) || [];
    report.duplicateInventoryRows = dupInvRows.length;
    if (dupInvRows.length > 0) report.details.duplicateInventory = dupInvRows;

    // 3. Inconsistent session/event/ticket_type relationships
    // e.g. seat_inventory whose ticket_type's session_id != seat_inventory.session_id
    const relCheck = await db.execute(sql`
      SELECT si.id as inv_id, si.session_id as inv_session_id, tt.session_id as tt_session_id,
             tt.event_id as tt_event_id, es.event_id as session_event_id
      FROM seat_inventory si
      JOIN ticket_types tt ON si.ticket_type_id = tt.id
      JOIN event_sessions es ON si.session_id = es.id
      WHERE si.session_id != tt.session_id OR tt.event_id != es.event_id
    `);
    const relRows = (relCheck as any)?.rows || (relCheck as any) || [];
    report.inconsistentSeatRelations = relRows.length;
    if (relRows.length > 0) report.details.inconsistentRelations = relRows;

    // 4. Expired holds still marked held
    const now = new Date().toISOString();
    const expHolds = await db.execute(sql`
      SELECT id, session_id, seat_id, held_by_user_id, hold_expires_at
      FROM seat_inventory
      WHERE status = 'held' AND hold_expires_at < NOW()
    `);
    const expRows = (expHolds as any)?.rows || (expHolds as any) || [];
    report.expiredHoldsActive = expRows.length;
    if (expRows.length > 0) report.details.expiredHolds = expRows.slice(0, 10);

    // 5. Confirmed/captured orders missing tickets
    const missingTickets = await db.execute(sql`
      SELECT o.id, o.order_number, o.order_status, o.payment_status, o.ticket_count,
             count(t.id)::int as actual_tickets
      FROM orders o
      LEFT JOIN tickets t ON o.id = t.order_id
      WHERE (o.order_status = 'confirmed' OR o.payment_status = 'captured')
      GROUP BY o.id, o.order_number, o.order_status, o.payment_status, o.ticket_count
      HAVING count(t.id) < o.ticket_count
    `);
    const missingRows = (missingTickets as any)?.rows || (missingTickets as any) || [];
    report.confirmedOrdersMissingTickets = missingRows.length;
    if (missingRows.length > 0) report.details.missingTickets = missingRows;

    // 6. Duplicate ticket seat rows for the same session and seat
    const dupTickets = await db.execute(sql`
      SELECT session_id, seat_id, count(*)::int as cnt
      FROM tickets
      WHERE seat_id IS NOT NULL
      GROUP BY session_id, seat_id
      HAVING count(*) > 1
    `);
    const dupTicketRows = (dupTickets as any)?.rows || (dupTickets as any) || [];
    report.duplicateTicketsForSeat = dupTicketRows.length;
    if (dupTicketRows.length > 0) report.details.duplicateTickets = dupTicketRows;

    // 7. Mismatches among session inventory available count and ticket_types available quota
    const quotaCheck = await db.execute(sql`
      SELECT tt.id, tt.session_id, tt.name, tt.available_quota,
             count(si.id) FILTER (WHERE si.status = 'available' OR (si.status = 'held' AND si.hold_expires_at < NOW()))::int as actual_available
      FROM ticket_types tt
      JOIN seat_inventory si ON tt.id = si.ticket_type_id
      GROUP BY tt.id, tt.session_id, tt.name, tt.available_quota
      HAVING tt.available_quota != count(si.id) FILTER (WHERE si.status = 'available' OR (si.status = 'held' AND si.hold_expires_at < NOW()))
    `);
    const quotaRows = (quotaCheck as any)?.rows || (quotaCheck as any) || [];
    report.quotaMismatches = quotaRows.length;
    if (quotaRows.length > 0) report.details.quotaMismatches = quotaRows.slice(0, 10);

    // 8. Pending/captured payments requiring reconciliation
    // e.g. orders with payment_status = 'captured' but order_status != 'confirmed', or razorpay_payment_id present with pending order
    const reconcCheck = await db.execute(sql`
      SELECT id, order_number, razorpay_order_id, razorpay_payment_id, payment_status, order_status, created_at
      FROM orders
      WHERE (payment_status = 'captured' AND order_status != 'confirmed')
         OR (razorpay_payment_id IS NOT NULL AND payment_status = 'pending')
    `);
    const reconcRows = (reconcCheck as any)?.rows || (reconcCheck as any) || [];
    report.paymentsRequiringReconciliation = reconcRows.length;
    if (reconcRows.length > 0) report.details.reconciliationRequired = reconcRows;

  } catch (error: any) {
    console.error('Integrity check error:', error);
  }

  return report;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('check-db-integrity')) {
  runDbIntegrityCheck().then((res) => {
    console.log('=== MAHATICKET DATABASE INTEGRITY AUDIT ===');
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.connected ? 0 : 1);
  });
}
