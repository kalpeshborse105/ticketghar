/**
 * Phase 1–2 security + PDF unit tests (no production DB).
 * Run: npx tsx scripts/test-phase1-order-security.ts
 */
import assert from 'node:assert/strict';
import {
  customerOwnsOrder,
  mintOrderPdfToken,
  verifyOrderPdfToken,
} from '../src/lib/order-access-crypto';
import { generateTicketPdfBuffer, toSafePdfString } from '../src/lib/ticket-pdf';

async function main() {
  const owner = { id: 42, email: 'owner@example.com' };
  const other = { id: 99, email: 'other@example.com' };
  const order = { userId: 42, userEmail: 'owner@example.com' };

  assert.equal(customerOwnsOrder(owner, order), true, 'owner owns order');
  assert.equal(customerOwnsOrder(other, order), false, 'other does not own order');
  assert.equal(
    customerOwnsOrder({ ...other, email: 'OWNER@example.com' }, order),
    true,
    'email case-insensitive ownership'
  );

  const token = mintOrderPdfToken(1001, 42);
  const parsed = verifyOrderPdfToken(token);
  assert.ok(parsed, 'token verifies');
  assert.equal(parsed!.orderId, 1001);
  assert.equal(parsed!.userId, 42);
  assert.equal(verifyOrderPdfToken('tampered.token'), null, 'tampered rejected');
  assert.equal(verifyOrderPdfToken(''), null, 'empty rejected');

  const marathi = toSafePdfString('बालगंधर्व रंगमंदिर', 'fallback');
  assert.match(marathi, /बालगंधर्व/, 'Marathi preserved in toSafePdfString');
  assert.equal(toSafePdfString('', 'Show time unavailable'), 'Show time unavailable');
  assert.equal(toSafePdfString(null, 'Show time unavailable'), 'Show time unavailable');

  const buf = await generateTicketPdfBuffer({
    ticketCode: 'TG-TK-TEST',
    orderNumber: 'TG-2026-TEST',
    eventTitle: 'नटसम्राट',
    venueName: 'बालगंधर्व रंगमंदिर',
    showtime: 'Show time unavailable',
    seatCode: 'A12',
    attendeeName: 'कलpesh',
    faceValuePaise: 50000,
    status: 'confirmed',
    qrPayload: 'https://mahaticket.kalpkrutinfotech.com/tickets/TG-TK-TEST',
  });
  assert.ok(buf.length > 500, 'PDF non-empty');
  assert.equal(buf.subarray(0, 4).toString('utf8'), '%PDF', 'valid PDF header');

  console.log('PASS: phase1 order ownership + pdf token + marathi pdf');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
