'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { translations } from '@/src/lib/i18n';
import { Language, EventCategory, EventItem, EventSessionItem } from '@/src/lib/types';
import { Header } from '@/src/components/Header';
import { HeroBanner } from '@/src/components/HeroBanner';
import { EventCard } from '@/src/components/EventCard';
import { CatalogFilterBar } from '@/src/components/CatalogFilterBar';
import { SeatMapModal } from '@/src/components/SeatMapModal';
import { CheckoutDrawer } from '@/src/components/CheckoutDrawer';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import { MyTicketsView } from '@/src/components/MyTicketsView';
import { PartnerWithUsModal } from '@/src/components/PartnerWithUsModal';
import { AuthModal } from '@/src/components/AuthModal';
import { MTBottomNavigation, NavTab } from '@/src/components/ui/MTBottomNavigation';
import { MTSkeleton } from '@/src/components/ui/MTSkeleton';
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

  useEffect(() => {
    setMounted(true);
    
    // Handle query params for direct booking
    const params = new URLSearchParams(window.location.search);
    const bookEventId = params.get('bookEvent');
    const sessionId = params.get('session');
    
    if (bookEventId && sessionId) {
      // Fetch the event and open seat map
      fetch(`/api/events/${bookEventId}`)
        .then(res => res.json())
        .then(data => {
          const event = data.event;
          const session = event.sessions.find((s: any) => s.id === parseInt(sessionId, 10));
          if (event && session) {
            setSelectedEventForBooking(event);
            setSelectedSessionForBooking(session);
            setSeatMapOpen(true);
          }
        })
        .catch(err => console.error('Failed to load booking:', err));
    }
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
          } catch {}
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

  // Filter theatre/plays events for Marathi spotlight
  const theatreEvents = events.filter(
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

      {/* Main Header with dynamic city support */}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-5">
            {/* Top Hero Banner */}
            {!searchQuery && selectedCategory === 'all' && priceRange === 2000 && selectedDate === 'all' && !customDate && (
              <HeroBanner
                events={events}
                language={language}
                onSelectEvent={handleSelectEvent}
              />
            )}

            {/* Category Navigation Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#ea580c] text-white shadow-sm font-semibold'
                          : 'bg-white text-[#6b7280] hover:text-[#111827] border border-[#e5e7eb] hover:bg-[#f5f5f5] hover:border-[#ea580c]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#ea580c]'}`} />
                      <span>{language === 'mr' ? cat.labelMr : cat.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Catalog Filter Bar */}
            <CatalogFilterBar
              language={language}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              customDate={customDate}
              onCustomDateChange={setCustomDate}
              onResetFilters={handleResetFilters}
              totalFiltered={events.length}
            />

            {/* Section 1: Marathi Theatre Spotlight */}
            {selectedCategory === 'all' && !searchQuery && priceRange === 2000 && selectedDate === 'all' && !customDate && theatreEvents.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/30 flex items-center justify-center">
                    <Theater className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
                      {t.theatreSpotlight}
                    </h2>
                    <p className="text-[11px] text-[#6b7280]">
                      महाराष्ट्रातील नामवंत रंगमंदिरांमधील लोकप्रिय व सुवर्णमहोत्सवी नाटके
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {theatreEvents.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      language={language}
                      onSelect={handleSelectEvent}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: All Events / Filtered Catalog */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
                    {selectedCategory === 'all'
                      ? language === 'mr'
                        ? 'आगामी कार्यक्रम (Upcoming Experiences)'
                        : 'Upcoming Experiences'
                      : CATEGORIES.find((c) => c.id === selectedCategory)?.labelMr || 'कार्यक्रम'}
                  </h2>
                  <p className="text-[11px] text-[#6b7280]">
                    {selectedCity} • {events.length} {language === 'mr' ? 'कार्यक्रम उपलब्ध' : 'events available'}
                    {priceRange < 2000 && ` • कमाल ₹${priceRange}`}
                    {customDate ? ` • तारीख: ${customDate}` : selectedDate !== 'all' ? ` • ${selectedDate}` : ''}
                  </p>
                </div>

                <button
                  onClick={fetchEvents}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#e5e7eb] text-xs text-[#6b7280] hover:text-[#111827] hover:border-[#ea580c] transition"
                >
                  <RefreshCw className="w-3 h-3 text-[#ea580c]" />
                  <span className="hidden sm:inline">{language === 'mr' ? 'ताजे करा' : 'Refresh'}</span>
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-xl border border-[#e5e7eb] p-3 space-y-3">
                      <MTSkeleton className="w-full h-40" />
                      <MTSkeleton variant="text" width="70%" />
                      <MTSkeleton variant="text" width="40%" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <MTEmptyState
                  type="general"
                  title={language === 'mr' ? 'माहिती लोड करण्यात अडचण आली' : 'Unable to load events'}
                  description={language === 'mr' ? 'कृपया इंटरनेट कनेक्शन तपासा किंवा पुन्हा प्रयत्न करा.' : 'Please verify connection and retry.'}
                  actionText={language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry'}
                  onAction={fetchEvents}
                />
              ) : events.length === 0 ? (
                <MTEmptyState
                  type="events"
                  title={language === 'mr' ? 'या निवडीसाठी कोणतेही कार्यक्रम नाहीत' : 'No events found'}
                  description={
                    language === 'mr'
                      ? 'आपले बजेट किंवा तारीख बदलून पहा किंवा सर्व शहरांमधील कार्यक्रम शोधा.'
                      : 'Try broadening your budget, clearing date filters, or selecting All Maharashtra.'
                  }
                  actionText={language === 'mr' ? 'सर्व कार्यक्रम पहा' : 'Show All Events'}
                  onAction={handleResetFilters}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      language={language}
                      onSelect={handleSelectEvent}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Producer & Organizer Banner */}
            <div className="rounded-xl bg-white border border-[#e5e7eb] p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1.5 max-w-xl text-center md:text-left">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#ea580c] flex items-center justify-center md:justify-start gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>नाट्य व कार्यक्रम आयोजकांसाठी</span>
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा
                </h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  पारदर्शक लेजर, थेट बँक खात्यात सेटलमेंट, मोफत व्हॉट्सॲप डिजिटल पास, आणि सभागृह गेट स्कॅनर सपोर्ट.
                </p>
              </div>
              <button
                onClick={() => setPartnerModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs shadow-sm transition active:scale-95 whitespace-nowrap"
              >
                {t.partnerWithUs}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e7eb] bg-white py-6 px-4 sm:px-8 text-xs text-[#6b7280] hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-[#111827] font-bold text-sm">
              <span>MahaTicket (महाटिकिट)</span>
              <span className="text-[10px] text-[#ea580c] bg-[#ea580c]/10 px-1.5 py-0.2 rounded border border-[#ea580c]/20">
                महाराष्ट्र
              </span>
            </div>
            <p className="mt-1 text-[#9ca3af] text-[11px]">
              पुणे • मुंबई • ठाणे • नाशिक • नागपूर • कोल्हापूर • संभाजीनगर • सोलापूर
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-2 text-[#6b7280] font-normal text-xs">
            <button
              onClick={() => setPartnerModalOpen(true)}
              className="hover:text-[#ea580c] transition"
            >
              Partner With Us
            </button>
            <span className="text-[#d1d5db]">•</span>
            <Link href="/about" className="hover:text-[#ea580c] transition">
              About
            </Link>
            <span className="text-[#d1d5db]">•</span>
            <Link href="/terms" className="hover:text-[#ea580c] transition">
              Terms
            </Link>
            <span className="text-[#d1d5db]">•</span>
            <Link href="/privacy" className="hover:text-[#ea580c] transition">
              Privacy
            </Link>
            <span className="text-[#d1d5db]">•</span>
            <Link href="/refund" className="hover:text-[#ea580c] transition">
              Refunds
            </Link>
            <span className="text-[#d1d5db]">•</span>
            <Link href="/contact" className="hover:text-[#ea580c] transition">
              Contact
            </Link>
            <span className="text-[#d1d5db]">•</span>
            <span>© {new Date().getFullYear()} Kalpkrut Infotech</span>
          </div>
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
