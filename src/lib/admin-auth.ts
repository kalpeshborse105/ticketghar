// Admin auth — password gate + signed httpOnly cookie (no in-memory session Map)
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'mahaticket-admin-session-secure-key';
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

export function authenticateAdmin(password: string): {
  success: boolean;
  sessionToken?: string;
  error?: string;
} {
  if (!ADMIN_PASSWORD) {
    return { success: false, error: 'Admin authentication not configured (ADMIN_PASSWORD missing)' };
  }

  const inputBuffer = Buffer.from(password, 'utf8');
  const expectedBuffer = Buffer.from(ADMIN_PASSWORD, 'utf8');
  if (inputBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(inputBuffer, expectedBuffer)) {
    return { success: false, error: 'Invalid password' };
  }

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = Buffer.from(JSON.stringify({ role: 'super_admin', exp: expiresAt })).toString('base64url');
  const sessionToken = `${payload}.${sign(payload)}`;
  return { success: true, sessionToken };
}

export function verifyAdminSession(request: NextRequest): { valid: boolean; error?: string } {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return { valid: false, error: 'No session cookie found' };

  const [payload, signature] = cookie.value.split('.');
  if (!payload || !signature) return { valid: false, error: 'Invalid session token format' };

  if (!timingSafeEqualStr(signature, sign(payload))) {
    return { valid: false, error: 'Invalid session signature' };
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    if (!data.exp || Date.now() > data.exp) {
      return { valid: false, error: 'Session expired' };
    }
  } catch {
    return { valid: false, error: 'Corrupt session payload' };
  }

  return { valid: true };
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
