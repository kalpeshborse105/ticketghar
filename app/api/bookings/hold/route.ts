import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, eventSessions } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { createTemporarySeatHold, calculatePricing } from '@/src/lib/inventory-engine.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, seatIds, userIdStr, couponCode } = body;

    if (!sessionId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid booking parameters. Session ID and at least one seat are required.' },
        { status: 400 }
      );
    }

    if (seatIds.length > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 tickets allowed per transaction to prevent bulk hoarding.' },
        { status: 400 }
      );
    }

    // 1. Fetch Session and Event
    const sessionRows = await db
      .select({
        session: eventSessions,
        event: events,
      })
      .from(eventSessions)
      .innerJoin(events, eq(eventSessions.eventId, events.id))
      .where(eq(eventSessions.id, sessionId));

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { event } = sessionRows[0];

    // 2. Perform atomic hold in DB
    const holdResult = await createTemporarySeatHold({
      sessionId,
      seatIds,
      userIdStr: userIdStr || 'guest-session-' + Date.now(),
    });

    // 3. Compute itemized pricing
    const pricing = await calculatePricing(
      event,
      seatIds.length,
      holdResult.faceValueTotal,
      couponCode
    );

    return NextResponse.json({
      success: true,
      hold: holdResult,
      pricing,
    });
  } catch (error: any) {
    console.error('Seat hold error:', error);
    return NextResponse.json(
      { error: error.message || 'Unable to reserve seats. Please try different seats.' },
      { status: 409 }
    );
  }
}
