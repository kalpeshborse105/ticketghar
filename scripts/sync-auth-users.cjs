const { Pool } = require('pg');
require('dotenv').config();

const raw = process.env.DATABASE_URL
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString: raw,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log('1. Syncing existing auth.users -> public.users...');
    const syncRes = await pool.query(`
      UPDATE public.users u
      SET uid = a.id::text,
          updated_at = now()
      FROM auth.users a
      WHERE lower(u.email) = lower(a.email)
        AND u.uid <> a.id::text;
    `);
    console.log(`Synced ${syncRes.rowCount} users with matching emails.`);

    console.log('2. Inserting any auth.users missing from public.users...');
    const insertRes = await pool.query(`
      INSERT INTO public.users (uid, email, full_name, avatar_url, role, preferred_language, city, status)
      SELECT 
        a.id::text,
        a.email,
        COALESCE(a.raw_user_meta_data->>'full_name', a.raw_user_meta_data->>'name', split_part(a.email, '@', 1), 'MahaTicket User'),
        a.raw_user_meta_data->>'avatar_url',
        'customer',
        'mr',
        'Pune',
        'active'
      FROM auth.users a
      WHERE NOT EXISTS (
        SELECT 1 FROM public.users u WHERE lower(u.email) = lower(a.email)
      );
    `);
    console.log(`Inserted ${insertRes.rowCount} missing auth users.`);

    console.log('3. Installing auto-sync trigger on auth.users...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.users (uid, email, full_name, avatar_url, role, preferred_language, city, status)
        VALUES (
          NEW.id::text,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'MahaTicket User'),
          NEW.raw_user_meta_data->>'avatar_url',
          'customer',
          'mr',
          'Pune',
          'active'
        )
        ON CONFLICT (email) DO UPDATE SET
          uid = EXCLUDED.uid,
          updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('Trigger installed successfully!');

    const check = await pool.query(`
      SELECT u.id, u.uid, u.email, u.role, a.id as auth_id
      FROM public.users u
      LEFT JOIN auth.users a ON lower(u.email) = lower(a.email)
      WHERE u.email = 'kalpeshborse105@gmail.com';
    `);
    console.log('kalpeshborse105 verification:', check.rows[0]);
  } catch (err) {
    console.error('Error syncing auth users:', err);
  } finally {
    await pool.end();
  }
}

run();
