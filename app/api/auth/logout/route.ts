import { NextResponse } from 'next/server';
import { clearCustomerSessionCookie } from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server.ts';

/**
 * Unified logout — clears MahaTicket session cookie + Supabase auth.
 * Prefer `/api/auth/flow/logout` for new clients; this route stays compatible.
 */
export async function POST() {
  try {
    await clearCustomerSessionCookie();

    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase logout notice:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
