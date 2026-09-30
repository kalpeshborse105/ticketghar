import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { deviceTokens } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const userUid = typeof body.userId === 'string' ? body.userId : body.userUid || null;
    const platform = ['android', 'ios', 'web'].includes(body.platform) ? body.platform : 'android';
    const appVersion = typeof body.appVersion === 'string' ? body.appVersion : null;

    if (!token) {
      return NextResponse.json({ error: 'Valid FCM registration token is required' }, { status: 400 });
    }

    const existing = await db.select().from(deviceTokens).where(eq(deviceTokens.token, token)).limit(1);

    if (existing.length > 0) {
      await db
        .update(deviceTokens)
        .set({
          userUid,
          platform,
          appVersion,
          lastSeenAt: new Date(),
        })
        .where(eq(deviceTokens.token, token));
    } else {
      await db.insert(deviceTokens).values({
        token,
        userUid,
        platform,
        appVersion,
        lastSeenAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'FCM device token registered',
    });
  } catch (error) {
    console.error('FCM token registration error:', error);
    return NextResponse.json({ error: 'Failed to register notification token' }, { status: 500 });
  }
}
