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
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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
  const recipientEmail = (order?.userEmail || order?.email || '').trim();
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
    (language === 'mr' ? 'सभागृह उपलब्ध नाही' : 'Venue unavailable');
  const venueCity = venueObj?.city || event?.venueCity || event?.city || '';
  const seatsList = tickets.map((tk: any) => tk.seatCode).join(', ');
  const ticketUrl = primaryTicket ? getTicketShareUrl(primaryTicket) : '';

  // Email is user-triggered only (Mail icon → confirm). Server may still email on first payment confirm.

  const handleWhatsApp = () => {
    if (!primaryTicket) return;
    const showStart =
      bookingResult?.session?.sessionStartTime ||
      order?.session?.sessionStartTime ||
      order?.sessionStartTime ||
      order?.sessionStart ||
      null;
    const dateTime = showStart
      ? `${formatISTDate(showStart, 'en', false)} · ${formatISTTime(showStart, 'en', true)}`
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
    if (isDownloading) return;
    if (!primaryTicket && !order?.orderNumber) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(false);
      setDownloadError(null);

      const pdfToken =
        (order as any)?.pdfDownloadToken ||
        (bookingResult as any)?.pdfDownloadToken ||
        (bookingResult as any)?.order?.pdfDownloadToken ||
        null;
      const sessionToken =
        typeof window !== 'undefined' ? localStorage.getItem('mahaticket_token') : null;

      if (!pdfToken && !sessionToken) {
        setDownloadError(
          language === 'mr'
            ? 'PDF डाउनलोडसाठी लॉगिन आवश्यक आहे किंवा पास पुन्हा उघडा.'
            : 'Sign in or reopen your pass to download the PDF.'
        );
        return;
      }

      const qs = new URLSearchParams({ download: '1' });
      if (pdfToken) qs.set('t', String(pdfToken));

      const headers: Record<string, string> = {};
      if (sessionToken && String(sessionToken).includes('.')) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const candidates = [
        primaryTicket
          ? `/api/tickets/${encodeURIComponent(primaryTicket)}/pdf?${qs.toString()}`
          : null,
        order?.orderNumber
          ? `/api/orders/${encodeURIComponent(order.orderNumber)}/pdf?${qs.toString()}`
          : null,
        order?.id ? `/api/orders/${encodeURIComponent(String(order.id))}/pdf?${qs.toString()}` : null,
      ].filter(Boolean) as string[];

      let res: Response | null = null;
      let lastStatus = 0;
      let lastErrorHint = '';
      for (const endpoint of candidates) {
        res = await fetch(endpoint, {
          credentials: 'include',
          cache: 'no-store',
          headers,
        });
        lastStatus = res.status;
        if (res.ok) break;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const body = await res.json().catch(() => ({}));
          lastErrorHint = String((body as any)?.error || '').slice(0, 120);
        }
      }

      if (!res || !res.ok) {
        const hint =
          lastStatus === 401 || lastStatus === 403 || lastStatus === 404
            ? language === 'mr'
              ? 'अनधिकृत किंवा कालबाह्य लिंक. लॉगिन करून My Tickets मधून पुन्हा प्रयत्न करा.'
              : 'Unauthorized or expired link. Sign in and retry from My Tickets.'
            : language === 'mr'
              ? `PDF तयार करता आली नाही (${lastStatus || 'network'}).`
              : `Could not generate PDF (${lastStatus || 'network'}).`;
        console.warn('[PDF] download failed', { status: lastStatus, hint: lastErrorHint || undefined });
        setDownloadError(hint);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        setDownloadError(
          language === 'mr'
            ? 'सर्व्हरने PDF ऐवजी चुकीचा प्रतिसाद दिला.'
            : 'Server returned a non-PDF response.'
        );
        return;
      }

        const blob = await res.blob();
      if (!blob || blob.size < 100) {
        setDownloadError(
          language === 'mr' ? 'PDF रिकामी किंवा अवैध आहे.' : 'PDF file is empty or invalid.'
        );
        return;
      }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
      a.download = `MahaTicket-${order.orderNumber || primaryTicket}.pdf`;
      document.body.appendChild(a);
        a.click();
      document.body.removeChild(a);
      // Delay revoke so the browser can finish starting the download
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('[PDF] download error', err instanceof Error ? err.message : 'unknown');
      setDownloadError(
        language === 'mr'
          ? 'PDF डाउनलोड अयशस्वी. कृपया पुन्हा प्रयत्न करा.'
          : 'PDF download failed. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSendEmail = async () => {
    if (!primaryTicket || !recipientEmail) return;
    setEmailConfirmOpen(false);
    setEmailStatus('sending');
    setEmailMessage(language === 'mr' ? 'ईमेल पाठवत आहे…' : 'Sending email…');
    try {
      const pdfToken =
        (order as any)?.pdfDownloadToken ||
        (bookingResult as any)?.pdfDownloadToken ||
        (bookingResult as any)?.order?.pdfDownloadToken ||
        null;
      const sessionToken =
        typeof window !== 'undefined' ? localStorage.getItem('mahaticket_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken && sessionToken.includes('.')) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }
      const res = await fetch(`/api/tickets/${primaryTicket}/email`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          email: recipientEmail,
          ...(pdfToken ? { pdfDownloadToken: pdfToken } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && (data.sent || data.success)) {
        setEmailStatus('sent');
        setEmailMessage(
          language === 'mr'
            ? `ईमेल पाठवला: ${data.recipient || recipientEmail}`
            : `Email sent to ${data.recipient || recipientEmail}`
        );
      } else if (data.status === 'not_configured') {
        setEmailStatus('pending');
        setEmailMessage(
          language === 'mr'
            ? 'ईमेल सेवा सध्या उपलब्ध नाही.'
            : 'Email service is not configured.'
        );
      } else {
        setEmailStatus('failed');
        setEmailMessage(data.error || data.message || 'Email delivery failed.');
      }
    } catch {
      setEmailStatus('failed');
      setEmailMessage(language === 'mr' ? 'ईमेल अयशस्वी.' : 'Failed to send email.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[min(92dvh,900px)] max-h-[92dvh] mb-[max(0px,env(safe-area-inset-bottom))] border border-slate-200">

        {/* Top Celebration Bar */}
        <div className="px-5 py-3.5 bg-[#ea580c] text-white flex items-center justify-between shrink-0">
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
                // Prefer short HTTP share URL for reliable phone-camera scans.
                // Dense MTGRP/MTSEC tokens often fail when scanned from another phone screen.
                ticketUrl ||
                primaryTicket ||
                order.orderNumber ||
                bookingResult.groupQrPayload ||
                order.groupQrPayload ||
                ''
              }
              totalTickets={tickets.length}
            />
          </div>
        </div>

        {/* Sticky footer: icon-only actions — clear of mobile bottom nav / safe area */}
        <div className="shrink-0 border-t border-slate-200 bg-white z-30 pb-[max(calc(env(safe-area-inset-bottom)+0.75rem),1rem)]">
          {emailMessage ? (
            <div className="px-4 py-1.5 bg-orange-50/70 text-[11px] text-slate-700 border-b border-orange-100/80 truncate">
              {emailStatus === 'sent' ? '✓ ' : emailStatus === 'sending' ? '⏳ ' : emailStatus === 'failed' ? '! ' : ''}
              {emailMessage}
            </div>
          ) : null}

          <div className="px-4 py-3 flex items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleWhatsApp}
              title="WhatsApp"
              aria-label="WhatsApp"
              className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </button>

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
                    /* fall through */
                  }
                }
                if (typeof navigator !== 'undefined' && navigator.clipboard && ticketUrl) {
                  await navigator.clipboard.writeText(ticketUrl);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 3000);
                }
              }}
              title="Share"
              aria-label="Share"
              className="relative w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
              {copySuccess && (
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md whitespace-nowrap shadow-md z-50">
                  ✓
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              title="Download PDF"
              aria-label="Download PDF"
              className="w-12 h-12 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setEmailConfirmOpen(true)}
              disabled={emailStatus === 'sending' || !recipientEmail}
              title="Email ticket"
              aria-label="Email ticket"
              className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {emailStatus === 'sending' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </button>
          </div>
          {downloadError ? (
            <p className="px-4 pb-2 text-center text-[11px] font-semibold text-red-600" role="alert">
              {downloadError}
            </p>
          ) : null}
        </div>
      </div>

      {emailConfirmOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'mr' ? 'ईमेल पाठवायचा?' : 'Send ticket email?'}
            </h3>
            <p className="text-xs text-slate-600">
              {language === 'mr'
                ? `तिकीट PDF या पत्त्यावर पाठवला जाईल: ${recipientEmail || '—'}`
                : `PDF ticket will be sent to: ${recipientEmail || '—'}`}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEmailConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                {language === 'mr' ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                className="flex-1 py-2.5 rounded-xl bg-[#ea580c] text-white text-xs font-bold"
              >
                {language === 'mr' ? 'पाठवा' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
