import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server.ts';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
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
