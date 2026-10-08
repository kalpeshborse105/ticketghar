import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getTicketShareUrl } from '@/src/lib/public-url';

export async function GET(
  _req: NextRequest,
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
      // Support direct order reference lookup
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
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Fetch all tickets in the order to show complete booking pass
    const allOrderTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, ticketRecord.order.id));

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    // Mask sensitive contact details for public verification
    const maskedEmail = ticketRecord.order.userEmail
      ? ticketRecord.order.userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : '';
    const maskedPhone = ticketRecord.order.userPhone
      ? ticketRecord.order.userPhone.replace(/(\d{2})(\d+)(\d{2})/, '$1****$3')
      : '';

    const publicUrl = getTicketShareUrl(ticketRecord.ticket.ticketCode);
    const seatsList = allOrderTickets.map((t) => t.seatCode);
    const seatsSummary = seatsList.join(', ');

    return NextResponse.json({
      valid:
        ticketRecord.ticket.status === 'valid' || ticketRecord.ticket.status === 'used',
      ticket: {
        ticketCode: ticketRecord.ticket.ticketCode,
        seatCode: ticketRecord.ticket.seatCode,
        attendeeName: ticketRecord.ticket.attendeeName,
        status: ticketRecord.ticket.status,
        faceValue: ticketRecord.ticket.faceValue,
        qrPayload: publicUrl,
      },
      order: {
        id: ticketRecord.order.id,
        orderNumber: ticketRecord.order.orderNumber,
        email: maskedEmail,
        phone: maskedPhone,
        userName: ticketRecord.order.userName,
        paymentStatus: ticketRecord.order.paymentStatus,
        orderStatus: ticketRecord.order.orderStatus,
        ticketCount: allOrderTickets.length,
        grandTotal: ticketRecord.order.grandTotal,
        seats: seatsList,
        seatsSummary,
        tickets: allOrderTickets.map((t) => ({
          ticketCode: t.ticketCode,
          seatCode: t.seatCode,
          attendeeName: t.attendeeName,
          status: t.status,
          faceValue: t.faceValue,
        })),
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
      downloadPdfUrl: `/api/tickets/${ticketRecord.ticket.ticketCode}/pdf?download=1`,
      viewPdfUrl: `/api/tickets/${ticketRecord.ticket.ticketCode}/pdf`,
      publicShareUrl: publicUrl,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket details' },
      { status: 500 }
    );
  }
}
