'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, EventSessionItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Clock,
  AlertCircle,
  Accessibility,
  ArrowRight,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface SeatMapModalProps {
  event: EventItem;
  session: EventSessionItem;
  language: Language;
  onClose: () => void;
  onProceedToCheckout: (holdData: {
    sessionId: number;
    seatIds: number[];
    heldSeats: any[];
    faceValueTotal: number;
    holdExpiresAt: string;
  }) => void;
}

const MAX_BOOKING_SEATS = 5;

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  event,
  session,
  language,
  onClose,
  onProceedToCheckout,
}) => {
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [venueData, setVenueData] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [isHolding, setIsHolding] = useState(false);

  // Fetch real-time seat inventory for this session
  const fetchSessionSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/sessions/${session.id}/seats`);
      if (!res.ok) throw new Error('Failed to load seat layout');
      const data = await res.json();
      setVenueData(data.venue);
      setSeats(data.seats || []);
      setSections(data.sections || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading seats');
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    fetchSessionSeats();
  }, [fetchSessionSeats]);

  // Handle seat click
  const toggleSeatSelection = (seat: any) => {
    if (seat.status === 'booked' || seat.status === 'held') return;

    setWarningMessage(null);

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= MAX_BOOKING_SEATS) {
        setWarningMessage(
          language === 'mr'
            ? `एका वेळी जास्तीत जास्त ${MAX_BOOKING_SEATS} जागा निवडता येतील. अधिक जागांसाठी दुसरी ऑर्डर करा.`
            : `Maximum ${MAX_BOOKING_SEATS} seats allowed per booking. Please place another order for more seats.`
        );
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
    }
  };

  // Selected seats details
  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.seatId));
  const subtotalPaise = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const estPlatformFee = (event.convenienceFeeValue || 3000) * selectedSeatIds.length;
  const estGst = Math.round((estPlatformFee * (event.gstPercent || 18)) / 100);
  const estTotal = subtotalPaise + estPlatformFee + estGst;

  // Handle temporary hold and proceed to booking
  const handleHoldAndProceed = async () => {
    if (selectedSeatIds.length === 0) return;

    try {
      setIsHolding(true);
      setError(null);

      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          seatIds: selectedSeatIds,
          userIdStr: `guest-browser-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Seat hold expired or unavailable.');
      }

      onProceedToCheckout({
        sessionId: session.id,
        seatIds: selectedSeatIds,
        heldSeats: data.hold.heldSeats,
        faceValueTotal: data.hold.faceValueTotal,
        holdExpiresAt: data.hold.holdExpiresAt,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Selected seat(s) became unavailable. Please refresh.');
      fetchSessionSeats();
      setSelectedSeatIds([]);
    } finally {
      setIsHolding(false);
    }
  };

  const balconySection = sections.find((s) => s.name.toLowerCase().includes('balcony'));
  const balconySeats = balconySection
    ? seats.filter((s) => s.sectionId === balconySection.id)
    : [];

  const stallSection = sections.find((s) => !s.name.toLowerCase().includes('balcony')) || sections[0];
  const stallSeats = stallSection
    ? seats.filter((s) => s.sectionId === stallSection.id)
    : seats;

  const groupByRow = (seatList: any[]) => {
    const rows: { [key: string]: any[] } = {};
    seatList.forEach((s) => {
      const row = s.rowLabel || 'A';
      if (!rows[row]) rows[row] = [];
      rows[row].push(s);
    });
    // Sort seats numerically within row
    Object.keys(rows).forEach((row) => {
      rows[row].sort((a, b) => a.seatNumber - b.seatNumber);
    });
    return rows;
  };

  const stallRows = groupByRow(stallSeats);
  const balconyRows = groupByRow(balconySeats);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border border-slate-200">
        
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-[#ea580c] text-white">
                BookMyShow Style
              </span>
              <h2 className="text-base sm:text-lg font-black text-white truncate max-w-[280px] sm:max-w-md">
                {language === 'mr' ? event.titleMr || event.title : event.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {venueData?.nameMr || venueData?.name || event.venue?.name} ·{' '}
              {session.sessionStartTime
                ? new Date(session.sessionStartTime).toLocaleString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Showtime'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend Indicator Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border-2 border-slate-300 bg-white" />
              <span className="text-slate-700 font-medium">उपलब्ध (Available)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#ea580c] text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                ✓
              </div>
              <span className="text-slate-900 font-bold">निवडलेली (Selected)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-slate-300 border border-slate-300" />
              <span className="text-slate-500 font-medium">विकलेली (Sold)</span>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[#ea580c] bg-orange-100/80 px-2.5 py-1 rounded-full border border-orange-200">
            ★ कमाल मर्यादा: एका वेळी ५ तिकीटे (Max 5 tickets)
          </div>
        </div>

        {/* Warning Notification if > 5 seats attempted */}
        {warningMessage && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warningMessage}</span>
            </div>
            <button
              onClick={() => setWarningMessage(null)}
              className="text-amber-800 hover:text-amber-950 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Seat Layout Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">सभागृह आसन व्यवस्था लोड होत आहे...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-medium text-slate-800">{error}</p>
              <button
                onClick={fetchSessionSeats}
                className="px-4 py-1.5 rounded-lg bg-[#ea580c] text-white text-xs font-bold shadow-sm"
              >
                पुन्हा प्रयत्न करा
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* BookMyShow Style Curved Screen / Stage Representation */}
              <div className="flex flex-col items-center pt-2 pb-4">
                <div className="w-full max-w-md h-3.5 bg-gradient-to-b from-[#ea580c] via-orange-400 to-transparent rounded-t-[100px] shadow-md opacity-90" />
                <div className="w-full max-w-lg border-t-2 border-dashed border-[#ea580c]/50 mt-1" />
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-700 tracking-widest mt-2">
                  <span>🎭 ऑल आईज ऑन स्टेज · SCREEN / STAGE THIS WAY</span>
                </div>
              </div>

              {/* STALL / EXECUTIVE SECTION */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                      {language === 'mr' ? stallSection?.nameMr || 'स्टॉल क्लास' : stallSection?.name || 'Stall Executive'}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-[#ea580c] font-mono">
                    ₹{((stallSection?.basePrice || 30000) / 100).toFixed(0)}
                  </span>
                </div>

                {/* Rows Grid */}
                <div className="flex flex-col items-center gap-2 pt-2 overflow-x-auto pb-2">
                  {Object.entries(stallRows).map(([rowLabel, rowSeats]) => (
                    <div key={rowLabel} className="flex items-center gap-2 min-w-max">
                      <span className="w-5 text-xs font-black text-slate-400 text-center select-none">
                        {rowLabel}
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.seatId);
                          const isBooked = seat.status === 'booked';
                          const isHeld = seat.status === 'held' && !isSelected;

                          let seatClass =
                            'bg-white border-2 border-slate-300 text-slate-800 hover:border-[#ea580c] hover:scale-105 active:scale-95';
                          if (isSelected) {
                            seatClass =
                              'bg-[#ea580c] border-[#ea580c] text-white font-black scale-105 shadow-md shadow-orange-500/30';
                          } else if (isBooked) {
                            seatClass =
                              'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed';
                          } else if (isHeld) {
                            seatClass =
                              'bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed';
                          }

                          return (
                            <button
                              key={seat.seatId}
                              disabled={isBooked || isHeld}
                              onClick={() => toggleSeatSelection(seat)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs flex items-center justify-center transition-all duration-150 font-mono font-bold ${seatClass}`}
                              title={`${seat.seatCode} (₹${((seat.price || 30000) / 100).toFixed(0)})`}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : seat.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-5 text-xs font-black text-slate-400 text-center select-none">
                        {rowLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BALCONY / VIP LOUNGE SECTION */}
              {Object.keys(balconyRows).length > 0 && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                        {language === 'mr' ? balconySection?.nameMr || 'बाल्कनी लाउंज' : balconySection?.name || 'Balcony Lounge'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#ea580c] font-mono">
                      ₹{((balconySection?.basePrice || 40000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-2 overflow-x-auto pb-2">
                    {Object.entries(balconyRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2 min-w-max">
                        <span className="w-5 text-xs font-black text-slate-400 text-center select-none">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatClass =
                              'bg-white border-2 border-slate-300 text-slate-800 hover:border-[#ea580c] hover:scale-105 active:scale-95';
                            if (isSelected) {
                              seatClass =
                                'bg-[#ea580c] border-[#ea580c] text-white font-black scale-105 shadow-md shadow-orange-500/30';
                            } else if (isBooked) {
                              seatClass =
                                'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed';
                            } else if (isHeld) {
                              seatClass =
                                'bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed';
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeatSelection(seat)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs flex items-center justify-center transition-all duration-150 font-mono font-bold ${seatClass}`}
                                title={`${seat.seatCode} (₹${((seat.price || 40000) / 100).toFixed(0)})`}
                              >
                                {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs font-black text-slate-400 text-center select-none">
                          {rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attractive BookMyShow Bottom Action Bar (No depressing raw price shout) */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 safe-bottom">
          <div className="w-full sm:w-auto">
            {selectedSeats.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900">
                    {selectedSeats.length} {language === 'mr' ? 'जागा निवडल्या' : 'Seats Selected'}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.map((s) => (
                      <span
                        key={s.seatId}
                        className="px-2 py-0.5 rounded-md bg-orange-100 text-[#ea580c] font-black text-xs font-mono border border-orange-200"
                      >
                        {s.seatCode}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  {language === 'mr'
                    ? '८ मिनिटांसाठी आरक्षित राहतील · कन्फर्म करण्यासाठी पुढे जा'
                    : 'Held for 8 minutes · Click Confirm Booking to proceed'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700">
                  {language === 'mr' ? 'आपली आवडती जागा निवडा' : 'Select your preferred seats'}
                </span>
                <p className="text-[11px] text-slate-600">
                  {language === 'mr'
                    ? 'एका वेळी कमाल ५ जागा निवडता येतील'
                    : 'Maximum 5 tickets allowed per booking'}
                </p>
              </div>
            )}
          </div>

          <button
            disabled={selectedSeatIds.length === 0 || isHolding}
            onClick={handleHoldAndProceed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition active:scale-95"
          >
            {isHolding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>आरक्षित करत आहे...</span>
              </>
            ) : (
              <>
                <span>
                  {selectedSeatIds.length > 0
                    ? language === 'mr'
                      ? `बुकिंग निश्चित करा (${selectedSeatIds.length})`
                      : `Confirm Booking (${selectedSeatIds.length} Seats)`
                    : language === 'mr'
                    ? 'जागा निवडा'
                    : 'Select Seats'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
