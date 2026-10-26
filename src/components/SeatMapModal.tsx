'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, EventSessionItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Timer,
  Check,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  ShieldCheck,
  Theater,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { AddonSelection } from '@/src/lib/concessions';
import { formatISTTime, formatISTDate } from '@/src/lib/dateUtils';

interface SeatMapModalProps {
  event: EventItem;
  session: EventSessionItem;
  /** All showtimes — enables BookMyShow-style date strip + time chips */
  allSessions?: EventSessionItem[];
  language: Language;
  onClose: () => void;
  onSessionChange?: (session: EventSessionItem) => void;
  onProceedToCheckout: (holdData: {
    sessionId: number;
    seatIds: number[];
    heldSeats: any[];
    faceValueTotal: number;
    holdExpiresAt: string;
    holdToken?: string;
    addons?: AddonSelection[];
  }) => void;
}

const MAX_BOOKING_SEATS = 5;

// Marathi digit mapper
const toMarathiDigits = (val: string | number) => {
  const map: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return String(val).replace(/[0-9]/g, (d) => map[d] || d);
};

// Client hold token persistent across same browser tab/session
function getClientHoldToken(): string {
  if (typeof window === 'undefined') return 'guest-browser';
  try {
    let token = sessionStorage.getItem('mahaticket_browser_hold_token');
    if (!token) {
      token = `guest-browser-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
      sessionStorage.setItem('mahaticket_browser_hold_token', token);
    }
    return token;
  } catch {
    return 'guest-browser';
  }
}

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  event,
  session,
  allSessions,
  language,
  onClose,
  onSessionChange,
  onProceedToCheckout,
}) => {
  const t = translations[language];
  const sessions = (allSessions && allSessions.length > 0 ? allSessions : [session]).filter(Boolean);
  const [activeSession, setActiveSession] = useState<EventSessionItem>(session);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [venueData, setVenueData] = useState<any>(null);
  const [layoutConfig, setLayoutConfig] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5 * 60); // 5 min hold window
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    setActiveSession(session);
    setSelectedSeatIds([]);
    setCountdownSeconds(5 * 60);
  }, [session.id]);

  // Group sessions by calendar date for top date strip
  const dateGroups = React.useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; day: string; month: string; weekday: string; sessions: EventSessionItem[] }
    >();
    sessions.forEach((s) => {
      const d = new Date(s.sessionStartTime);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: d.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
            day: 'numeric',
            month: 'short',
          }),
          day: d.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { day: 'numeric' }),
          month: d.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { month: 'short' }),
          weekday: d.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { weekday: 'short' }),
          sessions: [],
        });
      }
      map.get(key)!.sessions.push(s);
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions, language]);

  const activeDateKey = React.useMemo(() => {
    const d = new Date(activeSession.sessionStartTime);
    return Number.isNaN(d.getTime()) ? dateGroups[0]?.key : d.toISOString().slice(0, 10);
  }, [activeSession.sessionStartTime, dateGroups]);

  const timesForActiveDate = React.useMemo(() => {
    return (dateGroups.find((g) => g.key === activeDateKey)?.sessions || []).slice().sort(
      (a, b) =>
        new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );
  }, [dateGroups, activeDateKey]);

  const switchSession = (next: EventSessionItem) => {
    if (next.id === activeSession.id) return;
    setSelectedSeatIds([]);
    setActiveSession(next);
    setCountdownSeconds(5 * 60);
    onSessionChange?.(next);
  };

  const handleRequestClose = () => {
    if (selectedSeatIds.length > 0) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.55, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => setZoomLevel(1);

  // Countdown timer ticking down
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss warning banner after 6 seconds
  useEffect(() => {
    if (!warningMessage) return;
    const timer = setTimeout(() => {
      setWarningMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [warningMessage]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    const str = `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
    return language === 'mr' ? `${toMarathiDigits(str)} मि.` : `${str} min`;
  };

  // Fetch real-time seat inventory for this session (DB + cache)
  const fetchSessionSeats = useCallback(async (silent = false) => {
    try {
      if (!silent) {
      setLoading(true);
      setError(null);
      }
      const res = await fetch(`/api/sessions/${activeSession.id}/seats?fresh=1`);
      if (!res.ok) {
        if (!silent) throw new Error('Failed to load seat layout');
        return;
      }
      const data = await res.json();
      setVenueData(data.venue);
      setLayoutConfig(data.layoutConfig || data.venue?.layoutConfig || null);
      const incomingSeats = Array.isArray(data.seats) ? data.seats : [];
      setSeats(incomingSeats);
      setSections(Array.isArray(data.sections) ? data.sections : []);

      // If silent background refresh, prune any selected seats that became unavailable
      if (silent) {
        setSelectedSeatIds((prev) =>
          prev.filter((id) => {
            const matched = incomingSeats.find((s: any) => s.seatId === id);
            return matched && matched.status === 'available';
          })
        );
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
      setError(err.message || 'Error loading seats');
      }
    } finally {
      if (!silent) {
      setLoading(false);
      }
    }
  }, [activeSession.id]);

  useEffect(() => {
    fetchSessionSeats(false);
  }, [fetchSessionSeats]);

  // Live sync: refresh seats so another user's hold greys out immediately (same as Android)
  useEffect(() => {
    const poll = setInterval(() => {
      fetchSessionSeats(true);
    }, 8000);
    return () => clearInterval(poll);
  }, [fetchSessionSeats]);

  // Handle seat click
  const toggleSeatSelection = (seat: any) => {
    if (seat.status === 'booked' || seat.status === 'held' || seat.status === 'blocked') return;

    setWarningMessage(null);

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= MAX_BOOKING_SEATS) {
        setWarningMessage(
          language === 'mr'
            ? `एका वेळी जास्तीत जास्त ${MAX_BOOKING_SEATS} जागा निवडता येतील. अधिक जागांसाठी दुसरी ऑर्डर करा.`
            : `Maximum ${MAX_BOOKING_SEATS} seats allowed per booking.`
        );
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
    }
  };

  // Selected seats details
  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.seatId));

  const getSeatPricePaise = (s: any) => {
    if (typeof s.price === 'number' && s.price > 0) return s.price;
    const sec = sections.find((sec) => Number(sec.id) === Number(s.sectionId));
    if (typeof sec?.price === 'number' && sec.price > 0) return sec.price;
    if (typeof sec?.basePrice === 'number' && sec.basePrice > 0) return sec.basePrice;
    return 25000;
  };

  const subtotalPaise = selectedSeats.reduce((sum: number, s: any) => sum + getSeatPricePaise(s), 0);
  const subtotalRupees = Math.round(subtotalPaise / 100);

  // Direct checkout: skips food/addons step completely
  const handleHoldAndProceed = async () => {
    if (selectedSeatIds.length === 0) return;

    try {
      setIsHolding(true);
      setWarningMessage(null);

      const clientToken = getClientHoldToken();

      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          seatIds: selectedSeatIds,
          userIdStr: clientToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (language === 'mr' ? 'आसन आरक्षण कालबाह्य किंवा अनुपलब्ध झाले आहे.' : 'Seat hold expired or unavailable.'));
      }

      // Direct to checkout — NO food or extra addon screen!
      onProceedToCheckout({
        sessionId: activeSession.id,
        seatIds: selectedSeatIds,
        heldSeats:
          data.hold?.heldSeats ||
          selectedSeats.map((s) => ({
            seatId: s.seatId,
            seatCode: s.seatCode,
            price: getSeatPricePaise(s),
            tier: s.tier,
          })),
        faceValueTotal: data.hold?.faceValueTotal || subtotalPaise,
        holdExpiresAt: data.hold?.holdExpiresAt || new Date(Date.now() + 300000).toISOString(),
        holdToken: data.holdToken || data.hold?.holdToken || clientToken,
        addons: [],
      });
    } catch (err: any) {
      console.error('Seat hold notice:', err);
      const isMarathi = language === 'mr';
      const isHeld = err.message?.includes('currently held') || err.message?.includes('आरक्षित');
      const friendlyMsg = isHeld
        ? (isMarathi
            ? 'निवडलेले आसन सध्या दुसऱ्या ग्राहकाकडे आरक्षित आहे. कृपया इतर उपलब्ध आसन निवडा.'
            : (err.message || 'Seat is currently held by another user. Please choose another seat.'))
        : (err.message || (isMarathi ? 'निवडलेली जागा अनुपलब्ध झाली आहे. कृपया नवीन जागा निवडा.' : 'Selected seat(s) became unavailable. Please select another seat.'));

      // Non-destructive notification: do not replace the seating layout with an error screen
      setWarningMessage(friendlyMsg);
      // Silently refresh the seating map so updated DB state reflects on the layout
      await fetchSessionSeats(true);
    } finally {
      setIsHolding(false);
    }
  };

  const groupByRow = (seatList: any[]) => {
    const rows: { [key: string]: any[] } = {};
    seatList.forEach((s) => {
      let row = s.rowLabel || 'A';
      if (row.includes('-')) {
        row = row.split('-').pop() || row;
      }
      if (!rows[row]) rows[row] = [];
      rows[row].push(s);
    });
    Object.keys(rows).forEach((row) => {
      rows[row].sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber));
    });
    return rows;
  };

  // Group seats by sections — guaranteed to show all seats
  const displaySections = React.useMemo(() => {
    let result: any[] = [];
    if (sections && sections.length > 0) {
      result = sections
        .map((sec) => {
          const secSeats = seats.filter((s) => Number(s.sectionId) === Number(sec.id));
          const priced = secSeats.find((s) => typeof s.price === 'number' && s.price > 0);
          const effectivePricePaise =
            priced?.price ||
            (typeof sec.price === 'number' && sec.price > 0 ? sec.price : 0) ||
            (typeof sec.basePrice === 'number' && sec.basePrice > 0 ? sec.basePrice : 0) ||
            25000;
          return {
            id: sec.id,
            name: sec.name,
            nameMr: sec.nameMr || sec.name,
            pricePaise: effectivePricePaise,
            priceRupees: Math.round(effectivePricePaise / 100),
            seats: secSeats,
            rows: groupByRow(secSeats),
          };
        })
        .filter((sec) => sec.seats.length > 0);
    }

    if (result.length > 0) return result;

    // Fallback if section IDs didn't match: group directly by seat inventory sectionId
    const bySection = new Map<number, any[]>();
    seats.forEach((s) => {
      const sid = Number(s.sectionId) || 0;
      if (!bySection.has(sid)) bySection.set(sid, []);
      bySection.get(sid)!.push(s);
    });

    return Array.from(bySection.entries()).map(([id, secSeats]) => {
      const pricePaise =
        secSeats.find((s) => typeof s.price === 'number' && s.price > 0)?.price || 25000;
      return {
        id,
        name: secSeats[0]?.ticketTypeName || `Section ${id}`,
        nameMr: secSeats[0]?.ticketTypeNameMr || secSeats[0]?.ticketTypeName || `विभाग ${id}`,
        pricePaise,
        priceRupees: Math.round(pricePaise / 100),
        seats: secSeats,
        rows: groupByRow(secSeats),
      };
    });
  }, [sections, seats, language]);

  // Compute dynamic min & max price across all available sections/seats
  const pricesList = displaySections.map((s) => s.priceRupees).filter((p) => p > 0);
  const minPrice = pricesList.length > 0 ? Math.min(...pricesList) : 0;
  const maxPrice = pricesList.length > 0 ? Math.max(...pricesList) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[840px] border border-slate-200">

        {/* Compact Modern Header (Space-efficient) */}
        <header className="bg-[#141B2B] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleRequestClose}
              aria-label="Back"
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
            <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#EA580C]">महाटिकिट</span>
                <span className="text-slate-500">|</span>
                <h1 className="font-bold text-sm sm:text-base text-white truncate">
                {language === 'mr' ? event.titleMr || event.title : event.title}
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {venueData?.nameMr || venueData?.name || event.venue?.name || '—'}
              </p>
            </div>
          </div>

          {/* Availability Badge & Countdown Timer Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                <span>{language === 'mr' ? 'तपासत आहे...' : 'Loading...'}</span>
              </div>
            ) : (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>
                  {language === 'mr'
                    ? `उपलब्ध ${toMarathiDigits(seats.filter((s: any) => s.status === 'available').length)} आसने`
                    : `${seats.filter((s: any) => s.status === 'available').length} seats available`}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Compact Date & Showtime Selector Bar */}
        <div className="bg-[#FFF7ED] border-b border-orange-200/60 px-4 py-2 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Date Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {dateGroups.map((g) => {
              const selected = g.key === activeDateKey;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    const first = g.sessions[0];
                    if (first) switchSession(first);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${selected
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-orange-100 hover:bg-orange-50'
                    }`}
                >
                  <span>{g.weekday}</span>
                  <span className="font-extrabold">{g.day}</span>
                  <span>{g.month}</span>
                </button>
              );
            })}

            {/* Time Chips for current date */}
            {timesForActiveDate.map((s) => {
              const selected = s.id === activeSession.id;
              const timeLabel = formatISTTime(s.sessionStartTime, language, true);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => switchSession(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${selected
                    ? 'bg-[#141B2B] text-white'
                    : 'bg-white border border-slate-200 text-[#EA580C] hover:border-[#EA580C]'
                    }`}
                >
                  {timeLabel}
                </button>
              );
            })}
          </div>

          {/* Quick Zoom Bar */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl border border-slate-200 shadow-2xs text-slate-700 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.55}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 text-[11px] font-mono font-bold"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
          <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.0}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
          </button>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="px-4 py-1.5 bg-white border-b border-slate-200 flex items-center justify-around text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-t-xs rounded-b-sm bg-white border border-slate-300 shadow-2xs inline-block"></span>
            <span>{language === 'mr' ? 'उपलब्ध' : 'Available'}</span>
            </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-t-xs rounded-b-sm bg-[#EA580C] text-white flex items-center justify-center font-bold text-[9px]">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span className="text-slate-900 font-bold">{language === 'mr' ? 'निवडलेले' : 'Selected'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-t-xs rounded-b-sm bg-slate-300 opacity-80 inline-block"></span>
            <span>{language === 'mr' ? 'आरक्षित' : 'Occupied'}</span>
          </div>
        </div>

        {/* Warning Notification if > 5 seats attempted */}
        {warningMessage && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warningMessage}</span>
            </div>
            <button onClick={() => setWarningMessage(null)} className="text-amber-800 hover:text-amber-950 font-bold">✕</button>
          </div>
        )}

        {/* Interactive Seating Hall (BookMyShow style: unified auditorium canvas) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-[#F8FAFC] relative touch-pan-x touch-pan-y">
          {/* BMS-style mini overview map (always visible while layout loaded) */}
          {!loading && !error && seats.length > 0 && (
            <div
              className="absolute bottom-4 right-4 z-20 w-[118px] rounded-xl border border-slate-300 bg-white/95 shadow-lg backdrop-blur-sm p-1.5 pointer-events-auto"
              aria-label="Seat map overview"
            >
              <div className="text-[9px] font-bold text-slate-500 tracking-wide uppercase text-center mb-1">
                {language === 'mr' ? 'नकाशा' : 'Map'}
              </div>
              <div className="relative h-[88px] overflow-hidden rounded-md bg-slate-50 border border-slate-200">
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-[2px] p-1 origin-center transition-transform duration-150"
                  style={{ transform: `scale(${Math.min(1, 1 / zoomLevel)})` }}
                >
                  {displaySections.slice(0, 4).map((sec) => {
                    const rowEntries = Object.entries(sec.rows || {}).slice(0, 6);
                    return (
                      <div key={`mini-${sec.id}`} className="flex flex-col gap-[1px] items-center">
                        {rowEntries.map(([rowLabel, rowSeats]: [string, any]) => (
                          <div key={`mini-${sec.id}-${rowLabel}`} className="flex gap-[1px]">
                            {(rowSeats as any[]).slice(0, 14).map((seat: any) => {
                              const selected = selectedSeatIds.includes(seat.id);
                              const busy =
                                seat.status === 'booked' ||
                                seat.status === 'held' ||
                                seat.status === 'blocked';
                              return (
                                <span
                                  key={seat.id}
                                  className={`block w-[3px] h-[3px] rounded-[0.5px] ${
                                    selected
                                      ? 'bg-[#EA580C]'
                                      : busy
                                        ? 'bg-slate-300'
                                        : 'bg-slate-400'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {/* Viewport frame — grows when zoomed in */}
                <div
                  className="absolute border-2 border-[#EA580C] rounded-sm pointer-events-none bg-orange-500/10"
                  style={{
                    left: `${Math.max(4, 50 - 45 / zoomLevel)}%`,
                    top: `${Math.max(4, 50 - 40 / zoomLevel)}%`,
                    width: `${Math.min(92, 90 / zoomLevel)}%`,
                    height: `${Math.min(92, 80 / zoomLevel)}%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleResetZoom}
                className="mt-1 w-full text-[9px] font-bold text-[#EA580C] hover:underline"
              >
                {language === 'mr' ? 'रीसेट' : 'Reset view'}
              </button>
            </div>
          )}
          {loading ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="w-10 h-10 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                {language === 'mr' ? 'सभागृह आसन व्यवस्था लोड होत आहे...' : 'Loading seating plan...'}
              </p>
            </div>
          ) : error ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center space-y-3 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-medium text-slate-800">{error}</p>
              <button
                onClick={() => fetchSessionSeats(false)}
                className="px-4 py-1.5 rounded-lg bg-[#EA580C] text-white text-xs font-bold shadow-sm hover:bg-[#C2410C]"
              >
                {language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Try Again'}
              </button>
            </div>
          ) : (
            <div
              className="space-y-6 min-w-max mx-auto transition-transform duration-150 ease-out origin-top pb-12 px-6"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Curved Theatre Stage Indicator */}
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto mb-5">
                <div className="relative w-full flex flex-col items-center">
                  <svg className="w-72 h-10 drop-shadow-[0_4px_12px_rgba(234,88,12,0.25)]" fill="none" viewBox="0 0 320 38">
                    <path className="text-[#FD6B36]" d="M 10,34 Q 160,2 310,34" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                    <path className="text-[#FFB599]" d="M 25,36 Q 160,8 295,36" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5"></path>
                  </svg>
                  <div className="flex items-center gap-1.5 text-[#EA580C] -mt-1 font-bold text-xs tracking-widest uppercase">
                    <span>रंगमंच / STAGE (समोर)</span>
                </div>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5">पडदा क्रमांक १ • प्रेक्षक समोर</span>
              </div>

              {/* Dynamic Venue Sections */}
              {displaySections.map((sec, secIdx) => {
                const isOrangeTheme = secIdx % 2 === 0;
                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl p-4 shadow-xs border ${isOrangeTheme
                      ? 'bg-[#FFF7ED] border-orange-100'
                      : 'bg-white border-slate-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="font-bold text-xs sm:text-sm text-[#141B2B]">
                        {sec.nameMr}
                    </span>
                      <span
                        className={`bg-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs border ${isOrangeTheme
                          ? 'text-[#EA580C] border-orange-200'
                          : 'text-slate-700 border-slate-200'
                          }`}
                      >
                        {language === 'mr'
                          ? `₹${toMarathiDigits(sec.priceRupees)} प्रति आसन`
                          : `₹${sec.priceRupees} per seat`}
                  </span>
                </div>

                    <div className="space-y-2 text-center">
                      {Object.entries(sec.rows)
                        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                        .map(([rowLabel, rowSeats]: [string, any]) => {
                          const sorted = [...rowSeats].sort(
                            (a, b) => Number(a.seatNumber) - Number(b.seatNumber)
                          );
                          const aisleIndex = Math.floor(sorted.length / 2);

                          return (
                            <div key={rowLabel} className="flex items-center justify-center gap-1.5 text-xs py-0.5 whitespace-nowrap shrink-0">
                              <span className="w-5 shrink-0 font-bold text-slate-400 text-center text-[11px]">
                                {rowLabel}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {sorted.map((seat, seatIdx) => (
                                  <React.Fragment key={seat.seatId}>
                                    {renderSeatBtn(seat)}
                                    {sorted.length >= 6 && seatIdx === aisleIndex - 1 && (
                                      <div className="w-3 sm:w-4 shrink-0 text-slate-300 text-[10px] font-mono select-none" title="Aisle">
                                        ║
                                      </div>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                              <span className="w-5 shrink-0 font-bold text-slate-400 text-center text-[11px]">
                                {rowLabel}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                            );
                          })}

              {/* Cultural Assurance Pill */}
              <div className="pt-2 flex items-center justify-center gap-1.5 text-center text-slate-600 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>महाराष्ट्राचे अधिकृत थेट तिकीट आरक्षण • १००% सुरक्षित पेमेंट</span>
                </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Drawer (Stitch Exact) */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-40 shrink-0">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Selected Seats Summary */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
                <span className="text-xs sm:text-sm font-bold text-[#141B2B] truncate">
                  {selectedSeatIds.length > 0
                    ? language === 'mr'
                      ? `${toMarathiDigits(selectedSeatIds.length)} आसने (${selectedSeats
                        .map((s) => `${s.seatCode} ₹${toMarathiDigits(Math.round(getSeatPricePaise(s) / 100))}`)
                        .join(', ')})`
                      : `${selectedSeatIds.length} seats (${selectedSeats
                        .map((s) => `${s.seatCode} ₹${Math.round(getSeatPricePaise(s) / 100)}`)
                        .join(', ')})`
                    : language === 'mr'
                      ? 'कोणतेही आसन निवडलेले नाही'
                      : 'No seats selected'}
                      </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#EA580C] tabular-nums font-mono">
                  ₹{language === 'mr' ? toMarathiDigits(subtotalRupees) : subtotalRupees}
                </span>
                <span className="text-[11px] text-slate-500">
                  {language === 'mr' ? '+ जीएसटी (GST)' : '+ GST'}
                </span>
              </div>
          </div>

            {/* Right: Proceed Directly to Checkout Button */}
          <button
            disabled={selectedSeatIds.length === 0 || isHolding}
            onClick={handleHoldAndProceed}
              className="h-11 px-6 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            {isHolding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>आरक्षित करत आहे...</span>
              </>
            ) : (
              <>
                  <span>पुढे जा</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        </div>

        {/* Discard Seat Selection Confirmation Modal */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-1.5 text-center">
                <h3 className="text-base font-bold text-[#141B2B]">
                  {language === 'mr' ? 'बुकिंग रद्द करायची आहे का?' : 'Cancel seat selection?'}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {language === 'mr'
                    ? 'तुम्ही मागे गेल्यास तुमची निवडलेली आसने मुक्त केली जातील आणि इतरांसाठी त्वरित उपलब्ध होतील.'
                    : 'If you leave, your selected seats will be released and made available to other users.'}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#141B2B] hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === 'mr' ? 'नाही, सुरू ठेवा' : 'Stay'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setSelectedSeatIds([]);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                >
                  {language === 'mr' ? 'होय, रद्द करा' : 'Yes, discard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper renderer for individual seat button
  function renderSeatBtn(seat: any) {
    const isSelected = selectedSeatIds.includes(seat.seatId);
    const isBooked = seat.status === 'booked' || seat.status === 'blocked';
    const isHeld = seat.status === 'held' && !isSelected;
    const rawNum = String(seat.seatNumber ?? seat.seatCode?.replace(/\D/g, '') ?? '');
    const numDisplay = language === 'mr' ? toMarathiDigits(rawNum) : rawNum;

    if (isBooked || isHeld) {
      return (
        <button
          key={seat.seatId}
          disabled
          className="w-6 h-6 rounded-t-xs rounded-b-sm bg-slate-200 text-[10px] text-slate-400 cursor-not-allowed flex items-center justify-center font-mono"
        >
          {numDisplay}
        </button>
      );
    }

    if (isSelected) {
      return (
        <button
          key={seat.seatId}
          onClick={() => toggleSeatSelection(seat)}
          className="w-6 h-6 rounded-t-xs rounded-b-sm bg-[#EA580C] text-white text-[10px] font-bold shadow-md ring-2 ring-orange-300 ring-offset-1 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      );
    }

    return (
      <button
        key={seat.seatId}
        onClick={() => toggleSeatSelection(seat)}
        className="w-6 h-6 rounded-t-xs rounded-b-sm bg-white border border-slate-200 text-[10px] text-slate-800 font-semibold shadow-2xs hover:border-[#EA580C] active:scale-95 transition-transform flex items-center justify-center font-mono cursor-pointer"
      >
        {numDisplay}
      </button>
    );
  }
};
