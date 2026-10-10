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
 * Generate a high-fidelity BookMyShow-style M-Ticket PDF pass
 */
export async function generateTicketPdfBuffer(input: TicketPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    info: {
      Title: `MahaTicket Admission Pass - ${input.orderNumber}`,
      Author: 'MahaTicket (महाटिकिट)',
      Subject: 'Official Admission M-Ticket Pass',
      Keywords: 'ticket, bookmyshow, mahaticket, m-ticket, admission',
    },
  });

  const done = collectPdf(doc);

  const pageWidth = doc.page.width;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Brand Banner (BookMyShow / Cinemax Style Orange header)
  doc.rect(margin, margin, contentWidth, 54).fill('#ea580c');

  doc
    .fillColor('#FFFFFF')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('MahaTicket', margin + 18, margin + 12, { continued: true })
    .fontSize(11)
    .font('Helvetica')
    .text('  |  Official Admission Pass (M-Ticket)', { baseline: 'middle' });

  doc
    .fillColor('#FED7AA')
    .fontSize(9)
    .font('Helvetica')
    .text('Maharashtra First Event & Cultural Ticket Marketplace', margin + 18, margin + 35);

  // 2. Ticket Body Card Background
  const cardTop = margin + 54;
  const cardHeight = 670;
  doc
    .rect(margin, cardTop, contentWidth, cardHeight)
    .fillAndStroke('#FFFFFF', '#E2E8F0');

  let currentY = cardTop + 20;

  // 3. Event Title & Category
  doc
    .fillColor('#ea580c')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('LIVE PERFORMANCE / EVENT ADMISSION', margin + 20, currentY);

  currentY += 16;

  doc
    .fillColor('#0F172A')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(input.eventTitle, margin + 20, currentY, { width: contentWidth - 40 });

  currentY += 28;

  // Thin separator
  doc
    .strokeColor('#E2E8F0')
    .lineWidth(1)
    .moveTo(margin + 20, currentY)
    .lineTo(margin + contentWidth - 20, currentY)
    .stroke();

  currentY += 16;

  // 4. Booking Details Two-Column Grid
  const col1X = margin + 20;
  const col2X = margin + (contentWidth / 2) + 10;
  const labelWidth = 100;
  const valueWidth = (contentWidth / 2) - 120;

  const leftRows: [string, string][] = [
    ['Booking ID', input.orderNumber],
    ['Show Date & Time', input.showtime],
    ['Venue', input.venueName],
  ];

  const rightRows: [string, string][] = [
    ['Attendee Name', input.attendeeName || 'Guest Attendee'],
    ['Seats Assigned', input.seatCode],
    ['Total Amount', `INR ${(input.faceValuePaise / 100).toFixed(2)} (PAID)`],
  ];

  let leftY = currentY;
  doc.fontSize(10);
  for (const [label, val] of leftRows) {
    doc.fillColor('#64748B').font('Helvetica').text(label, col1X, leftY, { width: labelWidth });
    doc.fillColor('#0F172A').font('Helvetica-Bold').text(val, col1X + labelWidth, leftY, { width: valueWidth });
    leftY += 26;
  }

  let rightY = currentY;
  for (const [label, val] of rightRows) {
    doc.fillColor('#64748B').font('Helvetica').text(label, col2X, rightY, { width: labelWidth });
    doc.fillColor(label === 'Seats Assigned' ? '#ea580c' : '#0F172A').font('Helvetica-Bold').text(val, col2X + labelWidth, rightY, { width: valueWidth });
    rightY += 26;
  }

  currentY = Math.max(leftY, rightY) + 10;

  // 5. Perforated Dashed Tear Line (Cinema Ticket Stub effect)
  doc
    .strokeColor('#94A3B8')
    .lineWidth(1)
    .dash(4, { space: 4 })
    .moveTo(margin, currentY)
    .lineTo(margin + contentWidth, currentY)
    .stroke()
    .undash();

  currentY += 18;

  // 6. Central Unified QR Code (BookMyShow Style)
  // Encodes the verified public URL so phone cameras and scanners directly open the ticket pass!
  const publicShareUrl = getTicketShareUrl(input.ticketCode);
  const qrTarget = input.qrPayload.startsWith('http') ? input.qrPayload : publicShareUrl;

  const qrPng = await QRCode.toBuffer(qrTarget, {
    type: 'png',
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  const qrSize = 150;
  const qrX = margin + (contentWidth - qrSize) / 2;

  // QR container with light background and subtle border
  doc
    .rect(qrX - 10, currentY - 5, qrSize + 20, qrSize + 20)
    .fillAndStroke('#F8FAFC', '#CBD5E1');

  doc.image(qrPng, qrX, currentY + 5, { width: qrSize, height: qrSize });

  currentY += qrSize + 28;

  doc
    .fillColor('#ea580c')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('SCAN FOR GATE ENTRY & LIVE VERIFICATION', margin + 20, currentY, {
      align: 'center',
      width: contentWidth - 40,
    });

  currentY += 16;

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica')
    .text('Point mobile camera at QR code or tap the link below:', margin + 20, currentY, {
      align: 'center',
      width: contentWidth - 40,
    });

  currentY += 14;

  doc
    .fillColor('#0284c7')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(publicShareUrl, margin + 20, currentY, {
      align: 'center',
      width: contentWidth - 40,
      link: publicShareUrl,
    });

  currentY += 24;

  // 7. Important Instructions Box
  doc
    .rect(margin + 20, currentY, contentWidth - 40, 100)
    .fillAndStroke('#F1F5F9', '#E2E8F0');

  doc
    .fillColor('#0F172A')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('IMPORTANT INSTRUCTIONS & ENTRY GUIDELINES', margin + 30, currentY + 10);

  const instructions = [
    '• Present this digital M-Ticket on your phone or printed copy at the venue entrance.',
    '• Encrypted Security (MTSEC): Ticket is verified strictly by authorized venue gate operators.',
    '• Doors open 30 minutes before showtime. Please arrive at least 15 minutes prior to commencement.',
    '• Outside food, beverages, and proscribed items are strictly prohibited inside the venue.',
  ];

  let instY = currentY + 25;
  doc.fontSize(8).font('Helvetica').fillColor('#475569');
  for (const inst of instructions) {
    doc.text(inst, margin + 30, instY, { width: contentWidth - 60 });
    instY += 16;
  }

  currentY += 114;

  // 8. Footer Trust Marks
  doc
    .fillColor('#94A3B8')
    .fontSize(8)
    .font('Helvetica')
    .text(
      'MahaTicket Official Ticketing Partner · Customer Support: support@mahaticket.kalpkrutinfotech.com · Non-Transferable',
      margin + 20,
      currentY,
      { align: 'center', width: contentWidth - 40 }
    );

  if (input.securityHash) {
    currentY += 12;
    doc
      .fillColor('#CBD5E1')
      .fontSize(7)
      .font('Helvetica')
      .text(`HMAC SEC: ${input.securityHash.slice(0, 36)}...`, margin + 20, currentY, {
        align: 'center',
        width: contentWidth - 40,
      });
  }

  doc.end();
  return done;
}
