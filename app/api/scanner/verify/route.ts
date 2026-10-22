import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { tickets, ticketScans, events, orders, eventSessions } from '@/src/db/schema.ts';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { decryptSecureTicketQr, decryptSecureGroupOrderQr } from '@/src/lib/ticket-crypto.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ticketCodeOrPayload,
      gateName,
      scannerUserId,
      scannerDevice,
      targetEventId,
      scannerOrganizerId,
    } = body;

    if (!ticketCodeOrPayload) {
      return NextResponse.json(
        { error: 'Ticket code or QR payload is required for scanning.' },
        { status: 400 }
      );
    }

    let targetCode = String(ticketCodeOrPayload).trim();

    // =========================================================================
    // 1. Check if this is an authoritative Group Order QR (MTGRP:v1:...)
    // =========================================================================
    if (targetCode.startsWith('MTGRP:v1:')) {
      const groupData = decryptSecureGroupOrderQr(targetCode);
      if (!groupData || !groupData.orderNumber) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_SIGNATURE',
          message: 'अवैध किंवा बनावट ग्रुप क्युआर कोड! (Invalid or counterfeit Group QR signature).',
        });
      }

      // Look up the order in PostgreSQL
      const orderRows = await db
        .select({
          order: orders,
          session: eventSessions,
          event: events,
        })
        .from(orders)
        .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
        .innerJoin(events, eq(orders.eventId, events.id))
        .where(eq(orders.orderNumber, groupData.orderNumber))
        .limit(1);

      if (orderRows.length === 0) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_ORDER',
          message: 'अवैध बुकिंग! प्रणालीमध्ये या ऑर्डरची नोंद नाही (Order not found).',
        });
      }

      const { order, session, event } = orderRows[0];

      // Cryptographic Event ID Cross-Verification
      if (groupData.eventId && Number(order.eventId) !== Number(groupData.eventId)) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_SIGNATURE',
          message: 'अवैध क्युआर कोड! कार्यक्रमाची माहिती जुळत नाही (Event mismatch in QR token).',
        });
      }

      // Organizer & Event Isolation Scope Check
      if (targetEventId && Number(order.eventId) !== Number(targetEventId)) {
        return NextResponse.json({
          valid: false,
          scanResult: 'WRONG_EVENT',
          message: `हे तिकीट या कार्यक्रमाचे नाही! (Wrong Event: तिकीट '${event.titleMr || event.title}' चे आहे).`,
          ticket: {
            code: order.orderNumber,
            attendee: order.userName,
            event: event.title,
            eventMr: event.titleMr,
          },
        });
      }

      if (scannerOrganizerId && Number(event.organizerId) !== Number(scannerOrganizerId)) {
        return NextResponse.json({
          valid: false,
          scanResult: 'WRONG_ORGANIZER',
          message: 'सावधान! हे तिकीट तुमच्या संस्थेच्या / आयोजकाच्या कार्यक्रमाचे नाही (Unauthorized Organizer Scan).',
          ticket: {
            code: order.orderNumber,
            attendee: order.userName,
            event: event.title,
            eventMr: event.titleMr,
          },
        });
      }

      // Payment & Order Status Check
      if (order.paymentStatus !== 'captured') {
        return NextResponse.json({
          valid: false,
          scanResult: 'UNPAID',
          message: 'या बुकिंगचे पेमेंट पूर्ण झालेले नाही (Payment not captured).',
        });
      }

      if (order.orderStatus === 'cancelled' || order.orderStatus === 'refunded') {
        return NextResponse.json({
          valid: false,
          scanResult: 'TICKET_CANCELLED',
          message: 'हे तिकीट रद्द किंवा परतावा केलेले आहे (Order was cancelled or refunded).',
          ticket: {
            code: order.orderNumber,
            attendee: order.userName,
          },
        });
      }

      // Fetch all tickets for this order
      const allOrderTickets = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, order.id));

      if (allOrderTickets.length === 0) {
        return NextResponse.json({
          valid: false,
          scanResult: 'NO_TICKETS',
          message: 'या ऑर्डरसाठी कोणतीही वैध तिकिटे सापडली नाहीत.',
        });
      }

      const allSeatsList = allOrderTickets.map((t) => t.seatCode).filter(Boolean);
      const isAlreadyUsed = allOrderTickets.some((t) => t.status === 'used');

      if (isAlreadyUsed) {
        // Query previous scan details
        const prevScan = await db
          .select()
          .from(ticketScans)
          .where(eq(ticketScans.ticketCode, order.orderNumber))
          .orderBy(desc(ticketScans.scannedAt))
          .limit(1);

        // Record duplicate scan attempt
        await db.insert(ticketScans).values({
          ticketId: allOrderTickets[0].id,
          ticketCode: order.orderNumber,
          scannedByUserId: scannerUserId || null,
          scannerDevice: scannerDevice || 'Gate Terminal',
          scanResult: 'ALREADY_USED',
          gateName: gateName || 'Main Entry Gate',
        });

        return NextResponse.json({
          valid: false,
          scanResult: 'ALREADY_USED',
          message: 'सावधान! हे ग्रुप तिकीट आधीच स्कॅन व वापरले गेले आहे (Already Scanned).',
          alreadyScannedAt: prevScan[0]?.scannedAt || allOrderTickets[0].createdAt,
          previousGate: prevScan[0]?.gateName || 'Main Gate',
          isGroup: true,
          totalSeats: order.ticketCount,
          seatCodes: allSeatsList,
          ticket: {
            code: order.orderNumber,
            seats: allSeatsList.join(', '),
            attendee: order.userName,
            event: event.title,
            eventMr: event.titleMr,
          },
        });
      }

      // Atomic transition: mark all tickets of this order as 'used'
      const updated = await db
        .update(tickets)
        .set({ status: 'used' })
        .where(
          and(
            eq(tickets.orderId, order.id),
            eq(tickets.status, 'valid')
          )
        )
        .returning({ id: tickets.id });

      if (updated.length === 0) {
        return NextResponse.json({
          valid: false,
          scanResult: 'ALREADY_USED',
          message: 'सावधान! हे तिकीट आधीच वापरले गेले आहे.',
        });
      }

      // Log successful group entry
      const [scanLog] = await db
        .insert(ticketScans)
        .values({
          ticketId: allOrderTickets[0].id,
          ticketCode: order.orderNumber,
          scannedByUserId: scannerUserId || null,
          scannerDevice: scannerDevice || 'Gate Terminal Pro',
          scanResult: 'SUCCESS',
          gateName: gateName || 'Main Entry Gate 1',
        })
        .returning();

      return NextResponse.json({
        valid: true,
        scanResult: 'SUCCESS',
        message: 'ग्रुप प्रवेश मान्य! (Group Entry Approved)',
        isGroup: true,
        totalSeats: order.ticketCount,
        seatCodes: allSeatsList,
        ticket: {
          code: order.orderNumber,
          seats: allSeatsList.join(', '),
          attendee: order.userName,
          event: event.title,
          eventMr: event.titleMr,
          showtime: session.sessionStartTime,
        },
        scannedAt: scanLog.scannedAt,
      });
    }

    // =========================================================================
    // 2. Individual Ticket QR Scan (MTSEC:v1:... or ticket code)
    // =========================================================================
    let embeddedEventId: number | undefined;

    if (targetCode.startsWith('MTSEC:v1:')) {
      const decrypted = decryptSecureTicketQr(targetCode);
      if (!decrypted || !decrypted.ticketCode) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_SIGNATURE',
          message: 'अवैध किंवा बनावट क्युआर कोड! (Invalid or counterfeit ticket QR signature).',
        });
      }
      targetCode = decrypted.ticketCode;
      embeddedEventId = decrypted.eventId;
    } else if (targetCode.includes('/tickets/')) {
      const parts = targetCode.split('/tickets/');
      targetCode = decodeURIComponent(parts[1].split('?')[0].split('#')[0].trim());
    } else if (targetCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(targetCode);
        if (parsed.code) targetCode = parsed.code.trim();
        else if (parsed.ord) targetCode = parsed.ord.trim();
      } catch {}
    }

    // Look up ticket in PostgreSQL
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
      return NextResponse.json({
        valid: false,
        scanResult: 'INVALID_TICKET',
        message: 'अवैध तिकीट! प्रणालीमध्ये या क्रमांकाची नोंद नाही (Ticket not recognized).',
        ticketCode: targetCode,
      });
    }

    const { ticket, order, session, event } = ticketRows[0];

    // Cryptographic Token Cross-Verification:
    if (embeddedEventId && Number(order.eventId) !== Number(embeddedEventId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'INVALID_SIGNATURE',
        message: 'अवैध किंवा हेरफेर केलेला क्युआर कोड! (Encrypted QR signature mismatch).',
      });
    }

    // Strict Organizer & Event Isolation Check:
    if (targetEventId && Number(order.eventId) !== Number(targetEventId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'WRONG_EVENT',
        message: `हे तिकीट या कार्यक्रमाचे नाही! (Wrong Event: तिकीट '${event.titleMr || event.title}' चे आहे).`,
        ticket: {
          code: 'PROTECTED',
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          event: event.title,
          eventMr: event.titleMr,
        },
      });
    }

    if (scannerOrganizerId && Number(event.organizerId) !== Number(scannerOrganizerId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'WRONG_ORGANIZER',
        message: 'सावधान! हे तिकीट तुमच्या संस्थेच्या / आयोजकाच्या कार्यक्रमाचे नाही (Unauthorized Organizer Scan).',
        ticket: {
          code: 'PROTECTED',
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          event: event.title,
          eventMr: event.titleMr,
        },
      });
    }

    // Check if ticket was already scanned / used
    if (ticket.status === 'used') {
      const previousScans = await db
        .select()
        .from(ticketScans)
        .where(eq(ticketScans.ticketId, ticket.id))
        .orderBy(desc(ticketScans.scannedAt))
        .limit(1);

      const lastScan = previousScans[0];

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
        message: 'सावधान! हे तिकीट आधीच वापरले गेले आहे (Already Scanned).',
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

    // Atomic update
    await db
      .update(tickets)
      .set({ status: 'used' })
      .where(eq(tickets.id, ticket.id));

    // Log successful scan
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
