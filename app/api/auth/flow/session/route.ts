import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSession, setCustomerSessionCookie, signSessionToken } from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server';
import { db } from '@/src/db/index';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    // 1. App session (cookie or Android Bearer HMAC token)
    const customerUser = await getCustomerSession(authHeader);
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
            customerUser.uid = dbUser.uid || customerUser.uid;
            customerUser.id = dbUser.id;
            customerUser.role = dbUser.role || customerUser.role;
          }
        } catch {
          // non-blocking
        }
      }

      return NextResponse.json({
        user: customerUser,
        source: 'session',
        token: signSessionToken(customerUser),
      });
    }

    // 2. Supabase Auth → map to public.users (integer id), never return raw UUID as id
    try {
      const supabase = await createClient();
      const {
        data: { user: supaUser },
      } = await supabase.auth.getUser();

      if (supaUser?.email) {
        const email = supaUser.email.trim().toLowerCase();
        let [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!dbUser) {
          const [inserted] = await db
            .insert(users)
            .values({
              uid: supaUser.id,
              email,
              fullName:
                (supaUser.user_metadata?.full_name as string) ||
                email.split('@')[0] ||
                'MahaTicket User',
              role: 'customer',
              preferredLanguage: 'mr',
              city: 'Pune',
              avatarUrl: (supaUser.user_metadata?.avatar_url as string) || null,
              status: 'active',
            })
            .returning();
          dbUser = inserted;
        } else if (
          dbUser.uid &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbUser.uid)
        ) {
          // Link legacy string uid → Supabase UUID when safe
          try {
            const [updated] = await db
              .update(users)
              .set({ uid: supaUser.id, updatedAt: new Date() })
              .where(eq(users.id, dbUser.id))
              .returning();
            dbUser = updated;
          } catch {
            // uid collision — keep existing
          }
        }

        const sessionUser = {
          id: dbUser.id,
          uid: dbUser.uid,
          email: dbUser.email,
          fullName: dbUser.fullName,
          phoneNumber: dbUser.phoneNumber,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        };

        await setCustomerSessionCookie(sessionUser);

        return NextResponse.json({
          user: sessionUser,
          source: 'supabase',
          token: signSessionToken(sessionUser),
        });
      }
    } catch {
      // Supabase not configured or failed
    }

    return NextResponse.json({ user: null });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}
