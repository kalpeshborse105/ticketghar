import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const iconPath = path.join(process.cwd(), 'public', 'icon.png');
    if (fs.existsSync(iconPath)) {
      const img = fs.readFileSync(iconPath);
      return new NextResponse(img, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch (e) {
    console.warn('Favicon handler fallback:', e);
  }
  return new NextResponse(null, { status: 204 });
}
