import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, fullName, phoneNumber, avatarUrl, city } = body;

    if (!email && !uid) {
      return NextResponse.json(
        { error: 'uid or email is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanUid = uid ? uid.trim() : null;

    // Check if user exists by email FIRST (authoritative key), or by uid
    let existingUser = null;
    if (cleanEmail) {
      const byEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);
      if (byEmail.length > 0) existingUser = byEmail[0];
    }
    if (!existingUser && cleanUid) {
      const byUid = await db
        .select()
        .from(users)
        .where(eq(users.uid, cleanUid))
        .limit(1);
      if (byUid.length > 0) existingUser = byUid[0];
    }

    if (existingUser) {
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (cleanEmail) updateData.email = cleanEmail;
      if (fullName) updateData.fullName = fullName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (city) updateData.city = city;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id));

      return NextResponse.json({
        success: true,
        user: { ...existingUser, ...updateData },
      });
    } else {
      // Insert new user with unique identifier
      const newUid = cleanUid || `cust-${Date.now()}`;
      const finalEmail = cleanEmail || `${newUid}@mahaticket.app`;
      const [newUser] = await db
        .insert(users)
        .values({
          uid: newUid,
          email: finalEmail,
          fullName: fullName || 'MahaTicket User',
          phoneNumber: phoneNumber || null,
          avatarUrl: avatarUrl || null,
          role: 'customer',
          preferredLanguage: 'mr',
          city: city || 'Pune',
        })
        .returning();

      return NextResponse.json({
        success: true,
        user: newUser,
      });
    }
  } catch (error: any) {
    console.error('Profile upsert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
