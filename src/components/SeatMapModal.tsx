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
    holdToken?: string;
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5 * 60); // 5 min hold window
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleRequestClose = () => {
    if (selectedSeatIds.length > 0) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const touchStartDistRef = React.useRef<number | null>(null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.8, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.75, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => setZoomLevel(1);

  // Countdown timer ticking down
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    const str = `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
    return language === 'mr' ? `${toMarathiDigits(str)} मि.` : `${str} min`;
  };

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
    if (s.price && typeof s.price === 'number') return s.price;
    const sec = sections.find((sec) => sec.id === s.sectionId);
    if (sec?.price && typeof sec.price === 'number') return sec.price;
    if (sec?.basePrice && typeof sec.basePrice === 'number') return sec.basePrice;
    return 40000;
  };

  const subtotalPaise = selectedSeats.reduce((sum: number, s: any) => sum + getSeatPricePaise(s), 0);
  const subtotalRupees = Math.round(subtotalPaise / 100);

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
        holdToken: data.holdToken || data.hold?.holdToken,
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

  // Group seats by sections dynamically using authoritative DB sections and prices
  const displaySections = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections
        .map((sec) => {
          const secSeats = seats.filter((s) => s.sectionId === sec.id);
          const effectivePricePaise =
            secSeats.find((s) => s.price)?.price || sec.price || sec.basePrice || 40000;
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

    // Logical fallback if sections array is not provided
    const defaultSections = [
      {
        id: 1,
        name: 'Balcony',
        nameMr: language === 'mr' ? 'बालकनी (Balcony)' : 'Balcony',
        pricePaise: 50000,
        priceRupees: 500,
        seats: seats.slice(0, 24),
        rows: groupByRow(seats.slice(0, 24)),
      },
      {
        id: 2,
        name: 'Stall A',
        nameMr: language === 'mr' ? 'प्रथम वर्ग (Stall A)' : 'Stall A',
        pricePaise: 40000,
        priceRupees: 400,
        seats: seats.slice(24, 56),
        rows: groupByRow(seats.slice(24, 56)),
      },
      {
        id: 3,
        name: 'Stall B',
        nameMr: language === 'mr' ? 'द्वितीय वर्ग (Stall B)' : 'Stall B',
        pricePaise: 30000,
        priceRupees: 300,
        seats: seats.slice(56),
        rows: groupByRow(seats.slice(56)),
      },
    ].filter((sec) => sec.seats.length > 0);

    return defaultSections;
  }, [sections, seats, language]);

  // Compute dynamic min & max price across all available sections/seats
  const pricesList = displaySections.map((s) => s.priceRupees);
  const minPrice = pricesList.length > 0 ? Math.min(...pricesList) : 300;
  const maxPrice = pricesList.length > 0 ? Math.max(...pricesList) : 500;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:max-h-[94vh] border border-slate-200">
        
        {/* Stitch Header */}
        <header className="sticky top-0 z-30 bg-[#FFF7ED]/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleRequestClose}
              aria-label="Back"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#141B2B] hover:bg-orange-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-lg text-[#EA580C] tracking-tight shrink-0">महाटिकिट</span>
              <span className="text-slate-300 shrink-0">|</span>
              <h1 className="font-bold text-sm sm:text-base text-[#141B2B] truncate">
                {language === 'mr' ? 'आसन व्यवस्था' : 'Seat Selection'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-[#EA580C] bg-orange-100/90 border border-orange-200 px-2.5 py-1 rounded-full">
              {language === 'mr' ? 'थेट निवड' : 'Live'}
            </span>
          </div>
        </header>

        {/* Show & Venue Context Card (Stitch) */}
        <div className="bg-[#FFF7ED] px-4 py-3 border-b border-orange-100">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-200 aspect-[2/3]">
              <img
                src={event.posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=400&q=80'}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-[#EA580C] text-white text-[9px] px-1 py-0.2 rounded font-bold">
                नाटक
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'जलद भरणारे (Fast Filling)' : 'Fast Filling'}
                </span>
              </div>
              <h2 className="font-bold text-sm sm:text-base text-[#141B2B] truncate leading-tight">
                {language === 'mr' ? event.titleMr || event.title : event.title}
              </h2>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                प्रसाद ओक • मुक्ता बर्वे
              </p>
              <div className="flex items-center gap-2 text-slate-500 mt-1 text-[11px]">
                <span className="text-[#EA580C] font-semibold">
                  {session?.sessionStartTime
                    ? `${new Date(session.sessionStartTime).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })} • ${new Date(session.sessionStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : (language === 'mr' ? 'वेळापत्रक उपलब्ध' : 'Schedule available')}
                </span>
                <span>•</span>
                <span className="truncate">{venueData?.nameMr || venueData?.name || event.venue?.name || 'बाळ गंधर्व रंगमंदिर, पुणे'}</span>
              </div>
            </div>
          </div>

          {/* Countdown Timer Pill */}
          <div className="mt-2.5 bg-white rounded-full px-3 py-1.5 flex items-center justify-between border border-orange-200/60 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#EA580C] font-semibold">
              <Timer className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'तिकीट राखीव राहतील:' : 'Seats reserved for:'}</span>
            </div>
            <div className="text-xs font-bold text-[#EA580C] tabular-nums font-mono">
              {formatCountdown(countdownSeconds)}
            </div>
          </div>
        </div>

        {/* Legend Indicator Bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-around text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-t-xs rounded-b-sm bg-white border border-slate-300 shadow-2xs inline-block"></span>
            <span>
              {minPrice === maxPrice
                ? language === 'mr'
                  ? `उपलब्ध (₹${toMarathiDigits(minPrice)})`
                  : `Available (₹${minPrice})`
                : language === 'mr'
                  ? `उपलब्ध (₹${toMarathiDigits(minPrice)} - ₹${toMarathiDigits(maxPrice)})`
                  : `Available (₹${minPrice} - ₹${maxPrice})`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-t-xs rounded-b-sm bg-[#EA580C] text-white flex items-center justify-center font-bold text-[10px]">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span className="text-slate-900 font-bold">{language === 'mr' ? 'निवडलेले' : 'Selected'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-t-xs rounded-b-sm bg-slate-200 opacity-80 inline-block"></span>
            <span>{language === 'mr' ? 'आरक्षित' : 'Occupied'}</span>
          </div>
        </div>

        {/* Warning Notification if > 5 seats attempted */}
        {warningMessage && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
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

        {/* Interactive Stage & Seating Hall */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-[#FAFAFA] relative space-y-6">
          {/* Floating Zoom Bar */}
          <div className="sticky top-2 z-20 flex justify-end px-2 pointer-events-none mb-[-36px]">
            <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-2xl border border-slate-200 shadow-sm text-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.75}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[11px] font-mono font-bold hover:bg-slate-100 rounded transition"
                title="Reset 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 1.8}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                {language === 'mr' ? 'सभागृह आसन व्यवस्था लोड होत आहे...' : 'Loading seating plan...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-medium text-slate-800">{error}</p>
              <button
                onClick={fetchSessionSeats}
                className="px-4 py-1.5 rounded-lg bg-[#EA580C] text-white text-xs font-bold shadow-sm hover:bg-[#C2410C]"
              >
                {language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Try Again'}
              </button>
            </div>
          ) : (
            <div
              className="space-y-6 max-w-md mx-auto transition-transform duration-150 ease-out origin-top pb-10"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Curved Theatre Stage Indicator (Stitch Exact) */}
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto mb-4">
                <div className="relative w-full flex flex-col items-center">
                  <svg className="w-64 h-9 drop-shadow-[0_4px_10px_rgba(234,88,12,0.22)]" fill="none" viewBox="0 0 320 38">
                    <path className="text-[#FD6B36]" d="M 10,34 Q 160,2 310,34" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                    <path className="text-[#FFB599]" d="M 25,36 Q 160,8 295,36" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5"></path>
                  </svg>
                  <div className="flex items-center gap-1.5 text-[#EA580C] -mt-1 font-bold text-xs tracking-widest uppercase">
                    <span>रंगमंच / STAGE (समोर)</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5">पडदा क्रमांक १ • प्रेक्षक समोर</span>
              </div>

              {/* Dynamic Venue Sections — Authoritative Tier Prices from Database */}
              {displaySections.map((sec, secIdx) => {
                const isOrangeTheme = secIdx % 2 === 0;
                return (
                  <div
                    key={sec.id}
                    className={`rounded-xl p-3 shadow-xs border ${
                      isOrangeTheme
                        ? 'bg-[#FFF7ED] border-orange-100'
                        : 'bg-[#F8FAFC] border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#141B2B]">
                          {sec.nameMr}
                        </span>
                      </div>
                      <span
                        className={`bg-white font-bold text-[11px] px-2 py-0.5 rounded-full shadow-2xs border ${
                          isOrangeTheme
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
                      {Object.entries(sec.rows).map(([rowLabel, rowSeats]) => {
                        const half = Math.ceil(rowSeats.length / 2);
                        const leftWing = rowSeats.slice(0, half);
                        const rightWing = rowSeats.slice(half);

                        return (
                          <div key={rowLabel} className="flex items-center justify-between text-xs">
                            <span className="w-4 font-bold text-slate-500 text-center">{rowLabel}</span>
                            <div className="flex gap-1.5">
                              {leftWing.map((seat) => renderSeatBtn(seat))}
                            </div>
                            {rightWing.length > 0 && (
                              <div className="w-3 text-slate-400 text-[10px] font-mono select-none">।</div>
                            )}
                            <div className="flex gap-1.5">
                              {rightWing.map((seat) => renderSeatBtn(seat))}
                            </div>
                            <span className="w-4 font-bold text-slate-500 text-center">{rowLabel}</span>
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

        {/* Sticky Bottom Summary Drawer & Action Bar (Stitch Exact) */}
        <div className="sticky bottom-0 left-0 w-full bg-white/95 backdrop-blur-md shadow-[0_-6px_20px_rgba(0,0,0,0.08)] px-4 py-3 border-t border-slate-200 z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            {/* Left: Seats & Price Breakdown */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
                <span className="text-xs sm:text-sm font-bold text-[#141B2B] truncate">
                  {selectedSeatIds.length > 0
                    ? `${toMarathiDigits(selectedSeatIds.length)} आसने (${selectedSeats.map((s) => s.seatCode).join(', ')})`
                    : 'कोणतेही आसन निवडलेले नाही'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#EA580C] tabular-nums font-mono">
                  ₹{toMarathiDigits(subtotalRupees)}
                </span>
                <span className="text-[11px] text-slate-500">
                  + जीएसटी (GST)
                </span>
              </div>
            </div>

            {/* Right: Primary Call to Action */}
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
    const isBooked = seat.status === 'booked';
    const isHeld = seat.status === 'held' && !isSelected;
    const numDisplay = toMarathiDigits(seat.seatNumber);

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

