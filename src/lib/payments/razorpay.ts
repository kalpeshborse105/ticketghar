import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { Pool } from 'pg';

type RazorpayCreds = { keyId: string; keySecret: string };

let cachedCreds: RazorpayCreds | null = null;
let cachedAt = 0;
const CREDS_TTL_MS = 60_000;

function cleanEnv(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function isUsablePair(keyId: string, keySecret: string): boolean {
  if (!keyId || !keySecret) return false;
  const placeholderPatterns = [
    'YourKeyIdHere',
    'your_razorpay',
    'rzp_test_YOUR',
    'rzp_live_YOUR',
    'placeholder',
    'change_me',
  ];
  const blob = `${keyId}|${keySecret}`.toLowerCase();
  if (placeholderPatterns.some((p) => blob.includes(p.toLowerCase()))) return false;
  return keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_');
}

function envCreds(): RazorpayCreds | null {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  if (!isUsablePair(keyId, keySecret)) return null;
  return { keyId, keySecret };
}

async function dbCreds(): Promise<RazorpayCreds | null> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  const pool = new Pool({
    connectionString: connectionString.replace(/sslmode=[^&]+/i, 'sslmode=no-verify'),
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 8_000,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_runtime_config (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    const { rows } = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_runtime_config
       WHERE key IN ('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET')`
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, cleanEnv(r.value)]));
    const keyId = map.RAZORPAY_KEY_ID || '';
    const keySecret = map.RAZORPAY_KEY_SECRET || '';
    if (!isUsablePair(keyId, keySecret)) return null;
    return { keyId, keySecret };
  } catch (err) {
    console.warn('Razorpay DB credential lookup failed', err);
    return null;
  } finally {
    await pool.end().catch(() => null);
  }
}

/**
 * Prefer DB runtime config (fixes bad Vercel env) then fall back to process.env.
 */
export async function resolveRazorpayCreds(force = false): Promise<RazorpayCreds | null> {
  if (!force && cachedCreds && Date.now() - cachedAt < CREDS_TTL_MS) {
    return cachedCreds;
  }

  const fromDb = await dbCreds();
  const fromEnv = envCreds();
  const picked = fromDb || fromEnv;
  cachedCreds = picked;
  cachedAt = Date.now();
  return picked;
}

/**
 * Check if Razorpay is properly configured with real credentials
 */
export function isRazorpayConfigured(): boolean {
  return !!envCreds();
}

export async function isRazorpayReady(): Promise<boolean> {
  return !!(await resolveRazorpayCreds());
}

/**
 * Get configured Razorpay client instance (sync — env only).
 * Prefer getRazorpayClientAsync in API routes.
 */
export function getRazorpayClient(): Razorpay {
  const creds = envCreds();
  if (!creds) {
    throw new Error('Razorpay payment gateway is not configured. Please contact support.');
  }
  console.log('Initializing Razorpay client (env)');
  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
}

export async function getRazorpayClientAsync(): Promise<{ client: Razorpay; keyId: string }> {
  const creds = await resolveRazorpayCreds();
  if (!creds) {
    throw new Error('Razorpay payment gateway is not configured. Please contact support.');
  }
  console.log('Initializing Razorpay client', { source: 'resolved' });
  return {
    client: new Razorpay({
      key_id: creds.keyId,
      key_secret: creds.keySecret,
    }),
    keyId: creds.keyId,
  };
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const trySecrets = [
    cleanEnv(process.env.RAZORPAY_KEY_SECRET),
    cachedCreds?.keySecret || '',
  ].filter(Boolean);

  // Unique secrets only
  const secrets = [...new Set(trySecrets)];

  for (const keySecret of secrets) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return true;
    }
  }

  return false;
}

/**
 * Async verify — loads DB secret if needed so production works after key rotation.
 */
export async function verifyPaymentSignatureAsync(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  if (!orderId || !paymentId || !signature) return false;

  const creds = await resolveRazorpayCreds();
  const secrets = [...new Set([creds?.keySecret || '', cleanEnv(process.env.RAZORPAY_KEY_SECRET)].filter(Boolean))];

  for (const keySecret of secrets) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return true;
    }
  }
  return false;
}

/**
 * Verify webhook signature from Razorpay
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = cleanEnv(
    process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET
  );

  if (!webhookSecret || webhookSecret.toLowerCase().includes('placeholder')) {
    console.warn('Webhook secret not configured - skipping signature verification');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}
