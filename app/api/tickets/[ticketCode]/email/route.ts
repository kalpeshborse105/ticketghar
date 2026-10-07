import { NextRequest, NextResponse } from 'next/server';
import { sendBookingTicketEmail } from '@/src/lib/email-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await params;
    let recipientEmail: string | undefined;

    try {
      const body = await req.json();
      if (body && body.email) {
        recipientEmail = String(body.email).trim().toLowerCase();
      }
    } catch {
      // Body is optional
    }

    const result = await sendBookingTicketEmail({
      ticketCode,
      recipientEmail,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Email route error:', error);
    return NextResponse.json(
      { success: false, sent: false, error: error.message || 'Failed to dispatch email' },
      { status: 200 }
    );
  }
}
