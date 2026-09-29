import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { partnerLeads, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const leads = await db
      .select()
      .from(partnerLeads)
      .orderBy(desc(partnerLeads.createdAt));

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching partner leads:', error);
    return NextResponse.json({ error: 'Failed to fetch partner leads' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { leadId, status, actorId } = body;

    if (!leadId || !status) {
      return NextResponse.json(
        { error: 'Lead ID and new status are required' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(partnerLeads)
      .set({ status })
      .where(eq(partnerLeads.id, leadId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'admin',
      actorRole: 'operations',
      action: 'LEAD_STATUS_CHANGED',
      entityType: 'partner_lead',
      entityId: String(leadId),
      details: JSON.stringify({ status }),
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error('Error updating partner lead:', error);
    return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 });
  }
}
