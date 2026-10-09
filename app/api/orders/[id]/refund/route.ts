import { NextRequest, NextResponse } from 'next/server';
import { checkRefundEligibility, processOrderRefund } from '@/src/lib/refund-engine.ts';
import { db } from '@/src/db/index.ts';
import { orders } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const eligibility = await checkRefundEligibility(orderId);
    return NextResponse.json({ eligibility });
  } catch (error: any) {
    console.error('Refund eligibility check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check refund eligibility' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason, userEmail } = body;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If userEmail is provided, ensure it matches order
    if (userEmail && order.userEmail.toLowerCase() !== userEmail.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized: Email does not match booking records.' },
        { status: 403 }
      );
    }

    const result = await processOrderRefund({
      orderId,
      reason: reason || 'Customer requested ticket cancellation via MahaTicket portal',
      actorId: userEmail || order.userEmail,
      actorRole: 'customer',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 400 }
    );
  }
}
