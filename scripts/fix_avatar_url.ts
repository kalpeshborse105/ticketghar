import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

async function main() {
  const url = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  const client = await pool.connect();
  try {
    console.log('Adding avatar_url column to users table if missing...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log('SUCCESS: avatar_url column is present in users table.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
