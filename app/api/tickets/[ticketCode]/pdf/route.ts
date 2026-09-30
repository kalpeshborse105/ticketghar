import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateTicketPdfBuffer } from '@/src/lib/ticket-pdf';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;

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
      ? start.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
      : '—';

    const pdfBuffer = await generateTicketPdfBuffer({
      ticketCode: ticketRecord.ticket.ticketCode,
      orderNumber: ticketRecord.order.orderNumber,
      eventTitle: eventRecord?.event.title || eventRecord?.event.titleMr || 'Event',
      venueName: eventRecord?.venue?.name || eventRecord?.venue?.nameMr || 'Venue',
      showtime,
      seatCode: ticketRecord.ticket.seatCode,
      attendeeName: ticketRecord.ticket.attendeeName,
      faceValuePaise: ticketRecord.ticket.faceValue,
      status: ticketRecord.ticket.status,
      qrPayload: ticketRecord.ticket.qrPayload || ticketRecord.ticket.ticketCode,
      securityHash: ticketRecord.ticket.securityHash,
    });

    const filename = `MahaTicket-${ticketRecord.ticket.ticketCode}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
