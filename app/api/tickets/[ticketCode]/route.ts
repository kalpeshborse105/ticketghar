import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getTicketShareUrl } from '@/src/lib/public-url';
import {
  resolveAuthCustomer,
  customerOwnsOrder,
  mintOrderPdfToken,
} from '@/src/lib/order-access';

/**
 * Public ticket pass (share / gate display): event, venue, session, seat, validity.
 * Private PII, payment totals, sibling tickets, and PDF links require ownership.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const rawCode = (await params).ticketCode;
    const cleanCode = decodeURIComponent(rawCode || '').trim();

    let [ticketRecord] = await db
      .select({
        ticket: tickets,
        order: orders,
        session: eventSessions,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .where(eq(tickets.ticketCode, cleanCode))
      .limit(1);

    if (!ticketRecord) {
      [ticketRecord] = await db
        .select({
          ticket: tickets,
          order: orders,
          session: eventSessions,
        })
        .from(tickets)
        .innerJoin(orders, eq(tickets.orderId, orders.id))
        .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
        .where(eq(orders.orderNumber, cleanCode))
        .limit(1);
    }

    if (!ticketRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    const publicUrl = getTicketShareUrl(ticketRecord.ticket.ticketCode);
    const customer = await resolveAuthCustomer(req);
    const isOwner = customer ? customerOwnsOrder(customer, ticketRecord.order) : false;

    const publicPayload = {
      valid:
        ticketRecord.ticket.status === 'valid' || ticketRecord.ticket.status === 'used',
      ticket: {
        ticketCode: ticketRecord.ticket.ticketCode,
        seatCode: ticketRecord.ticket.seatCode,
        status: ticketRecord.ticket.status,
        qrPayload: publicUrl,
      },
      order: {
        orderNumber: ticketRecord.order.orderNumber,
        orderStatus: ticketRecord.order.orderStatus,
        ticketCount: ticketRecord.order.ticketCount,
      },
      event: {
        id: eventRecord?.event.id,
        title: eventRecord?.event.title,
        titleMr: eventRecord?.event.titleMr,
        category: eventRecord?.event.category,
        categoryMr: eventRecord?.event.categoryMr,
        language: eventRecord?.event.language,
        posterUrl: eventRecord?.event.posterUrl,
        bannerUrl: eventRecord?.event.bannerUrl,
        durationMinutes: eventRecord?.event.durationMinutes,
        ageGuidance: eventRecord?.event.ageGuidance,
      },
      venue: {
        id: eventRecord?.venue?.id,
        name: eventRecord?.venue?.name,
        nameMr: eventRecord?.venue?.nameMr,
        address: eventRecord?.venue?.address,
        city: eventRecord?.venue?.city,
        state: eventRecord?.venue?.state,
      },
      session: {
        sessionStartTime: ticketRecord.session.sessionStartTime,
        sessionEndTime: ticketRecord.session.sessionEndTime,
        start: ticketRecord.session.sessionStartTime,
        end: ticketRecord.session.sessionEndTime,
      },
      publicShareUrl: publicUrl,
      downloadPdfUrl: `/api/tickets/${encodeURIComponent(ticketRecord.ticket.ticketCode)}/pdf?download=1`,
      viewPdfUrl: `/api/tickets/${encodeURIComponent(ticketRecord.ticket.ticketCode)}/pdf`,
      pdfDownloadToken: mintOrderPdfToken(ticketRecord.order.id, ticketRecord.order.userId),
      owner: false as boolean,
    };

    if (!isOwner || !customer) {
      return NextResponse.json(publicPayload, {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      });
    }

    const allOrderTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, ticketRecord.order.id));

    const seatsList = allOrderTickets.map((t) => t.seatCode);
    const pdfToken = publicPayload.pdfDownloadToken;

    return NextResponse.json(
      {
        ...publicPayload,
        owner: true,
        ticket: {
          ...publicPayload.ticket,
          attendeeName: ticketRecord.ticket.attendeeName,
          faceValue: ticketRecord.ticket.faceValue,
        },
        order: {
          id: ticketRecord.order.id,
          orderNumber: ticketRecord.order.orderNumber,
          userName: ticketRecord.order.userName,
          paymentStatus: ticketRecord.order.paymentStatus,
          orderStatus: ticketRecord.order.orderStatus,
          ticketCount: allOrderTickets.length,
          grandTotal: ticketRecord.order.grandTotal,
          seats: seatsList,
          seatsSummary: seatsList.join(', '),
          tickets: allOrderTickets.map((t) => ({
            ticketCode: t.ticketCode,
            seatCode: t.seatCode,
            attendeeName: t.attendeeName,
            status: t.status,
            faceValue: t.faceValue,
          })),
        },
        downloadPdfUrl: `/api/tickets/${ticketRecord.ticket.ticketCode}/pdf?download=1&t=${encodeURIComponent(pdfToken)}`,
        viewPdfUrl: `/api/tickets/${ticketRecord.ticket.ticketCode}/pdf?t=${encodeURIComponent(pdfToken)}`,
        pdfDownloadToken: pdfToken,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching ticket:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to fetch ticket details' }, { status: 500 });
  }
}
