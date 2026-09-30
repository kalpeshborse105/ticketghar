import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { settlements, organizers, events, auditLogs } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const list = await db
      .select({
        settlement: settlements,
        organizer: organizers,
        event: events,
      })
      .from(settlements)
      .innerJoin(organizers, eq(settlements.organizerId, organizers.id))
      .innerJoin(events, eq(settlements.eventId, events.id))
      .orderBy(desc(settlements.createdAt));

    const formatted = list.map((item) => ({
      id: item.settlement.id,
      settlementReference: item.settlement.settlementReference,
      organizerId: item.settlement.organizerId,
      organizerName: item.organizer.name,
      companyName: item.organizer.companyName,
      bankName: item.organizer.bankName,
      bankAccountNumber: item.organizer.bankAccountNumber,
      bankIfsc: item.organizer.bankIfsc,
      panNumber: item.organizer.panNumber,
      gstin: item.organizer.gstin,
      eventId: item.settlement.eventId,
      eventTitle: item.event.title,
      eventTitleMr: item.event.titleMr,
      totalGrossTicketSales: item.settlement.totalGrossTicketSales,
      totalPlatformFeesCollected: item.settlement.totalPlatformFeesCollected,
      totalPaymentGatewayCost: item.settlement.totalPaymentGatewayCost,
      totalTaxCollected: item.settlement.totalTaxCollected,
      platformCommissionEarned: item.settlement.platformCommissionEarned,
      totalRefundDeductions: item.settlement.totalRefundDeductions,
      netPayableToOrganizer: item.settlement.netPayableToOrganizer,
      status: item.settlement.status,
      payoutUtr: item.settlement.payoutUtr,
      settledAt: item.settlement.settledAt,
      createdAt: item.settlement.createdAt,
    }));

    return NextResponse.json({ settlements: formatted });
  } catch (error: any) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const { settlementId, status, payoutUtr, adminActor } = body;

    if (!settlementId || !status) {
      return NextResponse.json(
        { error: 'Settlement ID and status are required' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(settlements)
      .set({
        status,
        payoutUtr: payoutUtr || null,
        settledAt: status === 'settled' ? new Date() : null,
      })
      .where(eq(settlements.id, settlementId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: adminActor || 'super-admin',
      actorRole: 'finance',
      action: 'SETTLEMENT_STATUS_UPDATED',
      entityType: 'settlement',
      entityId: updated.settlementReference,
      details: JSON.stringify({
        status,
        payoutUtr,
        netPayable: updated.netPayableToOrganizer,
      }),
    });

    return NextResponse.json({ success: true, settlement: updated });
  } catch (error: any) {
    console.error('Error updating settlement:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
}
