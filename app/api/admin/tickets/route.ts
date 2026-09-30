import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { tickets, orders, events, venues, eventSessions, ticketScans } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '200', 10);
    const statusParam = searchParams.get('status');

    const ticketRows = await db
      .select({
        ticket: tickets,
        order: orders,
        event: events,
        venue: venues,
        session: eventSessions,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(events, eq(orders.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .orderBy(desc(tickets.createdAt))
      .limit(limitParam);

    const enriched = await Promise.all(
      ticketRows.map(async (row) => {
        let lastScan = null;
        if (row.ticket.status === 'used') {
          const scans = await db
            .select()
            .from(ticketScans)
            .where(eq(ticketScans.ticketId, row.ticket.id))
            .orderBy(desc(ticketScans.scannedAt))
            .limit(1);
          lastScan = scans[0] || null;
        }

        return {
          id: row.ticket.id,
          ticketCode: row.ticket.ticketCode,
          seatCode: row.ticket.seatCode,
          attendeeName: row.ticket.attendeeName,
          status: row.ticket.status,
          price: row.ticket.faceValue,
          createdAt: row.ticket.createdAt,
          orderId: row.order.id,
          orderNumber: row.order.orderNumber,
          userPhone: row.order.userPhone,
          userEmail: row.order.userEmail,
          eventTitle: row.event.title,
          eventTitleMr: row.event.titleMr,
          venueName: row.venue?.nameMr || row.venue?.name || 'नाट्यगृह',
          city: row.venue?.city || 'महाराष्ट्र',
          sessionTime: row.session?.sessionStartTime,
          scannedAt: lastScan?.scannedAt || null,
          gateName: lastScan?.gateName || null,
          scanResult: lastScan?.scanResult || (row.ticket.status === 'used' ? 'SUCCESS' : null),
        };
      })
    );

    const filtered = statusParam && statusParam !== 'all'
      ? enriched.filter((t) => t.status === statusParam)
      : enriched;

    return NextResponse.json({ tickets: filtered });
  } catch (error: any) {
    console.error('Error fetching admin tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tickets/verify - Manual instant verification by organizer
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const session = verifyAdminSession(request);
    const body = await request.json();
    const { ticketId, ticketCode, gateName } = body;

    let targetTicket;
    if (ticketId) {
      const rows = await db.select().from(tickets).where(eq(tickets.id, Number(ticketId))).limit(1);
      targetTicket = rows[0];
    } else if (ticketCode) {
      const rows = await db.select().from(tickets).where(eq(tickets.ticketCode, String(ticketCode).trim())).limit(1);
      targetTicket = rows[0];
    }

    if (!targetTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (targetTicket.status === 'used') {
      return NextResponse.json({
        success: false,
        alreadyUsed: true,
        message: 'हे तिकीट आधीच वापरले गेले आहे (Already verified)',
        ticket: targetTicket,
      });
    }

    // Mark as used
    await db
      .update(tickets)
      .set({ status: 'used' })
      .where(eq(tickets.id, targetTicket.id));

    // Log scan
    await db.insert(ticketScans).values({
      ticketId: targetTicket.id,
      ticketCode: targetTicket.ticketCode,
      scannedByUserId: session.user?.userId ? Number(session.user.userId) : null,
      scannerDevice: 'Admin Console Manual Verification',
      scanResult: 'SUCCESS',
      gateName: gateName || 'Main Entry Gate',
    });

    return NextResponse.json({
      success: true,
      message: 'तिकीट यशस्वीरित्या सत्यापित केले (Ticket verified successfully)',
      ticketId: targetTicket.id,
    });
  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
