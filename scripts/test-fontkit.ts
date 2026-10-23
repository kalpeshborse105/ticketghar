import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

async function testFont(fontPath: string) {
  console.log('\n--- Testing font:', fontPath);
  try {
    const doc = new PDFDocument({ size: 'A4' });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

    doc.registerFont('TestFont', fontPath);
    doc.font('TestFont');
    doc.text('जर तर ची गोष्ट - यशवंतराव चव्हाण नाट्यगृह');
    doc.end();

    const buf = await done;
    console.log('Font SUCCESS! Output buffer length:', buf.length);
  } catch (err: any) {
    console.error('Font FAILED with error:', err.message, err.stack);
  }
}

async function main() {
  const unhinted = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansDevanagari-unhinted.ttf');
  const regular = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  if (fs.existsSync(unhinted)) await testFont(unhinted);
  if (fs.existsSync(regular)) await testFont(regular);
}

main();
