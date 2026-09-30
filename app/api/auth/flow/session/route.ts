import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server';

export async function GET() {
  try {
    // 1. Check customer session cookie
    const customerUser = await getCustomerSession();
    if (customerUser) {
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
