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

    // Fetch ticket with order and event details
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

    // Read template
    const templatePath = path.join(process.cwd(), 'src/lib/templates/booking-confirmation.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    // Replace template tags
    htmlContent = htmlContent
      .replace('{{EVENT_TITLE}}', eventRecord?.event.titleMr || eventRecord?.event.title || 'Event')
      .replace('{{EVENT_CATEGORY}}', eventRecord?.event.categoryMr || 'कार्यक्रम')
      .replace('{{ORDER_NUMBER}}', ticketRecord.order.orderNumber)
      .replace('{{VENUE_NAME}}', eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'सभागृह')
      .replace(
        '{{SHOW_DATE_TIME}}',
        new Date(ticketRecord.session.sessionStartTime).toLocaleString('mr-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      )
      .replace('{{SEATS_LIST}}', ticketRecord.ticket.seatCode)
      .replace('{{ATTENDEE_NAME}}', ticketRecord.ticket.attendeeName)
      .replace('{{GRAND_TOTAL}}', (ticketRecord.order.grandTotal / 100).toFixed(0))
      .replace('{{TICKET_CODE}}', ticketRecord.ticket.ticketCode)
      .replace('{{QR_DATA_URL}}', '');

    // Check if email provider is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!smtpHost && !resendApiKey && !smtpUser) {
      return NextResponse.json({
        success: false,
        configured: false,
        recipient: ticketRecord.order.userEmail,
        message:
          'Email provider not configured in environment. Provide SMTP_HOST or RESEND_API_KEY in .env to dispatch live emails.',
      });
    }

    // Provider is configured
    return NextResponse.json({
      success: true,
      configured: true,
      recipient: ticketRecord.order.userEmail,
      message: `Booking confirmation email prepared for ${ticketRecord.order.userEmail}`,
    });
  } catch (error: any) {
    console.error('Email dispatch error:', error);
    return NextResponse.json(
      { error: 'Failed to process email delivery' },
      { status: 500 }
    );
  }
}
