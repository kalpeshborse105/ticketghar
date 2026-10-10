import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Check customer session cookie
    const customerUser = await getCustomerSession();
    if (customerUser) {
      if (db && users && (customerUser.id || customerUser.email)) {
        try {
          const rows = customerUser.id
            ? await db.select().from(users).where(eq(users.id, customerUser.id)).limit(1)
            : await db.select().from(users).where(eq(users.email, customerUser.email)).limit(1);

          if (rows.length > 0) {
            const dbUser = rows[0];
            customerUser.avatarUrl = dbUser.avatarUrl || customerUser.avatarUrl;
            customerUser.fullName = dbUser.fullName || customerUser.fullName;
            customerUser.phoneNumber = dbUser.phoneNumber || customerUser.phoneNumber;
          }
        } catch {
          // non-blocking fallback to cookie data
        }
      }

      return NextResponse.json({
        user: customerUser,
        source: 'cookie',
      });
    }

    // 2. Check Supabase session if configured
    try {
      const supabase = await createClient();
      const {
        data: { user: supaUser },
      } = await supabase.auth.getUser();

      if (supaUser) {
        return NextResponse.json({
          user: {
            id: supaUser.id,
            email: supaUser.email,
            fullName: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0],
            role: 'customer',
          },
          source: 'supabase',
        });
      }
    } catch {
      // Supabase not configured or failed, non-blocking
    }

    return NextResponse.json({ user: null });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}
