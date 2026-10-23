/**
 * Smoke: event detail + create-order customer gate (with/without email).
 * Does not charge Razorpay — invalid hold only.
 */
require('dotenv').config({ path: '.env' });

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';

async function main() {
  const ev = await fetch(`${base}/api/events/34`);
  const ej = await ev.json().catch(() => ({}));
  const title = ej?.event?.title || ej?.title || ej?.error;
  console.log('EVENT_34', ev.status, title);
  if (ev.status !== 200) process.exitCode = 1;

  const noEmail = await fetch(`${base}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 1, seatIds: [1], holdToken: 'hold_test' }),
  });
  const nej = await noEmail.json().catch(() => ({}));
  console.log('NO_EMAIL', noEmail.status, String(nej.error || '').slice(0, 120));

  const withEmail = await fetch(`${base}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 999999,
      seatIds: [1],
      holdToken: 'hold_invalid_token_xyz',
      userEmail: `new.booker.${Date.now()}@example.com`,
      userName: 'New Booker',
      userPhone: '9876543210',
    }),
  });
  const wej = await withEmail.json().catch(() => ({}));
  console.log('WITH_EMAIL', withEmail.status, String(wej.error || wej.orderId || '').slice(0, 140));

  // With email must not die on "Customer account required"
  if (/Customer account required/i.test(String(wej.error || ''))) {
    console.log('FAIL: email path still blocked by customer gate');
    process.exitCode = 1;
  } else {
    console.log('PASS: email path past customer gate (hold/inventory error expected)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
