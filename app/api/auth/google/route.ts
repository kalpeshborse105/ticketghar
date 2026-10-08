import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server.ts';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to initiate Google sign-in' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: data.url,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
