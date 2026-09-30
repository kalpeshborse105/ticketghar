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

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= 8) {
        alert(language === 'mr' ? 'एका वेळी जास्तीत जास्त ८ जागा निवडता येतील.' : 'Maximum 8 seats allowed per booking.');
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

  // Handle temporary hold
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
    for (const s of seatList) {
      if (!rows[s.rowLabel]) rows[s.rowLabel] = [];
      rows[s.rowLabel].push(s);
    }
    for (const r in rows) {
      rows[r].sort((a, b) => a.seatNumber - b.seatNumber);
    }
    return rows;
  };

  const balconyRows = groupByRow(balconySeats);
  const stallRows = groupByRow(stallSeats);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-4xl bg-[#111827] border border-[#243044] rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-[#243044] flex items-center justify-between bg-[#0a0e17]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {language === 'mr' ? event.titleMr : event.title}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] font-semibold border border-[#ea580c]/30">
                {language === 'mr' ? event.categoryMr : event.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {venueData?.name} ({venueData?.city}) •{' '}
              {new Date(session.sessionStartTime).toLocaleDateString(
                language === 'mr' ? 'mr-IN' : 'en-IN',
                { weekday: 'short', day: 'numeric', month: 'short' }
              )}{' '}
              {new Date(session.sessionStartTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1a2333] text-slate-400 hover:text-white border border-[#243044] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seat Legend */}
        <div className="px-4 py-2.5 bg-[#0a0e17] border-b border-[#243044] flex flex-wrap items-center justify-center gap-3.5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#1e293b] border border-[#334155]" />
            <span>{t.available}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#ea580c] flex items-center justify-center text-white font-bold text-[9px]">
              ✓
            </div>
            <span>{t.selected}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-900/50 border border-amber-600 flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
            </div>
            <span>{t.held}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#1e293b] opacity-40" />
            <span>{t.sold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-950 flex items-center justify-center">
              <Accessibility className="w-2.5 h-2.5 text-blue-400" />
            </div>
            <span>{t.accessible}</span>
          </div>
        </div>

        {/* Scrollable Seat Grid Container */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <div className="w-6 h-6 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">आसनव्यवस्था तपासत आहे... (Loading Seat Map)</p>
            </div>
          ) : (
            <div className="min-w-[480px]">
              {/* Stage Visual */}
              <div className="w-full flex flex-col items-center mb-6">
                <div className="w-3/4 h-2 bg-[#ea580c] rounded-t-full shadow-sm" />
                <div className="w-3/4 py-1 bg-[#0a0e17] border-x border-b border-[#243044] rounded-b-lg text-center">
                  <span className="text-[11px] font-semibold tracking-wider text-[#ea580c] uppercase">
                    {t.stageThisWay}
                  </span>
                </div>
              </div>

              {/* Stall / Orchestra Section */}
              {Object.keys(stallRows).length > 0 && (
                <div className="space-y-2 bg-[#0a0e17] p-3.5 rounded-xl border border-[#243044]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#243044]">
                    <span className="text-xs font-semibold text-[#ea580c] uppercase tracking-wide">
                      {language === 'mr' ? stallSection?.nameMr || 'स्टॉल' : stallSection?.name || 'Stall Floor'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      ₹{((stallSection?.basePrice || 35000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2">
                    {Object.entries(stallRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        <span className="w-5 text-xs font-semibold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-[#1e293b] border border-[#334155] hover:border-[#ea580c] text-slate-300';
                            if (isSelected) {
                              seatStyle = 'bg-[#ea580c] border-[#ea580c] text-white font-bold shadow-sm';
                            } else if (isBooked) {
                              seatStyle = 'bg-[#1e293b]/40 border-[#243044] text-slate-600 cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-400 cursor-not-allowed';
                            } else if (seat.isAccessible) {
                              seatStyle = 'bg-blue-950/40 border-blue-500 text-blue-300 hover:border-blue-400';
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeatSelection(seat)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[10px] sm:text-xs flex items-center justify-center transition-all duration-150 active:scale-90 ${seatStyle}`}
                                title={`${seat.seatCode} (₹${((seat.price || 35000) / 100).toFixed(0)})`}
                              >
                                {isSelected ? '✓' : seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs font-semibold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balcony Section */}
              {Object.keys(balconyRows).length > 0 && (
                <div className="space-y-2 bg-[#0a0e17] p-3.5 rounded-xl border border-[#243044] mt-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#243044]">
                    <span className="text-xs font-semibold text-[#ea580c] uppercase tracking-wide">
                      {language === 'mr' ? balconySection?.nameMr || 'बाल्कनी' : balconySection?.name || 'Balcony Lounge'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      ₹{((balconySection?.basePrice || 50000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2">
                    {Object.entries(balconyRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        <span className="w-5 text-xs font-semibold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-[#1e293b] border border-[#334155] hover:border-[#ea580c] text-slate-300';
                            if (isSelected) {
                              seatStyle = 'bg-[#ea580c] border-[#ea580c] text-white font-bold shadow-sm';
                            } else if (isBooked) {
                              seatStyle = 'bg-[#1e293b]/40 border-[#243044] text-slate-600 cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-400 cursor-not-allowed';
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeatSelection(seat)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[10px] sm:text-xs flex items-center justify-center transition-all duration-150 active:scale-90 ${seatStyle}`}
                                title={`${seat.seatCode} (₹${((seat.price || 50000) / 100).toFixed(0)})`}
                              >
                                {isSelected ? '✓' : seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs font-semibold text-slate-400 text-center">
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

        {/* Modal Footer: Selection tray & Checkout button */}
        <div className="p-3.5 sm:p-4 border-t border-[#243044] bg-[#0a0e17] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {language === 'mr' ? 'निवडलेली आसने' : 'Selected Seats'}:
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((s) => (
                    <span
                      key={s.seatId}
                      className="px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] font-semibold text-[11px] border border-[#ea580c]/30"
                    >
                      {s.seatCode}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">
                    {language === 'mr' ? 'कोणतीही जागा निवडली नाही' : 'No seats selected'}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs text-slate-400">{t.grandTotal}:</span>
              <span className="text-base sm:text-lg font-bold text-[#ea580c]">
                ₹{(estTotal / 100).toFixed(0)}
              </span>
            </div>
          </div>

          <button
            disabled={selectedSeatIds.length === 0 || isHolding}
            onClick={handleHoldAndProceed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95"
          >
            {isHolding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>आरक्षित करत आहे...</span>
              </>
            ) : (
              <>
                <span>{t.proceedToCheckout}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
