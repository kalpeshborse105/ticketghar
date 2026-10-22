import { generateTicketPdfBuffer } from '../src/lib/ticket-pdf';

async function testPdf() {
  const buf = await generateTicketPdfBuffer({
    ticketCode: 'MT-TEST-123',
    orderNumber: 'MT-2026-99999',
    eventTitle: 'Ghashiram Kotwal',
    venueName: 'Bal Gandharva Rangmandir',
    showtime: 'Fri, 24 Oct 2026, 06:30 PM',
    seatCode: 'A01, A02 (2 Tickets)',
    attendeeName: 'Kalpesh Borse',
    faceValuePaise: 80000,
    status: 'valid',
    qrPayload: 'https://mahaticket.kalpkrutinfotech.com/tickets/MT-TEST-123',
  });
  console.log('PDF generated successfully, size:', buf.length, 'bytes');
}

testPdf().catch(console.error);
