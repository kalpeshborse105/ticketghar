'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Share2,
  Mail,
  Ticket,
  ArrowLeft,
  Loader2,
  ShieldCheck,
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
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);

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

  const handleShare = async () => {
    const url = data?.publicShareUrl || getTicketShareUrl(ticketCode);
    const title = data?.event.titleMr || data?.event.title || 'MahaTicket Pass';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.open(url, '_blank');
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

  const handleConfirmSendEmail = async () => {
    if (!ticketCode || !data) return;
    setEmailConfirmOpen(false);
    setEmailSending(true);
    setEmailNote(null);
    try {
      const sessionToken =
        typeof window !== 'undefined' ? localStorage.getItem('mahaticket_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken && sessionToken.includes('.')) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketCode)}/email`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          email: data.order.email,
          ...(data.pdfDownloadToken ? { pdfDownloadToken: data.pdfDownloadToken } : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.sent) {
        setEmailNote(`✓ ईमेल पाठवला: ${json.recipient || data.order.email || ''}`);
      } else {
        setEmailNote(json.error || json.message || 'ईमेल अयशस्वी');
      }
    } catch {
      setEmailNote('ईमेल अयशस्वी');
    } finally {
      setEmailSending(false);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-3 sm:px-6 pb-36 md:pb-8">
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

      </div>

      {/* Icon-only actions — fixed above mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 print:hidden md:static md:mt-2">
        {emailNote ? (
          <p className="mx-auto max-w-xl text-center text-[11px] font-semibold text-slate-700 px-3 pb-1">
            {emailNote}
          </p>
        ) : null}
        <div className="mx-auto max-w-xl flex items-center justify-center gap-3 px-4 pt-2 pb-[max(calc(env(safe-area-inset-bottom)+4.5rem),1.25rem)] md:pb-4 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent md:bg-transparent">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            title="WhatsApp"
            aria-label="WhatsApp"
            className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-md transition active:scale-95"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share"
            aria-label="Share"
            className="w-12 h-12 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-md transition active:scale-95"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            title="Download PDF"
            aria-label="Download PDF"
            className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : downloadSuccess ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEmailConfirmOpen(true)}
            disabled={emailSending || !data.order.email}
            title="Email"
            aria-label="Email"
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {emailSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {emailConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">ईमेल पाठवायचा?</h3>
            <p className="text-xs text-slate-600">
              तिकीट PDF या पत्त्यावर पाठवला जाईल: {data.order.email || '—'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEmailConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                रद्द
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
              >
                पाठवा
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
