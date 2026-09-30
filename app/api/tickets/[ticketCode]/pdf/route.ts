import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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

    let qrDataUrl =
      'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' +
      encodeURIComponent(ticketRecord.ticket.qrPayload || ticketRecord.ticket.ticketCode);

    try {
      const QRCode = (await import('qrcode')).default;
      qrDataUrl = await QRCode.toDataURL(
        ticketRecord.ticket.qrPayload || ticketRecord.ticket.ticketCode,
        {
          width: 240,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        }
      );
    } catch (qrErr) {
      console.error('Local QR generation failed, using fallback URL', qrErr);
    }

    const eventTitle = eventRecord?.event.titleMr || eventRecord?.event.title || 'Event';
    const venueName = eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'Venue';
    const start = ticketRecord.session.sessionStartTime
      ? new Date(ticketRecord.session.sessionStartTime)
      : null;
    const showtime = start
      ? start.toLocaleString('mr-IN', { dateStyle: 'full', timeStyle: 'short' })
      : '—';

    const html = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>MahaTicket Pass - ${ticketRecord.ticket.ticketCode}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Georgia, 'Noto Serif Devanagari', serif; background:#fafafa; color:#111827; margin:0; padding:24px; }
    .ticket { max-width:560px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,.06); }
    .header { background:#4f46e5; color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
    .header h1 { margin:0; font-size:20px; }
    .content { padding:20px; }
    .title { font-size:18px; font-weight:700; margin-bottom:12px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; }
    .label { color:#6b7280; font-size:11px; }
    .val { font-weight:600; margin-top:2px; }
    .qr { text-align:center; margin:20px 0; padding:12px; border:1px dashed #d1d5db; border-radius:8px; }
    .qr img { width:140px; height:140px; }
    .footer { background:#f5f5f5; padding:12px 20px; font-size:11px; color:#6b7280; text-align:center; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>MahaTicket · महाटिकिट</h1>
      <span style="font-size:12px;">${ticketRecord.ticket.ticketCode}</span>
    </div>
    <div class="content">
      <div class="title">${eventTitle}</div>
      <div class="grid">
        <div><div class="label">Venue</div><div class="val">${venueName}</div></div>
        <div><div class="label">Date & Time</div><div class="val">${showtime}</div></div>
        <div><div class="label">Seat</div><div class="val">${ticketRecord.ticket.seatCode}</div></div>
        <div><div class="label">Attendee</div><div class="val">${ticketRecord.ticket.attendeeName}</div></div>
        <div><div class="label">Booking ID</div><div class="val">${ticketRecord.order.orderNumber}</div></div>
        <div><div class="label">Amount</div><div class="val">₹${(ticketRecord.ticket.faceValue / 100).toFixed(0)}</div></div>
        <div><div class="label">Status</div><div class="val">${ticketRecord.ticket.status}</div></div>
        <div><div class="label">Ticket ID</div><div class="val">${ticketRecord.ticket.ticketCode}</div></div>
      </div>
      <div class="qr">
        <img src="${qrDataUrl}" alt="Ticket QR" />
        <div style="margin-top:8px;font-size:12px;">Show this QR at the venue gate</div>
      </div>
    </div>
    <div class="footer">MahaTicket printable pass · Use browser Print → Save as PDF</div>
  </div>
  <script>window.addEventListener('load',()=>{ try{ window.print(); }catch(e){} });</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="MahaTicket_${ticketRecord.ticket.ticketCode}.html"`,
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
