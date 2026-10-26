/**
 * Normalize raw camera / paste QR payloads into a ticket code, order number,
 * or secure MTSEC/MTGRP token the verify API can resolve.
 */
export function normalizeScannerPayload(raw: string): {
  normalized: string;
  kind: 'mtgrp' | 'mtsec' | 'ticket_url' | 'order' | 'ticket' | 'json' | 'raw';
} {
  let s = String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!s) {
    return { normalized: '', kind: 'raw' };
  }

  // Prefer first useful line if camera returns multi-line noise
  if (s.includes('\n')) {
    const lines = s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const preferred =
      lines.find((l) => /MTGRP:v1:|MTSEC:v1:|\/tickets\/|MT-TK-|MT-\d{4}-/i.test(l)) ||
      lines[0];
    s = preferred;
  }

  if (s.startsWith('MTGRP:v1:')) {
    return { normalized: s, kind: 'mtgrp' };
  }
  if (s.startsWith('MTSEC:v1:')) {
    return { normalized: s, kind: 'mtsec' };
  }

  // URL share link: …/tickets/CODE
  const ticketUrl = s.match(/\/tickets\/([^?\s#"'<>]+)/i);
  if (ticketUrl?.[1]) {
    try {
      return { normalized: decodeURIComponent(ticketUrl[1]), kind: 'ticket_url' };
    } catch {
      return { normalized: ticketUrl[1], kind: 'ticket_url' };
    }
  }

  // JSON blob from some printers / apps
  if (s.startsWith('{') && s.endsWith('}')) {
    try {
      const parsed = JSON.parse(s);
      const code = String(
        parsed.ticketCode ||
          parsed.code ||
          parsed.ord ||
          parsed.orderNumber ||
          parsed.bookingId ||
          ''
      ).trim();
      if (code) {
        return {
          normalized: code,
          kind: /^MT-\d{4}-/i.test(code) ? 'order' : 'json',
        };
      }
    } catch {
      /* keep raw */
    }
  }

  const orderMatch = s.match(/\b(MT-\d{4}-\d+)\b/i);
  if (orderMatch?.[1]) {
    return { normalized: orderMatch[1].toUpperCase(), kind: 'order' };
  }

  const ticketMatch = s.match(/\b(MT-TK-[A-Za-z0-9-]+)\b/i);
  if (ticketMatch?.[1]) {
    return { normalized: ticketMatch[1], kind: 'ticket' };
  }

  // Strip accidental wrappers
  s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
  return { normalized: s, kind: 'raw' };
}
