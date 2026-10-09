import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

interface TableStat {
  table_name: string;
  row_count: number;
}

async function runStage1Audit() {
  console.log('================================================================');
  console.log('  MAHATICKET STAGE 1 — COMPLETE DATABASE & BACKEND AUDIT        ');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    // 1. Tables and Row Counts
    console.log('--- 1. PUBLIC SCHEMA TABLES & RECORD COUNTS ---');
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableStats: TableStat[] = [];
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT count(*)::int as cnt FROM "${row.table_name}"`);
      tableStats.push({
        table_name: row.table_name,
        row_count: countRes.rows[0].cnt,
      });
    }

    console.table(tableStats);

    // 2. Foreign Keys & Integrity
    console.log('\n--- 2. FOREIGN KEYS & REFERENTIAL INTEGRITY AUDIT ---');
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log(`Total Foreign Key Constraints: ${fkRes.rows.length}`);
    for (const fk of fkRes.rows) {
      console.log(`  • ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} [${fk.constraint_name}]`);
    }

    // 3. Check for Orphaned Records
    console.log('\n--- 3. ORPHAN RECORD AUDIT ---');
    // Check orphaned talukas
    const orphanTalukas = await client.query(`
      SELECT count(*)::int as cnt FROM talukas t
      LEFT JOIN districts d ON d.id = t.district_id
      WHERE d.id IS NULL;
    `);
    console.log(`  • Orphaned talukas (missing district): ${orphanTalukas.rows[0].cnt}`);

    // Check orphaned cities
    const orphanCities = await client.query(`
      SELECT count(*)::int as cnt FROM cities c
      LEFT JOIN districts d ON d.id = c.district_id
      WHERE c.district_id IS NOT NULL AND d.id IS NULL;
    `);
    console.log(`  • Orphaned cities (invalid district_id): ${orphanCities.rows[0].cnt}`);

    // Check orphaned venues
    const orphanVenues = await client.query(`
      SELECT count(*)::int as cnt FROM venues v
      LEFT JOIN districts d ON d.id = v.district_id
      WHERE v.district_id IS NOT NULL AND d.id IS NULL;
    `);
    console.log(`  • Orphaned venues (invalid district_id): ${orphanVenues.rows[0].cnt}`);

    // Check orphaned event sessions
    const orphanSessions = await client.query(`
      SELECT count(*)::int as cnt FROM event_sessions es
      LEFT JOIN events e ON e.id = es.event_id
      WHERE e.id IS NULL;
    `);
    console.log(`  • Orphaned event sessions (missing event): ${orphanSessions.rows[0].cnt}`);

    // Check orphaned tickets
    const orphanTickets = await client.query(`
      SELECT count(*)::int as cnt FROM tickets t
      LEFT JOIN orders o ON o.id = t.order_id
      WHERE o.id IS NULL;
    `);
    console.log(`  • Orphaned tickets (missing order): ${orphanTickets.rows[0].cnt}`);

    // 4. District, Taluka, City & Venue Geography Summary
    console.log('\n--- 4. MAHARASHTRA ADMINISTRATIVE & VENUE GEOGRAPHY ---');
    const districtSummary = await client.query(`
      SELECT 
        d.id,
        d.name,
        d.name_mr,
        d.division,
        (SELECT count(*)::int FROM talukas t WHERE t.district_id = d.id) as taluka_count,
        (SELECT count(*)::int FROM cities c WHERE c.district_id = d.id) as city_count,
        (SELECT count(*)::int FROM venues v WHERE v.district_id = d.id) as venue_count,
        (SELECT count(*)::int FROM venues v WHERE v.district_id = d.id AND v.verification_status = 'verified') as verified_venues
      FROM districts d
      ORDER BY d.id;
    `);

    console.table(districtSummary.rows);

    // 5. Financial & Monetary Units Verification
    console.log('\n--- 5. MONETARY UNITS & GST INTEGRITY ---');
    const orderFinances = await client.query(`
      SELECT 
        count(*)::int as total_orders,
        min(grand_total) as min_total,
        max(grand_total) as max_total,
        avg(grand_total)::int as avg_total,
        min(platform_fee_total) as min_fee,
        max(platform_fee_total) as max_fee,
        min(tax_total) as min_tax,
        max(tax_total) as max_tax
      FROM orders;
    `);
    console.log('Order financial aggregates (in paise):', orderFinances.rows[0]);

    const ticketPriceAgg = await client.query(`
      SELECT 
        count(*)::int as total_ticket_types,
        min(price) as min_price,
        max(price) as max_price,
        avg(price)::int as avg_price
      FROM ticket_types;
    `);
    console.log('Ticket types price aggregates (in paise):', ticketPriceAgg.rows[0]);

    // 6. User Roles and Authorization Audit
    console.log('\n--- 6. USER ROLES & ACCESS CONTROL ---');
    const rolesRes = await client.query(`
      SELECT role, count(*)::int as cnt
      FROM users
      GROUP BY role
      ORDER BY cnt DESC;
    `);
    console.table(rolesRes.rows);

    // 7. Route & API Inventory
    console.log('\n--- 7. BACKEND API ROUTE INVENTORY ---');
    const appDir = path.resolve('app/api');
    const routes: string[] = [];

    function scanRoutes(dir: string, baseRoute: string = '/api') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanRoutes(fullPath, `${baseRoute}/${entry.name}`);
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
          routes.push(baseRoute);
        }
      }
    }

    if (fs.existsSync(appDir)) {
      scanRoutes(appDir);
    }

    console.log(`Found ${routes.length} Next.js App Router API endpoints:`);
    routes.sort().forEach(r => console.log(`  • ${r}`));

  } catch (err: any) {
    console.error('Audit Error:', err);
  } finally {
    await client.end();
  }
}

runStage1Audit();
