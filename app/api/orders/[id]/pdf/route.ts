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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderNumber = id;
    const url = new URL(req.url);
    const forceDownload = url.searchParams.get('download') === '1';

    let [orderRecord] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!orderRecord && /^\d+$/.test(orderNumber)) {
      const [byId] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, parseInt(orderNumber, 10)))
        .limit(1);
      orderRecord = byId;
    }

    if (!orderRecord) {
      const [byTicket] = await db
        .select({ order: orders })
        .from(tickets)
        .innerJoin(orders, eq(tickets.orderId, orders.id))
        .where(eq(tickets.ticketCode, orderNumber))
        .limit(1);
      if (byTicket?.order) {
        orderRecord = byTicket.order;
      }
    }

    // Generic 404 for missing OR unauthorized (no existence leak)
    if (!orderRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const access = await authorizeOrderPdfAccess(req, orderRecord);
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const orderTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, orderRecord.id));

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, orderRecord.eventId))
      .limit(1);

    const [sessionRecord] = await db
      .select()
      .from(eventSessions)
      .where(eq(eventSessions.id, orderRecord.sessionId))
      .limit(1);

    const startTime = sessionRecord?.sessionStartTime;
    if (!startTime) {
      console.error(
        '[PDF] Missing sessionStartTime for order',
        orderRecord.orderNumber,
        'session',
        orderRecord.sessionId
      );
    }
    const showtime = startTime
      ? `${formatISTDate(startTime, 'en', false)} • ${formatISTTime(startTime, 'en', true)}`
      : 'Show time unavailable';

    const seatsSummary =
      orderTickets.length > 0
        ? orderTickets.map((t) => t.seatCode).join(', ')
        : 'General Admission';

    const primaryTicketCode = orderTickets[0]?.ticketCode || orderRecord.orderNumber;
    const publicUrl = getTicketShareUrl(primaryTicketCode);
    const securePayload = eventRecord?.event?.id
      ? generateSecureTicketQr(primaryTicketCode, eventRecord.event.id)
      : publicUrl;

    const pdfBuffer = await generateTicketPdfBuffer({
      ticketCode: primaryTicketCode,
      orderNumber: orderRecord.orderNumber,
      eventTitle:
        eventRecord?.event.titleMr ||
        eventRecord?.event.title ||
        'Live Performance',
      venueName:
        eventRecord?.venue?.nameMr ||
        eventRecord?.venue?.name ||
        'Auditorium Venue',
      showtime,
      seatCode: `${seatsSummary} (${orderTickets.length || 1} Pass)`,
      attendeeName: orderRecord.userName,
      faceValuePaise: orderRecord.grandTotal,
      status: orderRecord.orderStatus || 'confirmed',
      qrPayload: securePayload,
      securityHash: orderTickets[0]?.securityHash,
    });

    const filename = `MahaTicket-${orderRecord.orderNumber}.pdf`;
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('PDF generation error:', message);
    return NextResponse.json(
      { error: 'Something went wrong while generating ticket PDF. Please try again.' },
      { status: 500 }
    );
  }
}
