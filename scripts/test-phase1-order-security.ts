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
  const guestEmailOrder = { userId: 77, userEmail: 'owner@example.com' };

  assert.equal(customerOwnsOrder(owner, order), true, 'owner owns by userId');
  assert.equal(customerOwnsOrder(other, order), false, 'other does not own');
  assert.equal(
    customerOwnsOrder({ id: 99, email: 'owner@example.com' }, order),
    false,
    'email match alone must NOT grant ownership'
  );
  assert.equal(
    customerOwnsOrder(owner, guestEmailOrder),
    false,
    'same email different userId must NOT grant ownership'
  );

  const token = mintOrderPdfToken(1001, 42);
  const parsed = verifyOrderPdfToken(token);
  assert.ok(parsed, 'token verifies');
  assert.equal(parsed!.orderId, 1001);
  assert.equal(parsed!.userId, 42);
  assert.equal(verifyOrderPdfToken('tampered.token'), null, 'tampered rejected');
  assert.equal(verifyOrderPdfToken(''), null, 'empty rejected');

  // Expiry: mint with past exp by forging then signing is blocked; verify rejects expired payload
  const crypto = await import('node:crypto');
  const secret =
    process.env.TICKET_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    'mahaticket_secure_production_secret_key_2026';
  const expiredPayload = Buffer.from(
    JSON.stringify({ oid: 1001, uid: 42, exp: Date.now() - 1000, v: 1 })
  ).toString('base64url');
  const expiredSig = crypto
    .createHmac('sha256', secret)
    .update(`pdf-dl:${expiredPayload}`)
    .digest('base64url');
  assert.equal(
    verifyOrderPdfToken(`${expiredPayload}.${expiredSig}`),
    null,
    'expired token rejected'
  );

  // Wrong user binding: token for uid 42 must not authorize order owned by 99 via verify fields alone
  const wrongUser = mintOrderPdfToken(1001, 99);
  const wrongParsed = verifyOrderPdfToken(wrongUser);
  assert.ok(wrongParsed);
  assert.notEqual(wrongParsed!.userId, order.userId, 'token uid differs from order owner');

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

  console.log('PASS: phase1 ownership (userId-canonical) + pdf token expiry + marathi pdf');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
