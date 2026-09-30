import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { uid, email, fullName } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'uid and email are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existingUsers.length > 0) {
      // Update existing user
      await db
        .update(users)
        .set({
          email,
          fullName: fullName || existingUsers[0].fullName,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid));

      return NextResponse.json({
        success: true,
        user: { ...existingUsers[0], email, fullName },
      });
    } else {
      // Insert new user
      const [newUser] = await db
        .insert(users)
        .values({
          uid,
          email,
          fullName: fullName || 'Guest User',
          role: 'customer',
          preferredLanguage: 'mr',
          city: 'Pune',
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
