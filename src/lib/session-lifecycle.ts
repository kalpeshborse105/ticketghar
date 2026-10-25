import { db } from '@/src/db/index.ts';
import { eventSessions } from '@/src/db/schema.ts';
import { and, eq, lt, or, sql } from 'drizzle-orm';

/** Grace after start before session is treated as ended for booking (minutes). */
const BOOKING_GRACE_MINUTES = 30;

/**
 * Mark past showtimes completed so they stop appearing as bookable.
 * Safe to call frequently (idempotent). Admin can still read completed via admin APIs.
 */
export async function expirePastSessions(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - BOOKING_GRACE_MINUTES * 60 * 1000);
    const updated = await db
      .update(eventSessions)
      .set({ status: 'completed' })
      .where(
        and(
          eq(eventSessions.status, 'active'),
          or(
            and(
              sql`${eventSessions.sessionEndTime} is not null`,
              lt(eventSessions.sessionEndTime, new Date())
            ),
            lt(eventSessions.sessionStartTime, cutoff)
          )
        )
      )
      .returning({ id: eventSessions.id });
    return updated.length;
  } catch (err) {
    console.warn('expirePastSessions:', err instanceof Error ? err.message : err);
    return 0;
  }
}

export function isSessionBookable(session: {
  sessionStartTime?: Date | string | null;
  sessionEndTime?: Date | string | null;
  status?: string | null;
}): boolean {
  if (!session) return false;
  if (session.status && session.status !== 'active') return false;
  const start = session.sessionStartTime ? new Date(session.sessionStartTime).getTime() : NaN;
  if (Number.isNaN(start)) return false;
  const end = session.sessionEndTime ? new Date(session.sessionEndTime).getTime() : NaN;
  const now = Date.now();
  if (!Number.isNaN(end) && end < now) return false;
  // Allow booking until start + grace
  if (start + BOOKING_GRACE_MINUTES * 60 * 1000 < now) return false;
  return true;
}
