import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';

// GET all users for admin role management
export async function GET() {
  try {
    const list = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        phoneNumber: users.phoneNumber,
        role: users.role,
        preferredLanguage: users.preferredLanguage,
        city: users.city,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.id));

    return NextResponse.json({ users: list });
  } catch (error: any) {
    console.error('Failed to fetch admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create or invite a staff / admin user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, phoneNumber, role, city, preferredLanguage, actorId } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['super_admin', 'operations', 'finance', 'content', 'scanner', 'customer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const generatedUid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        uid: generatedUid,
        email: email.trim().toLowerCase(),
        fullName: fullName?.trim() || 'Staff Member',
        phoneNumber: phoneNumber?.trim() || null,
        role,
        city: city?.trim() || 'Pune',
        preferredLanguage: preferredLanguage || 'mr',
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: actorId || 'super_admin',
      actorRole: 'super_admin',
      action: 'USER_ROLE_ASSIGNED',
      entityType: 'user',
      entityId: String(newUser.id),
      details: JSON.stringify({ email: newUser.email, role: newUser.role }),
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Failed to create/invite user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PATCH update user role or profile
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, fullName, phoneNumber, city, actorId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const validRoles = ['super_admin', 'operations', 'finance', 'content', 'scanner', 'customer'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (role !== undefined) updateData.role = role;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (city !== undefined) updateData.city = city;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(userId)))
      .returning();

    // Record in audit log
    await db.insert(auditLogs).values({
      actorId: actorId || 'super_admin',
      actorRole: 'super_admin',
      action: 'USER_ROLE_UPDATED',
      entityType: 'user',
      entityId: String(userId),
      details: JSON.stringify(updateData),
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
