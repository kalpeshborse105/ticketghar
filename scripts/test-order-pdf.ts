import 'dotenv/config';
import { db } from '../src/db/index';
import { tickets, orders, events, venues, eventSessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generateTicketPdfBuffer } from '../src/lib/ticket-pdf';
import { getTicketShareUrl } from '../src/lib/public-url';
import { formatISTDate, formatISTTime } from '../src/lib/dateUtils';
import { generateSecureTicketQr } from '../src/lib/ticket-crypto';

async function main() {
  const orderNumber = 'MT-2026-92797';
  console.log('Testing PDF generation for order:', orderNumber);

  let [orderRecord] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!orderRecord) {
    console.error('Order not found!');
    return;
  }

  const orderTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orderId, orderRecord.id));

  console.log('Tickets found:', orderTickets.length);

  const [eventRecord] = await db
    .select({ event: events, venue: venues })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, orderRecord.eventId))
    .limit(1);

  console.log('Event found:', eventRecord?.event?.title, 'Venue:', eventRecord?.venue?.name);

  const [sessionRecord] = await db
    .select()
    .from(eventSessions)
    .where(eq(eventSessions.id, orderRecord.sessionId))
    .limit(1);

  console.log('Session found:', sessionRecord?.id, 'Start:', sessionRecord?.sessionStartTime);

  const startTime = sessionRecord?.sessionStartTime;
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

  console.log('Payloads prepared. Calling generateTicketPdfBuffer...');
  try {
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
    console.log('PDF generated successfully! Size:', pdfBuffer.length);
  } catch (err: any) {
    console.error('generateTicketPdfBuffer CRASHED with:', err);
  }
}

main().catch(console.error);
