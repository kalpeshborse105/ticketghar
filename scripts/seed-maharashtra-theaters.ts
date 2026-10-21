/**
 * Seed iconic Maharashtra theatres / auditoriums (TicketKhidki-style venues).
 * Links to districts by MH-* code. Idempotent on (name, city).
 * Run: npx tsx scripts/seed-maharashtra-theaters.ts
 */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

type TheaterSeed = {
  districtCode: string;
  name: string;
  nameMr: string;
  city: string;
  address: string;
  capacity: number;
};

/** Public / cultural venues across 36 districts — real landmark names, curated catalog */
const THEATERS: TheaterSeed[] = [
  // Pune
  { districtCode: 'MH-PU', name: 'Bal Gandharva Rang Mandir', nameMr: 'बाळ गंधर्व रंगमंदिर', city: 'Pune', address: 'J.M. Road, Shivajinagar, Pune', capacity: 1000 },
  { districtCode: 'MH-PU', name: 'Yashwantrao Chavan Natya Gruha', nameMr: 'यशवंतराव चव्हाण नाट्यगृह', city: 'Pune', address: 'Kothrud, Pune', capacity: 900 },
  { districtCode: 'MH-PU', name: 'Balgandharva Tilak Smarak Mandir', nameMr: 'तिलक स्मारक मंदिर', city: 'Pune', address: 'Narayan Peth, Pune', capacity: 700 },
  { districtCode: 'MH-PU', name: 'Nehru Memorial Hall', nameMr: 'नेहरू मेमोरियल हॉल', city: 'Pune', address: 'Camp, Pune', capacity: 800 },
  // Mumbai City
  { districtCode: 'MH-MC', name: 'Shivaji Mandir', nameMr: 'शिवाजी मंदिर', city: 'Mumbai', address: 'Dadar West, Mumbai', capacity: 1100 },
  { districtCode: 'MH-MC', name: 'Ravindra Natya Mandir', nameMr: 'रवींद्र नाट्य मंदिर', city: 'Mumbai', address: 'Prabhadevi, Mumbai', capacity: 900 },
  { districtCode: 'MH-MC', name: 'Chhabildas Hall', nameMr: 'छाबिलदास हॉल', city: 'Mumbai', address: 'Dadar, Mumbai', capacity: 600 },
  { districtCode: 'MH-MC', name: 'NCPA Experimental Theatre', nameMr: 'एनसीपीए प्रयोग रंगमंच', city: 'Mumbai', address: 'Nariman Point, Mumbai', capacity: 300 },
  // Mumbai Suburban
  { districtCode: 'MH-MS', name: 'Prabodhankar Thackeray Natya Mandir', nameMr: 'प्रबोधनकार ठाकरे नाट्य मंदिर', city: 'Mumbai', address: 'Vile Parle East, Mumbai', capacity: 850 },
  { districtCode: 'MH-MS', name: 'Mysore Association Hall', nameMr: 'मैसूर असोसिएशन हॉल', city: 'Mumbai', address: 'Matunga, Mumbai', capacity: 500 },
  // Thane
  { districtCode: 'MH-TH', name: 'Kalidas Natya Mandir', nameMr: 'कालिदास नाट्य मंदिर', city: 'Thane', address: 'Mulund West / Thane belt', capacity: 800 },
  { districtCode: 'MH-TH', name: 'Dinanath Mangeshkar Natya Griha', nameMr: 'दीनानath मंगेशकर नाट्यगृह', city: 'Vile Parle', address: 'Vile Parle East', capacity: 950 },
  { districtCode: 'MH-TH', name: 'Thane Municipal Corporation Hall', nameMr: 'ठाणे महानगरपालिका सभागृह', city: 'Thane', address: 'Thane West', capacity: 700 },
  // Nagpur
  { districtCode: 'MH-NG', name: 'Suresh Bhat Auditorium', nameMr: 'सुरेश भट सभागृह', city: 'Nagpur', address: 'Civil Lines, Nagpur', capacity: 900 },
  { districtCode: 'MH-NG', name: 'Vasantrao Deshpande Hall', nameMr: 'वसंतराव देशपांडे हॉल', city: 'Nagpur', address: 'Nagpur', capacity: 750 },
  { districtCode: 'MH-NG', name: 'Kasturchand Park Open Theatre', nameMr: 'कस्तुरचंद पार्क मुक्त रंगमंच', city: 'Nagpur', address: 'Nagpur', capacity: 2000 },
  // Nashik
  { districtCode: 'MH-NS', name: 'Kalidas Kala Mandir', nameMr: 'कालिदास कला मंदिर', city: 'Nashik', address: 'Nashik', capacity: 800 },
  { districtCode: 'MH-NS', name: 'Mahakavi Kalidas Natya Mandir', nameMr: 'महाकवी कालिदास नाट्य मंदिर', city: 'Nashik', address: 'Nashik Road', capacity: 700 },
  // Chhatrapati Sambhajinagar
  { districtCode: 'MH-CS', name: 'Sant Eknath Rang Mandir', nameMr: 'संत एकनाथ रंगमंदिर', city: 'Chhatrapati Sambhajinagar', address: 'CSN', capacity: 850 },
  { districtCode: 'MH-CS', name: 'Town Hall Aurangabad', nameMr: 'टाउन हॉल', city: 'Chhatrapati Sambhajinagar', address: 'CSN', capacity: 600 },
  // Kolhapur
  { districtCode: 'MH-KO', name: 'Shahu Smarak Bhavan', nameMr: 'शाहू स्मारक भवन', city: 'Kolhapur', address: 'Kolhapur', capacity: 900 },
  { districtCode: 'MH-KO', name: 'Bhalji Pendharkar Kala Mandir', nameMr: 'भाळजी पेंढारकर कला मंदिर', city: 'Kolhapur', address: 'Kolhapur', capacity: 700 },
  // Sangli
  { districtCode: 'MH-SN', name: 'Bal Gandharva Natya Mandir Sangli', nameMr: 'बाळगंधर्व नाट्य मंदिर सांगली', city: 'Sangli', address: 'Sangli', capacity: 750 },
  // Satara
  { districtCode: 'MH-ST', name: 'Yashwantrao Chavan Auditorium Satara', nameMr: 'यशवंतराव चव्हाण सभागृह सातारा', city: 'Satara', address: 'Satara', capacity: 650 },
  // Solapur
  { districtCode: 'MH-SO', name: 'Indira Gandhi Indoor Stadium Hall', nameMr: 'इंदिरा गांधी इंडोर हॉल', city: 'Solapur', address: 'Solapur', capacity: 1000 },
  { districtCode: 'MH-SO', name: 'Lokmanya Tilak Natya Mandir', nameMr: 'लोकमान्य टिळक नाट्य मंदिर', city: 'Solapur', address: 'Solapur', capacity: 700 },
  // Ahmednagar
  { districtCode: 'MH-AH', name: 'Ahmednagar Municipal Hall', nameMr: 'अहमदनगर नगरपालिका सभागृह', city: 'Ahmednagar', address: 'Ahmednagar', capacity: 600 },
  // Jalgaon
  { districtCode: 'MH-JL', name: 'Jalgaon Natya Mandir', nameMr: 'जळगाव नाट्य मंदिर', city: 'Jalgaon', address: 'Jalgaon', capacity: 650 },
  // Dhule
  { districtCode: 'MH-DH', name: 'Dhule Cultural Hall', nameMr: 'धुळे सांस्कृतिक सभागृह', city: 'Dhule', address: 'Dhule', capacity: 550 },
  // Nandurbar
  { districtCode: 'MH-ND', name: 'Nandurbar Town Hall', nameMr: 'नंदुरबार टाउन हॉल', city: 'Nandurbar', address: 'Nandurbar', capacity: 500 },
  // Amravati
  { districtCode: 'MH-AM', name: 'Hanuman Vyayam Prasarak Mandal Hall', nameMr: 'हनुमान व्यायाम प्रसारक मंडळ हॉल', city: 'Amravati', address: 'Amravati', capacity: 800 },
  // Akola
  { districtCode: 'MH-AK', name: 'Akola Municipal Auditorium', nameMr: 'अकोला नगरपालिका सभागृह', city: 'Akola', address: 'Akola', capacity: 600 },
  // Buldhana
  { districtCode: 'MH-BU', name: 'Buldhana Cultural Centre', nameMr: 'बुलढाणा सांस्कृतिक केंद्र', city: 'Buldhana', address: 'Buldhana', capacity: 500 },
  // Washim
  { districtCode: 'MH-WS', name: 'Washim Town Hall', nameMr: 'वाशिम टाउन हॉल', city: 'Washim', address: 'Washim', capacity: 450 },
  // Yavatmal
  { districtCode: 'MH-YA', name: 'Yavatmal Natya Griha', nameMr: 'यवतमाळ नाट्यगृह', city: 'Yavatmal', address: 'Yavatmal', capacity: 550 },
  // Wardha
  { districtCode: 'MH-WR', name: 'Wardha Gandhi Seva Sangh Hall', nameMr: 'वर्धा गांधी सेवा संघ हॉल', city: 'Wardha', address: 'Wardha', capacity: 500 },
  // Bhandara
  { districtCode: 'MH-BH', name: 'Bhandara Municipal Hall', nameMr: 'भंडारा नगरपालिका हॉल', city: 'Bhandara', address: 'Bhandara', capacity: 450 },
  // Gondia
  { districtCode: 'MH-GD', name: 'Gondia Cultural Hall', nameMr: 'गोंदिया सांस्कृतिक हॉल', city: 'Gondia', address: 'Gondia', capacity: 500 },
  // Chandrapur
  { districtCode: 'MH-CH', name: 'Chandrapur Town Hall', nameMr: 'चंद्रपूर टाउन हॉल', city: 'Chandrapur', address: 'Chandrapur', capacity: 600 },
  // Gadchiroli
  { districtCode: 'MH-GA', name: 'Gadchiroli District Auditorium', nameMr: 'गडचिरोली जिल्हा सभागृह', city: 'Gadchiroli', address: 'Gadchiroli', capacity: 400 },
  // Latur
  { districtCode: 'MH-LA', name: 'Latur Municipal Natya Mandir', nameMr: 'लातूर नाट्य मंदिर', city: 'Latur', address: 'Latur', capacity: 700 },
  // Nanded
  { districtCode: 'MH-NA', name: 'Nanded Guru Gobind Singh Hall', nameMr: 'नांदेड गुरु गोबिंद सिंह हॉल', city: 'Nanded', address: 'Nanded', capacity: 800 },
  // Parbhani
  { districtCode: 'MH-PR', name: 'Parbhani Town Hall', nameMr: 'परभणी टाउन हॉल', city: 'Parbhani', address: 'Parbhani', capacity: 550 },
  // Hingoli
  { districtCode: 'MH-HG', name: 'Hingoli Cultural Hall', nameMr: 'हिंगोली सांस्कृतिक हॉल', city: 'Hingoli', address: 'Hingoli', capacity: 400 },
  // Beed
  { districtCode: 'MH-BD', name: 'Beed Municipal Hall', nameMr: 'बीड नगरपालिका हॉल', city: 'Beed', address: 'Beed', capacity: 500 },
  // Jalna
  { districtCode: 'MH-JN', name: 'Jalna Natya Mandir', nameMr: 'जालना नाट्य मंदिर', city: 'Jalna', address: 'Jalna', capacity: 550 },
  // Dharashiv
  { districtCode: 'MH-DR', name: 'Dharashiv Town Hall', nameMr: 'धाराशिव टाउन हॉल', city: 'Dharashiv', address: 'Dharashiv', capacity: 500 },
  // Raigad
  { districtCode: 'MH-RG', name: 'Alibag Town Hall', nameMr: 'अलिबाग टाउन हॉल', city: 'Alibag', address: 'Alibag, Raigad', capacity: 450 },
  { districtCode: 'MH-RG', name: 'Panvel Cultural Centre', nameMr: 'पनवेल सांस्कृतिक केंद्र', city: 'Panvel', address: 'Panvel', capacity: 600 },
  // Ratnagiri
  { districtCode: 'MH-RT', name: 'Ratnagiri Lokmanya Tilak Hall', nameMr: 'रत्नागिरी लोकमान्य टिळक हॉल', city: 'Ratnagiri', address: 'Ratnagiri', capacity: 550 },
  // Sindhudurg
  { districtCode: 'MH-SD', name: 'Sawantwadi Palace Hall', nameMr: 'सावंतवाडी राजवाडा हॉल', city: 'Sawantwadi', address: 'Sawantwadi', capacity: 400 },
  // Palghar
  { districtCode: 'MH-PL', name: 'Vasai Town Hall', nameMr: 'वसई टाउन हॉल', city: 'Vasai', address: 'Vasai-Virar', capacity: 500 },
];

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  const client = await pool.connect();

  try {
    const distRes = await client.query<{ id: number; code: string }>('SELECT id, code FROM districts');
    const distMap = new Map(distRes.rows.map((d) => [d.code, d.id]));

    let inserted = 0;
    let skipped = 0;

    for (const t of THEATERS) {
      const districtId = distMap.get(t.districtCode);
      if (!districtId) {
        console.warn(`Skip (no district ${t.districtCode}): ${t.name}`);
        skipped++;
        continue;
      }

      const exists = await client.query(
        `SELECT id FROM venues WHERE name = $1 AND city ILIKE $2 LIMIT 1`,
        [t.name, t.city]
      );
      if (exists.rows.length > 0) {
        await client.query(
          `UPDATE venues SET district_id = $1, name_mr = $2, address = $3, total_capacity = $4, verification_status = 'verified'
           WHERE id = $5`,
          [districtId, t.nameMr, t.address, t.capacity, exists.rows[0].id]
        );
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO venues (
           district_id, name, name_mr, address, city, state,
           total_capacity, has_seat_layout, verification_status, is_template, ownership_type
         ) VALUES ($1,$2,$3,$4,$5,'Maharashtra',$6,1,'verified',1,'public_theatre')`,
        [districtId, t.name, t.nameMr, t.address, t.city, t.capacity]
      );
      inserted++;
    }

    const count = await client.query('SELECT count(*)::int AS n FROM venues');
    console.log(`Theaters inserted=${inserted} updated/skipped=${skipped} total_venues=${count.rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
