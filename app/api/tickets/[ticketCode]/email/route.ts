import { NextRequest, NextResponse } from 'next/server';
import { sendBookingTicketEmail } from '@/src/lib/email-service';
import { db } from '@/src/db/index';
import { tickets, orders } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getCustomerSession } from '@/src/lib/auth-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;
    let requestedEmail: string | undefined;

    try {
      const body = await req.json();
      if (body && body.email) {
        requestedEmail = String(body.email).trim().toLowerCase();
      }
    } catch {
      // Body is optional
    }

    // 1. Authorize: Check ticket and verify recipient authorization
    const [ticketRecord] = await db
      .select({
        ticket: tickets,
        order: orders,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .where(eq(tickets.ticketCode, ticketCode))
      .limit(1);

    if (!ticketRecord) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const authHeader = req.headers.get('authorization');
    const session = await getCustomerSession(authHeader);

    const orderEmail = ticketRecord.order.userEmail.toLowerCase();
    const authorized =
      !requestedEmail ||
      requestedEmail === orderEmail ||
      (session && (session.email.toLowerCase() === orderEmail || session.id === ticketRecord.order.userId));

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Ticket can only be dispatched to the verified booking owner' },
        { status: 403 }
      );
    }

    const result = await sendBookingTicketEmail({
      ticketCode,
      recipientEmail: requestedEmail || orderEmail,
    });

    if (result.status === 'sent') {
      return NextResponse.json(result, { status: 200 });
    } else if (result.status === 'not_configured') {
      return NextResponse.json(result, { status: 503 });
    } else {
      return NextResponse.json(result, { status: 502 });
    }
  } catch (error: any) {
    console.error('Email route error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        sent: false,
        error: error?.message || 'Email delivery failed',
        message: 'ईमेल पाठवताना त्रुटी आली.',
      },
      { status: 500 }
    );
  }
}
