/**
 * Offline scanner payload + redeem CAS semantics (no DB / no real tickets).
 */
import assert from 'assert';
import { normalizeScannerPayload } from '../src/lib/scanner-payload.ts';

// empty / invalid
assert.strictEqual(normalizeScannerPayload('').normalized, '');
assert.strictEqual(normalizeScannerPayload('   ').normalized, '');

// secure tokens preserved
assert.strictEqual(normalizeScannerPayload('MTSEC:v1:abc').kind, 'mtsec');
assert.strictEqual(normalizeScannerPayload('MTGRP:v1:xyz').kind, 'mtgrp');

// ticket URL
const url = normalizeScannerPayload('https://mahaticket.in/tickets/MT-TK-ABC123?x=1');
assert.strictEqual(url.kind, 'ticket_url');
assert.strictEqual(url.normalized, 'MT-TK-ABC123');

// order number
const ord = normalizeScannerPayload('Order MT-2026-99999 please');
assert.strictEqual(ord.kind, 'order');
assert.strictEqual(ord.normalized, 'MT-2026-99999');

// ticket code
const tk = normalizeScannerPayload('pass MT-TK-SeatA12');
assert.strictEqual(tk.kind, 'ticket');
assert.ok(tk.normalized.startsWith('MT-TK-'));

// JSON blob
const js = normalizeScannerPayload(JSON.stringify({ ticketCode: 'MT-TK-JSON1' }));
assert.strictEqual(js.normalized, 'MT-TK-JSON1');

// multiline noise picks preferred line
const multi = normalizeScannerPayload('noise\nMT-TK-LINE2\nmore');
assert.strictEqual(multi.normalized, 'MT-TK-LINE2');

/**
 * Redeem CAS model: only status=valid → used wins.
 * Concurrent second update sees 0 rows → ALREADY_USED (no fake SUCCESS).
 */
function simulateRedeem(status: string): 'SUCCESS' | 'ALREADY_USED' | 'TICKET_CANCELLED' | 'UNPAID' {
  if (status === 'cancelled' || status === 'refunded') return 'TICKET_CANCELLED';
  if (status === 'used') return 'ALREADY_USED';
  if (status !== 'valid') return 'ALREADY_USED';
  // CAS: where status=valid
  const marked = status === 'valid' ? 1 : 0;
  return marked === 1 ? 'SUCCESS' : 'ALREADY_USED';
}

assert.strictEqual(simulateRedeem('valid'), 'SUCCESS');
assert.strictEqual(simulateRedeem('used'), 'ALREADY_USED');
assert.strictEqual(simulateRedeem('cancelled'), 'TICKET_CANCELLED');
assert.strictEqual(simulateRedeem('refunded'), 'TICKET_CANCELLED');

// Concurrent: first wins, second loses
let shared = 'valid';
function casOnce() {
  if (shared !== 'valid') return 'ALREADY_USED';
  shared = 'used';
  return 'SUCCESS';
}
assert.strictEqual(casOnce(), 'SUCCESS');
assert.strictEqual(casOnce(), 'ALREADY_USED');

console.log('test-scanner-payload-and-redeem: ALL OK');
