// POST /api/admin/login - Admin & Organizer authentication endpoint
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, setSessionCookie } from '@/src/lib/admin-auth.ts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, email } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'पासवर्ड आवश्यक आहे (Password is required)' },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin({ password, email });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'प्रमाणीकरण अयशस्वी (Authentication failed)' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: result.role,
      user: result.user,
      message: 'प्रमाणीकरण यशस्वी (Authenticated successfully)',
    });

    // Set httpOnly session cookie
    if (result.sessionToken) {
      setSessionCookie(response, result.sessionToken);
    }

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'प्रमाणीकरण करताना त्रुटी आली' },
      { status: 500 }
    );
  }
}
