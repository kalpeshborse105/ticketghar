import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getTicketShareUrl } from './public-url';
import { generateTicketPdfBuffer } from './ticket-pdf';

interface SendTicketEmailParams {
  ticketCode: string;
  recipientEmail?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  sent: boolean;
  configured: boolean;
  provider?: 'smtp' | 'resend';
  recipient?: string;
  message?: string;
  error?: string;
}

/**
 * Send booking confirmation email with M-Ticket pass & PDF attachment.
 * Supports SMTP (via nodemailer) and Resend API.
 */
export async function sendBookingTicketEmail(
  params: SendTicketEmailParams
): Promise<EmailDispatchResult> {
  const { ticketCode, recipientEmail } = params;

  try {
    // 1. Fetch ticket, order, session, and event info
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
      return {
        success: false,
        sent: false,
        configured: true,
        error: 'Ticket not found',
      };
    }

    // Fetch all tickets for this order so all seats are listed
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

    const recipient = recipientEmail || ticketRecord.order.userEmail;
    if (!recipient) {
      return {
        success: false,
        sent: false,
        configured: true,
        error: 'No recipient email specified for order',
      };
    }

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

    const seatsList = allOrderTickets.map((t) => t.seatCode).join(', ');
    const ticketLink = getTicketShareUrl(ticketRecord.ticket.ticketCode);

    // 2. Load and fill HTML email template
    const templatePath = path.join(process.cwd(), 'src/lib/templates/booking-confirmation.html');
    let htmlContent = '';
    if (fs.existsSync(templatePath)) {
      htmlContent = fs.readFileSync(templatePath, 'utf8');
    } else {
      htmlContent = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0a0e17; color: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #ea580c; border-radius: 12px; padding: 24px;">
    <h1 style="color: #ea580c;">MahaTicket — Booking Confirmed!</h1>
    <p><strong>Event:</strong> {{EVENT_TITLE}}</p>
    <p><strong>Venue:</strong> {{VENUE_NAME}}</p>
    <p><strong>Showtime:</strong> {{SHOW_DATE_TIME}}</p>
    <p><strong>Seats:</strong> {{SEATS_LIST}}</p>
    <p><strong>Booking ID:</strong> {{ORDER_NUMBER}}</p>
    <p><a href="{{TICKET_LINK}}" style="background: #ea580c; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Official Ticket Pass</a></p>
  </div>
</body>
</html>`;
    }

    htmlContent = htmlContent
      .replace(/\{\{EVENT_TITLE\}\}/g, eventRecord?.event.titleMr || eventRecord?.event.title || 'Event')
      .replace(/\{\{EVENT_CATEGORY\}\}/g, eventRecord?.event.categoryMr || eventRecord?.event.category || 'Event')
      .replace(/\{\{ORDER_NUMBER\}\}/g, ticketRecord.order.orderNumber)
      .replace(/\{\{VENUE_NAME\}\}/g, eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'Venue')
      .replace(/\{\{SHOW_DATE_TIME\}\}/g, showtime)
      .replace(/\{\{SEATS_LIST\}\}/g, `${seatsList} (${allOrderTickets.length} Tickets)`)
      .replace(/\{\{ATTENDEE_NAME\}\}/g, ticketRecord.ticket.attendeeName || ticketRecord.order.userName)
      .replace(/\{\{GRAND_TOTAL\}\}/g, (ticketRecord.order.grandTotal / 100).toFixed(0))
      .replace(/\{\{TICKET_CODE\}\}/g, ticketRecord.ticket.ticketCode)
      .replace(/\{\{QR_DATA_URL\}\}/g, '')
      .replace(/\{\{TICKET_LINK\}\}/g, ticketLink);

    // 3. Generate PDF pass attachment
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateTicketPdfBuffer({
        ticketCode: ticketRecord.ticket.ticketCode,
        orderNumber: ticketRecord.order.orderNumber,
        eventTitle: eventRecord?.event.titleMr || eventRecord?.event.title || 'Event',
        venueName: eventRecord?.venue?.nameMr || eventRecord?.venue?.name || 'Venue',
        showtime,
        seatCode: `${seatsList} (${allOrderTickets.length} Tickets)`,
        attendeeName: ticketRecord.ticket.attendeeName || ticketRecord.order.userName,
        faceValuePaise: ticketRecord.order.grandTotal,
        status: ticketRecord.ticket.status,
        qrPayload: ticketLink,
        securityHash: ticketRecord.ticket.securityHash,
      });
    } catch (pdfErr) {
      console.warn('PDF pass generation for email attachment skipped:', pdfErr);
    }

    const emailSubject = `MahaTicket 🎟️ — Booking Confirmed (${ticketRecord.order.orderNumber}): ${eventRecord?.event.titleMr || eventRecord?.event.title || 'Event'}`;

    // 4. Try SMTP first if configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const smtpPass = rawPass.trim().replace(/\s+/g, '');
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'MahaTicket <tickets@mahaticket.kalpkrutinfotech.com>';

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass,
        },
      });

      const attachments: any[] = [];
      if (pdfBuffer) {
        attachments.push({
          filename: `MahaTicket-${ticketRecord.order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      }

      await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject: emailSubject,
        html: htmlContent,
        attachments,
      });

      console.log(`[Email] Sent booking confirmation via SMTP to ${recipient}`);
      return {
        success: true,
        sent: true,
        configured: true,
        provider: 'smtp',
        recipient,
        message: `Booking email sent to ${recipient} via SMTP`,
      };
    }

    // 5. Try Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const payload: Record<string, unknown> = {
        from: fromAddress,
        to: [recipient],
        subject: emailSubject,
        html: htmlContent,
      };

      if (pdfBuffer) {
        payload.attachments = [
          {
            filename: `MahaTicket-${ticketRecord.order.orderNumber}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ];
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
        const errorText = await res.text();
        console.error('[Email] Resend API error:', errorText);
        return {
          success: false,
          sent: false,
          configured: true,
          provider: 'resend',
          recipient,
          message: 'Resend API rejected email dispatch',
          error: errorText,
        };
      }

      console.log(`[Email] Sent booking confirmation via Resend to ${recipient}`);
      return {
        success: true,
        sent: true,
        configured: true,
        provider: 'resend',
        recipient,
        message: `Booking email sent to ${recipient} via Resend`,
      };
    }

    // Neither SMTP nor Resend is configured
    console.log(
      `[Email] No SMTP or Resend credentials configured. Email dispatch queued for ${recipient}. Set SMTP_HOST/SMTP_USER/SMTP_PASS in environment.`
    );
    return {
      success: false,
      sent: false,
      configured: false,
      recipient,
      message: 'SMTP credentials not configured. Please add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to .env.',
    };
  } catch (error: any) {
    console.error('[Email] Exception during email dispatch:', error);
    return {
      success: false,
      sent: false,
      configured: true,
      error: error.message || 'Unknown email error',
      message: 'Failed to dispatch confirmation email',
    };
  }
}
