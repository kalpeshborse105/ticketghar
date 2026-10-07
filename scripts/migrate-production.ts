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
    console.log('Applying safe production schema updates...');

    // 1. Update users_role_check to support super_admin, organizer, manager, customer, operations, finance, scanner
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role = ANY (ARRAY['customer'::text, 'super_admin'::text, 'organizer'::text, 'manager'::text, 'operations'::text, 'finance'::text, 'scanner'::text]));
    `);
    console.log('✓ users_role_check updated successfully.');

    // 2. Add organizer_id, status, assigned_events to users table if missing
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_id integer REFERENCES organizers(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_events text;
    `);
    console.log('✓ users columns (organizer_id, status, assigned_events) ensured.');

    // 3. Ensure organizers table has status column
    await client.query(`
      ALTER TABLE organizers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
    `);
    console.log('✓ organizers status column ensured.');

    // 4. Update events_status_check to support workflow statuses
    await client.query(`
      ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
      ALTER TABLE events ADD CONSTRAINT events_status_check 
        CHECK (status = ANY (ARRAY[
          'draft'::text, 
          'submitted'::text, 
          'under_review'::text, 
          'approved'::text, 
          'rejected'::text, 
          'published'::text, 
          'unpublish'::text, 
          'unpublished'::text, 
          'cancelled'::text, 
          'completed'::text
        ]));
      ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason text;
    `);
    console.log('✓ events_status_check and rejection_reason ensured.');

    console.log('All migrations applied cleanly!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
