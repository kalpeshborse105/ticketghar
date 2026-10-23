import 'dotenv/config';
import { spawnSync } from 'child_process';

const keys = [
  'DATABASE_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_MODE',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'Client_ID',
  'Client_Secret',
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'TICKET_SECRET',
  'JWT_SECRET',
  'SESSION_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'RESEND_API_KEY',
  'PAYMENT_WEBHOOK_SECRET',
];

function clean(v) {
  return String(v || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
}

for (const k of keys) {
  let v = clean(process.env[k]);
  if (!v) continue;
  if (k === 'NEXT_PUBLIC_APP_URL' || k === 'APP_URL') {
    // Keep live custom domain for OAuth; Android still hits this host today.
    // New Vercel deploy will also serve under *.vercel.app until DNS moves.
    v = clean(process.env[k]) || 'https://mahaticket.kalpkrutinfotech.com';
  }
  if (k === 'RAZORPAY_MODE' && !v) v = 'test';

  const r = spawnSync(
    'npx',
    [
      'vercel',
      'env',
      'add',
      k,
      '--environment',
      'production',
      '--value',
      v,
      '--yes',
      '--force',
    ],
    { encoding: 'utf8', shell: true }
  );
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0 || /Added|Updated|Saved|Overrode/i.test(out);
  console.log(k, ok ? 'OK' : `FAIL ${out.slice(0, 160).replace(/\s+/g, ' ')}`);
}
