'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Share2,
  MapPin,
  Calendar,
  Ticket,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { getTicketShareUrl } from '@/src/lib/public-url';

interface TicketData {
  valid: boolean;
  ticket: {
    ticketCode: string;
    seatCode: string;
    attendeeName: string;
    status: string;
    faceValue: number;
    qrPayload: string;
  };
  order: {
    id: number;
    orderNumber: string;
    email: string;
    phone: string;
    userName: string;
    paymentStatus: string;
    orderStatus: string;
    ticketCount: number;
    grandTotal: number;
    seats: string[];
    seatsSummary: string;
  };
  event: {
    id: number;
    title: string;
    titleMr?: string;
    category: string;
    categoryMr?: string;
    language?: string;
    posterUrl?: string;
    bannerUrl?: string;
  };
  venue: {
    id: number;
    name?: string;
    nameMr?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  session: {
    sessionStartTime: string;
    sessionEndTime?: string;
  };
  downloadPdfUrl: string;
  viewPdfUrl: string;
  publicShareUrl: string;
}

export default function PublicTicketPage() {
  const params = useParams();
  const ticketCode = params?.ticketCode as string;

  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!ticketCode) return;

    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(ticketCode)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Ticket not found or invalid booking reference.');
          } else {
            setError('Unable to load ticket details.');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError('Failed to connect to ticketing registry.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketCode]);

  const handleDownloadPdf = async () => {
    if (!ticketCode || !data) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      const downloadEndpoint = `/api/tickets/${encodeURIComponent(ticketCode)}/pdf?download=1`;
      
      // Use direct anchor download pattern with fallback to window.open
      const response = await fetch(downloadEndpoint);
      if (!response.ok) {
        throw new Error('Failed to generate PDF pass');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MahaTicket-${data.order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback: open directly in new tab so browser native viewer handles download/print
      window.open(`/api/tickets/${encodeURIComponent(ticketCode)}/pdf`, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    const url = data?.publicShareUrl || getTicketShareUrl(ticketCode);
    const eventName = data?.event.titleMr || data?.event.title || 'Event';
    const venueName = data?.venue.nameMr || data?.venue.name || 'Venue';
    const seats = data?.order.seatsSummary || data?.ticket.seatCode || 'Seats';
    const text = encodeURIComponent(
      `🎟️ MahaTicket (महाटिकिट) Admission Pass\n\n🎭 ${eventName}\n📍 ${venueName}\n🎫 Seats: ${seats}\n🔢 Booking ID: ${data?.order.orderNumber}\n\nView official ticket: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-orange-600 mx-auto" />
          <p className="text-sm text-slate-700 font-medium">तिकीट उघडत आहे (Loading Official Pass)...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{error || 'Ticket Not Found'}</h1>
          <p className="text-sm text-slate-600">
            या तिकिटाची माहिती सापडली नाही किंवा ऑर्डर रद्द करण्यात आली आहे.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            मुख्यपृष्ठावर जा (Go to MahaTicket)
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

  const allSeatsDisplay = data.order.seatsSummary || data.ticket.seatCode;
  const isUsed = data.ticket.status === 'used';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-orange-600 transition print:hidden"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" />
            <span>MahaTicket (महाटिकिट)</span>
          </Link>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified M-Ticket</span>
          </span>
        </div>

        {/* BookMyShow Style M-Ticket Pass Container */}
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden print:shadow-none print:border-none">
          {/* Top Brand Banner */}
          <div className="bg-[#ea580c] text-white p-4 sm:p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight">MahaTicket</span>
                <span className="text-xs uppercase bg-white/20 px-2 py-0.5 rounded font-bold">
                  M-Ticket
                </span>
              </div>
              <p className="text-xs text-orange-100 mt-0.5">
                Official Admission Pass · महाटिकिट अधिकृत प्रवेशिका
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-orange-200 block">Booking ID</span>
              <span className="text-xs sm:text-sm font-mono font-bold">{data.order.orderNumber}</span>
            </div>
          </div>

          {/* Event Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#ea580c] uppercase">
              <span>{data.event.categoryMr || data.event.category}</span>
              {data.event.language && (
                <>
                  <span>·</span>
                  <span>{data.event.language}</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
              {data.event.titleMr || data.event.title}
            </h1>
            {data.event.titleMr && (
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{data.event.title}</p>
            )}

            {/* Event Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-600 block uppercase font-bold">Showtime</span>
                  <span className="font-bold text-slate-900">{formattedDate}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-600 block uppercase font-bold">Venue</span>
                  <span className="font-bold text-slate-900 block">{data.venue.nameMr || data.venue.name}</span>
                  <span className="text-[11px] text-slate-600">{data.venue.address || data.venue.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seat & Attendee Details */}
          <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 block">
                  Seats ({data.order.ticketCount || 1})
                </span>
                <span className="text-base font-extrabold text-[#ea580c] font-mono block">
                  {allSeatsDisplay}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 block">
                  Attendee
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  {data.ticket.attendeeName || data.order.userName || 'Guest'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 block">
                  Total Paid
                </span>
                <span className="text-base font-extrabold text-slate-950 font-mono block">
                  ₹{(data.order.grandTotal / 100).toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Perforated Stub Line */}
          <div className="relative border-b-2 border-dashed border-slate-300">
            <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200" />
            <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200" />
          </div>

          {/* Single Unified QR Code Section (BookMyShow Style) */}
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-3 bg-white">
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm relative">
              <QRCodeSVG
                value={data.publicShareUrl || getTicketShareUrl(data.ticket.ticketCode)}
                size={180}
                level="M"
                includeMargin={true}
              />
              {isUsed && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex items-center justify-center rounded-2xl">
                  <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-full uppercase tracking-wider">
                    ALREADY SCANNED
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-orange-600 tracking-wide block">
                प्रवेश द्वारावर हा QR कोड दाखवा (Scan at Venue Gate)
              </span>
              <p className="text-[11px] text-slate-600 max-w-sm">
                Phone camera scan will open this official ticket. Hand over to gate scanner for laser entry verification.
              </p>
            </div>

            <div className="pt-2 text-[10px] font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
              Primary Pass: {data.ticket.ticketCode}
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">महत्वाच्या सूचना (Important Notice):</p>
            <p>• कृपया वेळेच्या किमान १५ मिनिटे आधी सभागृहात पोहोचावे.</p>
            <p>• डिजिटल एम-तिकीट किंवा डाऊनलोड केलेली PDF प्रवेशासाठी ग्राह्य धरली जाईल.</p>
            <p>• support@mahaticket.kalpkrutinfotech.com</p>
          </div>
        </div>

        {/* Action Buttons (Download, Print, WhatsApp) */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>PDF डाऊनलोड होत आहे...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF Ticket</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
