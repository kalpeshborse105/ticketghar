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
      <div className="relative w-full max-w-4xl bg-white border border-[#e5e7eb] rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">
                {language === 'mr' ? event.titleMr : event.title}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-semibold border border-[#6366f1]/30">
                {language === 'mr' ? event.categoryMr : event.category}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
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
            className="p-1.5 rounded-lg bg-[#f5f5f5] text-[#6b7280] hover:text-[#111827] border border-[#e5e7eb] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seat Legend */}
        <div className="px-4 py-2.5 bg-[#fafafa] border-b border-[#e5e7eb] flex flex-wrap items-center justify-center gap-3.5 text-xs text-[#111827]">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-white border border-[#d1d5db]" />
            <span>{t.available}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#6366f1] flex items-center justify-center text-white font-bold text-[9px]">
              ✓
            </div>
            <span>{t.selected}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-amber-600" />
            </div>
            <span>{t.held}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#e5e7eb] opacity-60" />
            <span>{t.sold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-blue-400 bg-blue-50 flex items-center justify-center">
              <Accessibility className="w-2.5 h-2.5 text-blue-600" />
            </div>
            <span>{t.accessible}</span>
          </div>
        </div>

        {/* Scrollable Seat Grid Container */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-6 bg-[#fafafa]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6b7280] gap-3">
              <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">आसनव्यवस्था तपासत आहे... (Loading Seat Map)</p>
            </div>
          ) : (
            <div className="min-w-[480px]">
              {/* Stage Visual */}
              <div className="w-full flex flex-col items-center mb-6">
                <div className="w-3/4 h-2 bg-[#6366f1] rounded-t-full shadow-sm" />
                <div className="w-3/4 py-1 bg-white border-x border-b border-[#e5e7eb] rounded-b-lg text-center shadow-sm">
                  <span className="text-[11px] font-semibold tracking-wider text-[#6366f1] uppercase">
                    {t.stageThisWay}
                  </span>
                </div>
              </div>

              {/* Stall / Orchestra Section */}
              {Object.keys(stallRows).length > 0 && (
                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-[#e5e7eb] shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
                    <span className="text-xs font-semibold text-[#6366f1] uppercase tracking-wide">
                      {language === 'mr' ? stallSection?.nameMr || 'स्टॉल' : stallSection?.name || 'Stall Floor'}
                    </span>
                    <span className="text-xs font-medium text-[#6b7280]">
                      ₹{((stallSection?.basePrice || 35000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2">
                    {Object.entries(stallRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        <span className="w-5 text-xs font-semibold text-[#6b7280] text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-white border border-[#d1d5db] hover:border-[#6366f1] text-[#111827]';
                            if (isSelected) {
                              seatStyle = 'bg-[#6366f1] border-[#6366f1] text-white font-bold shadow-sm';
                            } else if (isBooked) {
                              seatStyle = 'bg-[#e5e7eb] border-[#e5e7eb] text-[#9ca3af] cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-100 border-amber-400 text-amber-700 cursor-not-allowed';
                            } else if (seat.isAccessible) {
                              seatStyle = 'bg-blue-50 border-blue-400 text-blue-700 hover:border-blue-500';
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
                        <span className="w-5 text-xs font-semibold text-[#6b7280] text-center">
                          {rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balcony Section */}
              {Object.keys(balconyRows).length > 0 && (
                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-[#e5e7eb] shadow-sm mt-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
                    <span className="text-xs font-semibold text-[#6366f1] uppercase tracking-wide">
                      {language === 'mr' ? balconySection?.nameMr || 'बाल्कनी' : balconySection?.name || 'Balcony Lounge'}
                    </span>
                    <span className="text-xs font-medium text-[#6b7280]">
                      ₹{((balconySection?.basePrice || 50000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2">
                    {Object.entries(balconyRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        <span className="w-5 text-xs font-semibold text-[#6b7280] text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-white border border-[#d1d5db] hover:border-[#6366f1] text-[#111827]';
                            if (isSelected) {
                              seatStyle = 'bg-[#6366f1] border-[#6366f1] text-white font-bold shadow-sm';
                            } else if (isBooked) {
                              seatStyle = 'bg-[#e5e7eb] border-[#e5e7eb] text-[#9ca3af] cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-100 border-amber-400 text-amber-700 cursor-not-allowed';
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
                        <span className="w-5 text-xs font-semibold text-[#6b7280] text-center">
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
        <div className="p-3.5 sm:p-4 border-t border-[#e5e7eb] bg-[#fafafa] flex flex-col sm:flex-row items-center justify-between gap-3 safe-bottom">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">
                {language === 'mr' ? 'निवडलेली आसने' : 'Selected Seats'}:
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((s) => (
                    <span
                      key={s.seatId}
                      className="px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-semibold text-[11px] border border-[#6366f1]/30"
                    >
                      {s.seatCode}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#9ca3af]">
                    {language === 'mr' ? 'कोणतीही जागा निवडली नाही' : 'No seats selected'}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs text-[#6b7280]">{t.grandTotal}:</span>
              <span className="text-base sm:text-lg font-bold text-[#6366f1]">
                ₹{(estTotal / 100).toFixed(0)}
              </span>
            </div>
          </div>

          <button
            disabled={selectedSeatIds.length === 0 || isHolding}
            onClick={handleHoldAndProceed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95"
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
