import { NextRequest, NextResponse } from 'next/server';
import { sendBookingTicketEmail } from '@/src/lib/email-service';
import { db } from '@/src/db/index';
import { tickets, orders } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getCustomerSession } from '@/src/lib/auth-service';
import { verifyOrderPdfToken } from '@/src/lib/order-access-crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;
    let requestedEmail: string | undefined;
    let pdfTokenFromBody: string | undefined;

    try {
      const body = await req.json();
      if (body && body.email) {
        requestedEmail = String(body.email).trim().toLowerCase();
      }
      if (body && body.pdfDownloadToken) {
        pdfTokenFromBody = String(body.pdfDownloadToken);
      }
    } catch {
      // Body is optional
    }

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
    const recipient = (requestedEmail || orderEmail).toLowerCase();

    const tokenRaw =
      pdfTokenFromBody ||
      req.headers.get('x-pdf-token') ||
      new URL(req.url).searchParams.get('t') ||
      undefined;
    const fromToken = verifyOrderPdfToken(tokenRaw);
    const tokenOk =
      Boolean(fromToken) &&
      fromToken!.orderId === ticketRecord.order.id &&
      fromToken!.userId === ticketRecord.order.userId;

    const ownsOrder = Boolean(session && session.id === ticketRecord.order.userId);

    // Session owner OR short-lived order-bound PDF token. Never email alone / open guest.
    if (!ownsOrder && !tokenOk) {
      return NextResponse.json(
        { error: 'Unauthorized: sign in as the booking owner or use a valid pass token' },
        { status: 403 }
      );
    }

    // Recipient locked to the order's verified booking email
    if (recipient !== orderEmail) {
      return NextResponse.json(
        { error: 'Unauthorized: ticket email can only be sent to the verified booking email' },
        { status: 403 }
      );
    }

    const result = await sendBookingTicketEmail({
      ticketCode,
      recipientEmail: orderEmail,
    });

    if (result.status === 'sent') {
      return NextResponse.json(result, { status: 200 });
    } else if (result.status === 'not_configured') {
      return NextResponse.json(result, { status: 503 });
    } else {
      return NextResponse.json(result, { status: 502 });
    }
  } catch (error: unknown) {
    console.error('Email route error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        sent: false,
        error: error instanceof Error ? error.message : 'Email delivery failed',
        message: 'ईमेल पाठवताना त्रुटी आली.',
      },
      { status: 500 }
    );
  }
}
