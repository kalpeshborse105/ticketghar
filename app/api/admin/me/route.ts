// GET /api/admin/me - Verify admin session and return role + profile
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const verification = verifyAdminSession(request);

  if (!verification.valid) {
    return NextResponse.json(
      { authenticated: false, error: verification.error },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    role: verification.role || 'super_admin',
    user: verification.user || null,
    message: 'Admin session valid',
  });
}
