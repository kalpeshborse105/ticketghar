import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateTicketPdfBuffer } from '@/src/lib/ticket-pdf';
import { getTicketShareUrl } from '@/src/lib/public-url';
import { formatISTDate, formatISTTime } from '@/src/lib/dateUtils';
import { generateSecureTicketQr } from '@/src/lib/ticket-crypto';
import {
  authorizeOrderPdfAccess,
  PRIVATE_PDF_HEADERS,
} from '@/src/lib/order-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;
    const url = new URL(req.url);
    const forceDownload = url.searchParams.get('download') === '1';

    let [ticketRecord] = await db
      .select({
        ticket: tickets,
        order: orders,
        session: eventSessions,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .where(eq(tickets.ticketCode, ticketCode))
      .limit(1);

    if (!ticketRecord) {
      [ticketRecord] = await db
        .select({
          ticket: tickets,
          order: orders,
          session: eventSessions,
        })
        .from(tickets)
        .innerJoin(orders, eq(tickets.orderId, orders.id))
        .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
        .where(eq(orders.orderNumber, ticketCode))
        .limit(1);
    }

    if (!ticketRecord && /^\d+$/.test(ticketCode)) {
      [ticketRecord] = await db
        .select({
          ticket: tickets,
          order: orders,
          session: eventSessions,
        })
        .from(tickets)
        .innerJoin(orders, eq(tickets.orderId, orders.id))
        .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
        .where(eq(orders.id, parseInt(ticketCode, 10)))
        .limit(1);
    }

    if (!ticketRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const access = await authorizeOrderPdfAccess(req, ticketRecord.order);
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allOrderTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, ticketRecord.order.id));

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    const startTime = ticketRecord.session.sessionStartTime;
    if (!startTime) {
      console.error(
        '[PDF] Missing sessionStartTime for ticket',
        ticketRecord.ticket.ticketCode,
        'session',
        ticketRecord.session.id
      );
    }
    const showtime = startTime
      ? `${formatISTDate(startTime, 'en', false)} • ${formatISTTime(startTime, 'en', true)}`
      : 'Show time unavailable';

    const seatsSummary =
      allOrderTickets.length > 1
        ? `${allOrderTickets.map((t) => t.seatCode).join(', ')} (${allOrderTickets.length} Tickets)`
        : ticketRecord.ticket.seatCode;

    const publicUrl = getTicketShareUrl(ticketRecord.ticket.ticketCode);
    let securePayload = publicUrl;
    try {
      if (eventRecord?.event?.id) {
        securePayload = generateSecureTicketQr(
          ticketRecord.ticket.ticketCode,
          eventRecord.event.id
        );
      }
    } catch (qrErr) {
      console.warn('[PDF] Secure QR generation failed; using share URL:', qrErr);
      securePayload = publicUrl;
    }

    const pdfBuffer = await generateTicketPdfBuffer({
      ticketCode: ticketRecord.ticket.ticketCode,
      orderNumber: ticketRecord.order.orderNumber,
      eventTitle:
        eventRecord?.event?.titleMr ||
        eventRecord?.event?.title ||
        'Live Performance',
      venueName:
        eventRecord?.venue?.nameMr ||
        eventRecord?.venue?.name ||
        'Auditorium Venue',
      showtime,
      seatCode: seatsSummary || 'General / Reserved',
      attendeeName:
        ticketRecord.ticket.attendeeName ||
        ticketRecord.order.userName ||
        'Valued Customer',
      faceValuePaise: Number(ticketRecord.order.grandTotal) || 0,
      status: ticketRecord.ticket.status || 'valid',
      qrPayload: securePayload || publicUrl,
      securityHash: ticketRecord.ticket.securityHash || undefined,
    });

    const filename = `MahaTicket-${ticketRecord.order.orderNumber}.pdf`;
    const dispositionType = forceDownload ? 'attachment' : 'inline';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        ...PRIVATE_PDF_HEADERS,
      },
    });
  } catch (error: unknown) {
    console.error(
      'PDF generation error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Something went wrong while generating ticket PDF. Please try again.' },
      { status: 500 }
    );
  }
}
