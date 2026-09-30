import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { setCustomerSessionCookie } from '@/src/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'ईमेल आणि ६-अंकी OTP कोड आवश्यक आहे.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'वापरकर्ता सापडला नाही.' }, { status: 404 });
    }

    // Verify OTP match and expiration
    if (!user.otpCode || user.otpCode !== cleanOtp) {
      return NextResponse.json(
        { error: 'अवैध OTP कोड! कृपया ईमेलमध्ये आलेला ६-अंकी कोड पुन्हा तपासा.' },
        { status: 400 }
      );
    }

    if (user.otpExpiresAt && new Date(user.otpExpiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'हा OTP कोड कालबाह्य (expired) झाला आहे. कृपया नवीन कोड मागवा.' },
        { status: 400 }
      );
    }

    // Clear OTP after successful verification
    await db
      .update(users)
      .set({
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Set authenticated session cookie
    await setCustomerSessionCookie({
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    const needsPasswordSetup = !user.passwordHash || user.passwordHash.length < 10;

    return NextResponse.json({
      success: true,
      message: 'OTP पडताळणी यशस्वी झाली!',
      needsPasswordSetup,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'OTP पडताळणी करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
