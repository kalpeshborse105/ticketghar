import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, setCustomerSessionCookie, signSessionToken } from '@/src/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ईमेल आणि पासवर्ड आवश्यक आहे (Email and password required).' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'या ईमेलसाठी कोणतेही खाते सापडले नाही.' },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: 'आपला पासवर्ड अद्याप सेट केलेला नाही. कृपया OTP द्वारे लॉगिन करून पासवर्ड तयार करा.',
          needsOtp: true,
        },
        { status: 400 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'चुकीचा पासवर्ड! कृपया पुन्हा तपासा किंवा OTP द्वारे लॉगिन करा.' },
        { status: 401 }
      );
    }

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
      message: 'यशस्वी लॉगिन झाले!',
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
  } catch (error: any) {
    console.error('Password login error:', error);
    return NextResponse.json(
      { error: 'लॉगिन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
