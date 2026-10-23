import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { events, eventSessions } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { createTemporarySeatHold, calculatePricing } from '@/src/lib/inventory-engine.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, seatIds, couponCode } = body;

    if (!sessionId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid booking parameters. Session ID and at least one seat are required.' },
        { status: 400 }
      );
    }

    if (seatIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 tickets allowed per transaction to prevent bulk hoarding.' },
        { status: 400 }
      );
    }

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

    // Server-issued hold token only — client userIdStr is ignored
    const holdResult = await createTemporarySeatHold({
      sessionId,
      seatIds,
    });

    const pricing = await calculatePricing(
      event,
      seatIds.length,
      holdResult.faceValueTotal,
      couponCode
    );

    return NextResponse.json({
      success: true,
      holdToken: holdResult.holdToken,
      hold: holdResult,
      pricing,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to reserve seats. Please try different seats.';
    console.error('Seat hold error:', message);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
