import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { setCustomerSessionCookie, signSessionToken, CustomerSessionUser } from '@/src/lib/auth-service.ts';
import { createClient } from '@/src/lib/supabase/server.ts';

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || urlObj.origin;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.Client_ID;
    const acceptHeader = request.headers.get('accept') || '';
    const isDirect = urlObj.searchParams.get('direct') === 'true' || acceptHeader.includes('text/html');
    const source = urlObj.searchParams.get('source') || 'web';
    const redirectParam = urlObj.searchParams.get('redirect') || '/';

    // 1. Direct Google OAuth flow when GOOGLE_CLIENT_ID is provided in .env
    if (clientId) {
      const redirectUri = `${origin}/api/auth/google/callback`;
      const stateObj = { source, redirect: redirectParam };
      const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=openid%20profile%20email&access_type=offline&prompt=select_account&state=${stateStr}`;

      if (isDirect) {
        return NextResponse.redirect(authUrl, 307);
      }

      return NextResponse.json({ url: authUrl });
    }

    // 2. Fallback to Supabase OAuth if GOOGLE_CLIENT_ID was not configured
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (!error && data?.url) {
        if (isDirect) {
          return NextResponse.redirect(data.url, 307);
        }
        return NextResponse.json({ url: data.url });
      }
    } catch {
      // Supabase OAuth fallback failed
    }

    return NextResponse.json(
      { error: 'Google OAuth credentials not configured. Please check GOOGLE_CLIENT_ID in .env.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, credential, accessToken, userInfo } = body;

    let email = userInfo?.email;
    let fullName = userInfo?.name || userInfo?.fullName || 'User';
    let avatarUrl = userInfo?.picture || userInfo?.avatarUrl || null;
    let googleSub = userInfo?.id || userInfo?.sub;

    // Verify token with Google if token provided
    const tokenToVerify = idToken || credential;
    if (tokenToVerify) {
      try {
        const tokenRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
        );
        if (tokenRes.ok) {
          const payload = await tokenRes.json();
          email = payload.email || email;
          fullName = payload.name || payload.given_name || fullName;
          avatarUrl = payload.picture || avatarUrl;
          googleSub = payload.sub || googleSub;
        }
      } catch (err) {
        console.warn('Google tokeninfo check failed, checking direct profile info:', err);
      }
    } else if (accessToken) {
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userRes.ok) {
          const payload = await userRes.json();
          email = payload.email || email;
          fullName = payload.name || fullName;
          avatarUrl = payload.picture || avatarUrl;
          googleSub = payload.id || googleSub;
        }
      } catch (err) {
        console.warn('Google userinfo fetch failed:', err);
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Valid Google email is required for login' },
        { status: 400 }
      );
    }

    email = email.trim().toLowerCase();
    googleSub = googleSub || `google-${Date.now()}`;

    // Upsert into users table
    let dbUser: any = null;
    try {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        dbUser = existing[0];
        const [updated] = await db
          .update(users)
          .set({
            fullName: dbUser.fullName && dbUser.fullName !== 'Guest User' ? dbUser.fullName : fullName,
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
            uid: `google-${googleSub}`,
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
    } catch {
      dbUser = {
        id: 999999,
        uid: `google-${googleSub}`,
        email,
        fullName,
        avatarUrl,
        role: 'customer',
      };
    }

    const customerUser: CustomerSessionUser = {
      id: dbUser.id,
      uid: dbUser.uid || `google-${googleSub}`,
      email: dbUser.email,
      fullName: dbUser.fullName || fullName,
      phoneNumber: dbUser.phoneNumber || null,
      role: dbUser.role || 'customer',
      avatarUrl: dbUser.avatarUrl || avatarUrl,
    };

    await setCustomerSessionCookie(customerUser);
    const token = signSessionToken(customerUser);

    return NextResponse.json({
      success: true,
      user: customerUser,
      token,
      message: 'Google login successful',
    });
  } catch (error: any) {
    console.error('Google login POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Google login failed' },
      { status: 500 }
    );
  }
}
