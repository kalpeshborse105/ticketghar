import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { tickets, ticketScans, events, orders, eventSessions, venues } from '@/src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { decryptSecureTicketQr, decryptSecureGroupOrderQr } from '@/src/lib/ticket-crypto.ts';
import { normalizeScannerPayload } from '@/src/lib/scanner-payload.ts';

function formatShowtimeIst(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function ticketPassSummary(params: {
  code: string;
  seat?: string | null;
  seats?: string;
  attendee?: string | null;
  eventTitle?: string | null;
  eventTitleMr?: string | null;
  venueName?: string | null;
  showtime?: Date | string | null;
  sessionId?: number | null;
}) {
  return {
    code: params.code,
    seat: params.seat || params.seats || '',
    seats: params.seats || params.seat || '',
    attendee: params.attendee || '',
    event: params.eventTitle || '',
    eventMr: params.eventTitleMr || params.eventTitle || '',
    venue: params.venueName || '',
    showtime: params.showtime || null,
    showtimeLabel: formatShowtimeIst(params.showtime),
    sessionId: params.sessionId ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ticketCodeOrPayload,
      gateName,
      scannerUserId,
      scannerDevice,
      targetEventId,
      targetSessionId,
      scannerOrganizerId,
      requireScope,
    } = body;

    if (!ticketCodeOrPayload) {
      return NextResponse.json(
        { error: 'Ticket code or QR payload is required for scanning.' },
        { status: 400 }
      );
    }

    // Gate staff must lock scanner to one event + showtime before accepting entry
    if (requireScope && (!targetEventId || !targetSessionId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'SCOPE_REQUIRED',
        message:
          'कृपया स्कॅन करण्यापूर्वी कार्यक्रम व शो वेळ निवडा (Select event and showtime first).',
      });
    }

    const { normalized, kind } = normalizeScannerPayload(String(ticketCodeOrPayload));
    let targetCode = normalized;
    const rawPreview = String(ticketCodeOrPayload).trim().slice(0, 96);

    if (!targetCode) {
      return NextResponse.json({
        valid: false,
        scanResult: 'INVALID_TICKET',
        message: 'QR रिक्त / वाचता आला नाही. पुन्हा स्कॅन करा किंवा मॅन्युअल कोड टाका.',
        rawPreview,
      });
    }

    // =========================================================================
    // 1. Check if this is an authoritative Group Order QR (MTGRP:v1:...)
    // =========================================================================
    if (targetCode.startsWith('MTGRP:v1:') || kind === 'mtgrp') {
      const groupData = decryptSecureGroupOrderQr(targetCode);
      if (!groupData || !groupData.orderNumber) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_SIGNATURE',
          message:
            'ग्रुप QR वाचला पण सिग्नेचर जुळला नाही — शक्यतो QR कापला गेला. तिकीट लिंक / ऑर्डर क्रमांक वापरा.',
          rawPreview,
        });
      }

      // Look up the order in PostgreSQL
      const orderRows = await db
        .select({
          order: orders,
          session: eventSessions,
          event: events,
          venue: venues,
        })
        .from(orders)
        .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
        .innerJoin(events, eq(orders.eventId, events.id))
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(orders.orderNumber, groupData.orderNumber))
        .limit(1);

      if (orderRows.length === 0) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_ORDER',
          message: 'अवैध बुकिंग! प्रणालीमध्ये या ऑर्डरची नोंद नाही (Order not found).',
        });
      }

      const { order, session, event, venue } = orderRows[0];
      const venueName = venue?.nameMr || venue?.name || '';

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
          message: `हे तिकीट या कार्यक्रमाचे नाही! तिकीट '${event.titleMr || event.title}' चे आहे. आयोजक / प्रशासनशी संपर्क साधा.`,
          ticket: ticketPassSummary({
            code: order.orderNumber,
            attendee: order.userName,
            eventTitle: event.title,
            eventTitleMr: event.titleMr,
            venueName,
            showtime: session.sessionStartTime,
            sessionId: session.id,
          }),
        });
      }

      // Exact showtime / session lock — never accept another date/time for same event
      if (targetSessionId && Number(order.sessionId) !== Number(targetSessionId)) {
        return NextResponse.json({
          valid: false,
          scanResult: 'WRONG_SESSION',
          message: `तिकीट या निवडलेल्या शो वेळेशी जुळत नाही. तिकीट वेळ: ${formatShowtimeIst(session.sessionStartTime)}. कृपया योग्य शो निवडा किंवा आयोजक / प्रशासनशी संपर्क साधा.`,
          ticket: ticketPassSummary({
            code: order.orderNumber,
            attendee: order.userName,
            eventTitle: event.title,
            eventTitleMr: event.titleMr,
            venueName,
            showtime: session.sessionStartTime,
            sessionId: session.id,
          }),
        });
      }

      if (scannerOrganizerId && Number(event.organizerId) !== Number(scannerOrganizerId)) {
        return NextResponse.json({
          valid: false,
          scanResult: 'WRONG_ORGANIZER',
          message: 'सावधान! हे तिकीट तुमच्या संस्थेच्या / आयोजकाच्या कार्यक्रमाचे नाही (Unauthorized Organizer Scan).',
          ticket: ticketPassSummary({
            code: order.orderNumber,
            attendee: order.userName,
            eventTitle: event.title,
            eventTitleMr: event.titleMr,
            venueName,
            showtime: session.sessionStartTime,
            sessionId: session.id,
          }),
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
          ticket: ticketPassSummary({
            code: order.orderNumber,
            seats: allSeatsList.join(', '),
            attendee: order.userName,
            eventTitle: event.title,
            eventTitleMr: event.titleMr,
            venueName,
            showtime: session.sessionStartTime,
            sessionId: session.id,
          }),
        });
      }

      // Atomic group redeem: CAS all valid tickets + scan log
      const groupRedeem = await db.transaction(async (tx) => {
        const updated = await tx
          .update(tickets)
          .set({ status: 'used' })
          .where(and(eq(tickets.orderId, order.id), eq(tickets.status, 'valid')))
          .returning({ id: tickets.id });

        if (updated.length === 0) {
          return { ok: false as const };
        }

        const [scanLog] = await tx
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

        return { ok: true as const, scanLog, updatedCount: updated.length };
      });

      if (!groupRedeem.ok) {
        return NextResponse.json({
          valid: false,
          scanResult: 'ALREADY_USED',
          message: 'सावधान! हे तिकीट आधीच वापरले गेले आहे.',
        });
      }

      return NextResponse.json({
        valid: true,
        scanResult: 'SUCCESS',
        message: 'ग्रुप प्रवेश मान्य! (Group Entry Approved)',
        isGroup: true,
        totalSeats: order.ticketCount,
        seatCodes: allSeatsList,
        ticket: ticketPassSummary({
          code: order.orderNumber,
          seats: allSeatsList.join(', '),
          attendee: order.userName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
        scannedAt: groupRedeem.scanLog.scannedAt,
      });
    }

    // =========================================================================
    // 2. Individual Ticket QR Scan (MTSEC:v1:... or ticket / order code)
    // =========================================================================
    let embeddedEventId: number | undefined;

    if (targetCode.startsWith('MTSEC:v1:') || kind === 'mtsec') {
      const decrypted = decryptSecureTicketQr(targetCode);
      if (!decrypted || !decrypted.ticketCode) {
        return NextResponse.json({
          valid: false,
          scanResult: 'INVALID_SIGNATURE',
          message:
            'तिकीट QR सिग्नेचर जुळला नाही. सार्वजनिक तिकीट लिंक किंवा MT-TK / MT-2026 कोड वापरा.',
          rawPreview,
        });
      }
      targetCode = decrypted.ticketCode;
      embeddedEventId = decrypted.eventId;
    }

    // Look up ticket in PostgreSQL (exact ticket code)
    let ticketRows = await db
      .select({
        ticket: tickets,
        order: orders,
        session: eventSessions,
        event: events,
        venue: venues,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .innerJoin(events, eq(orders.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(tickets.ticketCode, targetCode));

    // Manual fallback: booking / order number (e.g. MT-2026-22814)
    if (ticketRows.length === 0) {
      const orderRows = await db
        .select({
          order: orders,
          session: eventSessions,
          event: events,
          venue: venues,
        })
        .from(orders)
        .innerJoin(eventSessions, eq(orders.sessionId, eventSessions.id))
        .innerJoin(events, eq(orders.eventId, events.id))
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(orders.orderNumber, targetCode))
        .limit(1);

      if (orderRows.length > 0) {
        const { order: ord, session: sess, event: ev, venue: ven } = orderRows[0];
        const venueNameOrd = ven?.nameMr || ven?.name || '';

        if (targetEventId && Number(ord.eventId) !== Number(targetEventId)) {
          return NextResponse.json({
            valid: false,
            scanResult: 'WRONG_EVENT',
            message: `हे तिकीट या कार्यक्रमाचे नाही! (Wrong Event: '${ev.titleMr || ev.title}'). आयोजक / प्रशासनशी संपर्क साधा.`,
            ticket: ticketPassSummary({
              code: ord.orderNumber,
              attendee: ord.userName,
              eventTitle: ev.title,
              eventTitleMr: ev.titleMr,
              venueName: venueNameOrd,
              showtime: sess.sessionStartTime,
              sessionId: sess.id,
            }),
          });
        }
        if (targetSessionId && Number(ord.sessionId) !== Number(targetSessionId)) {
          return NextResponse.json({
            valid: false,
            scanResult: 'WRONG_SESSION',
            message: `तिकीट या निवडलेल्या शो वेळेशी जुळत नाही. तिकीट वेळ: ${formatShowtimeIst(sess.sessionStartTime)}. कृपया योग्य शो निवडा किंवा आयोजक / प्रशासनशी संपर्क साधा.`,
            ticket: ticketPassSummary({
              code: ord.orderNumber,
              attendee: ord.userName,
              eventTitle: ev.title,
              eventTitleMr: ev.titleMr,
              venueName: venueNameOrd,
              showtime: sess.sessionStartTime,
              sessionId: sess.id,
            }),
          });
        }
        if (scannerOrganizerId && Number(ev.organizerId) !== Number(scannerOrganizerId)) {
          return NextResponse.json({
            valid: false,
            scanResult: 'WRONG_ORGANIZER',
            message: 'हे तिकीट तुमच्या आयोजक खात्याशी संबंधित नाही. प्रशासनशी संपर्क साधा.',
          });
        }
        if (ord.paymentStatus !== 'captured') {
          return NextResponse.json({
            valid: false,
            scanResult: 'UNPAID',
            message: 'या बुकिंगचे पेमेंट पूर्ण झालेले नाही. प्रवेश मंजूर करू शकत नाही.',
            ticket: ticketPassSummary({
              code: ord.orderNumber,
              attendee: ord.userName,
              eventTitle: ev.title,
              eventTitleMr: ev.titleMr,
              venueName: venueNameOrd,
              showtime: sess.sessionStartTime,
              sessionId: sess.id,
            }),
          });
        }

        const orderTickets = await db.select().from(tickets).where(eq(tickets.orderId, ord.id));
        if (orderTickets.length === 0) {
          return NextResponse.json({
            valid: false,
            scanResult: 'NO_TICKETS',
            message: 'या ऑर्डरसाठी तिकिटे सापडली नाहीत. प्रशासनशी संपर्क साधा.',
          });
        }

        // Order ID / booking QR: check in ALL seats in the party (same as MTGRP)
        const allSeatsOrd = orderTickets.map((t) => t.seatCode).filter(Boolean);
        const validParty = orderTickets.filter((t) => t.status === 'valid');
        if (validParty.length === 0) {
          return NextResponse.json({
            valid: false,
            scanResult: 'ALREADY_USED',
            message: 'या ऑर्डरची सर्व तिकिटे आधीच वापरली गेली आहेत (Already Scanned).',
            isGroup: true,
            totalSeats: orderTickets.length,
            seatCodes: allSeatsOrd,
            ticket: ticketPassSummary({
              code: ord.orderNumber,
              seats: allSeatsOrd.join(', '),
              attendee: ord.userName,
              eventTitle: ev.title,
              eventTitleMr: ev.titleMr,
              venueName: venueNameOrd,
              showtime: sess.sessionStartTime,
              sessionId: sess.id,
            }),
          });
        }

        const partyRedeem = await db.transaction(async (tx) => {
          const markedParty = await tx
            .update(tickets)
            .set({ status: 'used' })
            .where(and(eq(tickets.orderId, ord.id), eq(tickets.status, 'valid')))
            .returning({ id: tickets.id });

          if (markedParty.length === 0) {
            return { ok: false as const };
          }

          const [partyScan] = await tx
            .insert(ticketScans)
            .values({
              ticketId: validParty[0].id,
              ticketCode: ord.orderNumber,
              scannedByUserId: scannerUserId || null,
              scannerDevice: scannerDevice || 'Gate Terminal Pro',
              scanResult: 'SUCCESS',
              gateName: gateName || 'Main Entry Gate 1',
            })
            .returning();

          return { ok: true as const, markedParty, partyScan };
        });

        if (!partyRedeem.ok) {
          return NextResponse.json({
            valid: false,
            scanResult: 'ALREADY_USED',
            message: 'या ऑर्डरची सर्व तिकिटे आधीच वापरली गेली आहेत (Already Scanned).',
          });
        }

        return NextResponse.json({
          valid: true,
          scanResult: 'SUCCESS',
          message: `ग्रुप प्रवेश मान्य! ${partyRedeem.markedParty.length} आसने चेक-इन (Group entry: ${partyRedeem.markedParty.length} seats)`,
          isGroup: true,
          totalSeats: partyRedeem.markedParty.length,
          seatCodes: allSeatsOrd,
          ticket: ticketPassSummary({
            code: ord.orderNumber,
            seats: allSeatsOrd.join(', '),
            attendee: ord.userName,
            eventTitle: ev.title,
            eventTitleMr: ev.titleMr,
            venueName: venueNameOrd,
            showtime: sess.sessionStartTime,
            sessionId: sess.id,
          }),
          scannedAt: partyRedeem.partyScan.scannedAt,
        });
      }
    }

    if (ticketRows.length === 0) {
      return NextResponse.json({
        valid: false,
        scanResult: 'INVALID_TICKET',
        message:
          'अवैध तिकीट / ऑर्डर क्रमांक! प्रणालीमध्ये नोंद नाही. QR पुन्हा स्कॅन करा किंवा आयोजक / प्रशासनशी संपर्क साधा.',
        ticketCode: targetCode,
        rawPreview,
      });
    }

    const { ticket, order, session, event, venue } = ticketRows[0];
    const venueName = venue?.nameMr || venue?.name || '';

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
        ticket: ticketPassSummary({
          code: 'PROTECTED',
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    // Exact showtime lock — ticket must match the selected session/date/time
    if (targetSessionId && Number(ticket.sessionId) !== Number(targetSessionId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'WRONG_SESSION',
        message: `तिकीट या निवडलेल्या शो वेळेशी जुळत नाही. तिकीट वेळ: ${formatShowtimeIst(session.sessionStartTime)}. कृपया योग्य शो निवडा किंवा आयोजक / प्रशासनशी संपर्क साधा.`,
        ticket: ticketPassSummary({
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    if (scannerOrganizerId && Number(event.organizerId) !== Number(scannerOrganizerId)) {
      return NextResponse.json({
        valid: false,
        scanResult: 'WRONG_ORGANIZER',
        message: 'सावधान! हे तिकीट तुमच्या संस्थेच्या / आयोजकाच्या कार्यक्रमाचे नाही (Unauthorized Organizer Scan).',
        ticket: ticketPassSummary({
          code: 'PROTECTED',
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    // Payment must be captured for entry
    if (order.paymentStatus !== 'captured') {
      return NextResponse.json({
        valid: false,
        scanResult: 'UNPAID',
        message: 'या बुकिंगचे पेमेंट पूर्ण झालेले नाही (Payment not captured).',
        ticket: ticketPassSummary({
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
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
        ticket: ticketPassSummary({
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return NextResponse.json({
        valid: false,
        scanResult: 'TICKET_CANCELLED',
        message: 'हे तिकीट रद्द / परतावा केलेले आहे (Ticket was cancelled or refunded).',
        ticket: ticketPassSummary({
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    // Atomic redeem: status CAS + scan log in one transaction (blocks double entry on retries)
    const redeem = await db.transaction(async (tx) => {
      const marked = await tx
        .update(tickets)
        .set({ status: 'used' })
        .where(and(eq(tickets.id, ticket.id), eq(tickets.status, 'valid')))
        .returning({ id: tickets.id });

      if (marked.length === 0) {
        return { ok: false as const };
      }

      const [scanLog] = await tx
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

      return { ok: true as const, scanLog };
    });

    if (!redeem.ok) {
      return NextResponse.json({
        valid: false,
        scanResult: 'ALREADY_USED',
        message: 'सावधान! हे तिकीट आधीच वापरले गेले आहे.',
        ticket: ticketPassSummary({
          code: ticket.ticketCode,
          seat: ticket.seatCode,
          attendee: ticket.attendeeName,
          eventTitle: event.title,
          eventTitleMr: event.titleMr,
          venueName,
          showtime: session.sessionStartTime,
          sessionId: session.id,
        }),
      });
    }

    return NextResponse.json({
      valid: true,
      scanResult: 'SUCCESS',
      message: 'प्रवेश मान्य! (Entry Approved)',
      ticket: ticketPassSummary({
        code: ticket.ticketCode,
        seat: ticket.seatCode,
        attendee: ticket.attendeeName,
        eventTitle: event.title,
        eventTitleMr: event.titleMr,
        venueName,
        showtime: session.sessionStartTime,
        sessionId: session.id,
      }),
      scannedAt: redeem.scanLog.scannedAt,
    });
  } catch (error: any) {
    console.error('Scanner verification error:', error);
    return NextResponse.json(
      { error: 'Scanner verification failed' },
      { status: 500 }
    );
  }
}
