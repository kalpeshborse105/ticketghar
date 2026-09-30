import { NextRequest, NextResponse } from 'next/server';

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_SUCCESS'
  | 'EVENT_REMINDER'
  | 'EVENT_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'OFFER';

export async function POST(req: NextRequest) {
  try {
    const { type, title, body, deepLink, token, userId } = await req.json();

    if (!type || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, body' },
        { status: 400 }
      );
    }

    // Determine target tokens
    const targetTokens: string[] = [];
    if (token) {
      targetTokens.push(token);
    } else if (global._fcmDeviceTokens) {
      for (const [t, data] of global._fcmDeviceTokens.entries()) {
        if (!userId || data.userId === userId) {
          targetTokens.push(t);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notification: {
        type,
        title,
        body,
        deepLink: deepLink || 'mahaticket://home',
        sentAt: new Date().toISOString(),
      },
      dispatchedCount: targetTokens.length,
      message: `Notification queued for ${targetTokens.length} devices`,
    });
  } catch (error: any) {
    console.error('Notification dispatch error:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch notification' },
      { status: 500 }
    );
  }
}
