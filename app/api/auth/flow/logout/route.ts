import { NextResponse } from 'next/server';
import { clearCustomerSessionCookie } from '@/src/lib/auth-service';
import { createClient } from '@/src/lib/supabase/server';

export async function POST() {
  try {
    await clearCustomerSessionCookie();

    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
