/**
 * Public URL helpers — never emit localhost in production ticket/email/WhatsApp links.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
  return raw.replace(/\/$/, '');
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
