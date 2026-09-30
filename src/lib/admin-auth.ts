// Admin & Organizer RBAC Auth — Signed httpOnly cookie + DB credentials
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/src/db/index.ts';
import { users, organizers } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/src/lib/auth-service.ts';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'mahaticket-admin-session-secure-key-2026';
}

const SESSION_SECRET = getSessionSecret();
const SESSION_COOKIE_NAME = 'mahaticket_admin_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function sign(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export interface AdminSessionData {
  role: 'super_admin' | 'organizer' | 'scanner' | 'operations' | 'finance';
  userId?: number;
  email?: string;
  fullName?: string;
  organizerId?: number;
  exp: number;
}

/**
 * Authenticate with either:
 * 1. Email + Password (checks DB users table & organizers table for role)
 * 2. Master ADMIN_PASSWORD (assigns 'super_admin')
 */
export async function authenticateAdmin(credentials: {
  password: string;
  email?: string;
}): Promise<{
  success: boolean;
  role?: string;
  user?: any;
  sessionToken?: string;
  error?: string;
}> {
  const { password, email } = credentials;

  // 1. Email + Password login (Organizer, Scanner, Admin)
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (!user) {
        return {
          success: false,
          error: 'या ईमेलसाठी कोणतेही खाते सापडले नाही (No account found with this email)',
        };
      }

      if (!user.passwordHash) {
        return {
          success: false,
          error: 'पासवर्ड सेट केलेला नाही. कृपया मुख्य संकेतस्थळावरून OTP द्वारे पासवर्ड सेट करा.',
        };
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return {
          success: false,
          error: 'चुकीचा पासवर्ड! कृपया पुन्हा तपासा (Invalid password)',
        };
      }

      // Check if user is linked to an organizer
      const [org] = await db
        .select()
        .from(organizers)
        .where(eq(organizers.email, cleanEmail))
        .limit(1);

      let rawRole = String(user.role || 'customer');
      let organizerId = org ? org.id : undefined;

      // If user is listed in organizers table or has organizer role
      if (org && (rawRole === 'customer' || !rawRole)) {
        rawRole = 'organizer';
      }

      // Security check: Only allowed roles can access /admin
      const allowedRoles = ['super_admin', 'organizer', 'scanner', 'operations', 'finance'];
      if (!allowedRoles.includes(rawRole)) {
        return {
          success: false,
          error: 'प्रवेश नाकारला: आपल्या खात्यास आयोजक किंवा प्रशासक अधिकार नाहीत (Access restricted to organizers & admins).',
        };
      }

      const role = rawRole as AdminSessionData['role'];

      const expiresAt = Date.now() + SESSION_DURATION_MS;
      const payloadObj: AdminSessionData = {
        role,
        userId: user.id,
        email: user.email,
        fullName: user.fullName || org?.companyName || 'आयोजक',
        organizerId,
        exp: expiresAt,
      };

      const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
      const sessionToken = `${payload}.${sign(payload)}`;

      return {
        success: true,
        role,
        user: payloadObj,
        sessionToken,
      };
    } catch (e: any) {
      console.error('Error authenticating admin user:', e);
      return {
        success: false,
        error: 'डेटाबेस प्रमाणीकरण त्रुटी (Authentication service error)',
      };
    }
  }

  // 2. Master ADMIN_PASSWORD login (Super Admin)
  if (!ADMIN_PASSWORD) {
    return {
      success: false,
      error: 'प्रशासक पासवर्ड कॉन्फिगर केलेला नाही (ADMIN_PASSWORD missing in .env)',
    };
  }

  const inputBuffer = Buffer.from(password, 'utf8');
  const expectedBuffer = Buffer.from(ADMIN_PASSWORD, 'utf8');
  if (
    inputBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(inputBuffer, expectedBuffer)
  ) {
    return {
      success: false,
      error: 'अवैध पासवर्ड (Invalid admin password)',
    };
  }

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payloadObj: AdminSessionData = {
    role: 'super_admin',
    fullName: 'मुख्य प्रशासक (Super Admin)',
    exp: expiresAt,
  };

  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sessionToken = `${payload}.${sign(payload)}`;

  return {
    success: true,
    role: 'super_admin',
    user: payloadObj,
    sessionToken,
  };
}

export function verifyAdminSession(request: NextRequest): {
  valid: boolean;
  role?: AdminSessionData['role'];
  user?: Partial<AdminSessionData>;
  error?: string;
} {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return { valid: false, error: 'No session cookie found' };

  const [payload, signature] = cookie.value.split('.');
  if (!payload || !signature) return { valid: false, error: 'Invalid session token format' };

  if (!timingSafeEqualStr(signature, sign(payload))) {
    return { valid: false, error: 'Invalid session signature' };
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSessionData;
    if (!data.exp || Date.now() > data.exp) {
      return { valid: false, error: 'Session expired' };
    }

    return {
      valid: true,
      role: data.role || 'super_admin',
      user: {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role || 'super_admin',
        organizerId: data.organizerId,
      },
    };
  } catch {
    return { valid: false, error: 'Corrupt session payload' };
  }
}

export function destroyAdminSession(_request: NextRequest): boolean {
  return true;
}

export function requireAdmin(request: NextRequest): NextResponse | null {
  const verification = verifyAdminSession(request);
  if (!verification.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function setSessionCookie(response: NextResponse, sessionToken: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
