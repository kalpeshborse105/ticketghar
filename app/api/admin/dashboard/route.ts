import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { orders, tickets, settlements, events, partnerLeads, ticketScans, organizers } from '@/src/db/schema.ts';
import { sql, desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    // 1. Aggregate Order Financials for captured orders
    const financialStats = await db
      .select({
        totalCapturedOrders: sql<number>`count(*)`,
        totalTickets: sql<number>`coalesce(sum(${orders.ticketCount}), 0)`,
        grossTicketSales: sql<number>`coalesce(sum(${orders.ticketFaceValueTotal}), 0)`,
        platformFees: sql<number>`coalesce(sum(${orders.platformFeeTotal}), 0)`,
        taxes: sql<number>`coalesce(sum(${orders.taxTotal}), 0)`,
        gatewayCosts: sql<number>`coalesce(sum(${orders.gatewayCostEstimate}), 0)`,
        grandTotal: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
      })
      .from(orders)
      .where(sql`${orders.paymentStatus} IN ('captured', 'paid', 'completed', 'confirmed')`);

    // Refunded and Failed aggregates
    const [refundStats] = await db
      .select({
        totalRefundedOrders: sql<number>`count(*)`,
        totalRefundAmount: sql<number>`coalesce(sum(${orders.ticketFaceValueTotal}), 0)`,
        totalRefundGrandTotal: sql<number>`coalesce(sum(${orders.grandTotal}), 0)`,
      })
      .from(orders)
      .where(eq(orders.paymentStatus, 'refunded'));

    const [failedStats] = await db
      .select({
        totalFailedOrders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(eq(orders.paymentStatus, 'failed'));

    const [allOrdersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);

    const stats = financialStats[0] || {
      totalCapturedOrders: 0,
      totalTickets: 0,
      grossTicketSales: 0,
      platformFees: 0,
      taxes: 0,
      gatewayCosts: 0,
      grandTotal: 0,
    };

    // 2. Pending & Settled Settlements
    const settlementStats = await db
      .select({
        totalSettlementsCount: sql<number>`count(*)`,
        pendingSettlementsCount: sql<number>`count(case when ${settlements.status} = 'pending' then 1 end)`,
        settledCount: sql<number>`count(case when ${settlements.status} = 'settled' then 1 end)`,
        pendingOrganizerPayable: sql<number>`coalesce(sum(case when ${settlements.status} = 'pending' then ${settlements.netPayableToOrganizer} else 0 end), 0)`,
        totalSettledPayable: sql<number>`coalesce(sum(case when ${settlements.status} = 'settled' then ${settlements.netPayableToOrganizer} else 0 end), 0)`,
        platformCommissionEarned: sql<number>`coalesce(sum(${settlements.platformCommissionEarned}), 0)`,
        totalRefundDeductions: sql<number>`coalesce(sum(${settlements.totalRefundDeductions}), 0)`,
      })
      .from(settlements);

    const sStats = settlementStats[0] || {
      totalSettlementsCount: 0,
      pendingSettlementsCount: 0,
      settledCount: 0,
      pendingOrganizerPayable: 0,
      totalSettledPayable: 0,
      platformCommissionEarned: 0,
      totalRefundDeductions: 0,
    };

    // 3. Scan metrics
    const scanStats = await db
      .select({
        totalScans: sql<number>`count(*)`,
        successfulScans: sql<number>`count(case when ${ticketScans.scanResult} = 'SUCCESS' then 1 end)`,
        duplicateScans: sql<number>`count(case when ${ticketScans.scanResult} = 'ALREADY_USED' then 1 end)`,
        rejectedScans: sql<number>`count(case when ${ticketScans.scanResult} IN ('TICKET_CANCELLED', 'INVALID_TICKET') then 1 end)`,
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

    // 6. Reconciliation Check
    const grossComponents = Number(stats.grossTicketSales) + Number(stats.platformFees) + Number(stats.taxes);
    const isReconciled = Math.abs(grossComponents - Number(stats.grandTotal)) === 0;

    return NextResponse.json({
      kpis: {
        totalGmv: Number(stats.grandTotal),
        ticketsSold: Number(stats.totalTickets),
        totalOrders: Number(allOrdersCount?.count || 0),
        capturedOrders: Number(stats.totalCapturedOrders),
        refundedOrders: Number(refundStats?.totalRefundedOrders || 0),
        failedOrders: Number(failedStats?.totalFailedOrders || 0),
        grossTicketSales: Number(stats.grossTicketSales),
        platformFees: Number(stats.platformFees),
        taxesCollected: Number(stats.taxes),
        gatewayCosts: Number(stats.gatewayCosts),
        platformCommissionEarned: Number(sStats.platformCommissionEarned),
        netOrganizerPayable: Number(sStats.pendingOrganizerPayable),
        totalSettledPayable: Number(sStats.totalSettledPayable),
        totalRefundDeductions: Number(sStats.totalRefundDeductions) + Number(refundStats?.totalRefundAmount || 0),
        pendingSettlementsCount: Number(sStats.pendingSettlementsCount),
        totalSettlementsCount: Number(sStats.totalSettlementsCount),
        totalEvents: Number(eventCount?.count || 0),
        totalOrganizers: Number(orgCount?.count || 0),
        pendingLeads: Number(leadsCount?.count || 0),
        isReconciled,
        scans: {
          total: Number(scanStats[0]?.totalScans || 0),
          successful: Number(scanStats[0]?.successfulScans || 0),
          duplicatesRejected: Number(scanStats[0]?.duplicateScans || 0),
          cancelledRejected: Number(scanStats[0]?.rejectedScans || 0),
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
