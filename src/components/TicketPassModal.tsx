'use client';

import React, { useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import {
  CheckCircle,
  Download,
  Share2,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';

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

  // Save to offline cache (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const existingStr = localStorage.getItem('ticketghar_offline_orders') || '[]';
      const existing = JSON.parse(existingStr);
      // Prepend order if not already present
      if (!existing.some((o: any) => o.orderNumber === order.orderNumber)) {
        const toSave = {
          ...order,
          event,
          tickets,
          pricing,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          'ticketghar_offline_orders',
          JSON.stringify([toSave, ...existing].slice(0, 20))
        );
      }
    } catch (e) {
      console.warn('Failed to cache ticket offline:', e);
    }
  }, [order, event, tickets, pricing]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `TicketGhar Pass - ${event.title}`,
          text: `Here is my booking confirmation for ${event.title} (${order.orderNumber}) on TicketGhar!`,
          url: window.location.href,
        });
      } catch (e) {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(
        `TicketGhar Booking Confirmed! Order #${order.orderNumber} for ${event.title}`
      );
      alert('ऑर्डर तपशील क्लिपबोर्डवर कॉपी केला आहे! (Booking details copied to clipboard)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Celebration Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">
                {t.bookingSuccess}
              </h2>
              <p className="text-xs text-emerald-100 font-mono">
                {t.orderNumber}: {order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* Main Ticket Card (Original TicketGhar Design) */}
          <div className="bg-slate-950 rounded-3xl border-2 border-dashed border-amber-500/40 p-6 sm:p-8 shadow-xl relative overflow-hidden">
            {/* Corner Decorative Punch-outs */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-r border-amber-500/40" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-l border-amber-500/40" />

            {/* Header: Title and Event Info */}
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {language === 'mr' ? event.categoryMr : event.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 font-serif">
                  {language === 'mr' ? event.titleMr : event.title}
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {language === 'mr' ? event.title : event.titleMr}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">{t.grandTotal}</span>
                <span className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono">
                  ₹{(order.grandTotal / 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  ✓ PAID (Razorpay)
                </span>
              </div>
            </div>

            {/* Event Timing & Venue */}
            <div className="py-4 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">तारीख व वार / Date</span>
                  <span className="font-semibold text-white">
                    {new Date(order.createdAt).toLocaleDateString(
                      language === 'mr' ? 'mr-IN' : 'en-IN',
                      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">सभागृह / Venue</span>
                  <span className="font-semibold text-white">
                    {language === 'mr' ? event.venue?.nameMr || 'सभागृह' : event.venue?.name}
                  </span>
                  <span className="text-slate-400 block text-[11px]">
                    {event.venue?.address || event.venue?.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Passes List with QR */}
            <div className="pt-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                <span>प्रवेशिका व अधिकृत QR कोड ({tickets.length} Passes)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tickets.map((tk: any, i: number) => (
                  <div
                    key={tk.id || i}
                    className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center text-center space-y-2 shadow-inner"
                  >
                    {/* QR Code Canvas/Image */}
                    <div className="p-2 bg-white rounded-xl shadow-md border border-slate-300">
                      {tk.qrDataUrl ? (
                        <img
                          src={tk.qrDataUrl}
                          alt="Gate Entry QR"
                          className="w-36 h-36 object-contain"
                        />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-500">
                          QR Pass
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                        आसन क्रमांक / Seat
                      </span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        {tk.seatCode}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      <span>{tk.attendeeName || order.userName}</span>
                    </div>

                    <div className="text-[9px] font-mono text-slate-500 truncate max-w-[180px]">
                      Code: {tk.ticketCode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification & Security Notice */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>तिकीटघर डिजिटल स्वाक्षरी सत्यापित (HMAC SHA-256 Validated)</span>
              </div>
              <span className="text-slate-500 font-mono">Gate: Main Entry 1</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400 hidden sm:block">
            {t.showAtGate}
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Pass</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs border border-amber-500/30 transition"
            >
              <Download className="w-4 h-4" />
              <span>{t.downloadTicket}</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md transition"
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
