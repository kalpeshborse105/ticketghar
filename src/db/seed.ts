import { db } from './index.ts';
import {
  users,
  organizers,
  venues,
  venueSections,
  seats,
  events,
  eventSessions,
  ticketTypes,
  seatInventory,
  orders,
  tickets,
  settlements,
  coupons,
  partnerLeads,
  auditLogs,
} from './schema.ts';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

async function seed() {
  console.log('--- Starting MahaTicket Database Seed ---');

  // Check if events already seeded
  const existingEvents = await db.select({ count: sql<number>`count(*)` }).from(events);
  if (Number(existingEvents[0]?.count || 0) > 0) {
    console.log('Database already has seeded data. Skipping seed.');
    process.exit(0);
  }

  // 1. Users (Admins, Scanners, Customers)
  console.log('Seeding users...');
  const [adminUser] = await db.insert(users).values({
    uid: 'admin-mahaticket-super',
    email: 'admin@mahaticket.in',
    fullName: 'Kalpesh Borse (Super Admin)',
    phoneNumber: '+91 98200 12345',
    role: 'super_admin',
    preferredLanguage: 'mr',
    city: 'Pune',
  }).returning();

  const [opsUser] = await db.insert(users).values({
    uid: 'ops-mahaticket-user',
    email: 'operations@mahaticket.in',
    fullName: 'Ananya Deshpande',
    phoneNumber: '+91 98200 67890',
    role: 'operations',
    preferredLanguage: 'mr',
    city: 'Mumbai',
  }).returning();

  const [scannerUser] = await db.insert(users).values({
    uid: 'scanner-balgandharva-01',
    email: 'gate1@mahaticket.org',
    fullName: 'Ramesh Kulkarni (Gate 1 Scanner)',
    phoneNumber: '+91 98200 54321',
    role: 'scanner',
    preferredLanguage: 'mr',
    city: 'Pune',
  }).returning();

  const [customerUser] = await db.insert(users).values({
    uid: 'cust-demo-101',
    email: 'sachin.patil@mahaticket.com',
    fullName: 'Sachin Patil',
    phoneNumber: '+91 98233 44556',
    role: 'customer',
    preferredLanguage: 'mr',
    city: 'Pune',
  }).returning();

  // 2. Organizers (Manually vetted by MahaTicket Company)
  console.log('Seeding organizers...');
  const [orgBhadipa] = await db.insert(organizers).values({
    name: 'Paula McGlynn & Sarang Sathaye',
    companyName: 'Bhadipa Productions LLP',
    email: 'events@mahaticket.com',
    phone: '+91 98201 11223',
    city: 'Pune',
    verificationStatus: 'verified',
    commissionType: 'percentage',
    commissionRate: 650, // 6.5%
    bankName: 'HDFC Bank, FC Road Branch',
    bankAccountNumber: '50200049281723',
    bankIfsc: 'HDFC0000149',
    panNumber: 'AABCB1234F',
    gstin: '27AABCB1234F1Z5',
  }).returning();

  const [orgNatyasampada] = await db.insert(organizers).values({
    name: 'Anant Panshikar',
    companyName: 'Natyasampada Commercial Theatres',
    email: 'natyasampada@mahaticket.com',
    phone: '+91 98210 99887',
    city: 'Mumbai',
    verificationStatus: 'verified',
    commissionType: 'percentage',
    commissionRate: 500, // 5.0%
    bankName: 'State Bank of India, Shivaji Park',
    bankAccountNumber: '38192048591',
    bankIfsc: 'SBIN0001422',
    panNumber: 'AAACN4920K',
    gstin: '27AAACN4920K1ZX',
  }).returning();

  const [orgSwaramadhuri] = await db.insert(organizers).values({
    name: 'Mahesh Kale Arts Foundation',
    companyName: 'Swaramadhuri Cultural Trust',
    email: 'info@mahaticket.org',
    phone: '+91 98220 33445',
    city: 'Pune',
    verificationStatus: 'verified',
    commissionType: 'percentage',
    commissionRate: 600, // 6.0%
    bankName: 'Bank of Maharashtra, Bajirao Road',
    bankAccountNumber: '60192847291',
    bankIfsc: 'MAHB0000004',
    panNumber: 'AABTS9921E',
    gstin: '27AABTS9921E1Z0',
  }).returning();

  // 3. Venues
  console.log('Seeding venues...');
  const [venueBalgandharva] = await db.insert(venues).values({
    name: 'Bal Gandharva Ranga Mandir',
    nameMr: 'बालगंधर्व रंगमंदिर',
    address: 'JM Road, Shivajinagar, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411005',
    latitude: '18.5204',
    longitude: '73.8567',
    facilities: JSON.stringify(['AC Auditorium', 'Wheelchair Ramp', 'Cafeteria', 'VIP Parking', 'Sound System Pro']),
    totalCapacity: 600,
    hasSeatLayout: 1,
  }).returning();

  const [venueShivajiMandir] = await db.insert(venues).values({
    name: 'Shivaji Mandir Natyagruha',
    nameMr: 'श्री छत्रपती शिवाजी मंदिर नाट्यगृह',
    address: 'Near Plaza Cinema, Dadar West, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400028',
    latitude: '19.0178',
    longitude: '72.8478',
    facilities: JSON.stringify(['Heritage Hall', 'AC', 'Metro Connected', 'Snack Bar']),
    totalCapacity: 500,
    hasSeatLayout: 1,
  }).returning();

  const [venueYashwantrao] = await db.insert(venues).values({
    name: 'Yashwantrao Chavan Natyagruha',
    nameMr: 'यशवंतराव चव्हाण नाट्यगृह',
    address: 'Kothrud, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    latitude: '18.5074',
    longitude: '73.8077',
    facilities: JSON.stringify(['Spacious Foyer', 'AC', 'Elevator', 'Four-Wheeler Parking']),
    totalCapacity: 550,
    hasSeatLayout: 1,
  }).returning();

  const [venueDeshpandeHall] = await db.insert(venues).values({
    name: 'Dr. Vasantrao Deshpande Hall',
    nameMr: 'डॉ. वसंतराव देशपांडे सभागृह',
    address: 'Civil Lines, Nagpur',
    city: 'Nagpur',
    state: 'Maharashtra',
    pincode: '440001',
    latitude: '21.1458',
    longitude: '79.0882',
    facilities: JSON.stringify(['Acoustic Pro', 'AC', 'Central Nagpur']),
    totalCapacity: 700,
    hasSeatLayout: 1,
  }).returning();

  // 4. Venue Sections for Bal Gandharva (Balcony & Orchestra Floor)
  console.log('Seeding venue sections and seats...');
  const [secBalcony] = await db.insert(venueSections).values({
    venueId: venueBalgandharva.id,
    name: 'Balcony Premium',
    nameMr: 'बाल्कनी प्रीमियम',
    rowsCount: 3,
    colsCount: 8,
    basePrice: 50000, // ₹500.00
    accessible: 0,
  }).returning();

  const [secOrchestra] = await db.insert(venueSections).values({
    venueId: venueBalgandharva.id,
    name: 'Stall / Orchestra Gold',
    nameMr: 'स्टॉल / सुवर्ण बैठक',
    rowsCount: 4,
    colsCount: 8,
    basePrice: 35000, // ₹350.00
    accessible: 1,
  }).returning();

  // Generate physical seats for Bal Gandharva
  const createdSeats: any[] = [];
  const rows = ['A', 'B', 'C'];
  for (const r of rows) {
    for (let c = 1; c <= 8; c++) {
      const isAcc = r === 'C' && c <= 2 ? 1 : 0;
      const [s] = await db.insert(seats).values({
        venueId: venueBalgandharva.id,
        sectionId: secBalcony.id,
        rowLabel: r,
        seatNumber: c,
        seatCode: `BAL-${r}${c.toString().padStart(2, '0')}`,
        tier: 'platinum',
        isAccessible: isAcc,
      }).returning();
      createdSeats.push(s);
    }
  }

  const stallRows = ['D', 'E', 'F', 'G'];
  for (const r of stallRows) {
    for (let c = 1; c <= 8; c++) {
      const [s] = await db.insert(seats).values({
        venueId: venueBalgandharva.id,
        sectionId: secOrchestra.id,
        rowLabel: r,
        seatNumber: c,
        seatCode: `STL-${r}${c.toString().padStart(2, '0')}`,
        tier: 'gold',
        isAccessible: 0,
      }).returning();
      createdSeats.push(s);
    }
  }

  // 5. Events
  console.log('Seeding events...');
  const now = new Date();

  // Event 1: Marathi Play - Punha Sahi Re Sahi
  const [event1] = await db.insert(events).values({
    organizerId: orgNatyasampada.id,
    venueId: venueBalgandharva.id,
    title: 'Punha Sahi Re Sahi (पुन्हा सही रे सही)',
    titleMr: 'पुन्हा सही रे सही - भारत जाधव विशेष',
    slug: 'punha-sahi-re-sahi-pune',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'Marathi',
    ageGuidance: 'U',
    durationMinutes: 165,
    description: 'The record-breaking Marathi comedy masterwork starring Bharat Jadhav in quad-roles. A laugh riot exploring mistaken identities, family squabbles, and iconic comic timing that has entertained millions across Maharashtra.',
    descriptionMr: 'मराठी रंगभूमीचा इतिहास घडवणारे महानाट्य! सुपरस्टार भारत जाधव यांच्या चौपदरी भूमिकेत हास्याची चौफेर आतषबाजी. संपूर्ण कुटुंबासह पोट धरून हसवणारे निखळ कौटुंबिक नाटक.',
    posterUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1600&q=80',
    status: 'published',
    featured: 1,
    convenienceFeeType: 'flat',
    convenienceFeeValue: 3000, // ₹30.00
    gstPercent: 18,
    cancellationPolicy: 'cancellable_up_to_4hr',
  }).returning();

  // Event 2: Music - Sur Nava Dhyas Nava Live Concert
  const [event2] = await db.insert(events).values({
    organizerId: orgSwaramadhuri.id,
    venueId: venueBalgandharva.id,
    title: 'Sur Nava Dhyas Nava - Mahasangeet Rajani',
    titleMr: 'सूर नवा ध्यास नवा - महासंगीत रजनी (पं. शौनक अभिषेकी व महेश काळे)',
    slug: 'sur-nava-dhyas-nava-pune',
    category: 'music',
    categoryMr: 'संगीत व मैफिली',
    language: 'Marathi',
    ageGuidance: 'U',
    durationMinutes: 180,
    description: 'An enchanting evening of Natyasangeet, Abhang, Bhavgeet, and classical symphonies featuring National Award Winner Mahesh Kale and disciples of Pt. Jitendra Abhisheki.',
    descriptionMr: 'नाट्यसंगीत, भक्तीरंग आणि शास्त्रीय रागांची स्वर्गीय मैफल! राष्ट्रीय पुरस्कार विजेते महेश काळे आणि दिग्गज संगीतकारांचे थेट सादरीकरण.',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
    status: 'published',
    featured: 1,
    convenienceFeeType: 'flat',
    convenienceFeeValue: 3500, // ₹35.00
    gstPercent: 18,
  }).returning();

  // Event 3: Comedy - Bhadipa Live Standup Special
  const [event3] = await db.insert(events).values({
    organizerId: orgBhadipa.id,
    venueId: venueYashwantrao.id,
    title: 'Bhadipa Standup Night: Aai Shapath!',
    titleMr: 'भाडिपा स्टँडअप नाईट: आई शपथ! (सारंग, मंदार आणि टोळी)',
    slug: 'bhadipa-aai-shapath-pune',
    category: 'comedy',
    categoryMr: 'स्टँडअप कॉमेडी',
    language: 'Marathi',
    ageGuidance: 'U/A 16+',
    durationMinutes: 120,
    description: 'Fresh relatable Marathi observational humor about Pune-Mumbai rivalry, engineering misadventures, Indian weddings, and authentic Maharashtrian households.',
    descriptionMr: 'पुणेरी पाट्या, मुंबईची घाई आणि अस्सल मराठी माणसाचे विनोदी किस्से! भाडिपाच्या लोकप्रिय कलाकारांचा अफलातून स्टँडअप कॉमेडी शो.',
    posterUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1600&q=80',
    status: 'published',
    featured: 1,
    convenienceFeeType: 'flat',
    convenienceFeeValue: 2500,
    gstPercent: 18,
  }).returning();

  // Event 4: Cultural - Lavani & Folk Splendour
  const [event4] = await db.insert(events).values({
    organizerId: orgNatyasampada.id,
    venueId: venueShivajiMandir.id,
    title: 'Sangeet Bari & Lavani Vaibhav 2026',
    titleMr: 'संगीत बारी व लावणी वैभव २०२६ (मुंबई महामहोत्सव)',
    slug: 'lavani-vaibhav-mumbai-2026',
    category: 'cultural',
    categoryMr: 'सांस्कृतिक महोत्सव',
    language: 'Marathi',
    ageGuidance: 'U',
    durationMinutes: 150,
    description: 'A traditional tribute to Maharashtra’s folk theatre heritage, Baithakichi Lavani, Gondhal, and Shahiri Powada performed by master artistes.',
    descriptionMr: 'बैठकीची लावणी, शाहिरी पोवाडा आणि महाराष्ट्राच्या लोककलांचा अद्वितीय महोत्सव दादरच्या छत्रपती शिवाजी मंदिरात.',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
    status: 'published',
    featured: 0,
    convenienceFeeType: 'flat',
    convenienceFeeValue: 3000,
    gstPercent: 18,
  }).returning();

  // Event 5: Workshop - Warli Art Masterclass
  const [event5] = await db.insert(events).values({
    organizerId: orgSwaramadhuri.id,
    venueId: venueDeshpandeHall.id,
    title: 'Authentic Warli Folk Art & Pigment Workshop',
    titleMr: 'पारंपरिक वारली आदिवासी चित्रकला कार्यशाळा',
    slug: 'warli-art-workshop-nagpur',
    category: 'workshops',
    categoryMr: 'कार्यशाळा',
    language: 'Marathi & Hindi',
    ageGuidance: 'U',
    durationMinutes: 240,
    description: 'Learn sacred geometric motifs, rice pigment painting, canvas preparation, and tribal storytelling from indigenous Palghar master artisans.',
    descriptionMr: 'वारली आदिवासी कलेची प्राचीन परंपरा, नैसर्गिक रंग बनवणे आणि चित्रकलेचे बारकावे प्रत्यक्ष आदिवासी गुरूकडून शिका.',
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80',
    status: 'published',
    featured: 0,
    convenienceFeeType: 'flat',
    convenienceFeeValue: 2000,
    gstPercent: 18,
  }).returning();

  // 6. Sessions for Event 1 (Punha Sahi Re Sahi)
  console.log('Seeding sessions and ticket types...');
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(17, 0, 0, 0); // 5:00 PM
  const session1EndTime = new Date(tomorrow.getTime() + 165 * 60000);

  const dayAfter = new Date(Date.now() + 2 * 86400000);
  dayAfter.setHours(20, 30, 0, 0); // 8:30 PM Night Show
  const session2EndTime = new Date(dayAfter.getTime() + 165 * 60000);

  const [session1] = await db.insert(eventSessions).values({
    eventId: event1.id,
    sessionStartTime: tomorrow,
    sessionEndTime: session1EndTime,
    status: 'active',
  }).returning();

  const [session2] = await db.insert(eventSessions).values({
    eventId: event1.id,
    sessionStartTime: dayAfter,
    sessionEndTime: session2EndTime,
    status: 'active',
  }).returning();

  // Sessions for Event 2 (Music)
  const sunday = new Date(Date.now() + 4 * 86400000);
  sunday.setHours(18, 0, 0, 0);
  const [sessionMusic] = await db.insert(eventSessions).values({
    eventId: event2.id,
    sessionStartTime: sunday,
    sessionEndTime: new Date(sunday.getTime() + 180 * 60000),
    status: 'active',
  }).returning();

  // 7. Ticket Types for Session 1 (Punha Sahi Re Sahi)
  const [ttBalcony] = await db.insert(ticketTypes).values({
    eventId: event1.id,
    sessionId: session1.id,
    sectionId: secBalcony.id,
    name: 'Balcony Premium',
    nameMr: 'बाल्कनी प्रीमियम',
    price: 50000, // ₹500
    totalQuota: 24,
    availableQuota: 21,
    isSeated: 1,
  }).returning();

  const [ttOrchestra] = await db.insert(ticketTypes).values({
    eventId: event1.id,
    sessionId: session1.id,
    sectionId: secOrchestra.id,
    name: 'Stall Gold',
    nameMr: 'स्टॉल सुवर्ण',
    price: 35000, // ₹350
    totalQuota: 32,
    availableQuota: 30,
    isSeated: 1,
  }).returning();

  // Ticket types for Music event (General + VIP)
  await db.insert(ticketTypes).values([
    {
      eventId: event2.id,
      sessionId: sessionMusic.id,
      name: 'Platinum Baithak',
      nameMr: 'प्लॅटिनम बैठक',
      price: 80000, // ₹800
      totalQuota: 100,
      availableQuota: 95,
      isSeated: 0,
    },
    {
      eventId: event2.id,
      sessionId: sessionMusic.id,
      name: 'Rasik Gallery',
      nameMr: 'रसिक प्रेक्षक गॅलरी',
      price: 40000, // ₹400
      totalQuota: 250,
      availableQuota: 240,
      isSeated: 0,
    },
  ]);

  // 8. Seat Inventory for Session 1
  console.log('Seeding seat inventory for Session 1...');
  for (const s of createdSeats) {
    const isBalcony = s.sectionId === secBalcony.id;
    const ttId = isBalcony ? ttBalcony.id : ttOrchestra.id;

    // Mark 2 seats as booked, 1 seat as held, rest available
    let status = 'available';
    let heldBy = null;
    let expires = null;

    if (s.seatCode === 'BAL-A01' || s.seatCode === 'BAL-A02') {
      status = 'booked';
    } else if (s.seatCode === 'BAL-A05') {
      status = 'held';
      heldBy = 'sample-guest-hold';
      expires = new Date(Date.now() + 8 * 60000); // 8 mins hold
    }

    await db.insert(seatInventory).values({
      sessionId: session1.id,
      seatId: s.id,
      ticketTypeId: ttId,
      status,
      heldByUserId: heldBy,
      holdExpiresAt: expires,
    });
  }

  // Real orders only (no fake/demo seeds)
  console.log('Skipping demo orders: only real user bookings are stored.');

  // 10. Initial Settlement Record in Ledger
  console.log('Seeding settlement ledger...');
  const ticketFaceVal = 100000;
  const platFee = 4000;
  const tax = 720;
  const orgComm = Math.round((ticketFaceVal * orgNatyasampada.commissionRate) / 10000); // 5% = ₹50
  const netPayable = ticketFaceVal - orgComm; // ₹950

  await db.insert(settlements).values({
    settlementReference: 'SETTLE-2026-001',
    organizerId: orgNatyasampada.id,
    eventId: event1.id,
    totalGrossTicketSales: ticketFaceVal,
    totalPlatformFeesCollected: platFee,
    totalPaymentGatewayCost: 2140,
    totalTaxCollected: tax,
    platformCommissionEarned: orgComm,
    totalRefundDeductions: 0,
    netPayableToOrganizer: netPayable,
    status: 'pending',
  });

  // 11. Coupons
  console.log('Seeding coupons...');
  await db.insert(coupons).values([
    {
      code: 'MAHA50',
      discountType: 'flat',
      discountValue: 5000, // ₹50.00
      minOrderValue: 40000, // min ₹400
      maxDiscount: 5000,
      active: 1,
    },
    {
      code: 'NATAK10',
      discountType: 'percentage',
      discountValue: 1000, // 10%
      minOrderValue: 30000,
      maxDiscount: 10000, // max ₹100
      active: 1,
    },
  ]);

  // 12. Partner Leads (Organizer MVP funnel)
  console.log('Seeding partner leads...');
  await db.insert(partnerLeads).values([
    {
      organizerName: 'Makarand Anaspure',
      companyName: 'Sahyadri Natya Manch',
      mobile: '+91 98222 77889',
      email: 'makarand.anaspure@sahyadri.org',
      eventName: 'झोपी गेलेला जागी झाला (Zopi Gelela Jagi Zhala)',
      category: 'plays',
      city: 'Pune',
      venuePreference: 'Bal Gandharva Ranga Mandir',
      proposedDate: '2026-11-15',
      expectedCapacity: 600,
      ticketPriceRange: '₹300 - ₹600',
      websiteOrSocial: 'instagram.com/sahyadrinatya',
      message: 'Looking for verified listing on MahaTicket for our 50th show milestone celebration in Pune.',
      status: 'new',
    },
    {
      organizerName: 'Kunal Deshmukh',
      companyName: 'Konkan Cultural Wave',
      mobile: '+91 98200 88771',
      email: 'kunal@konkanwave.com',
      eventName: 'सिंधुदुर्ग दशावतार महानाट्य (Sindhudurg Dashavatar)',
      category: 'cultural',
      city: 'Mumbai',
      venuePreference: 'Shivaji Mandir Dadar',
      proposedDate: '2026-12-05',
      expectedCapacity: 500,
      ticketPriceRange: '₹250 - ₹500',
      status: 'contacted',
    }
  ]);

  // 13. Audit Log
  console.log('Seeding audit logs...');
  await db.insert(auditLogs).values({
    actorId: adminUser.uid,
    actorRole: 'super_admin',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'platform',
    entityId: 'mahaticket-core',
    details: JSON.stringify({ message: 'MahaTicket platform initialized with Maharashtra production seed catalog' }),
  });

  console.log('--- MahaTicket Database Seed Complete! ---');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
