import { sql } from 'drizzle-orm';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import {
  getCustomerSession,
  type CustomerSessionUser,
} from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server';
import {
  customerOwnsOrder,
  mintOrderPdfToken,
  verifyOrderPdfToken,
  PRIVATE_PDF_HEADERS,
  type OrderOwnershipFields,
} from '@/src/lib/order-access-crypto';

export type AuthCustomer = CustomerSessionUser;
export {
  customerOwnsOrder,
  mintOrderPdfToken,
  verifyOrderPdfToken,
  PRIVATE_PDF_HEADERS,
};
export type { OrderOwnershipFields };

/**
 * Resolve the authenticated application customer from Bearer token and/or cookies.
 * Never trusts client-supplied email/phone/userId query params.
 */
export async function resolveAuthCustomer(req: Request): Promise<AuthCustomer | null> {
  const authHeader = req.headers.get('authorization');
  const session = await getCustomerSession(authHeader);
  if (session && typeof session.id === 'number' && session.email) {
    return session;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: supaUser },
    } = await supabase.auth.getUser();
    if (supaUser?.email) {
      const email = supaUser.email.trim().toLowerCase();
      const [row] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);
      if (row) {
        return {
          id: row.id,
          uid: row.uid,
          email: row.email,
          fullName: row.fullName || '',
          phoneNumber: row.phoneNumber,
          role: row.role || 'customer',
          avatarUrl: row.avatarUrl,
        };
      }
    }
  } catch {
    // non-blocking
  }

  return null;
}

/**
 * Authorize PDF access via session ownership or a short-lived download token.
 * Returns null when unauthorized (caller should respond with generic 404).
 */
export async function authorizeOrderPdfAccess(
  req: Request,
  order: OrderOwnershipFields & { id: number }
): Promise<{ ok: true; via: 'session' | 'token' } | { ok: false }> {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('t') ||
    url.searchParams.get('token') ||
    req.headers.get('x-pdf-token');

  const fromToken = verifyOrderPdfToken(token);
  if (fromToken && fromToken.orderId === order.id && fromToken.userId === order.userId) {
    return { ok: true, via: 'token' };
  }

  const customer = await resolveAuthCustomer(req);
  if (customer && customerOwnsOrder(customer, order)) {
    return { ok: true, via: 'session' };
  }

  return { ok: false };
}
