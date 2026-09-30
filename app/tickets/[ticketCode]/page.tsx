'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, MapPin, Calendar, User, Ticket, ArrowLeft, Loader2 } from 'lucide-react';
import { getTicketShareUrl } from '@/src/lib/public-url';

interface TicketData {
  ticket: {
    ticketCode: string;
    seatCode: string;
    attendeeName: string;
    status: string;
    faceValue: number;
    qrPayload: string;
  };
  order: {
    orderNumber: string;
    email: string;
    phone: string;
  };
  event: {
    title: string;
    titleMr?: string;
    category: string;
    language?: string;
    posterUrl?: string;
  };
  venue: {
    name?: string;
    nameMr?: string;
    address?: string;
    city?: string;
  };
  session: {
    sessionStartTime: string;
    sessionEndTime?: string;
  };
}

export default function PublicTicketPage() {
  const params = useParams();
  const ticketCode = params?.ticketCode as string;
  
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketCode) return;

    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketCode}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Ticket not found');
          } else {
            setError('Unable to load ticket');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketCode]);

  const handleDownloadPdf = () => {
    if (!ticketCode) return;
    window.open(`/api/tickets/${ticketCode}/pdf`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const url = getTicketShareUrl(ticketCode);
    const text = encodeURIComponent(
      `🎭 My MahaTicket Booking\n${data?.event.title || 'Event'}\n📍 ${data?.venue.name || 'Venue'}\n🎫 Seat: ${data?.ticket.seatCode}\n\nView ticket: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6366f1] mx-auto" />
          <p className="text-sm text-[#6b7280]">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#e5e7eb] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#fef2f2] text-[#ef4444] flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">{error || 'Ticket Not Found'}</h1>
          <p className="text-sm text-[#6b7280]">
            The ticket you're looking for doesn't exist or may have been cancelled.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-semibold hover:bg-[#4f46e5] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to MahaTicket
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(data.session.sessionStartTime);
  const formattedDate = eventDate.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusColor =
    data.ticket.status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : data.ticket.status === 'cancelled'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[#6366f1] hover:text-[#4f46e5] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>MahaTicket</span>
          </Link>
          <span className="text-xs font-mono text-[#6b7280]">{data.ticket.ticketCode}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        
        {/* Ticket Card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-lg">
          
          {/* Event Poster/Header */}
          {data.event.posterUrl ? (
            <div
              className="h-48 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${data.event.posterUrl})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h1 className="text-2xl font-bold">{data.event.titleMr || data.event.title}</h1>
                {data.event.titleMr && (
                  <p className="text-sm opacity-90">{data.event.title}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] p-8 text-white">
              <h1 className="text-2xl font-bold">{data.event.titleMr || data.event.title}</h1>
              {data.event.titleMr && (
                <p className="text-sm opacity-90 mt-1">{data.event.title}</p>
              )}
            </div>
          )}

          {/* Ticket Details */}
          <div className="p-6 space-y-5">
            
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                {data.ticket.status.toUpperCase()}
              </span>
              <span className="text-xs text-[#6b7280]">Booking #{data.order.orderNumber}</span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Venue</span>
                </div>
                <p className="text-sm font-semibold text-[#111827]">
                  {data.venue.nameMr || data.venue.name || 'Venue'}
                </p>
                <p className="text-xs text-[#6b7280]">{data.venue.city}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date & Time</span>
                </div>
                <p className="text-sm font-semibold text-[#111827]">{formattedDate}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Seat</span>
                </div>
                <p className="text-sm font-semibold text-[#111827]">{data.ticket.seatCode}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <User className="w-3.5 h-3.5" />
                  <span>Attendee</span>
                </div>
                <p className="text-sm font-semibold text-[#111827]">{data.ticket.attendeeName}</p>
              </div>

            </div>

            {/* QR Code */}
            <div className="border-t border-dashed border-[#e5e7eb] pt-5">
              <div className="bg-[#fafafa] rounded-xl p-6 text-center space-y-3">
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                  Entry QR Code
                </p>
                <div className="bg-white p-4 rounded-lg inline-block border border-[#e5e7eb]">
                  <QRCodeSVG
                    value={data.ticket.qrPayload}
                    size={160}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="text-xs text-[#6b7280]">
                  Show this QR code at the venue entrance for scanning
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleDownloadPdf}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#6366f1] text-white rounded-lg text-sm font-semibold hover:bg-[#4f46e5] transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:bg-[#20ba5a] transition shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </button>
            </div>

          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#111827]">Important Information</h3>
          <ul className="space-y-2 text-xs text-[#374151]">
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1]">•</span>
              <span>Arrive at least 15 minutes before the event start time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1]">•</span>
              <span>Each QR code can only be scanned once for entry</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1]">•</span>
              <span>Keep this ticket confidential and do not share screenshots publicly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1]">•</span>
              <span>For cancellations or support, contact support@mahaticket.in</span>
            </li>
          </ul>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280] py-4">
          <Link href="/terms" className="hover:text-[#6366f1] transition">Terms</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-[#6366f1] transition">Privacy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-[#6366f1] transition">Support</Link>
        </div>

      </main>
    </div>
  );
}
