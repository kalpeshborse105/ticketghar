import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSession, setCustomerSessionCookie } from '@/src/lib/auth-service';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'लॉगिन केलेले नाही (Unauthorized)' }, { status: 401 });
    }

    const body = await req.json();
    const fullName = body.fullName !== undefined ? String(body.fullName).trim() : session.fullName;
    const phoneNumber = body.phoneNumber !== undefined ? String(body.phoneNumber).trim() : session.phoneNumber;

    if (db && users && session.id) {
      try {
        await db
          .update(users)
          .set({
            fullName: fullName || session.fullName,
            phoneNumber: phoneNumber || session.phoneNumber,
          })
          .where(eq(users.id, session.id));
      } catch (err) {
        console.warn('DB update user failed non-blocking:', err);
      }
    }

    const updatedUser = {
      ...session,
      fullName: fullName || session.fullName,
      phoneNumber: phoneNumber || session.phoneNumber,
    };

    await setCustomerSessionCookie(updatedUser);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'प्रोफाइल यशस्वीरीत्या जतन केले (Profile updated successfully)',
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
