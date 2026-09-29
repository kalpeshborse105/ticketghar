'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, EventSessionItem, SeatItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Accessibility,
  ArrowRight,
  Ticket,
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
  const fetchSessionSeats = async () => {
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
  };

  useEffect(() => {
    fetchSessionSeats();
  }, [session.id]);

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

      // Success: pass hold token to checkout
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
      // Refresh seat statuses
      fetchSessionSeats();
      setSelectedSeatIds([]);
    } finally {
      setIsHolding(false);
    }
  };

  // Partition seats into Balcony & Stall/Orchestra
  const balconySection = sections.find((s) => s.name.toLowerCase().includes('balcony'));
  const balconySeats = balconySection
    ? seats.filter((s) => s.sectionId === balconySection.id)
    : [];

  const stallSection = sections.find((s) => !s.name.toLowerCase().includes('balcony')) || sections[0];
  const stallSeats = stallSection
    ? seats.filter((s) => s.sectionId === stallSection.id)
    : seats;

  // Group seats by row
  const groupByRow = (seatList: any[]) => {
    const rows: { [key: string]: any[] } = {};
    for (const s of seatList) {
      if (!rows[s.rowLabel]) rows[s.rowLabel] = [];
      rows[s.rowLabel].push(s);
    }
    // Sort each row by seat number
    for (const r in rows) {
      rows[r].sort((a, b) => a.seatNumber - b.seatNumber);
    }
    return rows;
  };

  const balconyRows = groupByRow(balconySeats);
  const stallRows = groupByRow(stallSeats);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white font-serif">
                {language === 'mr' ? event.titleMr : event.title}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
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
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seat Legend */}
        <div className="px-5 py-3 bg-slate-950/30 border-b border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-800" />
            <span>{t.available}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-[10px]">
              ✓
            </div>
            <span>{t.selected}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-600/30 border border-amber-500/50 flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
            </div>
            <span>{t.held}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-700 opacity-40 cursor-not-allowed" />
            <span>{t.sold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-blue-500 bg-blue-900/40 flex items-center justify-center">
              <Accessibility className="w-2.5 h-2.5 text-blue-400" />
            </div>
            <span>{t.accessible}</span>
          </div>
        </div>

        {/* Scrollable Seat Grid Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">आसनव्यवस्था तपासत आहे... (Loading Seat Map)</p>
            </div>
          ) : (
            <>
              {/* Stage Visual */}
              <div className="w-full flex flex-col items-center mb-6">
                <div className="w-3/4 h-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-t-full shadow-lg shadow-amber-500/20" />
                <div className="w-3/4 py-1.5 bg-slate-950 border-x border-b border-amber-500/30 rounded-b-xl text-center">
                  <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                    {t.stageThisWay}
                  </span>
                </div>
              </div>

              {/* Stall / Orchestra Section */}
              {Object.keys(stallRows).length > 0 && (
                <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {language === 'mr' ? stallSection?.nameMr || 'स्टॉल' : stallSection?.name || 'Stall Floor'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      ₹{((stallSection?.basePrice || 35000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-2">
                    {Object.entries(stallRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2 sm:gap-3">
                        <span className="w-5 text-xs font-extrabold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-300';
                            if (isSelected) {
                              seatStyle = 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30';
                            } else if (isBooked) {
                              seatStyle = 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-400 cursor-not-allowed';
                            } else if (seat.isAccessible) {
                              seatStyle = 'bg-blue-950/30 border-blue-500/70 text-blue-300 hover:border-blue-400';
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeatSelection(seat)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs flex items-center justify-center transition-all transform active:scale-95 ${seatStyle}`}
                                title={`${seat.seatCode} (₹${((seat.price || 35000) / 100).toFixed(0)})`}
                              >
                                {isSelected ? '✓' : seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs font-extrabold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balcony Section */}
              {Object.keys(balconyRows).length > 0 && (
                <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {language === 'mr' ? balconySection?.nameMr || 'बाल्कनी' : balconySection?.name || 'Balcony Lounge'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      ₹{((balconySection?.basePrice || 50000) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-2">
                    {Object.entries(balconyRows).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2 sm:gap-3">
                        <span className="w-5 text-xs font-extrabold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.seatId);
                            const isBooked = seat.status === 'booked';
                            const isHeld = seat.status === 'held' && !isSelected;

                            let seatStyle = 'bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-300';
                            if (isSelected) {
                              seatStyle = 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30';
                            } else if (isBooked) {
                              seatStyle = 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed';
                            } else if (isHeld) {
                              seatStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-400 cursor-not-allowed';
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeatSelection(seat)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs flex items-center justify-center transition-all transform active:scale-95 ${seatStyle}`}
                                title={`${seat.seatCode} (₹${((seat.price || 50000) / 100).toFixed(0)})`}
                              >
                                {isSelected ? '✓' : seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs font-extrabold text-slate-400 text-center">
                          {rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer: Selection tray & Checkout button */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30"
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
              <span className="text-lg sm:text-xl font-extrabold text-amber-400">
                ₹{(estTotal / 100).toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400">
                (शुल्क व करासह / incl. convenience fee & GST)
              </span>
            </div>
          </div>

          <button
            disabled={selectedSeatIds.length === 0 || isHolding}
            onClick={handleHoldAndProceed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm shadow-xl transition cursor-pointer"
          >
            {isHolding ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
