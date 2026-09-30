// POST /api/admin/logout - Clear admin session
import { NextRequest, NextResponse } from 'next/server';
import { destroyAdminSession, clearSessionCookie } from '@/src/lib/admin-auth.ts';

export async function POST(request: NextRequest) {
  destroyAdminSession(request);

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  clearSessionCookie(response);

  return response;
}
