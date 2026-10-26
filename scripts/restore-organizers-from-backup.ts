import { config } from 'dotenv';
import pg from 'pg';
config({ override: true });
const raw = process.env.DATABASE_URL || '';
const url = raw
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

async function main() {
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const c = await p.connect();
  try {
    const before = (await c.query(`SELECT COUNT(*)::int c FROM organizers`)).rows[0].c;
    await c.query('BEGIN');
    const n = await c.query(`
      INSERT INTO public.organizers (
        id, name, company_name, email, phone, city, verification_status, status,
        commission_type, commission_rate, bank_name, bank_account_number, bank_ifsc,
        pan_number, gstin, created_at
      )
      SELECT
        id, name, company_name, email, phone, city, verification_status, status,
        commission_type, commission_rate, bank_name, bank_account_number, bank_ifsc,
        pan_number, gstin, created_at
      FROM theatre_backup_20261026205337.organizers b
      WHERE NOT EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = b.id)
    `);
    await c.query(`
      SELECT setval(
        pg_get_serial_sequence('public.organizers', 'id'),
        (SELECT COALESCE(MAX(id), 1) FROM public.organizers)
      )
    `);
    await c.query('COMMIT');
    const rows = (await p.query(`SELECT id, name, company_name, email FROM organizers ORDER BY id`))
      .rows;
    console.log(JSON.stringify({ before, restored: n.rowCount, rows }, null, 2));
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
    await p.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
