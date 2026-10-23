import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { sendOtpEmail, newCustomerUid } from '@/src/lib/auth-service';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          uid: newCustomerUid(),
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
          role: 'customer',
          preferredLanguage: 'mr',
          city: 'Pune',
        })
        .returning();
      user = newUser;
    }

    // 2. Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Save to database
    await db
      .update(users)
      .set({
        otpCode: otp,
        otpExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 4. Send email via SMTP (same channel as DB otpCode)
    const emailSent = await sendOtpEmail(cleanEmail, otp);

    const isDev = process.env.NODE_ENV !== 'production';
    if (!emailSent && !isDev) {
      // Clear unused OTP so a failed send cannot leave a guessable code lingering
      await db
        .update(users)
        .set({ otpCode: null, otpExpiresAt: null, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: '६-अंकी पडताळणी कोड पाठवण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? '६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे.'
        : 'OTP तयार झाला (dev — ईमेल पाठवला नाही).',
      // Never expose OTP outside local development.
      ...(isDev ? { devOtp: otp, emailSent } : { emailSent: true }),
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'OTP कोड पाठवताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
