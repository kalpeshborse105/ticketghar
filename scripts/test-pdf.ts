import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

async function testMissingFont() {
  console.log('Testing PDF with NO devanagari font registered...');
  const doc = new PDFDocument({ size: 'A4' });
  const chunks: Buffer[] = [];
  
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => {
      console.log('Doc error event:', err);
      reject(err);
    });
  });

  try {
    doc.font('Helvetica-Bold');
    doc.text('जर तर ची गोष्ट');
    doc.end();
    const buf = await done;
    console.log('Success without font? Buf length:', buf.length);
  } catch (err: any) {
    console.error('CRASHED WITH ERROR:', err.message, err.stack);
  }
}

testMissingFont();
