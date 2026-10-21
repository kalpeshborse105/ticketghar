import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { setCustomerSessionCookie, signSessionToken, CustomerSessionUser } from '@/src/lib/auth-service.ts';

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

    const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

    if (error || !code) {
      console.error('Google OAuth callback error:', error);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error || 'Google login cancelled')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.Client_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.Client_Secret;
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth client credentials in environment');
      return NextResponse.redirect(`${origin}/?auth_error=Missing+Google+credentials`);
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
      console.error('Failed to exchange code for tokens:', errText);
      return NextResponse.redirect(`${origin}/?auth_error=Token+exchange+failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('Failed to fetch userinfo from Google');
      return NextResponse.redirect(`${origin}/?auth_error=Failed+to+fetch+user+profile`);
    }

    const googleUser = await userRes.json();
    const email = (googleUser.email || '').trim().toLowerCase();
    const fullName = googleUser.name || googleUser.given_name || email.split('@')[0] || 'User';
    const avatarUrl = googleUser.picture || null;
    const googleSub = googleUser.id || googleUser.sub || `google-${Date.now()}`;

    if (!email) {
      return NextResponse.redirect(`${origin}/?auth_error=No+email+returned+from+Google`);
    }

    // 3. Upsert user into database
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
    } catch (dbErr: any) {
      console.warn('DB upsert error on Google auth (fallback to memory session):', dbErr?.message);
      dbUser = {
        id: 999999,
        uid: `google-${googleSub}`,
        email,
        fullName,
        avatarUrl,
        role: 'customer',
      };
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

    // 5. Set customer session cookie
    await setCustomerSessionCookie(customerUser);
    const sessionToken = signSessionToken(customerUser);

    // 6. Handle redirect: if from mobile app, support deep link or web return
    const isMobile = state?.source === 'mobile';
    const destination = state?.redirect || '/';

    if (isMobile) {
      return NextResponse.redirect(
        `mahaticket://auth/callback?token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(
          JSON.stringify(customerUser)
        )}`
      );
    }

    return NextResponse.redirect(`${origin}${destination.startsWith('/') ? destination : '/'}`);
  } catch (error: any) {
    console.error('Google OAuth callback unhandled exception:', error);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/?auth_error=Internal+OAuth+error`);
  }
}
