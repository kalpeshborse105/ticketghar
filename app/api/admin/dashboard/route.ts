import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, tickets, settlements, events, partnerLeads, ticketScans, organizers } from '@/src/db/schema.ts';
import { sql, desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    // 1. Aggregate Order Financials
    const financialStats = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalTickets: sql<number>`coalesce(sum(${orders.ticketCount}), 0)`,
        grossTicketSales: sql<number>`coalesce(sum(${orders.ticketFaceValueTotal}), 0)`,
        platformFees: sql<number>`coalesce(sum(${orders.platformFeeTotal}), 0)`,
        taxes: sql<number>`coalesce(sum(${orders.taxTotal}), 0)`,
        gatewayCosts: sql<number>`coalesce(sum(${orders.gatewayCostEstimate}), 0)`,
        grandTotal: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
      })
      .from(orders)
      .where(sql`${orders.paymentStatus} IN ('captured', 'paid', 'completed', 'confirmed')`);

    const stats = financialStats[0] || {
      totalOrders: 0,
      totalTickets: 0,
      grossTicketSales: 0,
      platformFees: 0,
      taxes: 0,
      gatewayCosts: 0,
      grandTotal: 0,
    };

    // 2. Pending Settlements
    const settlementStats = await db
      .select({
        pendingSettlementsCount: sql<number>`count(*)`,
        pendingOrganizerPayable: sql<number>`coalesce(sum(${settlements.netPayableToOrganizer}), 0)`,
        platformCommissionEarned: sql<number>`coalesce(sum(${settlements.platformCommissionEarned}), 0)`,
      })
      .from(settlements)
      .where(eq(settlements.status, 'pending'));

    const sStats = settlementStats[0] || {
      pendingSettlementsCount: 0,
      pendingOrganizerPayable: 0,
      platformCommissionEarned: 0,
    };

    // 3. Scan metrics
    const scanStats = await db
      .select({
        totalScans: sql<number>`count(*)`,
        successfulScans: sql<number>`count(case when ${ticketScans.scanResult} = 'SUCCESS' then 1 end)`,
        duplicateScans: sql<number>`count(case when ${ticketScans.scanResult} = 'ALREADY_USED' then 1 end)`,
      })
      .from(ticketScans);

    // 4. Counts of events, organizers, partner leads
    const [eventCount] = await db.select({ count: sql<number>`count(*)` }).from(events);
    const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizers);
    const [leadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(partnerLeads)
      .where(eq(partnerLeads.status, 'new'));

    // 5. Recent Scan Activity
    const recentScans = await db
      .select()
      .from(ticketScans)
      .orderBy(desc(ticketScans.scannedAt))
      .limit(10);

    return NextResponse.json({
      kpis: {
        totalGmv: Number(stats.grandTotal),
        ticketsSold: Number(stats.totalTickets),
        totalOrders: Number(stats.totalOrders),
        grossTicketSales: Number(stats.grossTicketSales),
        platformFees: Number(stats.platformFees),
        taxesCollected: Number(stats.taxes),
        gatewayCosts: Number(stats.gatewayCosts),
        platformCommissionEarned: Number(sStats.platformCommissionEarned),
        netOrganizerPayable: Number(sStats.pendingOrganizerPayable),
        pendingSettlementsCount: Number(sStats.pendingSettlementsCount),
        totalEvents: Number(eventCount?.count || 0),
        totalOrganizers: Number(orgCount?.count || 0),
        pendingLeads: Number(leadsCount?.count || 0),
        scans: {
          total: Number(scanStats[0]?.totalScans || 0),
          successful: Number(scanStats[0]?.successfulScans || 0),
          duplicatesRejected: Number(scanStats[0]?.duplicateScans || 0),
        },
      },
      recentScans,
    });
  } catch (error: any) {
    console.error('Admin dashboard metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin metrics' },
      { status: 500 }
    );
  }
}
