import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  getCustomerSession,
  setCustomerSessionCookie,
  signSessionToken,
  newCustomerUid,
} from '@/src/lib/auth-service.ts';

/**
 * Upsert profile — authenticated session (cookie or Bearer) or Supabase OAuth callback.
 * When linking Supabase Auth UUID, pass uid = auth.users.id and it will be stored.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const session = await getCustomerSession(authHeader);
    const body = await request.json().catch(() => ({}));
    const { uid, email, fullName, phoneNumber, avatarUrl, city, age } = body;
    const parsedAge =
      age === null || age === undefined || age === ''
        ? undefined
        : Number.parseInt(String(age), 10);
    const cleanAge =
      parsedAge !== undefined && Number.isFinite(parsedAge) && parsedAge >= 1 && parsedAge <= 120
        ? parsedAge
        : age === null || age === ''
          ? null
          : undefined;

    const cleanEmail = (session?.email || email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanUid =
      typeof uid === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid.trim())
        ? uid.trim()
        : null;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    let activeUser: any = null;

    if (existingUser) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      // Upgrade to real UUID when current uid is legacy string
      if (
        cleanUid &&
        (!existingUser.uid ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingUser.uid))
      ) {
        updateData.uid = cleanUid;
      }
      if (fullName) updateData.fullName = fullName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (cleanAge !== undefined) updateData.age = cleanAge;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (city) updateData.city = city;

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .returning();
      activeUser = updated;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          uid: cleanUid || newCustomerUid(),
          email: cleanEmail,
          fullName: fullName || session?.fullName || 'MahaTicket User',
          phoneNumber: phoneNumber || session?.phoneNumber || null,
          age: cleanAge ?? null,
          avatarUrl: avatarUrl || session?.avatarUrl || null,
          role: 'customer',
          preferredLanguage: 'mr',
          city: city || 'Pune',
        })
        .returning();
      activeUser = newUser;
    }

    const sessionUser = {
      id: activeUser.id,
      uid: activeUser.uid,
      email: activeUser.email,
      fullName: activeUser.fullName,
      phoneNumber: activeUser.phoneNumber,
      age: activeUser.age ?? null,
      role: activeUser.role,
      avatarUrl: activeUser.avatarUrl,
    };

    await setCustomerSessionCookie(sessionUser);
    const token = signSessionToken(sessionUser);

    return NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });
  } catch (error: any) {
    console.error('Profile upsert error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upsert profile' },
      { status: 500 }
    );
  }
}
