// GET /api/admin/me - Verify admin session and return status
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
    role: 'super_admin',
    message: 'Admin session valid',
  });
}
