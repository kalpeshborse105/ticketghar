import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { tickets, orders, events, venues, eventSessions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;

    const [ticketRecord] = await db
      .select({
        ticket: tickets,
        order: orders,
        session: eventSessions,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(eventSessions, eq(tickets.sessionId, eventSessions.id))
      .where(eq(tickets.ticketCode, ticketCode))
      .limit(1);

    if (!ticketRecord) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const [eventRecord] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, ticketRecord.order.eventId))
      .limit(1);

    // Mask sensitive information for public view
    const maskedEmail = ticketRecord.order.userEmail
      ? ticketRecord.order.userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : '';
    const maskedPhone = ticketRecord.order.userPhone
      ? ticketRecord.order.userPhone.replace(/(\d{2})(\d+)(\d{2})/, '$1****$3')
      : '';

    return NextResponse.json({
      valid:
        ticketRecord.ticket.status === 'valid' || ticketRecord.ticket.status === 'used',
      ticket: {
        ticketCode: ticketRecord.ticket.ticketCode,
        seatCode: ticketRecord.ticket.seatCode,
        attendeeName: ticketRecord.ticket.attendeeName,
        status: ticketRecord.ticket.status,
        faceValue: ticketRecord.ticket.faceValue,
        qrPayload: ticketRecord.ticket.qrPayload || ticketRecord.ticket.ticketCode,
      },
      order: {
        orderNumber: ticketRecord.order.orderNumber,
        email: maskedEmail,
        phone: maskedPhone,
        paymentStatus: ticketRecord.order.paymentStatus,
        orderStatus: ticketRecord.order.orderStatus,
      },
      event: {
        title: eventRecord?.event.title,
        titleMr: eventRecord?.event.titleMr,
        category: eventRecord?.event.category,
        language: eventRecord?.event.language,
        posterUrl: eventRecord?.event.posterUrl,
      },
      venue: {
        name: eventRecord?.venue?.name,
        nameMr: eventRecord?.venue?.nameMr,
        address: eventRecord?.venue?.address,
        city: eventRecord?.venue?.city,
      },
      session: {
        sessionStartTime: ticketRecord.session.sessionStartTime,
        sessionEndTime: ticketRecord.session.sessionEndTime,
        start: ticketRecord.session.sessionStartTime,
        end: ticketRecord.session.sessionEndTime,
      },
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket details' },
      { status: 500 }
    );
  }
}
