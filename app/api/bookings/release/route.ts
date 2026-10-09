import { NextRequest, NextResponse } from 'next/server';
import { releaseSeatsHold } from '@/src/lib/inventory-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, holdToken, seatIds } = body;

    if (!sessionId || !holdToken) {
      return NextResponse.json(
        { error: 'sessionId and holdToken are required' },
        { status: 400 }
      );
    }

    const releasedCount = await releaseSeatsHold(
      Number(sessionId),
      String(holdToken),
      Array.isArray(seatIds) ? seatIds.map(Number) : undefined
    );

    return NextResponse.json({
      success: true,
      message: `${releasedCount} seats released successfully`,
      releasedCount,
    });
  } catch (error: any) {
    console.error('Error releasing held seats:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to release seats' },
      { status: 500 }
    );
  }
}
