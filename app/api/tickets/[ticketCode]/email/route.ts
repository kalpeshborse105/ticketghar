import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { getTicketShareUrl } from '@/src/lib/public-url';
import { generateTicketPdfBuffer } from '@/src/lib/ticket-pdf';

export async function POST(
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
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    const templatePath = path.join(process.cwd(), 'src/lib/templates/booking-confirmation.html');
    let htmlContent = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf8')
      : `<html><body><h1>MahaTicket</h1><p>{{EVENT_TITLE}}</p><p>{{TICKET_CODE}}</p><p><a href="{{TICKET_LINK}}">View Ticket</a></p></body></html>`;

    const ticketLink = getTicketShareUrl(ticketRecord.ticket.ticketCode);
    const showtime = ticketRecord.session.sessionStartTime
      ? new Date(ticketRecord.session.sessionStartTime).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';

    htmlContent = htmlContent
      .replace(/\{\{EVENT_TITLE\}\}/g, eventRecord?.event.title || 'Event')
      .replace(/\{\{EVENT_CATEGORY\}\}/g, eventRecord?.event.categoryMr || 'Event')
      .replace(/\{\{ORDER_NUMBER\}\}/g, ticketRecord.order.orderNumber)
      .replace(/\{\{VENUE_NAME\}\}/g, eventRecord?.venue?.name || 'Venue')
      .replace(/\{\{SHOW_DATE_TIME\}\}/g, showtime)
      .replace(/\{\{SEATS_LIST\}\}/g, ticketRecord.ticket.seatCode)
      .replace(/\{\{ATTENDEE_NAME\}\}/g, ticketRecord.ticket.attendeeName)
      .replace(/\{\{GRAND_TOTAL\}\}/g, (ticketRecord.order.grandTotal / 100).toFixed(0))
      .replace(/\{\{TICKET_CODE\}\}/g, ticketRecord.ticket.ticketCode)
      .replace(/\{\{QR_DATA_URL\}\}/g, '')
      .replace(/\{\{TICKET_LINK\}\}/g, ticketLink);

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'MahaTicket <onboarding@resend.dev>';
    const recipient = ticketRecord.order.userEmail;

    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        sent: false,
        configured: false,
        recipient,
        message: 'Email provider not configured. Set RESEND_API_KEY to send booking emails.',
      });
    }

    let pdfAttachment: { filename: string; content: string } | undefined;
    try {
      const pdf = await generateTicketPdfBuffer({
        ticketCode: ticketRecord.ticket.ticketCode,
        orderNumber: ticketRecord.order.orderNumber,
        eventTitle: eventRecord?.event.title || 'Event',
        venueName: eventRecord?.venue?.name || 'Venue',
        showtime,
        seatCode: ticketRecord.ticket.seatCode,
        attendeeName: ticketRecord.ticket.attendeeName,
        faceValuePaise: ticketRecord.ticket.faceValue,
        status: ticketRecord.ticket.status,
        qrPayload: ticketRecord.ticket.qrPayload || ticketRecord.ticket.ticketCode,
        securityHash: ticketRecord.ticket.securityHash,
      });
      pdfAttachment = {
        filename: `MahaTicket-${ticketRecord.order.orderNumber}.pdf`,
        content: pdf.toString('base64'),
      };
    } catch (pdfErr) {
      console.error('PDF attach failed:', pdfErr);
    }

    const payload: Record<string, unknown> = {
      from,
      to: [recipient],
      subject: `MahaTicket — Booking confirmed (${ticketRecord.order.orderNumber})`,
      html: htmlContent,
    };
    if (pdfAttachment) {
      payload.attachments = [pdfAttachment];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend error:', detail);
      return NextResponse.json(
        {
          success: false,
          sent: false,
          configured: true,
          message: 'Email provider rejected the send.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: true,
      configured: true,
      recipient,
      pdfAttached: Boolean(pdfAttachment),
      message: `Booking confirmation email sent to ${recipient}`,
    });
  } catch (error) {
    console.error('Email dispatch error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
