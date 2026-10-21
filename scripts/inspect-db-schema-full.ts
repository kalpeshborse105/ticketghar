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
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`=== Total tables in public schema: ${tables.length} ===`);

    for (const t of tables) {
      const countRes = await client.query(`SELECT count(*) FROM ${t}`);
      const count = countRes.rows[0].count;
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${t}'
        ORDER BY ordinal_position;
      `);
      console.log(`\nTable: [${t}] (${count} rows)`);
      console.log('Columns: ' + colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
