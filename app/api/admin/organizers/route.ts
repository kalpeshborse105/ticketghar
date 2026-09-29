import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { organizers, auditLogs } from '@/src/db/schema.ts';
import { desc, eq } from 'drizzle-orm';

// GET all organizers with commercial terms
export async function GET() {
  try {
    const list = await db.select().from(organizers).orderBy(desc(organizers.id));
    return NextResponse.json({ organizers: list });
  } catch (error: any) {
    console.error('Failed to fetch organizers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizers' },
      { status: 500 }
    );
  }
}

// POST create verified organizer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      companyName,
      email,
      phone,
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
    } = body;

    if (!name || !companyName || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, Company Name, Email, and Phone are required' },
        { status: 400 }
      );
    }

    const [newOrganizer] = await db
      .insert(organizers)
      .values({
        name: name.trim(),
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
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
      }),
    });

    return NextResponse.json({ success: true, organizer: newOrganizer });
  } catch (error: any) {
    console.error('Failed to create organizer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organizer' },
      { status: 500 }
    );
  }
}

// PATCH update organizer details, commission, and verification
export async function PATCH(request: Request) {
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
    if (email !== undefined) updateData.email = email;
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
