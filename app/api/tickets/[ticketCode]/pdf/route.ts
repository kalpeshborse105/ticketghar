import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';

export async function GET(
  req: NextRequest,
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
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    // Generate high-resolution QR code
    const qrDataUrl = await QRCode.toDataURL(ticketRecord.ticket.qrPayload, {
      width: 240,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const eventTitle = eventRecord?.event.titleMr || eventRecord?.event.title || 'Event';
    const venueName = eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'Venue';
    const showtime = new Date(ticketRecord.session.sessionStartTime).toLocaleString('mr-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>MahaTicket Pass - ${ticketRecord.ticket.ticketCode}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #111827;
      margin: 0;
      padding: 20px;
    }
    .ticket-card {
      max-width: 600px;
      margin: 0 auto;
      border: 2px solid #243044;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: #ea580c;
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .content { padding: 20px; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; font-size: 13px; }
    .info-label { color: #64748b; font-size: 11px; }
    .info-val { font-weight: 600; }
    .qr-box { text-align: center; margin: 20px 0; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; }
    .qr-box img { width: 140px; height: 140px; }
    .footer { background: #f8fafc; padding: 12px 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body onload="window.print()">
  <div class="ticket-card">
    <div class="header">
      <h1>MahaTicket (महाटिकिट)</h1>
      <span style="font-size: 12px; font-weight: 600;">PASS #${ticketRecord.ticket.ticketCode}</span>
    </div>
    <div class="content">
      <div class="title">${eventTitle}</div>
      <div class="info-grid">
        <div>
          <div class="info-label">सभागृह (Venue)</div>
          <div class="info-val">${venueName}</div>
        </div>
        <div>
          <div class="info-label">दिनांक व वेळ (Showtime)</div>
          <div class="info-val">${showtime}</div>
        </div>
        <div>
          <div class="info-label">आसन (Seat)</div>
          <div class="info-val" style="color: #ea580c; font-size: 16px;">${ticketRecord.ticket.seatCode}</div>
        </div>
        <div>
          <div class="info-label">प्रेक्षक (Attendee)</div>
          <div class="info-val">${ticketRecord.ticket.attendeeName}</div>
        </div>
        <div>
          <div class="info-label">ऑर्डर क्र. (Order ID)</div>
          <div class="info-val" style="font-family: monospace;">${ticketRecord.order.orderNumber}</div>
        </div>
        <div>
          <div class="info-label">रक्कम (Amount)</div>
          <div class="info-val">₹${(ticketRecord.ticket.faceValue / 100).toFixed(0)}</div>
        </div>
      </div>
      <div class="qr-box">
        <img src="${qrDataUrl}" alt="Gate Pass QR" />
        <div style="font-size: 12px; color: #334155; margin-top: 6px;">सभागृहाच्या प्रवेशद्वारावर हा अधिकृत QR कोड दाखवा</div>
        <div style="font-family: monospace; font-size: 10px; color: #94a3b8; margin-top: 2px;">SEC-HASH: ${ticketRecord.ticket.securityHash.slice(0, 24)}...</div>
      </div>
    </div>
    <div class="footer">
      MahaTicket Official Admission Pass • Present at Venue Gate
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="MahaTicket_${ticketRecord.ticket.ticketCode}.html"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ticket PDF pass' },
      { status: 500 }
    );
  }
}
