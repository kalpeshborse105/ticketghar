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

  // Save to offline cache (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const existingStr = localStorage.getItem('mahaticket_offline_orders') || '[]';
      const existing = JSON.parse(existingStr);
      if (!existing.some((o: any) => o.orderNumber === order.orderNumber)) {
        const toSave = {
          ...order,
          event,
          tickets,
          pricing,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          'mahaticket_offline_orders',
          JSON.stringify([toSave, ...existing].slice(0, 20))
        );
      }
    } catch {
      /* ignore cache errors */
    }
  }, [order, event, tickets, pricing]);

  const primaryTicket = tickets[0]?.ticketCode;
  const eventTitle = language === 'mr' ? event?.titleMr || event?.title : event?.title;
  const venueName = language === 'mr' ? event?.venue?.nameMr || event?.venue?.name : event?.venue?.name;
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

      const downloadEndpoint = `/api/tickets/${primaryTicket}/pdf?download=1`;
      const res = await fetch(downloadEndpoint);
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
      // Fallback: direct window.open
      window.open(`/api/tickets/${primaryTicket}/pdf`, '_blank');
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
      if (data.sent) {
        setEmailStatus('sent');
        setEmailMessage(
          language === 'mr' ? `ईमेल पाठवला: ${data.recipient}` : `Email sent to ${data.recipient}`
        );
      } else {
        setEmailStatus(data.configured === false ? 'pending' : 'failed');
        setEmailMessage(data.message || 'Email delivery not configured.');
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
            onClick={onClose}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/30 text-white transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Pass Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
          
          {/* Main BookMyShow Style M-Ticket Pass */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            
            {/* Header: Title and Event Info */}
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-orange-100 text-[#ea580c] border border-orange-200">
                  {language === 'mr' ? event.categoryMr || 'कार्यक्रम' : event.category || 'Event'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
                  {eventTitle}
                </h3>
                {event.titleMr && language === 'en' && (
                  <p className="text-xs text-slate-600">{event.titleMr}</p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-600 block">{t.grandTotal}</span>
                <span className="text-lg sm:text-xl font-black text-[#ea580c] font-mono">
                  ₹{(order.grandTotal / 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-emerald-600 block font-bold">
                  ✓ PAID (MahaTicket Verified)
                </span>
              </div>
            </div>

            {/* Event Timing & Venue */}
            <div className="py-2 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-900">
                <Calendar className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-600 block text-[10px] font-bold uppercase">तारीख व वेळ / Showtime</span>
                  <span className="font-bold text-slate-900">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString(
                          language === 'mr' ? 'mr-IN' : 'en-IN',
                          { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
                        )
                      : 'Today'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-900">
                <MapPin className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-600 block text-[10px] font-bold uppercase">सभागृह / Venue</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {venueName}
                  </span>
                  <span className="text-slate-600 block text-[11px]">
                    {event.venue?.address || event.venue?.city || 'Pune'}
                  </span>
                </div>
              </div>
            </div>

            {/* Single Unified QR Code Pass (BookMyShow Style for all 1-5 tickets) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
              {/* Central Scannable QR */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-sm">
                <QRCodeSVG
                  value={ticketUrl}
                  size={160}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#ea580c] tracking-wide block">
                  प्रवेश द्वारावर हा QR कोड दाखवा (Scan for Venue Entry)
                </span>
                <p className="text-[11px] text-slate-600 max-w-sm">
                  This single unified QR covers all {tickets.length} seats in this booking.
                </p>
              </div>

              {/* Seats Badge Grid */}
              <div className="w-full pt-2 border-t border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-600 mb-1">
                  आरक्षित आसने / Booked Seats ({tickets.length} Passes):
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {tickets.map((tk: any, i: number) => (
                    <span
                      key={tk.id || i}
                      className="px-2.5 py-1 rounded-md bg-white border border-orange-300 text-[#ea580c] font-black text-xs font-mono shadow-2xs"
                    >
                      {tk.seatCode}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-800 font-medium">
                ग्राहक: <span className="font-bold">{order.userName}</span>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>HMAC SHA-256 Verified Official Pass</span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">M-TICKET</span>
            </div>
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

        {/* Bottom Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 safe-bottom">
          <p className="text-xs text-slate-600 hidden sm:block">
            {t.showAtGate}
          </p>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
