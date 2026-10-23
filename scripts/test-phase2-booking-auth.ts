/**
 * Phase 2–7 focused unit tests (no production DB, no real payments).
 * Run: npx tsx scripts/test-phase2-booking-auth.ts
 */
import assert from 'node:assert/strict';
import {
  customerOwnsOrder,
  mintOrderPdfToken,
  verifyOrderPdfToken,
} from '../src/lib/order-access-crypto';
import { generateTicketPdfBuffer } from '../src/lib/ticket-pdf';
import { formatISTDate, formatISTTime, getISTDateParts } from '../src/lib/dateUtils';

async function main() {
  // --- Ownership / PDF token ---
  const owner = { id: 42, email: 'owner@example.com' };
  const other = { id: 99, email: 'other@example.com' };
  const order = { userId: 42, userEmail: 'owner@example.com' };

  assert.equal(customerOwnsOrder(owner, order), true);
  assert.equal(customerOwnsOrder(other, order), false);
  assert.equal(
    customerOwnsOrder({ id: 99, email: 'owner@example.com' }, order),
    false,
    'email alone must not authorize'
  );

  const token = mintOrderPdfToken(5001, 42);
  const ok = verifyOrderPdfToken(token);
  assert.ok(ok);
  assert.equal(ok!.orderId, 5001);
  assert.equal(ok!.userId, 42);
  assert.equal(verifyOrderPdfToken('a.b'), null);
  assert.equal(verifyOrderPdfToken(null), null);

  // Token for wrong user must not match order owner check pattern
  const otherTok = mintOrderPdfToken(5001, 99);
  const otherParsed = verifyOrderPdfToken(otherTok)!;
  assert.notEqual(otherParsed.userId, order.userId);

  // --- Date/time: no invented fallback when input missing ---
  assert.equal(getISTDateParts(null), null);
  assert.equal(getISTDateParts(undefined), null);
  assert.match(formatISTDate(null, 'en'), /unavailable/i);
  assert.match(formatISTTime(null, 'en'), /unavailable/i);

  // Consistent IST formatting for a fixed instant
  const sample = '2026-10-15T10:30:00+05:30';
  const d = formatISTDate(sample, 'en', false);
  const t = formatISTTime(sample, 'en', true);
  assert.ok(d.length > 3);
  assert.ok(t.length > 3);
  assert.doesNotMatch(d, /Juna Furniture|बालगंधर्व/);
  assert.doesNotMatch(t, /G01|static/i);

  // --- PDF generation with explicit unavailable showtime (must not invent a date) ---
  const buf = await generateTicketPdfBuffer({
    ticketCode: 'TG-TK-P2',
    orderNumber: 'TG-2026-P2',
    eventTitle: 'Test Natak',
    venueName: 'Test Venue',
    showtime: 'Show time unavailable',
    seatCode: 'B7',
    attendeeName: 'Tester',
    faceValuePaise: 25000,
    status: 'confirmed',
    qrPayload: 'https://mahaticket.kalpkrutinfotech.com/tickets/TG-TK-P2',
    securityHash: 'testhash',
  });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 500);
  assert.equal(buf.subarray(0, 4).toString('utf8'), '%PDF');

  console.log('PASS test-phase2-booking-auth');
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
