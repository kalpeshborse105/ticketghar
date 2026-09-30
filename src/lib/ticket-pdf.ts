import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { getTicketShareUrl } from './public-url';

export type TicketPdfInput = {
  ticketCode: string;
  orderNumber: string;
  eventTitle: string;
  venueName: string;
  showtime: string;
  seatCode: string;
  attendeeName: string;
  faceValuePaise: number;
  status: string;
  qrPayload: string;
  securityHash?: string;
};

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/**
 * Generate a real PDF Buffer for a MahaTicket pass (not HTML).
 */
export async function generateTicketPdfBuffer(input: TicketPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: {
      Title: `MahaTicket Pass ${input.ticketCode}`,
      Author: 'MahaTicket',
      Subject: 'Event admission ticket',
    },
  });

  const done = collectPdf(doc);

  // Header
  doc
    .fillColor('#4F46E5')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('MahaTicket', { continued: false });
  doc
    .fillColor('#6B7280')
    .fontSize(11)
    .font('Helvetica')
    .text('महाटिकिट — Official Admission Pass');

  doc.moveDown(0.5);
  doc
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .moveTo(48, doc.y)
    .lineTo(547, doc.y)
    .stroke();
  doc.moveDown(1);

  doc.fillColor('#111827').fontSize(16).font('Helvetica-Bold').text(input.eventTitle, {
    width: 500,
  });
  doc.moveDown(0.8);

  const amount = `INR ${(input.faceValuePaise / 100).toFixed(0)}`;
  const rows: [string, string][] = [
    ['Booking ID', input.orderNumber],
    ['Ticket ID', input.ticketCode],
    ['Venue', input.venueName],
    ['Date & Time', input.showtime],
    ['Seat', input.seatCode],
    ['Attendee', input.attendeeName],
    ['Amount', amount],
    ['Status', input.status],
  ];

  doc.fontSize(11).font('Helvetica');
  for (const [label, value] of rows) {
    doc.fillColor('#6B7280').text(label, { continued: false, width: 140 });
    doc
      .moveUp()
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(value || '—', 200, doc.y, { width: 320 });
    doc.font('Helvetica');
    doc.moveDown(0.45);
  }

  doc.moveDown(0.6);

  // QR
  const qrPng = await QRCode.toBuffer(input.qrPayload || input.ticketCode, {
    type: 'png',
    width: 180,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  const qrX = (doc.page.width - 180) / 2;
  doc.image(qrPng, qrX, doc.y, { width: 180, height: 180 });
  doc.moveDown(12);
  doc
    .fillColor('#6B7280')
    .fontSize(10)
    .text('Show this QR at the venue gate for entry.', { align: 'center' });

  const shareUrl = getTicketShareUrl(input.ticketCode);
  doc.moveDown(0.5);
  doc
    .fillColor('#4F46E5')
    .fontSize(9)
    .text(shareUrl, { align: 'center', link: shareUrl });

  doc.moveDown(1.5);
  doc
    .fillColor('#9CA3AF')
    .fontSize(8)
    .text(
      'MahaTicket support · Keep this pass safe · Non-transferable unless organizer allows · Do not share QR publicly.',
      { align: 'center', width: 480 }
    );

  if (input.securityHash) {
    doc.moveDown(0.4);
    doc
      .fillColor('#D1D5DB')
      .fontSize(7)
      .text(`SEC ${input.securityHash.slice(0, 32)}…`, { align: 'center' });
  }

  doc.end();
  return done;
}
