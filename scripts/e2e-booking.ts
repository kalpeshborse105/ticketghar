/**
 * Quick booking E2E against local API (hold → confirm → reject double-book)
 */
async function main() {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const seatsRes = await fetch(`${base}/api/sessions/1/seats`);
  const seatsJson = await seatsRes.json();
  const available = (seatsJson.seats || []).filter((s: any) => s.status === 'available');
  if (available.length < 2) throw new Error('Need 2 available seats');

  const pick = available.slice(0, 2).map((s: any) => s.seatId);
  console.log('holding seats', pick);

  const holdRes = await fetch(`${base}/api/bookings/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 1,
      seatIds: pick,
      userIdStr: 'e2e-user-1',
    }),
  });
  const hold = await holdRes.json();
  console.log('hold', holdRes.status, hold.hold?.holdExpiresAt || hold.error, 'face', hold.hold?.faceValueTotal);

  if (!holdRes.ok) process.exit(1);

  const confirmRes = await fetch(`${base}/api/bookings/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 1,
      eventId: seatsJson.event.id,
      seatIds: pick,
      userName: 'E2E Tester',
      userEmail: 'e2e@mahaticket.in',
      userPhone: '+91 90000 00001',
    }),
  });
  const confirm = await confirmRes.json();
  console.log('confirm', confirmRes.status, confirm.order?.orderNumber || confirm.error, confirm.payment);

  // Double book attempt
  const hold2 = await fetch(`${base}/api/bookings/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 1,
      seatIds: pick,
      userIdStr: 'e2e-user-2',
    }),
  });
  const hold2Json = await hold2.json();
  console.log('doubleBookBlocked', !hold2.ok, hold2Json.error || 'unexpected success');

  if (!confirmRes.ok || hold2.ok) process.exit(1);
  console.log('E2E PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
