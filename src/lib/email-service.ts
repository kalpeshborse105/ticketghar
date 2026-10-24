import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getTicketShareUrl } from './public-url';
import { generateTicketPdfBuffer } from './ticket-pdf';
import QRCode from 'qrcode';

interface SendTicketEmailParams {
  ticketCode: string;
  recipientEmail?: string;
}

export type EmailDeliveryStatus = 'sent' | 'pending' | 'not_configured' | 'failed';

export interface EmailDispatchResult {
  success: boolean;
  status: EmailDeliveryStatus;
  sent: boolean;
  /** True when a PDF buffer was attached to the outgoing message. */
  attached?: boolean;
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
        status: 'failed',
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
        status: 'failed',
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
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
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

    let qrDataUrl = '';
    let qrPngBuffer: Buffer | null = null;
    try {
      qrPngBuffer = await QRCode.toBuffer(ticketLink, {
        type: 'png',
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      qrDataUrl = `data:image/png;base64,${qrPngBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('[email-service] Failed to generate QR buffer:', e);
    }
    const qrImageTag = `<img src="cid:ticket-qr-code" alt="Gate Entry QR" width="160" height="160" />`;

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
      .replace(/\{\{QR_DATA_URL\}\}/g, qrDataUrl)
      .replace(/\{\{QR_IMAGE_TAG\}\}/g, qrImageTag)
      .replace(/\{\{TICKET_LINK\}\}/g, ticketLink);

    // 3. Generate PDF pass attachment (retry once — do not silently drop attachment)
    let pdfBuffer: Buffer | null = null;
    const pdfPayload = {
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
    };
    for (let attempt = 1; attempt <= 2 && !pdfBuffer; attempt++) {
      try {
        pdfBuffer = await generateTicketPdfBuffer(pdfPayload);
      } catch (pdfErr) {
        console.warn(`PDF pass generation attempt ${attempt} failed:`, pdfErr);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    const emailSubject = `MahaTicket 🎟️ — Booking Confirmed (${ticketRecord.order.orderNumber}): ${eventRecord?.event.titleMr || eventRecord?.event.title || 'Event'}`;

    // 4. Try SMTP first if configured
    const cleanEnv = (val?: string | null) => (val ? val.trim().replace(/^["']|["']$/g, '').trim() : '');
    const smtpHost = cleanEnv(process.env.SMTP_HOST);
    const rawPort = cleanEnv(process.env.SMTP_PORT);
    const smtpPort = rawPort && !isNaN(parseInt(rawPort, 10)) ? parseInt(rawPort, 10) : 587;
    const smtpUser = cleanEnv(process.env.SMTP_USER);
    const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const smtpPass = cleanEnv(rawPass).replace(/\s+/g, '');
    const rawSecure = cleanEnv(process.env.SMTP_SECURE).toLowerCase();
    const isSecure = rawSecure === 'true' || rawSecure === '1' || (rawSecure !== 'false' && rawSecure !== '0' && smtpPort === 465);
    const isGmail = smtpHost.toLowerCase().includes('gmail.com');
    const fromAddress =
      cleanEnv(process.env.SMTP_FROM) ||
      (isGmail
        ? `MahaTicket <${smtpUser}>`
        : cleanEnv(process.env.EMAIL_FROM) || 'MahaTicket <tickets@mahaticket.kalpkrutinfotech.com>');

    if (smtpHost && smtpUser && smtpPass) {
      const createTransporter = (useDirectGmailService = false) => {
        if (isGmail && useDirectGmailService) {
          return nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
        }
        return nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: isSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
      };

      const attachments: any[] = [];
      if (qrPngBuffer && qrPngBuffer.length > 0) {
        attachments.push({
          filename: 'qrcode.png',
          content: qrPngBuffer,
          contentType: 'image/png',
          cid: 'ticket-qr-code',
        });
      }
      if (pdfBuffer && pdfBuffer.length > 0) {
        attachments.push({
          filename: `MahaTicket-${ticketRecord.order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
          contentDisposition: 'attachment',
        });
      } else {
        console.error(
          `[Email] PDF buffer missing for ${ticketRecord.order.orderNumber} — email will go without attachment`
        );
      }

      let transporter = createTransporter(false);
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: recipient,
          subject: emailSubject,
          html: htmlContent,
          attachments,
        });

        console.log(
          `[Email] Sent booking confirmation via SMTP to ${recipient}` +
            (pdfBuffer ? ' with PDF ticket attached' : ' (HTML only — PDF attach failed)')
        );
        return {
          success: true,
          status: 'sent',
          sent: true,
          attached: Boolean(pdfBuffer),
          configured: true,
          provider: 'smtp',
          recipient,
          message: pdfBuffer
            ? `Booking email with PDF ticket sent to ${recipient} via SMTP`
            : `Booking email sent to ${recipient} (PDF attachment could not be generated)`,
        };
      } catch (smtpErr: any) {
        // If host/port failed and is Gmail, try service: 'gmail'
        if (isGmail) {
          try {
            console.log('[Email] Retrying via service: gmail transport...');
            const fallbackTransporter = createTransporter(true);
            await fallbackTransporter.sendMail({
              from: fromAddress,
              to: recipient,
              subject: emailSubject,
              html: htmlContent,
              attachments,
            });
            console.log(`[Email] Sent confirmation via Gmail service fallback to ${recipient}`);
            return {
              success: true,
              status: 'sent',
              sent: true,
              attached: Boolean(pdfBuffer),
              configured: true,
              provider: 'smtp',
              recipient,
              message: `Booking email with PDF ticket sent to ${recipient} via SMTP`,
            };
          } catch (retryErr: any) {
            smtpErr = retryErr;
          }
        }

        const isAuthErr = smtpErr?.code === 'EAUTH' || smtpErr?.responseCode === 535;
        if (isAuthErr) {
          console.warn(
            `[Email] Gmail SMTP Authentication Note (535 BadCredentials): Gmail requires a 16-character Google App Password (not main account password) generated at https://myaccount.google.com/apppasswords with 2-Step Verification enabled.`
          );
        } else {
          console.warn(`[Email] SMTP delivery warning (${smtpErr?.message || 'error'}):`, recipient);
        }
        return {
          success: false,
          status: 'failed',
          sent: false,
          configured: true,
          provider: 'smtp',
          recipient,
          error: isAuthErr
            ? 'Gmail App Password invalid or revoked. Generate new 16-character App Password at myaccount.google.com/apppasswords'
            : smtpErr?.message || 'SMTP delivery failed',
          message: `ईमेल पाठवणे अयशस्वी झाले (${recipient})`,
        };
      }
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

      const resendAttachments: Array<Record<string, string>> = [];
      if (pdfBuffer && pdfBuffer.length > 0) {
        resendAttachments.push({
          filename: `MahaTicket-${ticketRecord.order.orderNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        });
      }
      if (qrPngBuffer && qrPngBuffer.length > 0) {
        resendAttachments.push({
          filename: 'qrcode.png',
          content: qrPngBuffer.toString('base64'),
          contentType: 'image/png',
          content_id: 'ticket-qr-code',
        });
      }
      if (resendAttachments.length > 0) {
        payload.attachments = resendAttachments;
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
        console.warn('[Email] Resend API error:', errorText);
        return {
          success: false,
          status: 'failed',
          sent: false,
          configured: true,
          provider: 'resend',
          recipient,
          error: errorText,
          message: `ईमेल पाठवणे अयशस्वी झाले (${recipient})`,
        };
      }

      console.log(
        `[Email] Sent booking confirmation via Resend to ${recipient}` +
          (pdfBuffer ? ' with PDF' : ' (no PDF attach)')
      );
      return {
        success: true,
        status: 'sent',
        attached: Boolean(pdfBuffer),
        sent: true,
        configured: true,
        provider: 'resend',
        recipient,
        message: `Booking email sent to ${recipient} via Resend`,
      };
    }

    // Neither SMTP nor Resend is configured
    console.log(
      `[Email] Email service not configured for ${recipient}.`
    );
    return {
      success: false,
      status: 'not_configured',
      sent: false,
      configured: false,
      recipient,
      message: 'Email service is not configured (SMTP or Resend credentials missing).',
    };
  } catch (error: any) {
    console.warn('[Email] Exception handled gracefully during email dispatch:', error?.message || error);
    return {
      success: false,
      status: 'failed',
      sent: false,
      configured: false,
      error: error?.message || 'Email dispatch exception',
      message: 'ईमेल पाठवताना त्रुटी आली.',
    };
  }
}
