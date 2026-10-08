/**
 * Public URL helpers — never emit broken/placeholder links in tickets/email/WhatsApp.
 * Official production site: https://mahaticket.kalpkrutinfotech.com/
 */

const PRODUCTION_APP_URL = 'https://mahaticket.kalpkrutinfotech.com';

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

export function getAppBaseUrl(): string {
  const raw = stripQuotes(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '',
  );

  if (raw) {
    return raw.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_APP_URL;
  }

  return 'http://localhost:3000';
}

export function getPublicUrl(path = ''): string {
  const base = getAppBaseUrl();
  const p = !path ? '' : path.startsWith('/') ? path : `/${path}`;
  if (!base) return p || '/';
  return `${base}${p}`;
}

export function getTicketShareUrl(ticketCode: string): string {
  return getPublicUrl(`/tickets/${encodeURIComponent(ticketCode)}`);
}

export function isLocalAppUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function buildWhatsAppShareUrl(message: string, phone?: string): string {
  const text = encodeURIComponent(message);
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function buildBookingWhatsAppMessage(params: {
  eventTitle: string;
  venueName: string;
  dateTime: string;
  seats: string;
  bookingId: string;
  ticketCode: string;
}): string {
  const ticketUrl = getTicketShareUrl(params.ticketCode);
  return [
    '🎟️ MahaTicket — Booking Confirmed',
    '',
    `Event: ${params.eventTitle}`,
    `Venue: ${params.venueName}`,
    `Date: ${params.dateTime}`,
    `Seats: ${params.seats}`,
    `Booking ID: ${params.bookingId}`,
    '',
    `View ticket: ${ticketUrl}`,
  ].join('\n');
}
