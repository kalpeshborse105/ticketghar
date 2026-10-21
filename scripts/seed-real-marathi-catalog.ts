/**
 * Seed Real Marathi Plays & Events Catalog (BookMyShow / TicketKhidkee style)
 * With authentic synopsis, Marathi titles, cast & crew, high-res posters,
 * and Informative Showcase events (no theater allocated / 0 sessions).
 *
 * Usage: npx tsx --env-file=.env scripts/seed-real-marathi-catalog.ts
 */
import { db } from '../src/db/index.ts';
import {
  events,
  venues,
  organizers,
  eventSessions,
  ticketTypes,
  venueSections,
  seats,
  seatInventory,
} from '../src/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

interface CatalogEntry {
  slug: string;
  title: string;
  titleMr: string;
  category: string;
  categoryMr: string;
  language: string;
  ageGuidance: string;
  durationMinutes: number;
  tag: string;
  featured: number;
  posterUrl: string;
  bannerUrl: string;
  description: string;
  descriptionMr: string;
  castCrew: Array<{ name: string; nameMr: string; role: string; roleMr: string; avatarUrl?: string }>;
  isInformational?: boolean; // If true: 0 sessions / theater unallocated
}

const MARATHI_CATALOG: CatalogEntry[] = [
  {
    slug: 'punha-sahi-re-sahi',
    title: 'Punha Sahi Re Sahi',
    titleMr: 'पुन्हा सही रे सही',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U (कौटुंबिक)',
    durationMinutes: 165,
    tag: 'हाऊसफुल्ल',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    description: 'Punha Sahi Re Sahi is a legendary Marathi comedy play starring Bharat Jadhav in four distinct and unforgettable avatars. A laugh riot from start to finish.',
    descriptionMr: 'मराठी रंगभूमीच्या इतिहासातील सर्वाधिक लोकप्रिय आणि विक्रमी हास्यनाटक! भरत जाधव यांच्या एकाच नाटकात चार वेगवेगळ्या आणि भन्नाट भूमिका. निखळ कौटुंबिक मनोरंजन आणि हास्याचे तुफान फवारे.',
    castCrew: [
      { name: 'Bharat Jadhav', nameMr: 'भरत जाधव', role: 'Lead Actor (4 Roles)', roleMr: 'मुख्य भूमिका (४ पात्रे)', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Kedar Shinde', nameMr: 'केदार शिंदे', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Ajit Parab', nameMr: 'अजित परब', role: 'Music Director', roleMr: 'संगीतकार', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
    ],
  },
  {
    slug: 'ghashiram-kotwal',
    title: 'Ghashiram Kotwal',
    titleMr: 'घाशीराम कोतवाल',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U/A (१२+)',
    durationMinutes: 150,
    tag: 'क्लासिक',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
    description: 'Vijay Tendulkar masterwork directed by Dr. Jabbar Patel, combining traditional folk music, human chorus and intense political satire of the Peshwa era.',
    descriptionMr: 'विजय तेंडुलकर यांचे अजरामर नाटक आणि डॉ. जब्बार पटेल यांचे दिग्दर्शन! पारंपारिक मानवी पडद्याची रचना, संगीत व पेशवेकालीन सत्ताकारणाचे तीक्ष्ण वास्तव मांडणारे जागतिक दर्जाचे नाट्य.',
    castCrew: [
      { name: 'Mohan Agashe', nameMr: 'डॉ. मोहन आगाशे', role: 'Nana Phadnavis', roleMr: 'नाना फडणवीस', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Dr. Jabbar Patel', nameMr: 'डॉ. जब्बार पटेल', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Bhaskar Chandavarkar', nameMr: 'भास्कर चंदावरकर', role: 'Music Director', roleMr: 'संगीतकार', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
    ],
  },
  {
    slug: 'aai-retire-hote',
    title: 'Aai Retire Hote',
    titleMr: 'आई रिटायर होतेय',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U (कौटुंबिक)',
    durationMinutes: 140,
    tag: 'भावनिक',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    description: 'A poignant and heartwarming family drama highlighting the selfless sacrifices of a mother and what happens when she decides to take a retirement from domestic duties.',
    descriptionMr: 'कुटुंबासाठी आयुष्य वेचणाऱ्या आईच्या स्वाभिमानाची आणि जाणिवांची हृदयस्पर्शी गोष्ट. जेव्हा आई घरकामातून निवृत्त होण्याचा निर्णय घेते, तेव्हा उलगडणारे कौटुंबिक नातेसंबंध आणि भावनिक नाट्य.',
    castCrew: [
      { name: 'Nivedita Saraf', nameMr: 'निवेदिता सराफ', role: 'Lead Actress (Aai)', roleMr: 'मुख्य भूमिका (आई)', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { name: 'Mangesh Kadam', nameMr: 'मंगेश कदम', role: 'Father / Actor', roleMr: 'वडील / कलाकार', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Ashok Patki', nameMr: 'अशोक पत्की', role: 'Music Director', roleMr: 'संगीतकार', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
    ],
  },
  {
    slug: 'ti-phulrani',
    title: 'Ti Phulrani',
    titleMr: 'ती फुलराणी',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U (सर्व वयोगट)',
    durationMinutes: 160,
    tag: 'सुपरहिट',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
    description: 'P.L. Deshpande adaptation of George Bernard Shaw’s Pygmalion. The fascinating journey of flower seller Manjula transformed into an elite aristocratic lady.',
    descriptionMr: 'पु. ल. देशपांडे यांचे अजरामर नाट्यरूपांतर! फुलं विकणाऱ्या साध्या मंजुळेला अभिजात भाषेचे धडे देऊन उच्चभ्रू समाजात वावरण्यायोग्य बनवण्याचे प्राध्यापक बरवे यांचे आव्हान आणि त्यानंतरचे रंगतदार नाट्य.',
    castCrew: [
      { name: 'Hemangi Kavi', nameMr: 'हेमांगी कवी', role: 'Manjula (Phulrani)', roleMr: 'मंजुळा (फुलराणी)', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' },
      { name: 'Dr. Girish Oak', nameMr: 'डॉ. गिरीश ओक', role: 'Prof. Barve', roleMr: 'प्रा. बरवे', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Rajesh Deshpande', nameMr: 'राजेश देशपांडे', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
    ],
  },
  {
    slug: 'varhad-nighalay-londonla',
    title: 'Varhad Nighalay Londonla',
    titleMr: 'वऱ्हाड निघालं लंडनला',
    category: 'comedy',
    categoryMr: 'कॉमेडी',
    language: 'मराठी',
    ageGuidance: 'U (कौटुंबिक)',
    durationMinutes: 135,
    tag: 'एकपात्री',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
    description: 'Guinness World Record holding one-man show originally by Prof. Laxman Deshpande, brilliantly revived by Sandeep Pathak playing 52 distinct characters.',
    descriptionMr: 'गिनीज बुक ऑफ वर्ल्ड रेकॉर्ड्स नोंदवलेले प्रा. लक्ष्मण देशपांडे यांचे अजरामर एकपात्री नाटक! संदीप पाठक यांनी एकट्याने तब्बल ५२ वेगवेगळ्या पात्रांचा केलेला अप्रतिम आणि हास्यस्फोटक अभिनय.',
    castCrew: [
      { name: 'Sandeep Pathak', nameMr: 'संदीप पाठक', role: 'Solo Performer (52 Characters)', roleMr: 'एकपात्री कलाकार (५२ पात्रे)', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Prof. Laxman Deshpande', nameMr: 'प्रा. लक्ष्मण देशपांडे', role: 'Original Playwright', roleMr: 'मूळ लेखक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
    ],
  },
  {
    slug: 'eka-lagnachi-pudhchi-gosht',
    title: 'Eka Lagnachi Pudhchi Gosht',
    titleMr: 'एका लग्नाची पुढची गोष्ट',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U (कौटुंबिक)',
    durationMinutes: 155,
    tag: 'विशेष शिफारस',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    description: 'Prashant Damle and Kavita Lad return in the blockbuster sequel exploring marriage, middle age, communication gaps and hilarious everyday family squabbles.',
    descriptionMr: 'प्रशांत दामले आणि कविता लाड-मेढेकर यांची सुपरडुपर जोडी पुन्हा रंगभूमीवर! संसारातील २० वर्षांनंतरची आंबट-गोड वळणे, मध्यमवयीन जोडीदारांमधील संवाद आणि निखळ कौटुंबिक विनोद.',
    castCrew: [
      { name: 'Prashant Damle', nameMr: 'प्रशांत दामले', role: 'Lead Actor', roleMr: 'मुख्य भूमिका', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Kavita Lad', nameMr: 'कविता लाड-मेढेकर', role: 'Lead Actress', roleMr: 'मुख्य भूमिका', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { name: 'Adwait Dadarkar', nameMr: 'अद्वैत दादरकर', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
    ],
  },
  {
    slug: 'sur-nava-dhyas-nava',
    title: 'Sur Nava Dhyas Nava',
    titleMr: 'सूर नवा ध्यास नवा',
    category: 'music',
    categoryMr: 'संगीत',
    language: 'मराठी',
    ageGuidance: 'U (सर्व वयोगट)',
    durationMinutes: 180,
    tag: 'थेट संगीत',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    description: 'Grand live musical concert featuring Maharashtra’s finest classical and playback singers presenting Natyasangeet, Bhavgeet and Abhangas.',
    descriptionMr: 'महाराष्ट्राच्या लाडक्या गायकांचा सुरेल संगीतमय नजराणा! भावगीते, नाट्यसंगीत, लावणी आणि भक्तीगीतांची अविस्मरणीय मैफल.',
    castCrew: [
      { name: 'Avadhoot Gupte', nameMr: 'अवधूत गुप्ते', role: 'Singer & Host', roleMr: 'गायक व सूत्रसंचालक', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Mahesh Kale', nameMr: 'महेश काळे', role: 'Classical Maestro', roleMr: 'शास्त्रीय गायक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Aarya Ambekar', nameMr: 'आर्या आंबेकर', role: 'Playback Singer', roleMr: 'गायिका', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
    ],
  },
  {
    // INFORMATIVE SHOWCASE (NO SESSIONS ALLOCATED / THEATRE ANNOUNCING SOON)
    slug: 'mamachya-govyala-jauya',
    title: 'Mamachya Govyala Jauya',
    titleMr: 'मामाच्या गोव्याला जाऊया',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U (कौटुंबिक)',
    durationMinutes: 150,
    tag: 'माहितीपर शो',
    featured: 1,
    posterUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
    description: 'Mamachya Govyala Jauya is an eagerly awaited Marathi comedy family drama taking audiences on a hilarious adventure. Theater and show dates to be announced soon.',
    descriptionMr: 'मामाच्या गोव्याला जाऊया हे मराठी रंगभूमीवरील एक निखळ आणि खळखळून हसवणारे कौटुंबिक नाटक आहे. कुटुंबातील गमतीजमती, गोव्याची रंजक सफर आणि नाट्यमय वळणे. या नाटकाचे प्रयोग व नाट्यगृह लवकरच जाहीर करण्यात येतील.',
    castCrew: [
      { name: 'Prashant Damle', nameMr: 'प्रशांत दामले', role: 'Lead Actor', roleMr: 'मुख्य भूमिका', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { name: 'Kavita Lad', nameMr: 'कविता लाड-मेढेकर', role: 'Lead Actress', roleMr: 'मुख्य भूमिका', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { name: 'Vijay Kenkre', nameMr: 'विजय केंकरे', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Ashok Patki', nameMr: 'अशोक पत्की', role: 'Music Director', roleMr: 'संगीतकार', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
    ],
    isInformational: true, // NO SESSIONS / THEATRE ALLOCATED
  },
  {
    slug: 'chhapa-kata',
    title: 'Chhapa Kata',
    titleMr: 'छापा काटा',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'मराठी',
    ageGuidance: 'U/A (कौटुंबिक)',
    durationMinutes: 145,
    tag: 'गाजलेले नाटक',
    featured: 0,
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    description: 'An insightful exploration of modern mother-daughter relationship dynamics, career aspirations, and emotional conflicts written with sharp, realistic dialogue.',
    descriptionMr: 'आई आणि मुलगी यांच्यातील नाजूक नाते, संशय, प्रेम आणि स्वातंत्र्याची जाणीव यांचा सुरेख संगम! मुक्ता बर्वे आणि रीमा लागू यांच्या अभिनयाने सजलेले गाजलेले नाटक.',
    castCrew: [
      { name: 'Mukta Barve', nameMr: 'मुक्ता बर्वे', role: 'Daughter (Lead)', roleMr: 'मुलगी (मुख्य भूमिका)', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { name: 'Chandrakant Kulkarni', nameMr: 'चंद्रकांत कुलकर्णी', role: 'Director', roleMr: 'दिग्दर्शक', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { name: 'Sameer Joshi', nameMr: 'समीर जोशी', role: 'Writer', roleMr: 'लेखक', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
    ],
  },
];

async function run() {
  console.log('🎭 Seeding Real Marathi Catalog & Informative Shows...');

  // 1. Get or create primary Marathi Organizer
  let [org] = await db.select().from(organizers).limit(1);
  if (!org) {
    const [createdOrg] = await db
      .insert(organizers)
      .values({
        name: 'Maharashtra Natya Parishad',
        companyName: 'अखिल भारतीय मराठी नाट्य परिषद',
        email: 'natya@mahaticket.com',
        phone: '9822012345',
        city: 'Pune',
        verificationStatus: 'verified',
      })
      .returning();
    org = createdOrg;
  }

  // 2. Get or create Pune venue (Bal Gandharva Rangmandir)
  let [venue] = await db.select().from(venues).where(eq(venues.city, 'Pune')).limit(1);
  if (!venue) {
    const [createdVenue] = await db
      .insert(venues)
      .values({
        name: 'Bal Gandharva Rangmandir',
        nameMr: 'बालगंधर्व रंगमंदिर',
        address: 'झाशीची राणी लक्ष्मीबाई चौक, जे. एम. रोड, शिवाजीनगर',
        city: 'Pune',
        state: 'Maharashtra',
        totalCapacity: 800,
        hasSeatLayout: 1,
        facilities: 'वातानुकूलित सभागृह, विनामूल्य वाहनतळ, कॅफेटेरिया, अत्याधुनिक ध्वनी यंत्रणा',
      })
      .returning();
    venue = createdVenue;
  }

  // 3. Ensure Sections exist (Balcony, Silver, Gold)
  const tierDefs = [
    { name: 'Balcony', nameMr: 'बाल्कनी', rows: 4, cols: 10, price: 30000 },
    { name: 'Silver', nameMr: 'सिल्व्हर', rows: 5, cols: 12, price: 45000 },
    { name: 'Gold', nameMr: 'गोल्ड', rows: 4, cols: 12, price: 60000 },
  ];

  for (const td of tierDefs) {
    let [sec] = await db
      .select()
      .from(venueSections)
      .where(and(eq(venueSections.venueId, venue.id), eq(venueSections.name, td.name)))
      .limit(1);

    if (!sec) {
      const [newSec] = await db
        .insert(venueSections)
        .values({
          venueId: venue.id,
          name: td.name,
          nameMr: td.nameMr,
          rowsCount: td.rows,
          colsCount: td.cols,
          basePrice: td.price,
        })
        .returning();
      sec = newSec;

      // Add physical seats for this section
      const seatRows: any[] = [];
      for (let r = 0; r < td.rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 1; c <= td.cols; c++) {
          seatRows.push({
            venueId: venue.id,
            sectionId: sec.id,
            rowLabel,
            seatNumber: c,
            seatCode: `${td.name.slice(0, 3).toUpperCase()}-${rowLabel}-${String(c).padStart(2, '0')}`,
            tier: td.name.toLowerCase(),
          });
        }
      }
      await db.insert(seats).values(seatRows);
    }
  }

  const sections = await db.select().from(venueSections).where(eq(venueSections.venueId, venue.id));
  const venueSeats = await db.select().from(seats).where(eq(seats.venueId, venue.id));

  // 4. Upsert events from MARATHI_CATALOG
  for (const item of MARATHI_CATALOG) {
    const castJson = JSON.stringify(item.castCrew);

    let [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.slug, item.slug))
      .limit(1);

    let eventId: number;

    if (existingEvent) {
      await db
        .update(events)
        .set({
          title: item.title,
          titleMr: item.titleMr,
          category: item.category,
          categoryMr: item.categoryMr,
          language: item.language,
          ageGuidance: item.ageGuidance,
          durationMinutes: item.durationMinutes,
          description: item.description,
          descriptionMr: item.descriptionMr,
          posterUrl: item.posterUrl,
          bannerUrl: item.bannerUrl,
          status: 'published',
          featured: item.featured,
          tag: item.tag,
          castCrew: castJson,
        })
        .where(eq(events.id, existingEvent.id));

      eventId = existingEvent.id;
      console.log(`✓ Updated event [${eventId}] ${item.titleMr}`);
    } else {
      const [inserted] = await db
        .insert(events)
        .values({
          organizerId: org.id,
          venueId: venue.id,
          title: item.title,
          titleMr: item.titleMr,
          slug: item.slug,
          category: item.category,
          categoryMr: item.categoryMr,
          language: item.language,
          ageGuidance: item.ageGuidance,
          durationMinutes: item.durationMinutes,
          description: item.description,
          descriptionMr: item.descriptionMr,
          posterUrl: item.posterUrl,
          bannerUrl: item.bannerUrl,
          status: 'published',
          featured: item.featured,
          tag: item.tag,
          castCrew: castJson,
        })
        .returning();

      eventId = inserted.id;
      console.log(`+ Inserted event [${eventId}] ${item.titleMr}`);
    }

    // 5. Handle Sessions:
    // If it's an informative show (like Mamachya Govyala Jauya):
    // Delete any sessions so it is strictly informative (0 sessions)
    if (item.isInformational) {
      await db.delete(eventSessions).where(eq(eventSessions.eventId, eventId));
      console.log(`ℹ️ Marked [${eventId}] ${item.titleMr} as INFORMATIVE SHOW (0 sessions, theater unallocated).`);
      continue;
    }

    // For bookable shows: ensure at least 2 sessions exist
    const existingSessions = await db
      .select()
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId));

    if (existingSessions.length === 0) {
      const showTimes = [
        { dayOffset: 1, startHour: 17, startMin: 0 },
        { dayOffset: 2, startHour: 20, startMin: 30 },
      ];

      for (const st of showTimes) {
        const start = new Date();
        start.setDate(start.getDate() + st.dayOffset);
        start.setHours(st.startHour, st.startMin, 0, 0);

        const end = new Date(start);
        end.setMinutes(start.getMinutes() + item.durationMinutes);

        const [session] = await db
          .insert(eventSessions)
          .values({
            eventId,
            sessionStartTime: start,
            sessionEndTime: end,
            status: 'active',
          })
          .returning();

        // Create ticket types and inventory
        for (const sec of sections) {
          const secSeats = venueSeats.filter((s) => s.sectionId === sec.id);
          const [tt] = await db
            .insert(ticketTypes)
            .values({
              eventId,
              sessionId: session.id,
              sectionId: sec.id,
              name: sec.name,
              nameMr: sec.nameMr,
              price: sec.basePrice,
              totalQuota: secSeats.length,
              availableQuota: secSeats.length,
              isSeated: 1,
            })
            .returning();

          const inventoryRows = secSeats.map((s) => ({
            sessionId: session.id,
            seatId: s.id,
            ticketTypeId: tt.id,
            status: 'available',
          }));

          if (inventoryRows.length > 0) {
            await db.insert(seatInventory).values(inventoryRows);
          }
        }
      }
      console.log(`🎟️ Created 2 sessions & seat inventory for [${eventId}] ${item.titleMr}`);
    }
  }

  console.log('✅ Real Marathi catalog & informative showcase successfully synchronized!');
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal seed error:', e);
  process.exit(1);
});
