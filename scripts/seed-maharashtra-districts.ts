/**
 * Upsert all 36 Maharashtra districts into `districts` table.
 * Codes use MH-* format (matches import_maharashtra_admin_data.ts).
 * Run: npx tsx scripts/seed-maharashtra-districts.ts
 */
import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { districts } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

const MH_DISTRICTS: Array<{
  code: string;
  name: string;
  nameMr: string;
  division: string;
  divisionMr: string;
}> = [
  { code: 'MH-AH', name: 'Ahmednagar', nameMr: 'अहमदनगर', division: 'Nashik', divisionMr: 'नाशिक' },
  { code: 'MH-AK', name: 'Akola', nameMr: 'अकोला', division: 'Amravati', divisionMr: 'अमरावती' },
  { code: 'MH-AM', name: 'Amravati', nameMr: 'अमरावती', division: 'Amravati', divisionMr: 'अमरावती' },
  { code: 'MH-CS', name: 'Chhatrapati Sambhajinagar', nameMr: 'छत्रपती संभाजीनगर', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-BD', name: 'Beed', nameMr: 'बीड', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-BH', name: 'Bhandara', nameMr: 'भंडारा', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-BU', name: 'Buldhana', nameMr: 'बुलढाणा', division: 'Amravati', divisionMr: 'अमरावती' },
  { code: 'MH-CH', name: 'Chandrapur', nameMr: 'चंद्रपूर', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-DH', name: 'Dhule', nameMr: 'धुळे', division: 'Nashik', divisionMr: 'नाशिक' },
  { code: 'MH-GA', name: 'Gadchiroli', nameMr: 'गडचिरोली', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-GD', name: 'Gondia', nameMr: 'गोंदिया', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-HG', name: 'Hingoli', nameMr: 'हिंगोली', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-JL', name: 'Jalgaon', nameMr: 'जळगाव', division: 'Nashik', divisionMr: 'नाशिक' },
  { code: 'MH-JN', name: 'Jalna', nameMr: 'जालना', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-KO', name: 'Kolhapur', nameMr: 'कोल्हापूर', division: 'Pune', divisionMr: 'पुणे' },
  { code: 'MH-LA', name: 'Latur', nameMr: 'लातूर', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-MC', name: 'Mumbai City', nameMr: 'मुंबई शहर', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-MS', name: 'Mumbai Suburban', nameMr: 'मुंबई उपनगर', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-NG', name: 'Nagpur', nameMr: 'नागपूर', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-NA', name: 'Nanded', nameMr: 'नांदेड', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-ND', name: 'Nandurbar', nameMr: 'नंदुरबार', division: 'Nashik', divisionMr: 'नाशिक' },
  { code: 'MH-NS', name: 'Nashik', nameMr: 'नाशिक', division: 'Nashik', divisionMr: 'नाशिक' },
  { code: 'MH-DR', name: 'Dharashiv', nameMr: 'धाराशिव', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-PL', name: 'Palghar', nameMr: 'पालघर', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-PR', name: 'Parbhani', nameMr: 'परभणी', division: 'Chhatrapati Sambhajinagar', divisionMr: 'छत्रपती संभाजीनगर' },
  { code: 'MH-PU', name: 'Pune', nameMr: 'पुणे', division: 'Pune', divisionMr: 'पुणे' },
  { code: 'MH-RG', name: 'Raigad', nameMr: 'रायगड', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-RT', name: 'Ratnagiri', nameMr: 'रत्नागिरी', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-SN', name: 'Sangli', nameMr: 'सांगली', division: 'Pune', divisionMr: 'पुणे' },
  { code: 'MH-ST', name: 'Satara', nameMr: 'सातारा', division: 'Pune', divisionMr: 'पुणे' },
  { code: 'MH-SD', name: 'Sindhudurg', nameMr: 'सिंधुदुर्ग', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-SO', name: 'Solapur', nameMr: 'सोलापूर', division: 'Pune', divisionMr: 'पुणे' },
  { code: 'MH-TH', name: 'Thane', nameMr: 'ठाणे', division: 'Konkan', divisionMr: 'कोंकण' },
  { code: 'MH-WR', name: 'Wardha', nameMr: 'वर्धा', division: 'Nagpur', divisionMr: 'नागपूर' },
  { code: 'MH-WS', name: 'Washim', nameMr: 'वाशिम', division: 'Amravati', divisionMr: 'अमरावती' },
  { code: 'MH-YA', name: 'Yavatmal', nameMr: 'यवतमाळ', division: 'Amravati', divisionMr: 'अमरावती' },
];

/** Legacy short codes → MH-* (from earlier seed) */
const LEGACY_CODE_MAP: Record<string, string> = {
  AHM: 'MH-AH', AKO: 'MH-AK', AMR: 'MH-AM', CSN: 'MH-CS', BEE: 'MH-BD',
  BHA: 'MH-BH', BUL: 'MH-BU', CHD: 'MH-CH', DHU: 'MH-DH', GAD: 'MH-GA',
  GON: 'MH-GD', HING: 'MH-HG', JAL: 'MH-JL', JLN: 'MH-JN', KOL: 'MH-KO',
  LAT: 'MH-LA', MUM: 'MH-MC', MSU: 'MH-MS', NAG: 'MH-NG', NAN: 'MH-NA',
  NDB: 'MH-ND', NSK: 'MH-NS', OSM: 'MH-DR', PAL: 'MH-PL', PAR: 'MH-PR',
  PUN: 'MH-PU', RAI: 'MH-RG', RAT: 'MH-RT', SAN: 'MH-SN', SAT: 'MH-ST',
  SIN: 'MH-SD', SOL: 'MH-SO', THA: 'MH-TH', WAR: 'MH-WR', WAS: 'MH-WS', YAV: 'MH-YA',
};

async function main() {
  // Migrate legacy short codes if present
  for (const [legacy, modern] of Object.entries(LEGACY_CODE_MAP)) {
    const rows = await db.select().from(districts).where(eq(districts.code, legacy)).limit(1);
    if (rows.length > 0) {
      const modernExists = await db.select().from(districts).where(eq(districts.code, modern)).limit(1);
      if (modernExists.length === 0) {
        await db.update(districts).set({ code: modern }).where(eq(districts.code, legacy));
        console.log(`Renamed district code ${legacy} → ${modern}`);
      }
    }
  }

  let upserted = 0;
  for (const d of MH_DISTRICTS) {
    const existing = await db.select().from(districts).where(eq(districts.code, d.code)).limit(1);
    if (existing.length > 0) {
      await db
        .update(districts)
        .set({
          name: d.name,
          nameMr: d.nameMr,
          division: d.division,
          divisionMr: d.divisionMr,
          state: 'Maharashtra',
          isActive: 1,
        })
        .where(eq(districts.code, d.code));
    } else {
      await db.insert(districts).values({
        code: d.code,
        name: d.name,
        nameMr: d.nameMr,
        division: d.division,
        divisionMr: d.divisionMr,
        state: 'Maharashtra',
        isActive: 1,
      });
    }
    upserted++;
  }
  console.log(`OK upserted ${upserted} Maharashtra districts`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
