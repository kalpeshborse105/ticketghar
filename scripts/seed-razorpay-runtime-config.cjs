/**
 * Seed working Razorpay keys into app_runtime_config (production DB).
 * Used when Vercel env keys are mismatched / Authentication failed.
 */
const { Client } = require('pg');
require('dotenv').config();

function clean(v) {
  return String(v || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

(async () => {
  const keyId = clean(process.env.RAZORPAY_KEY_ID);
  const keySecret = clean(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId.startsWith('rzp_') || !keySecret) {
    throw new Error('Local .env RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing or invalid');
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const connectionString = String(process.env.DATABASE_URL || '').replace(
    /sslmode=[^&]+/i,
    'sslmode=no-verify'
  );
  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS app_runtime_config (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await c.query(
    `
    INSERT INTO app_runtime_config(key, value) VALUES
      ('RAZORPAY_KEY_ID', $1),
      ('RAZORPAY_KEY_SECRET', $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  `,
    [keyId, keySecret]
  );
  const r = await c.query(
    `SELECT key, left(value, 12) AS prefix, length(value) AS len
     FROM app_runtime_config WHERE key LIKE 'RAZORPAY%'`
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
