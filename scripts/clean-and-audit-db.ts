import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

function getCleanUrl(): string {
  return (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function main() {
  const pool = new pg.Pool({
    connectionString: getCleanUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('public.users columns:');
    console.table(cols.rows);

    const userRows = await client.query(`
      SELECT * FROM public.users ORDER BY id;
    `);
    console.log('\npublic.users rows:');
    console.table(userRows.rows);

    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass;
    `);
    console.log('\npublic.users constraints:');
    console.table(constraints.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
