import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateTicketPdfBuffer } from '@/src/lib/ticket-pdf';
import { getTicketShareUrl } from '@/src/lib/public-url';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;
    const url = new URL(req.url);
    const forceDownload = url.searchParams.get('download') === '1';

    // 1. Find ticket and associated order
    const [ticketRecord] = await db
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
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Fetch all tickets for this booking so all seats are aggregated on the single pass
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

    const start = ticketRecord.session.sessionStartTime
      ? new Date(ticketRecord.session.sessionStartTime)
      : null;
    const showtime = start
      ? start.toLocaleString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    const seatsSummary =
      allOrderTickets.length > 1
        ? `${allOrderTickets.map((t) => t.seatCode).join(', ')} (${allOrderTickets.length} Tickets)`
        : ticketRecord.ticket.seatCode;

    const publicUrl = getTicketShareUrl(ticketRecord.ticket.ticketCode);

    const pdfBuffer = await generateTicketPdfBuffer({
      ticketCode: ticketRecord.ticket.ticketCode,
      orderNumber: ticketRecord.order.orderNumber,
      eventTitle: eventRecord?.event.titleMr || eventRecord?.event.title || 'Event',
      venueName: eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'Venue',
      showtime,
      seatCode: seatsSummary,
      attendeeName: ticketRecord.ticket.attendeeName || ticketRecord.order.userName,
      faceValuePaise: ticketRecord.order.grandTotal,
      status: ticketRecord.ticket.status,
      qrPayload: publicUrl,
      securityHash: ticketRecord.ticket.securityHash,
    });

    const filename = `MahaTicket-${ticketRecord.order.orderNumber}.pdf`;
    const dispositionType = forceDownload ? 'attachment' : 'inline';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Something went wrong while generating ticket PDF. Please try again.' },
      { status: 500 }
    );
  }
}
