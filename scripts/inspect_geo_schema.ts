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

  const talukaConstraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'talukas';
  `);
  console.log('Talukas constraints:', talukaConstraints.rows);

  const cityConstraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'cities';
  `);
  console.log('Cities constraints:', cityConstraints.rows);

  const districtList = await client.query('SELECT id, code, name, name_mr, division, division_mr FROM districts ORDER BY id');
  console.log('Districts in DB:');
  districtList.rows.forEach(d => console.log(`${d.id}: [${d.code}] ${d.name} (${d.name_mr}) - ${d.division} (${d.division_mr})`));

  await client.end();
}

main().catch(console.error);
