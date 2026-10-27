import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { tickets, eventSessions, events, venues } from '@/src/db/schema.ts';
import { eq, sql, count } from 'drizzle-orm';
import { requireRoles } from '@/src/lib/admin-auth.ts';

/**
 * Live gate attendance for a selected showtime (from DB — not demo numbers).
 * GET /api/scanner/attendance?sessionId=123
 */
export async function GET(request: NextRequest) {
  try {
    const authError = requireRoles(request, [
      'super_admin',
      'organizer',
      'scanner',
      'operations',
      'manager',
    ]);
    if (authError) return authError;

    const sessionId = Number(request.nextUrl.searchParams.get('sessionId') || 0);
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const [row] = await db
      .select({
        session: eventSessions,
        event: events,
        venue: venues,
      })
      .from(eventSessions)
      .innerJoin(events, eq(eventSessions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(eventSessions.id, sessionId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [totals] = await db
      .select({
        totalTickets: count(),
        usedTickets: sql<number>`coalesce(sum(case when ${tickets.status} = 'used' then 1 else 0 end), 0)`,
        validTickets: sql<number>`coalesce(sum(case when ${tickets.status} = 'valid' then 1 else 0 end), 0)`,
      })
      .from(tickets)
      .where(eq(tickets.sessionId, sessionId));

    const total = Number(totals?.totalTickets || 0);
    const used = Number(totals?.usedTickets || 0);
    const remaining = Number(totals?.validTickets || 0);
    const capacity = Number(row.venue?.totalCapacity || total || 0);
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;

    return NextResponse.json({
      sessionId,
      eventId: row.event.id,
      eventTitle: row.event.titleMr || row.event.title,
      venueName: row.venue?.nameMr || row.venue?.name || '',
      sessionStartTime: row.session.sessionStartTime,
      capacity,
      totalTickets: total,
      checkedIn: used,
      remaining,
      percent: pct,
    });
  } catch (error: unknown) {
    console.error('Attendance error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
  }
}
