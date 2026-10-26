import crypto from 'crypto';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const AUTH_COOKIE_NAME = 'mahaticket_customer_session';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.TICKET_SECRET ||
  'mahaticket_secure_production_secret_key_2026';

/** Stable app uid — UUID preferred; keep existing staff/google prefixes intact */
export function newCustomerUid(): string {
  return crypto.randomUUID();
}

export interface CustomerSessionUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: string;
  avatarUrl?: string | null;
}

/**
 * Hash password securely using PBKDF2 with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verify plaintext password against stored salt:derivedKey hash.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
}

/**
 * Sign customer session token
 */
export function signSessionToken(user: CustomerSessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode customer session token
 */
export function verifySessionToken(token: string): CustomerSessionUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      )
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.id,
      uid: payload.uid,
      email: payload.email,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: payload.role,
      avatarUrl: payload.avatarUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Get current customer session from cookies or Authorization Bearer (Android).
 */
export async function getCustomerSession(
  authorizationHeader?: string | null
): Promise<CustomerSessionUser | null> {
  if (authorizationHeader) {
    const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) {
      const fromBearer = verifySessionToken(m[1].trim());
      if (fromBearer) return fromBearer;
    }
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Set customer session cookie
 */
export async function setCustomerSessionCookie(user: CustomerSessionUser) {
  const token = signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clear customer session cookie
 */
export async function clearCustomerSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  try {
    cookieStore.delete('mahaticket_logged_in');
  } catch {
    /* ignore */
  }
}

/**
 * Dispatch verification OTP email using configured SMTP or development fallback
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromAddress =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    'MahaTicket <tickets@mahaticket.kalpkrutinfotech.com>';

  const subject = `महाटिकिट लॉगिन कोड: ${otp} | MahaTicket Verification Code`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MahaTicket Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #ea580c; padding: 24px; text-align: center; color: #ffffff; }
        .content { padding: 32px 24px; text-align: center; }
        .otp-box { background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #ea580c; padding: 16px; margin: 24px 0; }
        .footer { background: #f1f5f9; padding: 16px; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">महाटिकिट | MahaTicket</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">अधिकृत तिकीट आरक्षण प्रणाली</p>
        </div>
        <div class="content">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">आपला लॉगिन पडताळणी कोड</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            आपल्या महाटिकिट खात्यात प्रवेश करण्यासाठी खालील ६-अंकी कोड प्रविष्ट करा. हा कोड पुढील <strong>१० मिनिटांसाठी</strong> वैध आहे.
          </p>
          <div class="otp-box">${otp}</div>
          <p style="font-size: 13px; color: #64748b;">
            जर आपण हा कोड मागितला नसेल, तर कृपया या ईमेलकडे दुर्लक्ष करा.
          </p>
        </div>
        <div class="footer">
          © 2026 MahaTicket · Kalpkrut Infotech · All Rights Reserved
        </div>
      </div>
    </body>
    </html>
  `;

  // OTP must be delivered via the same SMTP channel that stores otpCode in DB.
  // Do NOT fall back to Supabase Auth OTP — those codes are not the DB otpCode and break verify.
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const cleanedPass = String(smtpPass).trim().replace(/\s+/g, '');
      const isGmail = smtpHost.toLowerCase().includes('gmail.com');
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: cleanedPass },
            connectionTimeout: 7000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
          })
        : nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
            auth: { user: smtpUser, pass: cleanedPass },
            connectionTimeout: 7000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
          });
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html,
      });
      console.log(`[AUTH-OTP] Sent OTP via SMTP to ${email}`);
      return true;
    } catch (err) {
      console.error(
        '[AUTH-OTP] SMTP delivery failed:',
        err instanceof Error ? err.message : 'unknown'
      );
      return false;
    }
  }

  // Development logging fallback
  console.log(`[AUTH-OTP CODE for ${email}]: >>> ${otp} <<<`);
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return false;
}
