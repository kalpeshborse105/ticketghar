import crypto from 'crypto';

const TOKEN_SECRET =
  process.env.TICKET_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  'mahaticket_secure_production_secret_key_2026';

/** Short-lived PDF download capability (not a session). */
const PDF_TOKEN_TTL_MS = 5 * 60 * 1000;

export type OrderOwnershipFields = {
  userId: number;
  userEmail: string;
};

export type AuthCustomerLite = {
  id: number;
  email: string;
};

/**
 * Canonical ownership: application user id only.
 * Email equality alone must not grant access (prevents wrong-account association).
 */
export function customerOwnsOrder(
  customer: AuthCustomerLite,
  order: OrderOwnershipFields
): boolean {
  return typeof customer.id === 'number' && customer.id === order.userId;
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
