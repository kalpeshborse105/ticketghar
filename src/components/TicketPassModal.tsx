'use client';

import React, { useEffect, useState } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle,
  Download,
  Share2,
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  X,
  Mail,
  Loader2,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import {
  buildBookingWhatsAppMessage,
  buildWhatsAppShareUrl,
  getTicketShareUrl,
} from '@/src/lib/public-url';
import { MahaTicketCard } from '@/src/components/ui/MahaTicketCard';
import { formatISTTime, formatISTDate } from '@/src/lib/dateUtils';
import { generateSecureTicketQr } from '@/src/lib/ticket-crypto';

interface TicketPassModalProps {
  bookingResult: any;
  language: Language;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  bookingResult,
  language,
  onClose,
}) => {
  const t = translations[language];
  const { order, tickets = [], event, pricing } = bookingResult;
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'pending' | 'failed'>(
    'idle'
  );
  const [emailMessage, setEmailMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Save to offline cache (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const existingStr = localStorage.getItem('mahaticket_offline_orders') || '[]';
      const existing = JSON.parse(existingStr);
      const toSave = {
        ...order,
        event,
        tickets,
        pricing,
        userEmail: order?.userEmail || order?.email,
        session: bookingResult.session || order?.session,
        sessionId: bookingResult.sessionId || order?.sessionId || bookingResult.session?.id,
        savedAt: new Date().toISOString(),
      };
      const next = [toSave, ...existing.filter((o: any) => o.orderNumber !== order.orderNumber)].slice(
        0,
        20
      );
      localStorage.setItem('mahaticket_offline_orders', JSON.stringify(next));
      localStorage.setItem('mahaticket_my_orders', JSON.stringify(next));
    } catch {
      /* ignore cache errors */
    }
  }, [order, event, tickets, pricing]);

  const primaryTicket = tickets[0]?.ticketCode;
  const eventTitle = language === 'mr' ? event?.titleMr || event?.title : event?.title;
  const venueObj =
    event?.venue ||
    bookingResult?.session?.venue ||
    bookingResult?.venue ||
    order?.event?.venue ||
    order?.session?.venue;
  const venueName =
    (language === 'mr' ? venueObj?.nameMr || venueObj?.name : venueObj?.name || venueObj?.nameMr) ||
    event?.venueName ||
    bookingResult?.venueName ||
    (language === 'mr' ? 'बालगंधर्व रंगमंदिर' : 'Bal Gandharva Ranga Mandir');
  const venueCity = venueObj?.city || event?.venueCity || event?.city || 'पुणे, महाराष्ट्र';
  const seatsList = tickets.map((tk: any) => tk.seatCode).join(', ');
  const ticketUrl = primaryTicket ? getTicketShareUrl(primaryTicket) : '';

  // Auto-email verification on mount
  useEffect(() => {
    if (!primaryTicket || !order?.userEmail) return;
    let cancelled = false;
    (async () => {
      setEmailStatus('sending');
      try {
        const res = await fetch(`/api/tickets/${primaryTicket}/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: order.userEmail }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.sent) {
          setEmailStatus('sent');
          setEmailMessage(
            language === 'mr'
              ? `ईमेल पाठवला: ${data.recipient || order.userEmail}`
              : `Email sent to ${data.recipient || order.userEmail}`
          );
        } else if (data.configured === false) {
          setEmailStatus('pending');
          setEmailMessage(
            language === 'mr'
              ? 'तिकीट निश्चित. ईमेल सेवा लवकरच सुरू होईल.'
              : 'Booking confirmed. SMTP delivery queued.'
          );
        } else {
          setEmailStatus('failed');
          setEmailMessage(
            language === 'mr' ? 'तिकीट निश्चित. ईमेल पुन्हा पाठवा.' : 'Booking confirmed. You can retry email.'
          );
        }
      } catch {
        if (!cancelled) {
          setEmailStatus('failed');
          setEmailMessage(
            language === 'mr' ? 'तिकीट निश्चित.' : 'Booking confirmed.'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryTicket, order?.userEmail, language]);

  const handleWhatsApp = () => {
    if (!primaryTicket) return;
    const dateTime = order?.sessionStart
      ? new Date(order.sessionStart).toLocaleString('en-IN')
      : 'See ticket';
    const message = buildBookingWhatsAppMessage({
      eventTitle: eventTitle || 'Event',
      venueName: venueName || 'Venue',
      dateTime,
      seats: `${seatsList} (${tickets.length} Tickets)`,
      bookingId: order.orderNumber,
      ticketCode: primaryTicket,
    });
    window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPDF = async () => {
    if (!primaryTicket) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      const token =
        (order as any)?.pdfDownloadToken ||
        (typeof window !== 'undefined' ? localStorage.getItem('mahaticket_token') : null);
      const qs = new URLSearchParams({ download: '1' });
      // Prefer short-lived PDF token when present on the order payload
      if ((order as any)?.pdfDownloadToken) {
        qs.set('t', String((order as any).pdfDownloadToken));
      }
      const downloadEndpoint = `/api/tickets/${primaryTicket}/pdf?${qs.toString()}`;
      const headers: Record<string, string> = {};
      if (token && String(token).includes('.') && !(order as any)?.pdfDownloadToken) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(downloadEndpoint, {
        credentials: 'include',
        cache: 'no-store',
        headers,
      });
      if (!res.ok) {
        throw new Error('PDF route failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MahaTicket-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleRetryEmail = async () => {
    if (!primaryTicket) return;
    setEmailStatus('sending');
    try {
      const res = await fetch(`/api/tickets/${primaryTicket}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: order.userEmail }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setEmailStatus('sent');
        setEmailMessage(
          language === 'mr' ? `ईमेल पाठवला: ${data.recipient}` : `Email sent to ${data.recipient}`
        );
      } else if (data.status === 'not_configured') {
        setEmailStatus('pending');
        setEmailMessage(
          language === 'mr'
            ? 'ईमेल सेवा सध्या उपलब्ध नाही. आपण PDF थेट डाउनलोड करू शकता.'
            : 'Email service is not configured. You can download the PDF pass directly.'
        );
      } else {
        setEmailStatus('failed');
        setEmailMessage(data.error || data.message || 'Email delivery failed.');
      }
    } catch {
      setEmailStatus('failed');
      setEmailMessage('Failed to trigger email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">

        {/* Top Celebration Bar */}
        <div className="px-5 py-3.5 bg-[#ea580c] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">
                {t.bookingSuccess}
              </h2>
              <p className="text-xs text-orange-100 font-mono">
                {t.orderNumber}: {order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              if (typeof window !== 'undefined') window.location.href = '/my-tickets';
            }}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Single authentic Stitch digital pass */}
        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="flex flex-col items-center gap-3 p-4 sm:p-5">
            <MahaTicketCard
              ticketCode={primaryTicket || order.orderNumber}
              seatCode={seatsList}
              attendeeName={order.userName}
              status="confirmed"
              eventTitle={eventTitle || 'Event'}
              eventCategory={
                language === 'mr'
                  ? event?.categoryMr || 'कार्यक्रम'
                  : event?.category || 'Event'
              }
              venueName={venueName}
              venueCity={venueCity}
              sessionStartTime={
                bookingResult.session?.sessionStartTime ||
                order?.session?.sessionStartTime ||
                bookingResult.event?.sessions?.find(
                  (s: any) =>
                    Number(s.id) === Number(order?.sessionId || bookingResult.sessionId || bookingResult.session?.id)
                )?.sessionStartTime ||
                event?.sessions?.find(
                  (s: any) =>
                    Number(s.id) === Number(order?.sessionId || bookingResult.sessionId || bookingResult.session?.id)
                )?.sessionStartTime ||
                order?.sessionStartTime ||
                order?.sessionStart ||
                null
              }
              language={language}
              orderNumber={order.orderNumber}
              grandTotal={order.grandTotal}
              qrPayload={
                bookingResult.groupQrPayload ||
                order.groupQrPayload ||
                (event?.id && primaryTicket
                  ? generateSecureTicketQr(primaryTicket, event.id)
                  : (ticketUrl || primaryTicket || order.orderNumber))
              }
              totalTickets={tickets.length}
            />
          </div>
        </div>

        {/* Email delivery status banner */}
        {emailMessage ? (
          <div className="px-4 py-2 border-t border-slate-200 bg-orange-50/60 text-xs text-slate-700 flex items-center justify-between gap-2">
            <span>
              {emailStatus === 'sent' ? '✓ ' : emailStatus === 'pending' ? '⏳ ' : emailStatus === 'failed' ? '! ' : ''}
              {emailMessage}
            </span>
            {(emailStatus === 'failed' || emailStatus === 'pending') && (
              <button
                type="button"
                onClick={handleRetryEmail}
                className="text-[#ea580c] font-bold shrink-0 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : null}

        {/* Bottom Actions: Circular icon buttons for WhatsApp, Share, Download + My Tickets CTA */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          {/* Circular Icon Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* WhatsApp Icon Button */}
            <button
              type="button"
              onClick={handleWhatsApp}
              title="WhatsApp वर पाठवा (Share on WhatsApp)"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </button>

            {/* Share Native / Link Icon Button */}
            <button
              type="button"
              onClick={async () => {
                if (typeof navigator !== 'undefined' && navigator.share && ticketUrl) {
                  try {
                    await navigator.share({
                      title: event?.title || 'MahaTicket Pass',
                      text: `माझे तिकीट (${event?.title || 'कार्यक्रम'}): ${ticketUrl}`,
                      url: ticketUrl,
                    });
                    return;
                  } catch {
                    // fall through
                  }
                }
                if (typeof navigator !== 'undefined' && navigator.clipboard && ticketUrl) {
                  await navigator.clipboard.writeText(ticketUrl);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 3000);
                }
              }}
              title="शेअर करा (Share)"
              aria-label="Share"
              className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              {copySuccess && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md animate-fadeIn z-50">
                  {language === 'mr' ? 'लिंक कॉपी झाली!' : 'Link copied!'}
                </span>
              )}
            </button>

            {/* Download PDF Icon Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              title="PDF डाउनलोड करा (Download PDF)"
              aria-label="Download PDF"
              className="w-10 h-10 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary View My Tickets Redirect Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== 'undefined') window.location.href = '/my-tickets';
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <span>{language === 'mr' ? 'माझी तिकिटे पहा' : 'View My Tickets'}</span>
            <Ticket className="w-3.5 h-3.5 text-orange-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
