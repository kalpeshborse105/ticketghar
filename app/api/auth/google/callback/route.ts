import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { setCustomerSessionCookie, signSessionToken, CustomerSessionUser } from '@/src/lib/auth-service.ts';
import { getAppBaseUrl } from '@/src/lib/public-url';

function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    const host = forwardedHost.toLowerCase();
    if (host === 'mahaticket.com' || host === 'www.mahaticket.com') {
      return getAppBaseUrl();
    }
    return `${forwardedProto}://${forwardedHost}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && !appUrl.includes('localhost')) {
    return getAppBaseUrl();
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateRaw = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    let state: any = {};
    try {
      if (stateRaw) {
        state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      }
    } catch {
      state = {};
    }

    const origin = getOrigin(request);

    const isMobileFlow = state?.source === 'mobile';
    const failRedirect = (msg: string) => {
      if (isMobileFlow) {
        const bridge = new URL(`${origin}/auth/mobile-done`);
        bridge.searchParams.set('error', msg);
        return NextResponse.redirect(bridge.toString(), 307);
      }
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
    };

    if (error || !code) {
      console.error('Google OAuth callback error:', error);
      return failRedirect(error || 'Google login cancelled');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.Client_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.Client_Secret;
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth client credentials in environment');
      return failRedirect('Missing Google credentials');
    }

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Failed to exchange code for tokens:', errText.slice(0, 200));
      return failRedirect('Token exchange failed');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('Failed to fetch userinfo from Google');
      return failRedirect('Failed to fetch user profile');
    }

    const googleUser = await userRes.json();
    const email = (googleUser.email || '').trim().toLowerCase();
    const googleGivenName = googleUser.given_name || '';
    const googleFamilyName = googleUser.family_name || '';
    const combinedGoogleName = [googleGivenName, googleFamilyName].filter(Boolean).join(' ').trim();
    const cleanGoogleName = googleUser.name || combinedGoogleName || null;
    const emailFallbackName = email ? email.split('@')[0].replace(/[._\d]+/g, ' ').trim() : 'User';
    const fullName = cleanGoogleName || (emailFallbackName.charAt(0).toUpperCase() + emailFallbackName.slice(1));
    const avatarUrl = googleUser.picture || null;
    const googleSub = googleUser.id || googleUser.sub || `google-${Date.now()}`;

    if (!email) {
      return failRedirect('No email returned from Google');
    }

    // 3. Upsert user into database
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
        const updatedName = cleanGoogleName || (isEmailLikeName ? fullName : dbUser.fullName);

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
    } catch (dbErr: unknown) {
      console.error('DB upsert error on Google auth:', dbErr instanceof Error ? dbErr.message : 'unknown');
      return failRedirect('Account sync failed');
    }

    // 4. Create verified customer session user
    const customerUser: CustomerSessionUser = {
      id: dbUser.id,
      uid: dbUser.uid || `google-${googleSub}`,
      email: dbUser.email,
      fullName: dbUser.fullName || fullName,
      phoneNumber: dbUser.phoneNumber || null,
      role: dbUser.role || 'customer',
      avatarUrl: dbUser.avatarUrl || avatarUrl,
    };

    // 5. Set customer session cookie & sign token
    await setCustomerSessionCookie(customerUser);
    const sessionToken = signSessionToken(customerUser);

    // 6. Handle redirect: if from mobile app, support deep link or web return
    const isMobile = state?.source === 'mobile';
    const destination = state?.redirect || '/';

    if (isMobile) {
      // Chrome blocks direct custom-scheme redirects after OAuth.
      // Bridge page opens mahaticket:// with token only (short URL; app decodes user).
      const bridge = new URL(`${origin}/auth/mobile-done`);
      bridge.searchParams.set('token', sessionToken);
      return NextResponse.redirect(bridge.toString(), 307);
    }

    const redirectUrl = `${origin}${destination.startsWith('/') ? destination : '/'}`;
    const res = NextResponse.redirect(redirectUrl, 307);
    res.cookies.set('mahaticket_customer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.set('mahaticket_logged_in', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error: any) {
    console.error('Google OAuth callback unhandled exception:', error);
    const origin = getOrigin(request);
    // Best-effort mobile bridge when state is unavailable
    try {
      const url = new URL(request.url);
      const stateRaw = url.searchParams.get('state');
      let state: any = {};
      if (stateRaw) {
        state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      }
      if (state?.source === 'mobile') {
        const bridge = new URL(`${origin}/auth/mobile-done`);
        bridge.searchParams.set('error', 'Internal OAuth error');
        return NextResponse.redirect(bridge.toString(), 307);
      }
    } catch {
      /* fall through */
    }
    return NextResponse.redirect(`${origin}/?auth_error=Internal+OAuth+error`);
  }
}
