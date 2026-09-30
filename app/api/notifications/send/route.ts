import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { deviceTokens, notificationLog } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_SUCCESS'
  | 'EVENT_REMINDER'
  | 'EVENT_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'OFFER';

const ALLOWED: NotificationType[] = [
  'BOOKING_CONFIRMED',
  'PAYMENT_SUCCESS',
  'EVENT_REMINDER',
  'EVENT_UPDATED',
  'BOOKING_CANCELLED',
  'OFFER',
];

async function getFirebaseMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey || privateKey.includes('YOUR_')) {
    return null;
  }

  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return admin.messaging();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type as NotificationType;
    const title = body.title as string;
    const messageBody = body.body as string;
    const deepLink = body.deepLink || 'mahaticket://home';
    const token = body.token as string | undefined;
    const userId = body.userId as string | undefined;
    const dedupeKey =
      (body.dedupeKey as string) ||
      `${type}:${userId || token || 'broadcast'}:${body.entityId || title}`;

    if (!type || !title || !messageBody || !ALLOWED.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }

    const existing = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.dedupeKey, dedupeKey))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'duplicate',
        dispatchedCount: 0,
      });
    }

    let targets: { id: number; token: string }[] = [];
    if (token) {
      const rows = await db.select().from(deviceTokens).where(eq(deviceTokens.token, token)).limit(1);
      if (rows[0]) targets = [{ id: rows[0].id, token: rows[0].token }];
      else targets = [{ id: 0, token }];
    } else if (userId) {
      const rows = await db.select().from(deviceTokens).where(eq(deviceTokens.userUid, userId));
      targets = rows.map((r) => ({ id: r.id, token: r.token }));
    } else {
      const rows = await db.select().from(deviceTokens);
      targets = rows.map((r) => ({ id: r.id, token: r.token }));
    }

    const messaging = await getFirebaseMessaging();
    let sent = 0;
    const invalidTokens: string[] = [];

    if (!messaging) {
      await db.insert(notificationLog).values({
        userUid: userId || null,
        notificationType: type,
        dedupeKey,
        title,
        body: messageBody,
        dataJson: JSON.stringify({ deepLink }),
        status: 'skipped',
      });
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'Firebase Admin is not configured. Notification was not sent.',
        dispatchedCount: 0,
      });
    }

    for (const t of targets) {
      try {
        await messaging.send({
          token: t.token,
          notification: { title, body: messageBody },
          data: { type, deepLink: String(deepLink) },
        });
        sent += 1;
        await db.insert(notificationLog).values({
          deviceTokenId: t.id || null,
          userUid: userId || null,
          notificationType: type,
          dedupeKey: `${dedupeKey}:${t.token.slice(-8)}`,
          title,
          body: messageBody,
          dataJson: JSON.stringify({ deepLink }),
          status: 'sent',
        });
      } catch (err: any) {
        const code = err?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(t.token);
          await db.delete(deviceTokens).where(eq(deviceTokens.token, t.token));
        }
        console.error('FCM send error:', err?.message || err);
      }
    }

    // Primary dedupe row
    await db.insert(notificationLog).values({
      userUid: userId || null,
      notificationType: type,
      dedupeKey,
      title,
      body: messageBody,
      dataJson: JSON.stringify({ deepLink, sent, invalidRemoved: invalidTokens.length }),
      status: sent > 0 ? 'sent' : 'failed',
    }).catch(() => undefined);

    return NextResponse.json({
      success: sent > 0,
      configured: true,
      dispatchedCount: sent,
      invalidTokensRemoved: invalidTokens.length,
    });
  } catch (error) {
    console.error('Notification dispatch error:', error);
    return NextResponse.json({ error: 'Failed to dispatch notification' }, { status: 500 });
  }
}
