'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, MapPin, ShieldCheck, Ticket, Download, Share2 } from 'lucide-react';

export interface MahaTicketCardProps {
  ticketCode: string;
  seatCode?: string;
  attendeeName?: string;
  status?: string;
  eventTitle: string;
  eventCategory?: string;
  venueName: string;
  venueCity?: string;
  showTimeStr?: string;
  showDateStr?: string;
  orderNumber?: string;
  grandTotal?: number;
  qrPayload: string;
  isMultiple?: boolean;
  ticketIndex?: number;
  totalTickets?: number;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  className?: string;
}

export const MahaTicketCard: React.FC<MahaTicketCardProps> = ({
  ticketCode,
  seatCode,
  attendeeName,
  status = 'confirmed',
  eventTitle,
  eventCategory = 'नाटक / Theatre',
  venueName,
  venueCity = 'महाराष्ट्र',
  showTimeStr,
  showDateStr,
  orderNumber,
  grandTotal,
  qrPayload,
  isMultiple = false,
  ticketIndex,
  totalTickets,
  onDownloadPdf,
  onShare,
  className = '',
}) => {
  const isUsed = status.toLowerCase() === 'used';
  const isCancelled = status.toLowerCase() === 'cancelled';

  return (
    <div
      className={`relative bg-white rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-lg overflow-hidden max-w-md mx-auto transition-all ${className}`}
    >
      {/* Top Brand Banner / Theatre Header */}
      <div className="bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#C2410C] px-5 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white -rotate-12" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase opacity-90 block">
              महाटिकिट M-TICKET PASS
            </span>
            <span className="text-xs font-bold font-mono">
              {orderNumber ? `#${orderNumber}` : ticketCode}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-xs text-[11px] font-bold border border-white/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          <span className="capitalize">
            {isUsed ? 'प्रवेश पूर्ण (Used)' : isCancelled ? 'रद्द (Cancelled)' : 'वैध (Valid)'}
          </span>
        </div>
      </div>

      {/* Main Ticket Info Section */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Category & Title */}
        <div>
          <span className="inline-block text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]/50 mb-1.5">
            {eventCategory}
          </span>
          <h3 className="text-lg sm:text-xl font-black text-[#111827] leading-snug font-serif">
            {eventTitle}
          </h3>
        </div>

        {/* Date, Time & Venue Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F3F4F6] text-xs">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">
                तारीख / Date
              </span>
              <span className="font-extrabold text-[#111827]">
                {showDateStr || 'Today'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">
                वेळ / Time
              </span>
              <span className="font-extrabold text-[#111827]">
                {showTimeStr || '7:00 PM'}
              </span>
            </div>
          </div>

          <div className="col-span-2 flex items-start gap-2 pt-1">
            <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
            <div className="truncate">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">
                सभागृह / Venue
              </span>
              <span className="font-extrabold text-[#111827] truncate block">
                {venueName}
              </span>
              {venueCity && (
                <span className="text-[11px] text-[#64748B]">{venueCity}</span>
              )}
            </div>
          </div>
        </div>

        {/* Seat / Pass Details Callout */}
        <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FDBA74]/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#C2410C] block">
              आरक्षित आसन / Seat
            </span>
            <span className="text-base font-black text-[#111827] font-mono">
              {seatCode || 'General Entry'}
            </span>
          </div>

          {totalTickets && totalTickets > 1 && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#64748B] block">
                तिकीट क्रमांक
              </span>
              <span className="text-xs font-extrabold text-[#EA580C]">
                {ticketIndex ? `${ticketIndex} of ${totalTickets}` : `${totalTickets} Passes`}
              </span>
            </div>
          )}

          {grandTotal && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#64748B] block">
                एकूण रक्कम
              </span>
              <span className="text-sm font-black text-[#EA580C] font-mono">
                ₹{(grandTotal / 100).toFixed(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TICKET PERFORATION & NOTCH CUTOUTS (Physical Pass Metaphor) */}
      <div className="relative flex items-center justify-between my-1">
        {/* Left Semi-circle Notch */}
        <div className="w-3 h-5 bg-slate-100 sm:bg-slate-200 rounded-r-full -ml-1 border-r border-t border-b border-[#E5E7EB]" />

        {/* Dashed Perforation Line */}
        <div className="flex-1 border-b-2 border-dashed border-[#CBD5E1] mx-3" />

        {/* Right Semi-circle Notch */}
        <div className="w-3 h-5 bg-slate-100 sm:bg-slate-200 rounded-l-full -mr-1 border-l border-t border-b border-[#E5E7EB]" />
      </div>

      {/* QR PRESENTATION ZONE (High contrast, pure white, generous quiet zone) */}
      <div className="p-5 sm:p-6 bg-white flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-white rounded-2xl border-2 border-[#E5E7EB] shadow-inner inline-block">
          <QRCodeSVG
            value={qrPayload || ticketCode}
            size={180}
            level="M"
            includeMargin={true}
            className="w-40 h-40 sm:w-44 sm:h-44"
          />
        </div>

        <div className="space-y-1 w-full">
          <span className="text-xs font-black text-[#EA580C] tracking-wide block uppercase">
            प्रवेशद्वारावर हा QR कोड दाखवा (Entry Pass)
          </span>
          <p className="text-[11px] text-[#64748B]">
            स्कॅन करण्यासाठी स्क्रीन ब्राईटनेस वाढवा • Increase brightness for scan
          </p>
          <span className="text-[10px] font-mono font-bold text-slate-400 block pt-0.5">
            CODE: {ticketCode}
          </span>
        </div>

        {/* Security & Gate Verification Notice */}
        <div className="w-full pt-2.5 mt-2 border-t border-slate-100 text-left space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
            <span>सुरक्षित डिजिटल तिकीट पडताळणी</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            • हे तिकीट अधिकृत आयोजक/गेट ऑपरेटरद्वारेच सुरक्षितपणे सत्यापित केले जाते.
          </p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            • प्रयोगाच्या वेळेपूर्वी १५ मिनिटे आधी सभागृहात उपस्थित राहावे.
          </p>
        </div>
      </div>
    </div>
  );
};
