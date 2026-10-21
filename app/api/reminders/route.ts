import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSession } from '@/src/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId = Number(body?.eventId);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const deviceToken =
      typeof body?.deviceToken === 'string' && body.deviceToken.trim()
        ? body.deviceToken.trim()
        : null;

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Valid eventId is required.' }, { status: 400 });
    }

    const sessionUser = await getCustomerSession().catch(() => null);

    // Schema scaffold only for now. When the reminders table is provisioned,
    // insert { user_id, event_id, fcm_token, created_at } here.
    return NextResponse.json(
      {
        success: true,
        stored: false,
        configured: false,
        reminder: {
          eventId,
          title: title || null,
          userId: sessionUser?.id ?? null,
          fcmToken: deviceToken,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Reminder registration error:', error);
    return NextResponse.json({ error: 'Failed to register reminder.' }, { status: 500 });
  }
}
