import crypto from 'crypto';

const TOKEN_SECRET =
  process.env.TICKET_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  'mahaticket_secure_production_secret_key_2026';

/** PDF download capability token — valid for 30 days to cover event duration */
const PDF_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type OrderOwnershipFields = {
  userId: number;
  userEmail: string;
};

export type AuthCustomerLite = {
  id: number;
  email: string;
};

/**
 * Ownership for an authenticated session:
 * - primary: application user id
 * - also: same verified session email (covers guest-checkout / duplicate-account drift)
 * Client-supplied email query params are never used — only the signed-in session email.
 */
export function customerOwnsOrder(
  customer: AuthCustomerLite,
  order: OrderOwnershipFields
): boolean {
  if (typeof customer.id === 'number' && customer.id === order.userId) return true;
  const sessionEmail = String(customer.email || '').trim().toLowerCase();
  const orderEmail = String(order.userEmail || '').trim().toLowerCase();
  return !!sessionEmail && !!orderEmail && sessionEmail === orderEmail;
}

export function mintOrderPdfToken(orderId: number, userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      oid: orderId,
      uid: userId,
      exp: Date.now() + PDF_TOKEN_TTL_MS,
      v: 1,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`pdf-dl:${payload}`)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyOrderPdfToken(
  token: string | null | undefined
): { orderId: number; userId: number } | null {
  if (!token || !token.includes('.')) return null;
  try {
    const [payload, signature] = token.split('.');
    const expected = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`pdf-dl:${payload}`)
      .digest('base64url');
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expected, 'utf8')
      )
    ) {
      return null;
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      oid?: number;
      uid?: number;
      exp?: number;
    };
    if (!data.oid || !data.uid || !data.exp || Date.now() > data.exp) {
      return null;
    }
    return { orderId: data.oid, userId: data.uid };
  } catch {
    return null;
  }
}

export const PRIVATE_PDF_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
};
