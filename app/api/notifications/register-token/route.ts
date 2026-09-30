import { NextRequest, NextResponse } from 'next/server';

// Global cache or database mapping of device tokens for push notifications
declare global {
  var _fcmDeviceTokens: Map<string, { token: string; userId?: string; platform: string; registeredAt: string }> | undefined;
}

if (!global._fcmDeviceTokens) {
  global._fcmDeviceTokens = new Map();
}

export async function POST(req: NextRequest) {
  try {
    const { token, userId, platform = 'android' } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Valid FCM registration token is required' },
        { status: 400 }
      );
    }

    // Register or update device token
    global._fcmDeviceTokens!.set(token, {
      token,
      userId: userId || 'anonymous',
      platform,
      registeredAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'FCM device token registered successfully for MahaTicket notifications',
      totalRegisteredDevices: global._fcmDeviceTokens!.size,
    });
  } catch (error: any) {
    console.error('FCM token registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register notification token' },
      { status: 500 }
    );
  }
}
