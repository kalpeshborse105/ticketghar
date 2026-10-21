import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users, orders } from '@/src/db/schema';
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
      // Check if user has booked tickets previously as guest
      const [order] = await db
        .select({ userEmail: orders.userEmail, userName: orders.userName, userPhone: orders.userPhone })
        .from(orders)
        .where(eq(orders.userEmail, cleanEmail))
        .limit(1);

      if (!order) {
        return NextResponse.json(
          {
            exists: false,
            error: 'हा ईमेल नोंदणीकृत नाही. कृपया तिकीट बुकिंग करताना वापरलेला ईमेल प्रविष्ट करा.',
          },
          { status: 404 }
        );
      }

      // Guest has previous booking -> create user account entry with blank password so OTP flow can set one
      const [newUser] = await db
        .insert(users)
        .values({
          uid: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          email: cleanEmail,
          fullName: order.userName || cleanEmail.split('@')[0],
          phoneNumber: order.userPhone || null,
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
