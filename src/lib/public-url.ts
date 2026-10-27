/**
 * Public URL helpers — never emit broken/placeholder links in tickets/email/WhatsApp.
 * Official production site: https://mahaticket.kalpkrutinfotech.com/
 */

/** Official production site — never use bare mahaticket.com */
const PRODUCTION_APP_URL = 'https://mahaticket.kalpkrutinfotech.com';

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

/** Rewrite mistaken bare mahaticket.com (or www) to the real Kalpkrut domain. */
function normalizeAppBaseUrl(url: string): string {
  const cleaned = url.replace(/\/$/, '');
  try {
    const u = new URL(cleaned);
    const host = u.hostname.toLowerCase();
    if (host === 'mahaticket.com' || host === 'www.mahaticket.com') {
      return PRODUCTION_APP_URL;
    }
  } catch {
    /* keep as-is */
  }
  return cleaned;
}

export function getAppBaseUrl(): string {
  const raw = stripQuotes(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '',
  );

  if (raw) {
    return normalizeAppBaseUrl(raw);
  }

  if (process.env.VERCEL_URL) {
    return normalizeAppBaseUrl(`https://${process.env.VERCEL_URL}`);
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

/**
 * QR / PDF / WhatsApp must never embed localhost — gate scanners need a reachable URL.
 * Prefer production host when APP_URL is missing or points at loopback.
 */
export function getTicketQrShareUrl(ticketCode: string): string {
  const url = getTicketShareUrl(ticketCode);
  if (isLocalAppUrl(url)) {
    return `${PRODUCTION_APP_URL}/tickets/${encodeURIComponent(ticketCode)}`;
  }
  return url;
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
