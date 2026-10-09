import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

interface VenueCsvRow {
  district: string;
  taluka: string;
  city: string;
  venue_name: string;
  venue_name_mr: string;
  address: string;
  total_capacity: number;
  has_seat_layout: number;
  verification_status: string;
  ownership_type: string;
  source_url?: string;
  notes?: string;
}

function parseCsv(content: string): VenueCsvRow[] {
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const rows: VenueCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser supporting quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      matches.push(val.trim());
    }

    if (matches.length >= 8) {
      rows.push({
        district: matches[0] || '',
        taluka: matches[1] || '',
        city: matches[2] || '',
        venue_name: matches[3] || '',
        venue_name_mr: matches[4] || '',
        address: matches[5] || '',
        total_capacity: parseInt(matches[6], 10) || 600,
        has_seat_layout: parseInt(matches[7], 10) || 1,
        verification_status: matches[8] || 'verified',
        ownership_type: matches[9] || 'public_theatre',
        source_url: matches[10] || '',
        notes: matches[11] || '',
      });
    }
  }
  return rows;
}

async function runVenueDryRunImport() {
  console.log('================================================================');
  console.log('  MAHATICKET STAGE 2 — VENUE CSV DRY-RUN VALIDATION & PREVIEW   ');
  console.log('================================================================\n');

  const filePath = path.resolve('data/templates/venues_import_template.csv');
  if (!fs.existsSync(filePath)) {
    console.error('CSV template file not found at:', filePath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV template.\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let validRows = 0;
  let rejectedRows = 0;
  let duplicateCount = 0;

  try {
    const districtsRes = await client.query('SELECT id, name, name_mr FROM districts');
    const districtMap = new Map<string, number>();
    districtsRes.rows.forEach(d => {
      districtMap.set(d.name.toLowerCase(), d.id);
      districtMap.set(d.name_mr.toLowerCase(), d.id);
    });

    const existingVenuesRes = await client.query('SELECT id, name, name_mr, district_id FROM venues');
    const existingVenues = existingVenuesRes.rows;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2;
      const issues: string[] = [];

      // 1. District check
      const dId = districtMap.get(row.district.toLowerCase());
      if (!dId) {
        issues.push(`Unknown district "${row.district}"`);
      }

      // 2. Name check
      if (!row.venue_name || row.venue_name.trim().length < 3) {
        issues.push('Missing or too short English venue name');
      }
      if (!row.venue_name_mr || row.venue_name_mr.trim().length < 3) {
        issues.push('Missing or too short Marathi venue name');
      }

      // 3. Duplicate check
      const isDup = existingVenues.some(v =>
        v.name.toLowerCase() === row.venue_name.toLowerCase() ||
        v.name_mr.toLowerCase() === row.venue_name_mr.toLowerCase()
      );
      if (isDup) {
        duplicateCount++;
        issues.push(`Already exists in database (Potential Duplicate)`);
      }

      if (issues.length > 0) {
        console.log(`Row ${rowNum} [${row.venue_name}]: ⚠️ ISSUES: ${issues.join(', ')}`);
        if (!isDup) rejectedRows++;
      } else {
        console.log(`Row ${rowNum} [${row.venue_name} / ${row.venue_name_mr}]: ✅ VALID (District ID: ${dId}, Capacity: ${row.total_capacity})`);
        validRows++;
      }
    }

    console.log('\n--- DRY-RUN SUMMARY ---');
    console.log(`Total Rows Audited: ${rows.length}`);
    console.log(`Valid New Candidates: ${validRows}`);
    console.log(`Existing in Database: ${duplicateCount}`);
    console.log(`Invalid / Rejected: ${rejectedRows}`);
    console.log('DRY-RUN COMPLETE: Zero production records were written or modified.\n');

  } finally {
    await client.end();
  }
}

runVenueDryRunImport();
