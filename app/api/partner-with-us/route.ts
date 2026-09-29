import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { partnerLeads, auditLogs } from '@/src/db/schema.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      organizerName,
      companyName,
      mobile,
      email,
      eventName,
      category,
      city,
      venuePreference,
      proposedDate,
      expectedCapacity,
      ticketPriceRange,
      websiteOrSocial,
      message,
    } = body;

    if (!organizerName || !mobile || !email || !eventName || !category || !city) {
      return NextResponse.json(
        { error: 'Please provide all mandatory fields: name, mobile, email, event name, category, and city.' },
        { status: 400 }
      );
    }

    const [lead] = await db
      .insert(partnerLeads)
      .values({
        organizerName: organizerName.trim(),
        companyName: companyName ? companyName.trim() : organizerName.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        eventName: eventName.trim(),
        category: category.trim(),
        city: city.trim(),
        venuePreference: venuePreference || null,
        proposedDate: proposedDate || null,
        expectedCapacity: expectedCapacity ? parseInt(expectedCapacity, 10) : null,
        ticketPriceRange: ticketPriceRange || null,
        websiteOrSocial: websiteOrSocial || null,
        message: message || null,
        status: 'new',
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: `lead-${lead.id}`,
      actorRole: 'organizer_applicant',
      action: 'ORGANIZER_LEAD_SUBMITTED',
      entityType: 'partner_lead',
      entityId: String(lead.id),
      details: JSON.stringify({
        eventName: lead.eventName,
        city: lead.city,
        organizer: lead.organizerName,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'धन्यवाद! आपली नोंदणी यशस्वी झाली आहे. तिकीटघरची टीम २४ तासांत संपर्क करेल. (Thank you! Our onboarding team will contact you within 24 hours).',
      leadId: lead.id,
    });
  } catch (error: any) {
    console.error('Error submitting partner lead:', error);
    return NextResponse.json(
      { error: 'Failed to submit partner request. Please try again.' },
      { status: 500 }
    );
  }
}
