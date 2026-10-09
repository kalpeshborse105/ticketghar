import { NextRequest, NextResponse } from 'next/server';
import { askTikitMitra } from '@/src/lib/tikitmitra.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message;
    const history = body.history || [];
    const language = body.language === 'en' ? 'en' : 'mr';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message exceeds maximum allowed length of 500 characters.' },
        { status: 400 }
      );
    }

    const response = await askTikitMitra({
      message,
      history,
      language,
    });

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('TikitMitra API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to process chat request at this moment.',
      },
      { status: 500 }
    );
  }
}
