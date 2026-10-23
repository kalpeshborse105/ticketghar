import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  const usersRes = await db.execute(
    sql`SELECT id, email, full_name, phone_number, role FROM users WHERE id IN (12, 49) OR email ILIKE '%kalp%'`
  );
  console.log('Users found:', usersRes.rows);
}

main().catch(console.error);
