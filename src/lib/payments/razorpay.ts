import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { db } from '@/src/db/index.ts';
import { sql } from 'drizzle-orm';

/** Strip whitespace / wrapping quotes that break Razorpay Authentication. */
function cleanEnv(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
}

type RazorpayCreds = { keyId: string; keySecret: string; source: 'env' | 'db' };

let cachedDbCreds: RazorpayCreds | null = null;
let dbCredsLoadedAt = 0;
const DB_CREDS_TTL_MS = 60_000;

function envCreds(): RazorpayCreds | null {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) return null;
  if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) return null;
  const placeholders = ['YourKeyIdHere', 'your_razorpay', 'rzp_test_YOUR', 'rzp_live_YOUR', 'placeholder', 'change_me'];
  for (const p of placeholders) {
    if (keyId.toLowerCase().includes(p.toLowerCase()) || keySecret.toLowerCase().includes(p.toLowerCase())) {
      return null;
    }
  }
  return { keyId, keySecret, source: 'env' };
}

async function loadDbCreds(): Promise<RazorpayCreds | null> {
  const now = Date.now();
  if (cachedDbCreds && now - dbCredsLoadedAt < DB_CREDS_TTL_MS) {
    return cachedDbCreds;
  }
  try {
    // Ensure table exists (idempotent) then read keys
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_secrets (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const rows = await db.execute(sql`
      SELECT key, value FROM app_secrets
      WHERE key IN ('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET')
    `);
    const map = new Map<string, string>();
    const list = (rows as any)?.rows || (rows as any) || [];
    for (const r of list) {
      if (r?.key && r?.value) map.set(String(r.key), cleanEnv(r.value));
    }
    const keyId = map.get('RAZORPAY_KEY_ID') || '';
    const keySecret = map.get('RAZORPAY_KEY_SECRET') || '';
    if (!keyId || !keySecret) return null;
    if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) return null;
    cachedDbCreds = { keyId, keySecret, source: 'db' };
    dbCredsLoadedAt = now;
    return cachedDbCreds;
  } catch (err: any) {
    console.warn('[Razorpay] DB secrets load failed:', err?.message || err);
    return null;
  }
}

/**
 * Resolve credentials: env first, then app_secrets DB fallback (for prod env mismatch).
 */
export async function resolveRazorpayCreds(): Promise<RazorpayCreds> {
  const fromEnv = envCreds();
  if (fromEnv) return fromEnv;
  const fromDb = await loadDbCreds();
  if (fromDb) return fromDb;
  throw new Error('Razorpay payment gateway is not configured (env + DB empty)');
}

/**
 * Determine the configured Razorpay mode: 'test' or 'live'
 */
export function getRazorpayMode(): 'test' | 'live' | 'unknown' {
  const explicitMode = cleanEnv(process.env.RAZORPAY_MODE).toLowerCase();
  if (explicitMode === 'test' || explicitMode === 'live') {
    return explicitMode;
  }
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID) || cachedDbCreds?.keyId || '';
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'unknown';
}

/**
 * Diagnostic helper reporting status of Razorpay configuration safely without leaking secrets
 */
export function getRazorpayConfigDiagnostic(): {
  mode: 'test' | 'live' | 'unknown';
  isConfigured: boolean;
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  const explicitMode = cleanEnv(process.env.RAZORPAY_MODE).toLowerCase();
  const mode = getRazorpayMode();

  if (!keyId) issues.push('RAZORPAY_KEY_ID is missing');
  if (!keySecret) issues.push('RAZORPAY_KEY_SECRET is missing');

  const placeholderPatterns = [
    'YourKeyIdHere',
    'your_razorpay',
    'rzp_test_YOUR',
    'rzp_live_YOUR',
    'placeholder',
    'change_me',
  ];
  for (const pattern of placeholderPatterns) {
    if (
      keyId.toLowerCase().includes(pattern.toLowerCase()) ||
      keySecret.toLowerCase().includes(pattern.toLowerCase())
    ) {
      issues.push(`Credential contains placeholder pattern: "${pattern}"`);
    }
  }

  if (keyId && !keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
    issues.push('RAZORPAY_KEY_ID does not match expected prefix (rzp_test_ or rzp_live_)');
  }

  let isConsistent = true;
  if (explicitMode) {
    if (explicitMode === 'test' && keyId && !keyId.startsWith('rzp_test_')) {
      issues.push('RAZORPAY_MODE is set to "test" but RAZORPAY_KEY_ID does not start with "rzp_test_"');
      isConsistent = false;
    } else if (explicitMode === 'live' && keyId && !keyId.startsWith('rzp_live_')) {
      issues.push('RAZORPAY_MODE is set to "live" but RAZORPAY_KEY_ID does not start with "rzp_live_"');
      isConsistent = false;
    }
  }

  // Env may be broken on prod; DB fallback still counts as configured for health checks
  const isConfigured = issues.length === 0 || Boolean(cachedDbCreds);

  return {
    mode,
    isConfigured,
    isConsistent:
      isConsistent &&
      (issues.length === 0 ||
        !issues.some(
          (i) => i.includes('does not match expected prefix') || i.includes('RAZORPAY_MODE is set')
        )),
    issues,
  };
}

export function isRazorpayConfigured(): boolean {
  // Sync check: env OK, or we already loaded DB creds. Async routes should call resolveRazorpayCreds.
  const diag = getRazorpayConfigDiagnostic();
  if (diag.isConfigured && diag.isConsistent) return true;
  return Boolean(envCreds() || cachedDbCreds);
}

export function getRazorpayClient(): Razorpay {
  const creds = envCreds() || cachedDbCreds;
  if (!creds) {
    throw new Error('Razorpay payment gateway configuration error: credentials missing');
  }
  console.log(`Initializing Razorpay client from ${creds.source} (${getRazorpayMode()} mode)`);
  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
}

/**
 * Preferred async client — env first, DB fallback. Retries with DB if env auth fails at call site.
 */
export async function getRazorpayClientAsync(): Promise<{ client: Razorpay; keyId: string; source: string }> {
  const preferred = envCreds() || (await loadDbCreds());
  if (!preferred) {
    throw new Error('Razorpay payment gateway is not configured');
  }
  return {
    client: new Razorpay({ key_id: preferred.keyId, key_secret: preferred.keySecret }),
    keyId: preferred.keyId,
    source: preferred.source,
  };
}

/** Build client from explicit creds (used for env→DB auth retry). */
export function clientFromCreds(creds: RazorpayCreds): Razorpay {
  return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
}

export async function getDbRazorpayCreds(): Promise<RazorpayCreds | null> {
  return loadDbCreds();
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secrets = [cleanEnv(process.env.RAZORPAY_KEY_SECRET), cachedDbCreds?.keySecret].filter(
    Boolean
  ) as string[];

  if (secrets.length === 0) {
    throw new Error('Razorpay is not configured');
  }

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
 * Async verify — also tries DB secret if env secret fails.
 */
export async function verifyPaymentSignatureAsync(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  if (!orderId || !paymentId || !signature) return false;

  if (verifyPaymentSignature(orderId, paymentId, signature)) return true;

  const dbCreds = await loadDbCreds();
  if (!dbCreds?.keySecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', dbCreds.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

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
