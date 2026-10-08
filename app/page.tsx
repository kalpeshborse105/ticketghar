'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { translations } from '@/src/lib/i18n';
import { Language, EventCategory, EventItem, EventSessionItem } from '@/src/lib/types';
import { Header } from '@/src/components/Header';
import { EventCard } from '@/src/components/EventCard';
import { HeroBanner } from '@/src/components/HeroBanner';
import { MiddleStripBanner } from '@/src/components/MiddleStripBanner';
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
  Theater,
  Music,
  Smile,
  Film,
  Compass,
  Trophy,
  Palette,
  AlertTriangle,
  RefreshCw,
  Tag,
  ShieldCheck,
  MapPin,
  Ticket,
} from 'lucide-react';


const CATEGORIES: { id: EventCategory; labelEn: string; labelMr: string; icon: any }[] = [
  { id: 'all', labelEn: 'All Experiences', labelMr: 'सर्व कार्यक्रम', icon: Ticket },
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
        const cached = localStorage.getItem('mahaticket_cached_events');
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

  return (
    <div className="mt-shell flex min-h-screen flex-col font-sans selection:bg-[#ea580c] selection:text-white">
      <MTToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {mounted && !isOnline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#f59e0b] px-4 py-1.5 text-center text-xs font-bold text-white">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {mounted && cityDetected && detectedCityName && (
        <div className="flex items-center justify-center gap-2 border-b border-orange-200 bg-[#fff7ed] px-4 py-1.5 text-center text-xs font-semibold text-[#c2410c]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            {language === 'mr' ? 'शहर:' : 'City:'} <strong>{detectedCityName}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedCity('महाराष्ट्र (All)');
              localStorage.removeItem('mahaticket_user_city');
              setCityDetected(false);
            }}
            className="underline hover:text-[#ea580c]"
          >
            {language === 'mr' ? 'बदला' : 'Change'}
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
          <div className="pb-4 bg-[#FFF7ED]">
            <div className="mt-container space-y-5 pt-4">
              {/* Stitch cinematic hero slider — events + admin hero_banner */}
              {!searchQuery.trim() && selectedCategory === 'all' && (
                <HeroBanner
                  events={sortedEvents}
                  announcements={announcements}
                  language={language}
                  onSelectEvent={handleSelectEvent}
                />
              )}

              {/* Category chips — Stitch rail */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#ea580c]">
                      {language === 'mr' ? 'श्रेणीनुसार शोधा' : 'Browse by category'}
                    </p>
                    <h2 className="text-lg font-bold text-[#141b2b]">
                      {language === 'mr' ? 'मनोरंजन प्रकार निवडा' : 'Pick a category'}
                    </h2>
                  </div>
                  {selectedCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="text-xs font-bold text-[#ea580c]"
                    >
                      {language === 'mr' ? 'सर्व दाखवा' : 'Show all'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`group flex flex-col items-center justify-center rounded-2xl p-3 text-center shadow-sm transition ${
                          isSelected
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-white text-[#141b2b] hover:bg-[#FFF7ED]'
                        }`}
                      >
                        <div
                          className={`mb-1.5 flex h-12 w-12 items-center justify-center rounded-2xl p-2.5 transition ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#FFF7ED] text-[#ea580c] group-hover:bg-[#ea580c] group-hover:text-white'
                          }`}
                        >
                          <Icon className="h-7 w-7" />
                        </div>
                        <span className="text-xs font-semibold leading-tight">
                          {language === 'mr' ? cat.labelMr : cat.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Admin mid_banner ads / featured promo */}
              {!searchQuery.trim() && selectedCategory === 'all' && (
                <MiddleStripBanner announcements={announcements} language={language} />
              )}

              {/* Featured events rail */}
              {!searchQuery.trim() &&
                selectedCategory === 'all' &&
                sortedEvents.filter((e) => (e as any).featured).length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
                      <div>
                        <h2 className="text-xl font-bold text-[#141b2b]">
                          {language === 'mr' ? 'आज काय पाहायचं?' : "What's on today?"}
                        </h2>
                        <p className="text-sm text-[#64748b]">
                          {language === 'mr'
                            ? 'सध्या हायलाइट केलेले कार्यक्रम'
                            : 'Currently highlighted shows'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {sortedEvents
                        .filter((e) => (e as any).featured)
                        .slice(0, 4)
                        .map((evt) => (
                          <EventCard
                            key={`feat-${evt.id}`}
                            event={evt}
                            language={language}
                            onSelect={handleSelectEvent}
                          />
                        ))}
                    </div>
                  </section>
                )}

              {/* Main discovery grid */}
              <section>
                <div className="mb-3 flex items-end justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-[#141b2b]">
                      {language === 'mr' ? 'ठळक कार्यक्रम' : 'All events'}
                    </h2>
                    <p className="text-sm text-[#64748b]">
                      {selectedCity}
                      {sortedEvents.length > 0
                        ? ` · ${sortedEvents.length} ${language === 'mr' ? 'उपलब्ध' : 'available'}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchEvents}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e7e5e4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#64748b] hover:border-orange-300 hover:text-[#ea580c]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {language === 'mr' ? 'ताजे करा' : 'Refresh'}
                    </span>
                  </button>
                </div>

                {loading ? (
                  <div className="mt-event-grid py-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <MTEventCardSkeleton key={n} />
                    ))}
                  </div>
                ) : error ? (
                  <MTEmptyState
                    type="general"
                    title={language === 'mr' ? 'काहीतरी चूक झाली.' : 'Something went wrong.'}
                    description={language === 'mr' ? 'कृपया पुन्हा प्रयत्न करा.' : 'Please try again.'}
                    actionText={language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry'}
                    onAction={fetchEvents}
                  />
                ) : sortedEvents.length === 0 ? (
                  <MTEmptyState
                    type="events"
                    title={
                      language === 'mr'
                        ? 'सध्या या शहरात कार्यक्रम उपलब्ध नाहीत.'
                        : 'No events available in this city right now.'
                    }
                    description={
                      language === 'mr'
                        ? 'शहर किंवा श्रेणी बदलून पहा.'
                        : 'Try another city or category.'
                    }
                    actionText={
                      language === 'mr' ? 'सर्व महाराष्ट्र पहा' : 'View all Maharashtra'
                    }
                    onAction={() => {
                      setSelectedCity('महाराष्ट्र (All)');
                      handleResetFilters();
                    }}
                  />
                ) : (
                  <div className="mt-event-grid">
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

              {/* Post Event CTA — compact */}
              <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#e7e5e4] bg-white p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827]">
                    {language === 'mr' ? 'आपला कार्यक्रम पोस्ट करा' : 'Post your event'}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#64748b]">
                    {language === 'mr'
                      ? 'आयोजकांसाठी सूचीबद्धता, बुकिंग आणि सेटलमेंट.'
                      : 'Listing, bookings and settlements for organizers.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(true)}
                  className="mt-btn mt-btn-primary whitespace-nowrap"
                >
                  {language === 'mr' ? 'कार्यक्रम पोस्ट करा' : 'Post Event'}
                </button>
              </section>
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

          {/* Brand strip — compact, no dead store links */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#f97316] px-5 py-4 sm:px-6">
            <p className="text-base font-black tracking-tight sm:text-lg">महाटिकिट</p>
            <p className="mt-0.5 text-xs font-medium text-white/90 sm:text-sm">
              महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ
            </p>
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
                  Admin Login
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
