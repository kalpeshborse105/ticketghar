const PUBLIC_TICKET_BASE_URL = 'https://mahaticket.kalpkrutinfotech.com/tickets';

export function extractTicketCode(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  // Preserve signed group / seat tokens — verify API decrypts them
  if (/^MTGRP:v1:/i.test(trimmed) || /^MTSEC:v1:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const nested =
        parsed?.ticketCode ||
        parsed?.ticket_code ||
        parsed?.code ||
        parsed?.id ||
        parsed?.url;
      if (typeof nested === 'string' && nested.trim()) {
        return extractTicketCode(nested);
      }
    } catch {
      /* ignore */
    }
  }

  if (trimmed.includes('|') || /^MTSEC:/i.test(trimmed)) {
    const cleaned = trimmed.replace(/^MTSEC:/i, '');
    const firstPart = cleaned.split('|')[0]?.trim();
    if (firstPart) {
      const keyValMatch = firstPart.match(/(?:CODE|TICKET)[:=]([A-Za-z0-9_-]+)/i);
      if (keyValMatch?.[1]) return keyValMatch[1];
      if (/^[A-Za-z0-9_-]{4,}$/.test(firstPart)) return firstPart;
    }
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mahaticket://')) {
    try {
      const url = new URL(trimmed.replace(/^mahaticket:\/\//i, 'https://mahaticket.local/'));
      const queryCode =
        url.searchParams.get('ticketCode') ||
        url.searchParams.get('code') ||
        url.searchParams.get('ticket');
      if (queryCode) return queryCode.trim();

      const ticketsIndex = url.pathname.indexOf('/tickets/');
      if (ticketsIndex >= 0) {
        const code = url.pathname
          .slice(ticketsIndex + '/tickets/'.length)
          .split('/')[0];
        return decodeURIComponent(code).trim() || null;
      }
    } catch {
      const match = trimmed.match(/\/tickets\/([A-Za-z0-9_-]+)/i);
      if (match?.[1]) return match[1];
    }
  }

  return /^[A-Za-z0-9_-]{4,}$/.test(trimmed) ? trimmed : null;
}

export function resolveTicketUrl(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.pathname.includes('/tickets/') || url.pathname.includes('/my-tickets')) {
        return trimmed;
      }
    } catch {
      /* ignore */
    }
  }

  if (trimmed.startsWith('mahaticket://')) {
    return trimmed;
  }

  const ticketCode = extractTicketCode(trimmed);
  if (!ticketCode) return null;
  return `${PUBLIC_TICKET_BASE_URL}/${encodeURIComponent(ticketCode)}`;
}
