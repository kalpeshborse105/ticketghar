import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा (Valid email required).' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    let [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (!user) {
      // Create guest customer entry so they have an account
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

    const hasPassword = Boolean(user.passwordHash && user.passwordHash.length > 10);

    return NextResponse.json({
      exists: true,
      hasPassword,
      email: user.email,
      fullName: user.fullName,
    });
  } catch (error: any) {
    console.error('Check email error:', error);
    return NextResponse.json({ error: 'ईमेल पडताळणीमध्ये त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' }, { status: 500 });
  }
}
