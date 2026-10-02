import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { organizers, users, auditLogs } from '@/src/db/schema.ts';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';
import { hashPassword } from '@/src/lib/auth-service.ts';

// GET all organizers with commercial terms & login status
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const list = await db.select().from(organizers).orderBy(desc(organizers.id));

    if (list.length === 0) {
      return NextResponse.json({ organizers: [] });
    }

    // Check login credentials for all organizers in the users table
    const emails = list.map((o) => o.email.toLowerCase()).filter(Boolean);
    let userAccounts: Record<string, { id: number; role: string; hasPassword: boolean }> = {};

    if (emails.length > 0) {
      const matchedUsers = await db
        .select()
        .from(users)
        .where(inArray(users.email, emails));

      for (const u of matchedUsers) {
        userAccounts[u.email.toLowerCase()] = {
          id: u.id,
          role: u.role,
          hasPassword: Boolean(u.passwordHash),
        };
      }
    }

    // Attach login account metadata
    const enrichedList = list.map((org) => {
      const userMeta = userAccounts[org.email.toLowerCase()];
      return {
        ...org,
        hasLoginAccount: Boolean(userMeta && userMeta.hasPassword),
        userRole: userMeta?.role || 'organizer',
        userId: userMeta?.id,
      };
    });

    return NextResponse.json({ organizers: enrichedList });
  } catch (error: any) {
    console.error('Failed to fetch organizers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizers' },
      { status: 500 }
    );
  }
}

// POST create verified organizer + optional login credentials
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      action,
      name,
      companyName,
      email,
      phone,
      password,
      city = 'Pune',
      verificationStatus = 'verified',
      commissionType = 'percentage',
      commissionRate = 600, // 6% default
      bankName,
      bankAccountNumber,
      bankIfsc,
      panNumber,
      gstin,
      actorId,
      organizerId,
    } = body;

    // Action 1: Set or reset credentials for existing organizer
    if (action === 'set_credentials' || (organizerId && password)) {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required to set credentials.' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const hashedPassword = hashPassword(password);

      // Check if user already exists
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      let savedUser;
      if (existingUsers.length > 0) {
        [savedUser] = await db
          .update(users)
          .set({
            passwordHash: hashedPassword,
            role: 'organizer',
            fullName: name || existingUsers[0].fullName,
            phoneNumber: phone || existingUsers[0].phoneNumber,
          })
          .where(eq(users.id, existingUsers[0].id))
          .returning();
      } else {
        const generatedUid = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        [savedUser] = await db
          .insert(users)
          .values({
            uid: generatedUid,
            email: cleanEmail,
            fullName: name || companyName || 'आयोजक',
            phoneNumber: phone || null,
            role: 'organizer',
            passwordHash: hashedPassword,
          })
          .returning();
      }

      await db.insert(auditLogs).values({
        actorId: actorId || 'admin',
        actorRole: 'super_admin',
        action: 'ORGANIZER_CREDENTIALS_SET',
        entityType: 'organizer',
        entityId: String(organizerId || savedUser.id),
        details: JSON.stringify({ email: cleanEmail, role: 'organizer' }),
      });

      return NextResponse.json({
        success: true,
        message: 'आयोजक लॉगिन क्रेडेंशियल्स यशस्वीरित्या तयार केले (Organizer login credentials created/updated)',
        userId: savedUser.id,
        email: cleanEmail,
      });
    }

    // Action 2: Create new organizer
    if (!name || !companyName || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, Company Name, Email, and Phone are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const [newOrganizer] = await db
      .insert(organizers)
      .values({
        name: name.trim(),
        companyName: companyName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        city: city.trim(),
        verificationStatus,
        commissionType,
        commissionRate: Number(commissionRate),
        bankName: bankName?.trim() || null,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankIfsc: bankIfsc?.trim() || null,
        panNumber: panNumber?.trim() || null,
        gstin: gstin?.trim() || null,
      })
      .returning();

    // If initial password was supplied, also create organizer login in users table
    if (password && password.trim()) {
      const hashedPassword = hashPassword(password.trim());
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (existingUser.length > 0) {
        await db
          .update(users)
          .set({
            passwordHash: hashedPassword,
            role: 'organizer',
            fullName: name.trim(),
            phoneNumber: phone.trim(),
          })
          .where(eq(users.id, existingUser[0].id));
      } else {
        const generatedUid = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.insert(users).values({
          uid: generatedUid,
          email: cleanEmail,
          fullName: name.trim(),
          phoneNumber: phone.trim(),
          role: 'organizer',
          passwordHash: hashedPassword,
        });
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      actorId: actorId || 'operations',
      actorRole: 'operations',
      action: 'ORGANIZER_CREATED',
      entityType: 'organizer',
      entityId: String(newOrganizer.id),
      details: JSON.stringify({
        companyName: newOrganizer.companyName,
        commissionRate: newOrganizer.commissionRate,
        hasPasswordSet: Boolean(password),
      }),
    });

    return NextResponse.json({
      success: true,
      organizer: newOrganizer,
      hasLoginAccount: Boolean(password),
    });
  } catch (error: any) {
    console.error('Failed to create organizer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organizer' },
      { status: 500 }
    );
  }
}

// PATCH update organizer details, commission, and verification
export async function PATCH(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      organizerId,
      name,
      companyName,
      email,
      phone,
      city,
      verificationStatus,
      commissionType,
      commissionRate,
      bankName,
      bankAccountNumber,
      bankIfsc,
      panNumber,
      gstin,
      actorId,
    } = body;

    if (!organizerId) {
      return NextResponse.json(
        { error: 'Organizer ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;
    if (commissionType !== undefined) updateData.commissionType = commissionType;
    if (commissionRate !== undefined) updateData.commissionRate = Number(commissionRate);
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
    if (bankIfsc !== undefined) updateData.bankIfsc = bankIfsc;
    if (panNumber !== undefined) updateData.panNumber = panNumber;
    if (gstin !== undefined) updateData.gstin = gstin;

    const [updated] = await db
      .update(organizers)
      .set(updateData)
      .where(eq(organizers.id, Number(organizerId)))
      .returning();

    await db.insert(auditLogs).values({
      actorId: actorId || 'finance',
      actorRole: 'finance',
      action: 'ORGANIZER_UPDATED',
      entityType: 'organizer',
      entityId: String(organizerId),
      details: JSON.stringify(updateData),
    });

    return NextResponse.json({ success: true, organizer: updated });
  } catch (error: any) {
    console.error('Failed to update organizer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update organizer' },
      { status: 500 }
    );
  }
}
