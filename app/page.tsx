'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { translations } from '@/src/lib/i18n';
import { Language, EventCategory, EventItem, EventSessionItem } from '@/src/lib/types';
import { Header } from '@/src/components/Header';
import { EventCard } from '@/src/components/EventCard';
import { SeatMapModal } from '@/src/components/SeatMapModal';
import { CheckoutDrawer } from '@/src/components/CheckoutDrawer';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import { MyTicketsView } from '@/src/components/MyTicketsView';
import { PartnerWithUsModal } from '@/src/components/PartnerWithUsModal';
import { AuthModal } from '@/src/components/AuthModal';
import { MTBottomNavigation, NavTab } from '@/src/components/ui/MTBottomNavigation';
import { MTSkeleton, MTEventCardSkeleton } from '@/src/components/ui/MTSkeleton';
import { MTEmptyState } from '@/src/components/ui/MTEmptyState';
import { MTToastContainer, ToastMessage } from '@/src/components/ui/MTToast';
import { useOnlineStatus } from '@/hooks/use-pwa';
import {
  Sparkles,
  Theater,
  Music,
  Smile,
  Film,
  Compass,
  Trophy,
  Palette,
  AlertTriangle,
  RefreshCw,
  Building2,
  Tag,
  ShieldCheck,
  MapPin,
  Ticket,
} from 'lucide-react';


