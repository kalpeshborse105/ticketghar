/**
 * Ensure app_secrets has working Razorpay keys (from local .env) for prod fallback.
 */
import 'dotenv/config';
import pg from 'pg';

function clean(v) {
  return String(v || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
}

const keyId = clean(process.env.RAZORPAY_KEY_ID);
const keySecret = clean(process.env.RAZORPAY_KEY_SECRET);

if (!keyId || !keySecret) {
  console.error('Missing local RAZORPAY_KEY_ID/SECRET');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS app_secrets (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`);

await client.query(
  `INSERT INTO app_secrets (key, value, updated_at)
   VALUES ($1, $2, now()), ($3, $4, now())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
  ['RAZORPAY_KEY_ID', keyId, 'RAZORPAY_KEY_SECRET', keySecret]
);

const check = await client.query(
  `SELECT key, left(value, 12) AS prefix, length(value) AS len FROM app_secrets WHERE key LIKE 'RAZORPAY%'`
);
console.log('UPSERTED', check.rows);
await client.end();
