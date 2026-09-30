import { config } from 'dotenv';
import fs from 'fs';
import { generateTicketPdfBuffer } from '../src/lib/ticket-pdf.ts';

config({ override: true });

async function main() {
  const b = await generateTicketPdfBuffer({
    ticketCode: 'MT-TK-TEST',
    orderNumber: 'MT-2026-1',
    eventTitle: 'Test Natak',
    venueName: 'Pune Hall',
    showtime: '1 Oct 2026, 7:30 PM',
    seatCode: 'A1',
    attendeeName: 'Test User',
    faceValuePaise: 50000,
    status: 'valid',
    qrPayload: JSON.stringify({ code: 'MT-TK-TEST' }),
    securityHash: 'abcdef0123456789',
  });
  fs.writeFileSync('tmp-ticket-test.pdf', b);
  console.log('pdf bytes', b.length, 'magic', b.slice(0, 5).toString());
  if (b.slice(0, 5).toString() !== '%PDF-') process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
