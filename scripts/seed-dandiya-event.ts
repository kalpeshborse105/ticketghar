import { db } from '../src/db/index.ts';
import { events, eventSessions, ticketTypes, venues } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function seedDandiyaEvent() {
  console.log('Seeding Dandiya Nights and real cultural events into database...');

  // 1. Get or create a venue for Dandiya Nights
  const venueRows = await db.select().from(venues).where(eq(venues.name, 'Bal Gandharva Rang Mandir'));
  const venueId = venueRows[0]?.id || 1;

  // Check if Dandiya Nights already exists
  const existing = await db.select().from(events).where(eq(events.slug, 'dandiya-nights-2026'));
  if (existing.length > 0) {
    console.log('Dandiya Nights already exists (id:', existing[0].id, ')');
    return;
  }

  // Insert Dandiya Nights Event
  const [dandiya] = await db
    .insert(events)
    .values({
      organizerId: 1,
      venueId: venueId,
      title: 'Dandiya Nights 2026',
      titleMr: 'दांडिया रास महोत्सव २०२६',
      slug: 'dandiya-nights-2026',
      category: 'cultural',
      categoryMr: 'उत्सव / गरबा',
      language: 'Hindi / Gujarati / Marathi',
      ageGuidance: 'सर्व वयोगटांसाठी (All Ages)',
      description: 'Experience Maharashtra\'s most electrifying Dandiya & Garba celebration with live celebrity orchestra, traditional dhol tasha, ethnic food stalls, and non-stop dancing under royal palace pavilions. Win exciting daily prizes for best traditional attire & best dancer!',
      descriptionMr: 'महाराष्ट्रातील सर्वात भव्य दांडिया व गरबा रास महोत्सव! प्रसिद्ध गायक, लाइव्ह ढोल-ताशा ऑर्केस्ट्रा, पारंपरिक पोशाख स्पर्धा आणि चवदार खाद्यपदार्थांची मेजवानी. आपल्या मित्र-परिवारासह या भव्य उत्सवात सहभागी व्हा आणि आनंद लुटा!',
      posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=80',
      durationMinutes: 240,
      castCrew: JSON.stringify([
        { name: 'सचिन-जिगर (Sachin-Jigar)', role: 'मुख्य संगीतकार (Live Band)' },
        { name: 'प्रिती-पिंकी (Preeti-Pinky)', role: 'गायिका (Lead Vocalist)' },
        { name: 'डीजे अनिकेत (DJ Aniket)', role: 'डीजे व रिमिक्स (Folk DJ)' },
        { name: 'राजेश पटेल (Rajesh Patel)', role: 'आयोजक (Fest Director)' }
      ]),
      status: 'published',
      featured: 1,
    })
    .returning();

  console.log('Created Dandiya Nights event with ID:', dandiya.id);

  // Add 3 evening sessions
  const sessionDates = [
    new Date(Date.now() + 86400000 * 2), // Day after tomorrow
    new Date(Date.now() + 86400000 * 3),
    new Date(Date.now() + 86400000 * 4),
  ];

  for (const sDate of sessionDates) {
    sDate.setHours(19, 0, 0, 0); // 7:00 PM
    const endDate = new Date(sDate.getTime() + 4 * 3600000); // 11:00 PM

    const [session] = await db
      .insert(eventSessions)
      .values({
        eventId: dandiya.id,
        sessionStartTime: sDate,
        sessionEndTime: endDate,
        status: 'active',
      })
      .returning();

    // Add Ticket Types: General (₹350), VIP Pass (₹750), Couple Pass (₹1,200)
    await db.insert(ticketTypes).values([
      {
        eventId: dandiya.id,
        sessionId: session.id,
        name: 'General Pass',
        nameMr: 'सर्वसाधारण प्रवेशिका',
        price: 35000,
        totalQuota: 500,
        availableQuota: 420,
        isSeated: 0,
      },
      {
        eventId: dandiya.id,
        sessionId: session.id,
        name: 'VIP Arena Pass',
        nameMr: 'व्हीआयपी अरेना प्रवेश',
        price: 75000,
        totalQuota: 200,
        availableQuota: 145,
        isSeated: 0,
      },
      {
        eventId: dandiya.id,
        sessionId: session.id,
        name: 'Couple Pass',
        nameMr: 'युगुल प्रवेशिका (Couple Pass)',
        price: 120000,
        totalQuota: 150,
        availableQuota: 90,
        isSeated: 0,
      },
    ]);

    console.log('Created session & ticket types for:', sDate.toDateString());
  }

  console.log('✅ Dandiya Nights successfully seeded!');
}

seedDandiyaEvent().catch(console.error);
