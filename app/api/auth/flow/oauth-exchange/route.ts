import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { createClient } from '@/src/lib/supabase/server.ts';
import { setCustomerSessionCookie, signSessionToken, CustomerSessionUser } from '@/src/lib/auth-service.ts';

function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && !appUrl.includes('localhost')) {
    return appUrl.replace(/\/+$/, '');
  }
  return new URL(request.url).origin;
}

export async function POST(req: NextRequest) {
  try {
    const { code, source } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const origin = getOrigin(req);
    let email = '';
    let fullName = 'MahaTicket User';
    let avatarUrl: string | null = null;
    let authUid = '';

    // 1. Try Supabase SSR Server exchange first
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user?.email) {
        email = data.user.email.trim().toLowerCase();
        fullName =
          (data.user.user_metadata?.full_name as string) ||
          (data.user.user_metadata?.name as string) ||
          email.split('@')[0] ||
          'MahaTicket User';
        avatarUrl = (data.user.user_metadata?.avatar_url as string) || null;
        authUid = data.user.id;
      }
    } catch {
      // Supabase SSR exchange error, try direct Google exchange next
    }

    // 2. If Supabase exchange did not yield an email, try direct Google token exchange
    if (!email) {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.Client_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.Client_Secret;
      const redirectUriCandidates = [
        `${origin}/auth/callback`,
        `${origin}/api/auth/google/callback`,
        'https://mahaticket.kalpkrutinfotech.com/auth/callback',
        'https://mahaticket.kalpkrutinfotech.com/api/auth/google/callback',
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/api/auth/google/callback',
      ];

      if (clientId && clientSecret) {
        for (const redUri of redirectUriCandidates) {
          try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redUri,
                grant_type: 'authorization_code',
              }),
            });

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData.access_token) {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                if (userRes.ok) {
                  const googleUser = await userRes.json();
                  if (googleUser?.email) {
                    email = googleUser.email.trim().toLowerCase();
                    fullName = googleUser.name || googleUser.given_name || email.split('@')[0];
                    avatarUrl = googleUser.picture || null;
                    authUid = `google-${googleUser.id || googleUser.sub || Date.now()}`;
                    break;
                  }
                }
              }
            }
          } catch {
            // Try next candidate
          }
        }
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'प्रमाणीकरण कोड अवैध किंवा कालबाह्य झाला आहे. कृपया पुन्हा लॉगिन करा.' },
        { status: 400 }
      );
    }

    // 3. Upsert user in database
    let dbUser: any = null;
    try {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        dbUser = existing[0];
        const isEmailLikeName =
          !dbUser.fullName ||
          dbUser.fullName === 'Guest User' ||
          dbUser.fullName === email.split('@')[0] ||
          dbUser.fullName.includes('@');
        const updatedName = !isEmailLikeName ? dbUser.fullName : fullName;

        const [updated] = await db
          .update(users)
          .set({
            fullName: updatedName,
            avatarUrl: avatarUrl || dbUser.avatarUrl,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(users.id, dbUser.id))
          .returning();
        dbUser = updated;
      } else {
        const [inserted] = await db
          .insert(users)
          .values({
            uid: authUid || `user-${Date.now()}`,
            email,
            fullName,
            avatarUrl,
            role: 'customer',
            status: 'active',
            preferredLanguage: 'mr',
            city: 'Pune',
          })
          .returning();
        dbUser = inserted;
      }
    } catch (dbErr: any) {
      console.warn('DB upsert error in oauth-exchange:', dbErr);
      dbUser = {
        id: 1,
        uid: authUid || `user-${Date.now()}`,
        email,
        fullName,
        role: 'customer',
        avatarUrl,
      };
    }

    const customerUser: CustomerSessionUser = {
      id: dbUser.id,
      uid: dbUser.uid || authUid,
      email: dbUser.email,
      fullName: dbUser.fullName || fullName,
      phoneNumber: dbUser.phoneNumber || null,
      role: dbUser.role || 'customer',
      avatarUrl: dbUser.avatarUrl || avatarUrl,
    };

    await setCustomerSessionCookie(customerUser);
    const sessionToken = signSessionToken(customerUser);

    const response = NextResponse.json({
      success: true,
      user: customerUser,
      token: sessionToken,
      source: source || 'web',
    });

    response.cookies.set('mahaticket_customer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set('mahaticket_logged_in', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    console.error('OAuth exchange error:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication exchange failed' },
      { status: 500 }
    );
  }
}
