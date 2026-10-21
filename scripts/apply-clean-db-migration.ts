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
    await client.query('BEGIN');

    console.log('1. Merging user 15 into user 12...');
    await client.query(`
      UPDATE users 
      SET full_name = 'Kalpesh Borse', 
          avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
          updated_at = NOW()
      WHERE id = 12;
    `);

    // Verify if anything references id 15 just in case
    await client.query(`UPDATE orders SET user_id = 12 WHERE user_id = 15;`);
    await client.query(`UPDATE event_reviews SET user_id = 12 WHERE user_id = 15;`);

    // Delete user 15
    await client.query(`DELETE FROM users WHERE id = 15;`);
    console.log('User 15 merged and removed.');

    console.log('2. Normalizing uids...');
    // Ensure all users have clean uids if needed
    await client.query(`
      UPDATE users 
      SET uid = 'user-' || id 
      WHERE uid LIKE 'user-registered-%' OR uid ~ '^[0-9]+$';
    `);

    console.log('3. Adding UNIQUE constraint on users.email if not present...');
    const constraintCheck = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'public.users'::regclass AND conname = 'users_email_unique';
    `);
    if (constraintCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
      `);
      console.log('Added UNIQUE (email) constraint to users table.');
    } else {
      console.log('UNIQUE (email) constraint already present.');
    }

    console.log('4. Dropping legacy uuid2 tables...');
    const legacyTables = [
      'legacy_bookings_uuid2',
      'legacy_events_uuid2',
      'legacy_profiles_uuid2',
      'legacy_seats_uuid2',
      'legacy_showtimes_uuid2',
      'legacy_venues_uuid2'
    ];
    for (const t of legacyTables) {
      await client.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
      console.log(`Dropped ${t}`);
    }

    await client.query('COMMIT');
    console.log('\nMigration completed successfully!');

    // Show remaining tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nRemaining tables in public schema:');
    console.log(tablesRes.rows.map(r => r.table_name));

    // Show users
    const usersRes = await client.query(`SELECT id, uid, email, full_name, phone_number, role FROM users ORDER BY id;`);
    console.log('\nCurrent users:');
    console.table(usersRes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