const CATEGORIES: { id: EventCategory; labelEn: string; labelMr: string; icon: any }[] = [
  { id: 'all', labelEn: 'All Experiences', labelMr: 'सर्व कार्यक्रम', icon: Sparkles },
  { id: 'plays', labelEn: 'Plays & Theatre', labelMr: 'नाटक', icon: Theater },
  { id: 'music', labelEn: 'Music & Concerts', labelMr: 'संगीत व मैफिली', icon: Music },
  { id: 'comedy', labelEn: 'Standup Comedy', labelMr: 'स्टँडअप कॉमेडी', icon: Smile },
  { id: 'cultural', labelEn: 'Cultural & Festivals', labelMr: 'सांस्कृतिक महोत्सव', icon: Compass },
  { id: 'workshops', labelEn: 'Workshops', labelMr: 'कार्यशाळा', icon: Palette },
  { id: 'movies', labelEn: 'Movies', labelMr: 'चित्रपट', icon: Film },
  { id: 'sports', labelEn: 'Sports', labelMr: 'क्रीडा', icon: Trophy },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<Language>('mr');
  const t = translations[language];
  const isOnline = useOnlineStatus();

  // Navigation and Filtering State
  const [selectedCity, setSelectedCity] = useState('महाराष्ट्र (All)');
  const [cityDetected, setCityDetected] = useState(false);
  const [detectedCityName, setDetectedCityName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('home');

  // Price range & Date filter state
  const [priceRange, setPriceRange] = useState<number>(2000);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Events Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Surface view controllers
  const [viewState, setViewState] = useState<'home' | 'my_tickets' | 'offers' | 'profile'>('home');
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Booking Flow State
  const [selectedEventForBooking, setSelectedEventForBooking] = useState<EventItem | null>(null);
  const [selectedSessionForBooking, setSelectedSessionForBooking] = useState<EventSessionItem | null>(null);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [checkoutHoldData, setCheckoutHoldData] = useState<any | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBookingResult, setConfirmedBookingResult] = useState<any | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc'>('date');

  useEffect(() => {
    setMounted(true);

    // Fetch public active announcements from admin
    const loadAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (e) {
        console.warn('Failed to load announcements', e);
      }
    };
    loadAnnouncements();

    // IP-based city auto-detection (like BookMyShow)
    const detectCity = async () => {
      try {
        const savedCity = typeof window !== 'undefined' ? localStorage.getItem('mahaticket_user_city') : null;
        if (savedCity && savedCity !== 'महाराष्ट्र (All)') {
          setSelectedCity(savedCity);
          return;
        }
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const geo = await res.json();
          const ipCity = geo.city || '';
          const MAHARASHTRA_CITIES: Record<string, string> = {
            'Pune': 'Pune', 'Pimpri': 'Pune', 'Pimpri-Chinchwad': 'Pune',
            'Mumbai': 'Mumbai', 'Navi Mumbai': 'Mumbai', 'Thane': 'Thane',
            'Nagpur': 'Nagpur', 'Nashik': 'Nashik', 'Aurangabad': 'Chhatrapati Sambhaji Nagar',
            'Sambhajinagar': 'Chhatrapati Sambhaji Nagar', 'Kolhapur': 'Kolhapur',
            'Solapur': 'Solapur', 'Sangli': 'Sangli', 'Satara': 'Satara',
            'Amravati': 'Amravati', 'Nanded': 'Nanded', 'Ratnagiri': 'Ratnagiri',
            'Jalgaon': 'Jalgaon',
          };
          const matched = Object.entries(MAHARASHTRA_CITIES).find(([key]) =>
            ipCity.toLowerCase().includes(key.toLowerCase())
          );
          if (matched) {
            setSelectedCity(matched[1]);
            setDetectedCityName(matched[1]);
            setCityDetected(true);
            localStorage.setItem('mahaticket_user_city', matched[1]);
            setTimeout(() => setCityDetected(false), 5000);
          }
        }
      } catch {
        // Silently fallback to all Maharashtra
      }
    };
    detectCity();
  }, []);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetFilters = () => {
    setPriceRange(2000);
    setSelectedDate('all');
    setCustomDate('');
    setSelectedCategory('all');
    setSearchQuery('');
    addToast('info', language === 'mr' ? 'फिल्टर रीसेट केले आहेत' : 'Filters reset');
  };

  // Fetch Events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCity && selectedCity !== 'महाराष्ट्र (All)') {
        params.append('city', selectedCity);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (priceRange < 2000) {
        params.append('maxPrice', String(priceRange));
      }
      if (customDate) {
        params.append('date', customDate);
      } else if (selectedDate && selectedDate !== 'all') {
        params.append('date', selectedDate);
      }

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mahaticket_cached_events', JSON.stringify(data.events || []));
        } catch {
          // ignore cache error
        }
      }
    } catch (err: any) {
      console.warn('Network error fetching events:', err);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('mahaticket_cached_events') || localStorage.getItem('ticketghar_cached_events');
        if (cached) {
          try {
            setEvents(JSON.parse(cached));
            setError(null);
            setLoading(false);
            return;
          } catch { }
        }
      }
      setError(err.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCategory, searchQuery, priceRange, selectedDate, customDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Deep-link: /?bookEvent=ID&session=ID opens seat map from event detail
  useEffect(() => {
    if (typeof window === 'undefined' || events.length === 0) return;
    const qs = new URLSearchParams(window.location.search);
    const bookEventId = qs.get('bookEvent');
    const sessionId = qs.get('session');
    if (!bookEventId || !sessionId) return;

    const ev = events.find((e) => String(e.id) === String(bookEventId));
    if (!ev) return;
    const sess =
      (ev.sessions || []).find((s: any) => String(s.id) === String(sessionId)) ||
      ({ id: Number(sessionId) } as any);
    setSelectedEventForBooking(ev);
    setSelectedSessionForBooking(sess);
    setSeatMapOpen(true);
    window.history.replaceState({}, '', '/');
  }, [events]);

  // Handle Bottom Nav Changes
  const handleNavTabChange = (tab: NavTab) => {
    setActiveNavTab(tab);
    if (tab === 'home') {
      setViewState('home');
      setSelectedCategory('all');
    } else if (tab === 'explore') {
      setViewState('home');
    } else if (tab === 'tickets') {
      fetch('/api/auth/flow/session')
        .then((r) => r.json())
        .then((data) => {
          if (!data.user) {
            setAuthModalOpen(true);
          } else {
            setViewState('my_tickets');
          }
        })
        .catch(() => setViewState('my_tickets'));
    } else if (tab === 'offers') {
      setViewState('offers');
    } else if (tab === 'profile') {
      setViewState('profile');
    }
  };

  // Initiate booking from event card
  const handleSelectEvent = (event: EventItem) => {
    setSelectedEventForBooking(event);
    if (event.sessions && event.sessions.length > 0) {
      setSelectedSessionForBooking(event.sessions[0]);
    }
    setSeatMapOpen(true);
  };

  // From Seat Map to Checkout
  const handleProceedToCheckout = (holdData: any) => {
    setCheckoutHoldData(holdData);
    setSeatMapOpen(false);
    setCheckoutOpen(true);
    addToast('success', language === 'mr' ? 'जागा ८ मिनिटांसाठी आरक्षित केल्या आहेत' : 'Seats held for 8 minutes');
  };

  // From Checkout to Success Ticket Pass
  const handleBookingConfirmed = (result: any) => {
    setCheckoutOpen(false);
    setConfirmedBookingResult(result);
    addToast('success', language === 'mr' ? 'तिकीट यशस्वीरीत्या बुक झाले!' : 'Booking confirmed successfully!');
  };

  // Sort events dynamically
  const sortedEvents = React.useMemo(() => {
    const list = [...events];
    if (sortBy === 'price_asc') {
      list.sort((a, b) => {
        const pA = a.sessions?.[0]?.ticketTypes?.[0]?.price || 30000;
        const pB = b.sessions?.[0]?.ticketTypes?.[0]?.price || 30000;
        return pA - pB;
      });
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => {
        const pA = a.sessions?.[0]?.ticketTypes?.[0]?.price || 30000;
        const pB = b.sessions?.[0]?.ticketTypes?.[0]?.price || 30000;
        return pB - pA;
      });
    } else {
      // Default: soonest date
      list.sort((a, b) => {
        const tA = a.sessions?.[0]?.sessionStartTime ? new Date(a.sessions[0].sessionStartTime).getTime() : 0;
        const tB = b.sessions?.[0]?.sessionStartTime ? new Date(b.sessions[0].sessionStartTime).getTime() : 0;
        return tA - tB;
      });
    }
    return list;
  }, [events, sortBy]);

  // Filter theatre/plays events for Marathi spotlight
  const theatreEvents = sortedEvents.filter(
    (e) => e.category === 'plays' || e.title.includes('Sahi')
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827] flex flex-col font-sans selection:bg-[#ea580c] selection:text-white">
      {/* Toast Notifications */}
      <MTToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Offline Status Alert Banner */}
      {mounted && !isOnline && (
        <div className="bg-[#f59e0b] px-4 py-2 text-center text-xs font-bold text-white flex items-center justify-center gap-2 sticky top-0 z-50">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {/* City Auto-Detected Banner — shows after IP detection like BookMyShow */}
      {mounted && cityDetected && detectedCityName && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-center text-xs font-bold text-white flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>📍 आपले शहर आढळले: <strong>{detectedCityName}</strong> — {detectedCityName} मधील कार्यक्रम दाखवत आहे</span>
          <button
            onClick={() => { setSelectedCity('महाराष्ट्र (All)'); localStorage.removeItem('mahaticket_user_city'); setCityDetected(false); }}
            className="ml-2 underline text-orange-100 hover:text-white"
          >
            बदला
          </button>
        </div>
      )}


      <Header
        language={language}
        onLanguageChange={setLanguage}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMyTickets={() => {
          setViewState('my_tickets');
          setActiveNavTab('tickets');
        }}
        onOpenPartnerModal={() => setPartnerModalOpen(true)}
        onHomeClick={() => {
          setViewState('home');
          setActiveNavTab('home');
        }}
        onCategorySelect={(cat) => {
          setViewState('home');
          setSelectedCategory(cat as EventCategory);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-6">
        {viewState === 'my_tickets' ? (
          <MyTicketsView
            language={language}
            onBack={() => {
              setViewState('home');
              setActiveNavTab('home');
            }}
            onViewTicket={(data) => setConfirmedBookingResult(data)}
          />
        ) : viewState === 'offers' ? (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#ea580c]" />
              <span>{language === 'mr' ? 'विशेष सवलती व ऑफर्स' : 'Special Offers & Promo Codes'}</span>
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-[#ea580c]">MAHA50</span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200">सक्रिय (Active)</span>
                </div>
                <p className="text-sm text-[#111827]">₹५० थेट सवलत</p>
                <p className="text-xs text-[#6b7280]">किमान ₹३०० च्या बुकिंगवर लागू. चेकआउट दरम्यान कूपन लागू करा.</p>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-[#ea580c]">NATAK10</span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200">सक्रिय (Active)</span>
                </div>
                <p className="text-sm text-[#111827]">१०% सवलत (कमाल ₹१०० पर्यंत)</p>
                <p className="text-xs text-[#6b7280]">मराठी नाटके व संगीत मैफिलींवर उपलब्ध.</p>
              </div>
            </div>
          </div>
        ) : viewState === 'profile' ? (
          <div className="max-w-md mx-auto px-4 py-10 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f5] border border-[#e5e7eb] flex items-center justify-center mx-auto text-[#ea580c]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">महाटिकिट वापरकर्ता खाते</h2>
              <p className="text-xs text-[#6b7280] mt-1">आपली बुक केलेली सर्व तिकिटे आपल्या फोनवर उपलब्ध आहेत.</p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 text-left space-y-3 shadow-sm">
              <div className="flex justify-between text-xs">
                <span className="text-[#6b7280]">पसंतीचे शहर:</span>
                <span className="text-[#111827] font-medium">{selectedCity}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6b7280]">भाषा:</span>
                <span className="text-[#ea580c] font-medium">{language === 'mr' ? 'मराठी' : 'English'}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setViewState('my_tickets');
                setActiveNavTab('tickets');
              }}
              className="w-full py-2.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-sm transition"
            >
              {t.myTickets}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Marquee Ticker (Stitch Parity) */}
            <div className="w-full bg-[#ea580c] text-white py-1.5 px-4 overflow-hidden shadow-xs">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                  <span className="tracking-wide truncate">
                    {language === 'mr'
                      ? "विशेष सवलत: आज 'मराठी रंगभूमी दिन' विशेष! निवडक नाटकांवर थेट ५०% पर्यंत आसन आरक्षण उपलब्ध"
                      : "Special: Up to 50% discount on select Marathi theatrical performances today!"}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-4 text-[11px] text-white/90 shrink-0">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>अधिकृत ई-तिकीट</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>जलद प्रवेश पास</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Container for Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              {/* 1. Cinematic Hero Section (Stitch Parity: 480px min-height, gradient scrim, badges, live date chip, CTAs) */}
              {!searchQuery.trim() && selectedCategory === 'all' && (() => {
                const featured = theatreEvents[0] || events[0];
                if (!featured) return null;
                const featTitle = language === 'mr' ? featured.titleMr || featured.title : featured.title;
                const featVenue = language === 'mr' ? featured.venue?.nameMr || featured.venue?.name : featured.venue?.name;
                const nextSess = featured.sessions && featured.sessions[0];
                const dateText = nextSess
                  ? new Date(nextSess.sessionStartTime).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }) + ' • ' + new Date(nextSess.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'आज • ७:३० PM';

                return (
                  <section className="relative w-full rounded-3xl overflow-hidden bg-slate-950 text-white shadow-2xl min-h-[420px] md:min-h-[480px] flex flex-col justify-end p-6 sm:p-8 md:p-12 group">
                    <div className="absolute inset-0 z-0">
                      <img
                        src={featured.bannerUrl || featured.posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1400'}
                        alt={featTitle}
                        className="w-full h-full object-cover opacity-50 scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
                    </div>

                    <div className="relative z-10 max-w-2xl space-y-4">
                      {/* Badges Line */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#ea580c] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>लवकर भरत आहे (Fast Filling)</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold">
                          {featured.categoryMr || featured.category} • {featured.language || 'मराठी'}
                        </span>
                        {featured.durationMinutes ? (
                          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[11px]">
                            {featured.durationMinutes} मिनिटे (१ मध्यंतर)
                          </span>
                        ) : null}
                      </div>

                      {/* Play Title */}
                      <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md font-serif">
                          {featTitle}
                        </h1>
                        <p className="text-base sm:text-lg text-orange-100/90 font-medium">
                          {featured.venue?.city ? `${featVenue}, ${featured.venue.city}` : featVenue}
                        </p>
                      </div>

                      <p className="text-sm sm:text-base text-white/80 line-clamp-2 max-w-xl leading-relaxed">
                        {featured.descriptionMr || featured.description || 'महाराष्ट्रातील नामवंत रंगमंदिरांमधील लोकप्रिय व सुवर्णमहोत्सवी नाटकाचा कौटुंबिक मनोरंजनाचा परिपूर्ण अनुभव.'}
                      </p>

                      {/* Venue & Live Date Chip */}
                      <div className="flex flex-wrap items-center gap-3 py-1 text-white/95 text-xs">
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-inner">
                          <Theater className="w-4 h-4 text-[#ea580c]" />
                          <span className="font-semibold">{dateText}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-inner">
                          <MapPin className="w-4 h-4 text-[#ea580c]" />
                          <span>{featVenue}</span>
                        </div>
                      </div>

                      {/* CTAs */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectEvent(featured)}
                          className="px-8 py-3.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>तिकीट बुक करा</span>
                        </button>

                        <a
                          href={`/events/${featured.id}`}
                          className="px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-sm backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <span>माहिती व तपशील</span>
                        </a>

                        <div className="flex items-center gap-1.5 text-white/70 text-xs ml-auto sm:ml-0 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>केवळ २२ आसने शिल्लक</span>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* 2. Premium Category Rail (Stitch Parity: Circular/rounded icon cards, 8-column layout) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#ea580c] font-black">श्रेणीनुसार शोधा</span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">मनोरंजन प्रकार निवडा</h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-[#ea580c] hover:text-orange-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <span>सर्व श्रेणी (All)</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    const catCount =
                      cat.id === 'plays'
                        ? '४२ प्रयोग'
                        : cat.id === 'music'
                        ? '१८ मैफिली'
                        : cat.id === 'comedy'
                        ? '१४ शोज'
                        : cat.id === 'cultural'
                        ? '११ उत्सव'
                        : cat.id === 'workshops'
                        ? '७ सत्रे'
                        : cat.id === 'movies'
                        ? '५ चित्रपट'
                        : 'उपलब्ध';

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`group flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all shadow-2xs hover:shadow-md text-center border cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 border-[#ea580c] shadow-sm'
                            : 'bg-white border-slate-200/80 hover:bg-orange-50/50 hover:border-orange-300'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors p-2.5 ${
                            isSelected
                              ? 'bg-[#ea580c] text-white shadow-xs'
                              : 'bg-orange-50 group-hover:bg-[#ea580c] group-hover:text-white text-[#ea580c]'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span
                          className={`text-xs transition-colors ${
                            isSelected
                              ? 'text-[#ea580c] font-black'
                              : 'text-slate-800 font-bold group-hover:text-[#ea580c]'
                          }`}
                        >
                          {language === 'mr' ? cat.labelMr : cat.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 3. Curated Event Rail: आज काय पाहायचं? (Stitch Parity: 4-column 2:3 vertical cards, NO PRICE!) */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-8 bg-[#ea580c] rounded-full" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900">आज काय पाहायचं?</h2>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#ea580c] text-[10px] font-bold">
                          आजचे थेट प्रयोग
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {selectedCity} परिसरातील आज संध्याकाळचे खास मराठी नाट्य आणि स्टँडअप प्रयोग
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 hidden sm:inline">{sortedEvents.length} कार्यक्रम</span>
                    <button
                      onClick={fetchEvents}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-orange-300 transition shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span className="hidden sm:inline">ताजे करा</span>
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                    {[1, 2, 3, 4].map((n) => (
                      <MTEventCardSkeleton key={n} />
                    ))}
                  </div>
                ) : error ? (
                  <MTEmptyState
                    type="general"
                    title={language === 'mr' ? 'अरेरे! काहीतरी अडचण आली.' : 'Something went wrong.'}
                    description={language === 'mr' ? 'कृपया पुन्हा प्रयत्न करा.' : 'Please try again.'}
                    actionText={language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry'}
                    onAction={fetchEvents}
                  />
                ) : sortedEvents.length === 0 ? (
                  <MTEmptyState
                    type="events"
                    title={
                      selectedCity !== 'महाराष्ट्र (All)'
                        ? (language === 'mr' ? 'या शहरात सध्या कार्यक्रम उपलब्ध नाहीत.' : 'No events currently available in this city.')
                        : (language === 'mr' ? 'या निवडीसाठी कोणतेही कार्यक्रम नाहीत' : 'No events found for this selection')
                    }
                    description={
                      selectedCity !== 'महाराष्ट्र (All)'
                        ? (language === 'mr' ? 'लवकरच नवीन नाटके व सांस्कृतिक कार्यक्रम सुरू होतील. आपण संपूर्ण महाराष्ट्रातील कार्यक्रम पाहू शकता.' : 'Upcoming events will be listed soon. You can explore events across all Maharashtra.')
                        : (language === 'mr' ? 'आपले बजेट किंवा तारीख बदलून पहा किंवा सर्व शहरांमधील कार्यक्रम शोधा.' : 'Try adjusting your budget or date filter, or explore events across Maharashtra.')
                    }
                    actionText={
                      selectedCity !== 'महाराष्ट्र (All)'
                        ? (language === 'mr' ? 'संपूर्ण महाराष्ट्रातील कार्यक्रम पहा' : 'View All Maharashtra Events')
                        : (language === 'mr' ? 'सर्व कार्यक्रम पहा' : 'Show All Events')
                    }
                    onAction={() => {
                      if (selectedCity !== 'महाराष्ट्र (All)') {
                        setSelectedCity('महाराष्ट्र (All)');
                      }
                      handleResetFilters();
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sortedEvents.map((evt) => (
                      <EventCard
                        key={evt.id}
                        event={evt}
                        language={language}
                        onSelect={handleSelectEvent}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Producer & Organizer Banner (Stitch Parity) */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1.5 max-w-xl text-center md:text-left">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#ea580c] flex items-center justify-center md:justify-start gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>नाट्य व कार्यक्रम आयोजकांसाठी</span>
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                    आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    पारदर्शक लेजर, थेट बँक खात्यात सेटलमेंट, मोफत व्हॉट्सॲप डिजिटल पास, आणि सभागृह गेट स्कॅनर सपोर्ट.
                  </p>
                </div>
                <button
                  onClick={() => setPartnerModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  {t.partnerWithUs}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {/* =========================================================
    MODERN BOOKING PLATFORM FOOTER
    ========================================================= */}
      <footer className="relative mt-10 overflow-hidden border-t border-slate-200 bg-[#0b1220] text-white">

        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

          {/* =====================================================
        TOP APP PROMOTION
        ===================================================== */}
          <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 p-5 shadow-2xl sm:p-7">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              {/* Left */}
              <div className="flex items-start gap-4">

                {/* App Icon */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg sm:h-20 sm:w-20">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white shadow-md sm:h-14 sm:w-14">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="5" y="2.5" width="14" height="19" rx="3" />
                      <path d="M9 5h6" strokeLinecap="round" />
                      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight sm:text-2xl">
                      महाटिकिट
                    </h2>

                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
                      Official App
                    </span>
                  </div>

                  <p className="max-w-xl text-sm font-medium text-white/90 sm:text-base">
                    महाराष्ट्रातील नाटक, संगीत, कॉमेडी, चित्रपट,
                    क्रीडा आणि खास कार्यक्रमांची तिकिटे एका ठिकाणी.
                  </p>

                  <p className="mt-1 text-xs text-white/70">
                    Discover • Book • Enjoy
                  </p>
                </div>
              </div>

              {/* Google Play */}
              <div className="shrink-0">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Get MahaTicket on Google Play"
                  title="MahaTicket Android App — Coming Soon"
                  className="group flex min-w-[205px] items-center gap-3 rounded-xl border border-white/20 bg-black px-4 py-3 text-white shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#050505] hover:shadow-2xl active:scale-[0.98]"
                >

                  {/* Google Play Multicolor Icon */}
                  <svg
                    viewBox="0 0 48 48"
                    className="h-9 w-9 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.5 4.4c-.9.9-1.5 2.3-1.5 4v31.2c0 1.7.6 3.1 1.5 4l.2.2L28.1 24v-.5L5.7 4.2l-.2.2z"
                      fill="#00D7FF"
                    />
                    <path
                      d="M35.6 31.5 28.1 24v-.5l7.5-7.5.2.1 8.9 5.1c2.5 1.4 2.5 3.7 0 5.1l-8.9 5.1-.2.1z"
                      fill="#FFD500"
                    />
                    <path
                      d="m5.7 43.8 22.4-19.3 7.5 7.5-25.8 14.8c-1.6.9-3 .4-4.1-3z"
                      fill="#FF3B5C"
                    />
                    <path
                      d="M5.7 4.2c1.1-3.4 2.5-3.9 4.1-3l25.8 14.8-7.5 7.5L5.7 4.2z"
                      fill="#00E676"
                    />
                  </svg>

                  <div className="text-left">
                    <p className="text-[10px] leading-none text-white/60">
                      GET IT ON
                    </p>

                    <p className="mt-1 text-[16px] font-semibold leading-none tracking-tight">
                      Google Play
                    </p>
                  </div>
                </a>

                <p className="mt-2 text-center text-[9px] font-medium text-white/60">
                  Android app coming soon
                </p>
              </div>
            </div>
          </div>

          {/* =====================================================
        BRAND + LINK COLUMNS
        ===================================================== */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
                  <Ticket className="h-6 w-6 -rotate-12 text-white" />
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    MahaTicket
                  </h3>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                    Maharashtra's Ticketing Platform
                  </p>
                </div>
              </div>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                नाटक, संगीत, कॉमेडी, सांस्कृतिक कार्यक्रम, चित्रपट,
                क्रीडा आणि इतर खास अनुभवांसाठी सोपे आणि सुरक्षित
                ऑनलाइन तिकीट बुकिंग.
              </p>

              {/* Trust badges */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-300">
                  ✓ Secure Booking
                </span>

                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-300">
                  ✓ Digital Tickets
                </span>

                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-300">
                  ✓ Easy Payments
                </span>
              </div>
            </div>

            {/* Explore */}
            <div>
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-white">
                Explore
              </h4>

              <div className="space-y-3 text-sm text-slate-400">
                <button
                  onClick={() => {
                    setViewState('home');
                    setSelectedCategory('all');
                  }}
                  className="block transition hover:text-orange-400"
                >
                  All Events
                </button>

                <button
                  onClick={() => setSelectedCategory('plays')}
                  className="block transition hover:text-orange-400"
                >
                  Plays & Theatre
                </button>

                <button
                  onClick={() => setSelectedCategory('music')}
                  className="block transition hover:text-orange-400"
                >
                  Music & Concerts
                </button>

                <button
                  onClick={() => setSelectedCategory('comedy')}
                  className="block transition hover:text-orange-400"
                >
                  Comedy
                </button>

                <button
                  onClick={() => setSelectedCategory('movies')}
                  className="block transition hover:text-orange-400"
                >
                  Movies
                </button>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-white">
                Company
              </h4>

              <div className="space-y-3 text-sm text-slate-400">

                <Link
                  href="/about"
                  className="block transition hover:text-orange-400"
                >
                  About Us
                </Link>

                <button
                  onClick={() => setPartnerModalOpen(true)}
                  className="block transition hover:text-orange-400"
                >
                  Partner With Us
                </button>

                <Link
                  href="/contact"
                  className="block transition hover:text-orange-400"
                >
                  Contact Us
                </Link>

                <Link
                  href="/privacy"
                  className="block transition hover:text-orange-400"
                >
                  Privacy Policy
                </Link>

                <Link
                  href="/terms"
                  className="block transition hover:text-orange-400"
                >
                  Terms & Conditions
                </Link>

                <Link
                  href="/admin"
                  className="block transition hover:text-orange-400"
                >
                  Admin / Organizer Portal
                </Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-white">
                Support
              </h4>

              <div className="space-y-3 text-sm text-slate-400">

                <Link
                  href="/refund"
                  className="block transition hover:text-orange-400"
                >
                  Refund Policy
                </Link>

                <button
                  onClick={() => {
                    setViewState('my_tickets');
                    setActiveNavTab('tickets');
                  }}
                  className="block transition hover:text-orange-400"
                >
                  My Tickets
                </button>

                <button
                  onClick={() => setViewState('offers')}
                  className="block transition hover:text-orange-400"
                >
                  Offers & Coupons
                </button>

                <Link
                  href="/contact"
                  className="block transition hover:text-orange-400"
                >
                  Help Centre
                </Link>
              </div>
            </div>
          </div>

          {/* =====================================================
        CATEGORIES STRIP
        ===================================================== */}
          <div className="mt-10 border-y border-white/10 py-6">

            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: 'plays',
                    label: '🎭 नाटक',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/20',
                    text: 'text-orange-400',
                  },
                  {
                    id: 'music',
                    label: '🎵 संगीत',
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/20',
                    text: 'text-purple-400',
                  },
                  {
                    id: 'comedy',
                    label: '😂 कॉमेडी',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/20',
                    text: 'text-yellow-400',
                  },
                  {
                    id: 'cultural',
                    label: '🎉 सांस्कृतिक',
                    bg: 'bg-pink-500/10',
                    border: 'border-pink-500/20',
                    text: 'text-pink-400',
                  },
                  {
                    id: 'movies',
                    label: '🎬 चित्रपट',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    text: 'text-blue-400',
                  },
                  {
                    id: 'sports',
                    label: '🏆 क्रीडा',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    text: 'text-emerald-400',
                  },
                  {
                    id: 'workshops',
                    label: '🎨 कार्यशाळा',
                    bg: 'bg-cyan-500/10',
                    border: 'border-cyan-500/20',
                    text: 'text-cyan-400',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setViewState('home');
                      setSelectedCategory(item.id as EventCategory);
                    }}
                    className={`rounded-full border ${item.border} ${item.bg} ${item.text} px-3.5 py-2 text-[11px] font-bold transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-95`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[11px] font-semibold text-slate-400">
                  © {new Date().getFullYear()} Kalpkrut Infotech Pvt. Ltd.
                </p>

                <p className="mt-0.5 text-[9px] text-slate-500">
                  MahaTicket is a Maharashtra-focused events & ticketing platform.
                </p>

                <div className="mt-1.5 flex items-center justify-start sm:justify-end">
                  <Link
                    href="/admin"
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition"
                  >
                    Admin / Organizer Login
                  </Link>
                </div>
              </div>
            </div>


          </div>

          {/* =====================================================
        LOCATION / BRAND STATEMENT
        ===================================================== */}
          {/* <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <MapPin className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-white">
                  महाराष्ट्रभर तुमच्या जवळचे कार्यक्रम
                </p>

                <p className="text-[10px] text-slate-500">
                  Pune • Mumbai • Thane • Nashik • Nagpur • Kolhapur •
                  Solapur • Aurangabad • Maharashtra
                </p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-slate-500">
              Built for Maharashtra
            </span>
          </div> */}

          {/* =====================================================
        COPYRIGHT / LEGAL
        ===================================================== */}


        </div>
      </footer>

      {/* Mobile Bottom Navigation (Home, Explore, Tickets, Offers, Profile) */}

      <MTBottomNavigation
        activeTab={activeNavTab}
        onTabChange={handleNavTabChange}
        language={language}
      />

      {/* MODAL 1: Interactive Seat Map */}
      {seatMapOpen && selectedEventForBooking && selectedSessionForBooking && (
        <SeatMapModal
          event={selectedEventForBooking}
          session={selectedSessionForBooking}
          language={language}
          onClose={() => setSeatMapOpen(false)}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* MODAL 2: Checkout Drawer */}
      {checkoutOpen && selectedEventForBooking && selectedSessionForBooking && checkoutHoldData && (
        <CheckoutDrawer
          event={selectedEventForBooking}
          session={selectedSessionForBooking}
          holdData={checkoutHoldData}
          language={language}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleBookingConfirmed}
        />
      )}

      {/* MODAL 3: Celebratory Ticket Pass with QR */}
      {confirmedBookingResult && (
        <TicketPassModal
          bookingResult={confirmedBookingResult}
          language={language}
          onClose={() => setConfirmedBookingResult(null)}
        />
      )}

      {/* MODAL 4: Partner With Us */}
      {partnerModalOpen && (
        <PartnerWithUsModal
          language={language}
          onClose={() => setPartnerModalOpen(false)}
        />
      )}

      {/* MODAL 5: Customer Sign In / Sign Up */}
      <AuthModal
        isOpen={authModalOpen}
        initialMessage="तिकिटे पाहण्यासाठी कृपया लॉगिन करा (Please sign in to view your tickets)"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setViewState('my_tickets')}
      />
    </div>
  );
}
