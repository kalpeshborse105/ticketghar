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
import { MahaTicketCard } from '@/src/components/ui/MahaTicketCard';

interface TicketData {
  valid: boolean;
  owner?: boolean;
  ticket: {
    ticketCode: string;
    seatCode: string;
    attendeeName?: string;
    status: string;
    faceValue?: number;
    qrPayload: string;
  };
  order: {
    id?: number;
    orderNumber: string;
    email?: string;
    phone?: string;
    userName?: string;
    paymentStatus?: string;
    orderStatus: string;
    ticketCount: number;
    grandTotal?: number;
    seats?: string[];
    seatsSummary?: string;
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
  downloadPdfUrl?: string;
  viewPdfUrl?: string;
  publicShareUrl: string;
  pdfDownloadToken?: string;
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
        const res = await fetch(`/api/tickets/${encodeURIComponent(ticketCode)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
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
    if (!data.owner && !data.downloadPdfUrl && !data.pdfDownloadToken) {
      setError('PDF डाउनलोडसाठी लॉगिन आवश्यक आहे (Sign in required to download PDF).');
      return;
    }
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      const downloadEndpoint =
        data.downloadPdfUrl ||
        `/api/tickets/${encodeURIComponent(ticketCode)}/pdf?download=1${
          data.pdfDownloadToken ? `&t=${encodeURIComponent(data.pdfDownloadToken)}` : ''
        }`;

      const response = await fetch(downloadEndpoint, {
        credentials: 'include',
        cache: 'no-store',
      });
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
      setError('PDF डाउनलोड अयशस्वी. कृपया लॉगिन करून पुन्हा प्रयत्न करा.');
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

        {/* BookMyShow Style M-Ticket Pass Container with Stitch Visuals */}
        <MahaTicketCard
          ticketCode={data.ticket.ticketCode}
          seatCode={allSeatsDisplay}
          attendeeName={data.ticket.attendeeName || data.order.userName || 'Guest'}
          status={data.ticket.status}
          eventTitle={data.event.titleMr || data.event.title}
          eventCategory={data.event.categoryMr || data.event.category}
          venueName={data.venue.nameMr || data.venue.name || 'Venue'}
          venueCity={data.venue.city || 'महाराष्ट्र'}
          sessionStartTime={data.session.sessionStartTime}
          language="mr"
          orderNumber={data.order.orderNumber}
          grandTotal={data.order.grandTotal}
          qrPayload={data.publicShareUrl || getTicketShareUrl(data.ticket.ticketCode)}
          totalTickets={data.order.ticketCount}
          onDownloadPdf={handleDownloadPdf}
          onShare={handleShareWhatsApp}
        />

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
