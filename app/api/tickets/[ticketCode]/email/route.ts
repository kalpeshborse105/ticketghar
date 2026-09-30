import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

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
      : `<html><body><h1>MahaTicket</h1><p>{{EVENT_TITLE}}</p><p>{{TICKET_CODE}}</p></body></html>`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    htmlContent = htmlContent
      .replace(/\{\{EVENT_TITLE\}\}/g, eventRecord?.event.titleMr || eventRecord?.event.title || 'Event')
      .replace(/\{\{EVENT_CATEGORY\}\}/g, eventRecord?.event.categoryMr || 'कार्यक्रम')
      .replace(/\{\{ORDER_NUMBER\}\}/g, ticketRecord.order.orderNumber)
      .replace(/\{\{VENUE_NAME\}\}/g, eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'सभागृह')
      .replace(
        /\{\{SHOW_DATE_TIME\}\}/g,
        new Date(ticketRecord.session.sessionStartTime!).toLocaleString('mr-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      )
      .replace(/\{\{SEATS_LIST\}\}/g, ticketRecord.ticket.seatCode)
      .replace(/\{\{ATTENDEE_NAME\}\}/g, ticketRecord.ticket.attendeeName)
      .replace(/\{\{GRAND_TOTAL\}\}/g, (ticketRecord.order.grandTotal / 100).toFixed(0))
      .replace(/\{\{TICKET_CODE\}\}/g, ticketRecord.ticket.ticketCode)
      .replace(/\{\{QR_DATA_URL\}\}/g, '')
      .replace(/\{\{TICKET_LINK\}\}/g, appUrl ? `${appUrl}/?ticket=${ticketRecord.ticket.ticketCode}` : ticketRecord.ticket.ticketCode);

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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `MahaTicket — Booking confirmed (${ticketRecord.order.orderNumber})`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend error:', detail);
      return NextResponse.json(
        { success: false, sent: false, configured: true, message: 'Email provider rejected the send.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: true,
      configured: true,
      recipient,
      message: `Booking confirmation email sent to ${recipient}`,
    });
  } catch (error) {
    console.error('Email dispatch error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
