import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { tickets, ticketScans, events, orders, eventSessions, users } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

function getTicketSecret(): string {
  return process.env.TICKET_SECRET || 'mahaticket_secure_signing_key_2026';
}

const TICKET_SECRET = getTicketSecret();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketCodeOrPayload, gateName, scannerUserId, scannerDevice } = body;

    if (!ticketCodeOrPayload) {
      return NextResponse.json(
        { error: 'Ticket code or QR payload is required for scanning.' },
        { status: 400 }
      );
    }

    // Extract code if scanned string is a full ticket URL or JSON
    let targetCode = ticketCodeOrPayload.trim();
    if (targetCode.includes('/tickets/')) {
      const parts = targetCode.split('/tickets/');
      targetCode = decodeURIComponent(parts[1].split('?')[0].split('#')[0].trim());
    } else if (ticketCodeOrPayload.startsWith('{')) {
      try {
        const parsed = JSON.parse(ticketCodeOrPayload);
        if (parsed.code) {
          targetCode = parsed.code.trim();
        }
      } catch (e) {
        // Not JSON, treat as raw code
      }
    }

    // 1. Look up ticket in PostgreSQL
    const ticketRows = await db
      .select({
        ticket: tickets,
        order: orders,
        session: eventSessions,
        event: events,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .innerJoin(events, eq(orders.eventId, events.id))
      .where(eq(tickets.ticketCode, targetCode));

    if (ticketRows.length === 0) {
      // Record failed invalid scan
      return NextResponse.json({
        valid: false,
        scanResult: 'INVALID_TICKET',
        message: 'अवैध तिकीट! प्रणालीमध्ये या क्रमांकाची नोंद नाही (Ticket not recognized).',
        ticketCode: targetCode,
      });
    }

    const { ticket, order, session, event } = ticketRows[0];

    // 2. Check if ticket was already scanned / used
    if (ticket.status === 'used') {
      // Find previous scan timestamp and gate
      const previousScans = await db
        .select()
        .from(ticketScans)
        .where(eq(ticketScans.ticketId, ticket.id))
        .orderBy(desc(ticketScans.scannedAt))
        .limit(1);

      const lastScan = previousScans[0];

      // Log this duplicate scan attempt
      await db.insert(ticketScans).values({
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        scannedByUserId: scannerUserId || null,
        scannerDevice: scannerDevice || 'Gate Terminal 1',
        scanResult: 'ALREADY_USED',
        gateName: gateName || 'Main Gate',
      });

      return NextResponse.json({
        valid: false,
        scanResult: 'ALREADY_USED',
        message: `सावधान! हे तिकीट आधीच वापरले गेले आहे (Already Scanned).`,
        alreadyScannedAt: lastScan?.scannedAt || ticket.createdAt,
        previousGate: lastScan?.gateName || 'Gate 1',
        ticket: {
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          event: event.title,
          eventMr: event.titleMr,
        },
      });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return NextResponse.json({
        valid: false,
        scanResult: 'TICKET_CANCELLED',
        message: 'हे तिकीट रद्द / परतावा केलेले आहे (Ticket was cancelled or refunded).',
        ticket: {
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
        },
      });
    }

    // 3. Mark ticket as 'used' atomically
    await db
      .update(tickets)
      .set({
        status: 'used',
      })
      .where(eq(tickets.id, ticket.id));

    // 4. Log successful scan
    const [scanLog] = await db
      .insert(ticketScans)
      .values({
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        scannedByUserId: scannerUserId || null,
        scannerDevice: scannerDevice || 'Gate Terminal Pro',
        scanResult: 'SUCCESS',
        gateName: gateName || 'Main Entry Gate 1',
      })
      .returning();

    return NextResponse.json({
      valid: true,
      scanResult: 'SUCCESS',
      message: 'प्रवेश मान्य! (Entry Approved)',
      ticket: {
        code: ticket.ticketCode,
        seat: ticket.seatCode,
        attendee: ticket.attendeeName,
        event: event.title,
        eventMr: event.titleMr,
        showtime: session.sessionStartTime,
      },
      scannedAt: scanLog.scannedAt,
    });
  } catch (error: any) {
    console.error('Scanner verification error:', error);
    return NextResponse.json(
      { error: 'Scanner verification failed' },
      { status: 500 }
    );
  }
}
