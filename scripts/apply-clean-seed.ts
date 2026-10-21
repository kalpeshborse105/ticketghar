import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Reading and executing clean_database_seed.sql...');
  const sqlContent = fs.readFileSync(path.join(process.cwd(), 'clean_database_seed.sql'), 'utf-8');
  await db.execute(sql.raw(sqlContent));
  console.log('✅ clean_database_seed.sql successfully executed on PostgreSQL!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
