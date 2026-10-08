import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { sendOtpEmail } from '@/src/lib/auth-service';

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
          uid: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

    // 4. Send email via SMTP
    const emailSent = await sendOtpEmail(cleanEmail, otp);

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      success: true,
      message: emailSent
        ? '६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे.'
        : isDev
          ? 'OTP तयार झाला (dev — ईमेल पाठवला नाही).'
          : '६-अंकी पडताळणी कोड पाठवण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.',
      // Never expose OTP outside local development.
      ...(isDev ? { devOtp: otp, emailSent } : { emailSent }),
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'OTP कोड पाठवताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
