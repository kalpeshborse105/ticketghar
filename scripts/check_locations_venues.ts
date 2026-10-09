import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const d = await client.query('SELECT count(*) FROM districts');
  console.log('Districts count:', d.rows[0].count);
  const dList = await client.query('SELECT id, name, name_mr, code, division FROM districts ORDER BY id');
  console.log('Districts All (36):', dList.rows);

  const c = await client.query('SELECT count(*) FROM cities');
  console.log('Cities count:', c.rows[0].count);
  const cList = await client.query('SELECT c.id, c.name, c.name_mr, c.district_id, d.name as district_name FROM cities c LEFT JOIN districts d ON c.district_id = d.id ORDER BY c.id');
  console.log('Cities List:', cList.rows);

  const t = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'talukas'");
  console.log('Talukas table:', t.rows);
  if (t.rows.length > 0) {
    const tr = await client.query('SELECT count(*) FROM talukas');
    console.log('Talukas count:', tr.rows[0].count);
  }

  const v = await client.query('SELECT count(*) FROM venues');
  console.log('Venues count:', v.rows[0].count);
  const vList = await client.query('SELECT id, name, name_mr, city, verification_status, is_template, layout_config, total_capacity FROM venues');
  console.log('Venues:', vList.rows);

  const sec = await client.query('SELECT * FROM venue_sections');
  console.log('Venue Sections count:', sec.rows.length, sec.rows);

  const seats = await client.query('SELECT count(*) FROM seats');
  console.log('Seats count:', seats.rows[0].count);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
