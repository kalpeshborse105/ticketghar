import { NextRequest, NextResponse } from 'next/server';
import { askTikitMitra } from '@/src/lib/tikitmitra.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || '';
    const history = body.history || [];
    const language = body.language === 'en' ? 'en' : 'mr';
    const actionPayload = body.actionPayload || body.payload || undefined;

    if (!message && !actionPayload) {
      return NextResponse.json(
        { success: false, error: 'Message or action payload is required.' },
        { status: 400 }
      );
    }

    if (typeof message === 'string' && message.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message exceeds maximum allowed length of 500 characters.' },
        { status: 400 }
      );
    }

    const response = await askTikitMitra({
      message: String(message || ''),
      history,
      language,
      actionPayload,
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
