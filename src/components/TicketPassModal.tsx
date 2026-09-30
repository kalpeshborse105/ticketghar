'use client';

import React, { useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import {
  CheckCircle,
  Download,
  Share2,
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  X,
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
      const existingStr =
        localStorage.getItem('mahaticket_offline_orders') ||
        localStorage.getItem('ticketghar_offline_orders') ||
        '[]';
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
    } catch (e) {
      console.warn('Failed to cache ticket offline:', e);
    }
  }, [order, event, tickets, pricing]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const seatNames = tickets.map((tk: any) => tk.seatCode).join(', ');
    const eventTitle = language === 'mr' ? event.titleMr : event.title;
    const venueName = language === 'mr' ? event.venue?.nameMr : event.venue?.name;

    const shareMessage = `MahaTicket 🎟️\nBooking confirmed!\n\nEvent: ${eventTitle}\nVenue: ${venueName}\nSeats: ${seatNames}\nBooking ID: ${order.orderNumber}\n\nPresent this digital pass at the entrance gate.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `MahaTicket - ${eventTitle}`,
          text: shareMessage,
          url: window.location.href,
        });
      } catch {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareMessage);
      alert(
        language === 'mr'
          ? 'तिकीट तपशील क्लिपबोर्डवर कॉपी केला आहे!'
          : 'Booking details copied to clipboard!'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-xl bg-[#111827] border border-[#243044] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Celebration Bar */}
        <div className="px-5 py-3.5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-200" />
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                {t.bookingSuccess}
              </h2>
              <p className="text-xs text-emerald-100 font-mono">
                {t.orderNumber}: {order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Pass Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Main Ticket Card */}
          <div className="bg-[#0a0e17] rounded-xl border border-[#243044] p-5 shadow-sm relative overflow-hidden">
            {/* Header: Title and Event Info */}
            <div className="border-b border-[#243044] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/30">
                  {language === 'mr' ? event.categoryMr : event.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {language === 'mr' ? event.titleMr : event.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'mr' ? event.title : event.titleMr}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">{t.grandTotal}</span>
                <span className="text-base sm:text-lg font-bold text-[#ea580c] font-mono">
                  ₹{(order.grandTotal / 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-medium">
                  ✓ PAID (MahaTicket Verified)
                </span>
              </div>
            </div>

            {/* Event Timing & Venue */}
            <div className="py-3 border-b border-[#243044] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">तारीख व वार / Date</span>
                  <span className="font-semibold text-white">
                    {new Date(order.createdAt).toLocaleDateString(
                      language === 'mr' ? 'mr-IN' : 'en-IN',
                      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">सभागृह / Venue</span>
                  <span className="font-semibold text-white truncate block">
                    {language === 'mr' ? event.venue?.nameMr || 'सभागृह' : event.venue?.name}
                  </span>
                  <span className="text-slate-400 block text-[10px]">
                    {event.venue?.address || event.venue?.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Passes List with Compact QR */}
            <div className="pt-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#ea580c] flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" />
                <span>प्रवेशिका व अधिकृत QR कोड ({tickets.length} Passes)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tickets.map((tk: any, i: number) => (
                  <div
                    key={tk.id || i}
                    className="p-3 bg-[#111827] rounded-lg border border-[#243044] flex flex-col items-center text-center space-y-1.5"
                  >
                    {/* Compact QR Code Canvas */}
                    <div className="p-1.5 bg-white rounded-lg border border-slate-300">
                      {tk.qrDataUrl ? (
                        <img
                          src={tk.qrDataUrl}
                          alt="Gate Entry QR"
                          className="w-28 h-28 object-contain"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-600">
                          QR Pass
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">
                        आसन क्रमांक / Seat
                      </span>
                      <span className="text-sm font-bold text-[#ea580c] font-mono">
                        {tk.seatCode}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium">
                      <span>{tk.attendeeName || order.userName}</span>
                    </div>

                    <div className="text-[9px] font-mono text-slate-500 truncate max-w-[150px]">
                      {tk.ticketCode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Notice */}
            <div className="mt-4 pt-3 border-t border-[#243044] flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>महाटिकिट डिजिटल स्वाक्षरी सत्यापित (HMAC SHA-256)</span>
              </div>
              <span className="text-slate-500 font-mono">Gate Entry Pass</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3.5 sm:p-4 border-t border-[#243044] bg-[#0a0e17] flex flex-wrap items-center justify-between gap-2 safe-bottom">
          <p className="text-xs text-slate-400 hidden sm:block">
            {t.showAtGate}
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a2333] hover:bg-[#243044] text-white font-medium text-xs border border-[#243044] transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Share Pass</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a2333] hover:bg-[#243044] text-white font-medium text-xs border border-[#243044] transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>{t.downloadTicket}</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs shadow-sm transition active:scale-95"
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
