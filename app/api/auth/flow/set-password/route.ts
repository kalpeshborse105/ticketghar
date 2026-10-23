import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  getCustomerSession,
  setCustomerSessionCookie,
  signSessionToken,
} from '@/src/lib/auth-service';

/**
 * Set / reset password — requires an authenticated customer session
 * (from OTP verify or Google). Email alone is never sufficient.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;
    const authHeader = req.headers.get('authorization');

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'पासवर्ड किमान ६ अक्षरांचा असावा (Minimum 6 characters).' },
        { status: 400 }
      );
    }

    const session = await getCustomerSession(authHeader);
    if (!session?.id || !session.email) {
      return NextResponse.json(
        {
          error:
            'अनधिकृत विनंती. कृपया आधी OTP किंवा Google द्वारे पडताळणी करा (Verify OTP or Google first).',
        },
        { status: 401 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'वापरकर्ता सापडला नाही.' }, { status: 404 });
    }

    const hashed = hashPassword(password);

    await db
      .update(users)
      .set({
        passwordHash: hashed,
        // Clear any leftover OTP after password is set
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const sessionUser = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };

    await setCustomerSessionCookie(sessionUser);
    const token = signSessionToken(sessionUser);

    return NextResponse.json({
      success: true,
      message:
        'आपला पासवर्ड यशस्वीरीत्या जतन झाला आहे! पुढच्या वेळी आपण थेट या पासवर्डने लॉगिन करू शकता.',
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: unknown) {
    console.error('Set password error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { error: 'पासवर्ड सेट करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
