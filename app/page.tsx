'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
  Sparkles,
  QrCode,
  Armchair,
  Building2,
  Landmark,
  Headphones,
  Clock,
  ArrowRight,
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
  const router = useRouter();
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
  const [venuesList, setVenuesList] = useState<any[]>([]);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const url = `/api/venues${selectedCity && selectedCity !== 'महाराष्ट्र (All)' ? `?city=${encodeURIComponent(selectedCity)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setVenuesList(data.venues || []);
        }
      } catch (e) {
        console.warn('Failed to load venues', e);
      }
    };
    loadVenues();
  }, [selectedCity]);

  useEffect(() => {
    setMounted(true);

    // Instant SWR cache hydration from localStorage for 0ms initial render
    if (typeof window !== 'undefined') {
      const savedCity = localStorage.getItem('mahaticket_user_city');
      if (savedCity && savedCity !== 'महाराष्ट्र (All)') {
        setSelectedCity(savedCity);
      }
      const cached = localStorage.getItem('mahaticket_cached_events');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            setLoading(false);
          }
        } catch {}
      }
    }

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

  // Fetch Events from API with Stale-While-Revalidate (smooth background update)
  const fetchEvents = useCallback(async () => {
    try {
      // Only set loading = true if we literally have 0 events in state
      // (prevents wiping out rendered cards into skeleton when refreshing/filtering)
      setEvents((currentEvents) => {
        if (currentEvents.length === 0) {
          setLoading(true);
        }
        return currentEvents;
      });
      setError(null);

      const params = new URLSearchParams();
      if (selectedCity && selectedCity !== 'महाराष्ट्र (All)') {
        params.append('city', selectedCity);
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
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEvents(parsed);
              setError(null);
              setLoading(false);
              return;
            }
          } catch { }
        }
      }
      setError(err.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, searchQuery, priceRange, selectedDate, customDate]);

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
      router.push('/profile');
    }
  };

  // Initiate booking from event card -> redirect to event details page for showtime selection
  const handleSelectEvent = (event: EventItem) => {
    router.push(`/events/${event.id}`);
  };

  // From Seat Map to Checkout
  const handleProceedToCheckout = (holdData: any) => {
    setCheckoutHoldData(holdData);
    setSeatMapOpen(false);
    setCheckoutOpen(true);
    addToast('success', language === 'mr' ? 'जागा ५ मिनिटांसाठी आरक्षित केल्या आहेत' : 'Seats held for 5 minutes');
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

  // Dynamic category filtered results shown directly under the category rail
  const categoryFilteredEvents = React.useMemo(() => {
    if (selectedCategory === 'all') return [];
    return sortedEvents.filter((e) => {
      if (selectedCategory === 'plays') return e.category === 'plays' || (e as any).categoryMr === 'नाटक';
      if (selectedCategory === 'music') return e.category === 'music' || (e as any).categoryMr?.includes('संगीत');
      if (selectedCategory === 'comedy') return e.category === 'comedy' || (e as any).categoryMr?.includes('कॉमेडी');
      if (selectedCategory === 'cultural') return e.category === 'cultural' || (e as any).categoryMr?.includes('सांस्कृतिक');
      if (selectedCategory === 'workshops') return e.category === 'workshops' || (e as any).categoryMr?.includes('कार्यशाळा');
      if (selectedCategory === 'movies') return e.category === 'movies' || (e as any).categoryMr?.includes('चित्रपट');
      if (selectedCategory === 'sports') return e.category === 'sports' || (e as any).categoryMr?.includes('क्रीडा');
      return e.category === selectedCategory;
    });
  }, [sortedEvents, selectedCategory]);

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
              {/* Stitch cinematic hero slider — always visible to keep hero content intact */}
              {!searchQuery.trim() && (
                <HeroBanner
                  events={sortedEvents}
                  announcements={announcements}
                  language={language}
                  onSelectEvent={handleSelectEvent}
                  loading={loading}
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
                <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-8">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`group flex flex-col items-center justify-center rounded-2xl p-3 text-center shadow-xs transition min-w-[85px] sm:min-w-0 shrink-0 sm:shrink cursor-pointer ${isSelected
                          ? 'bg-[#ea580c] text-white'
                          : 'bg-white text-[#141b2b] hover:bg-[#FFF7ED]'
                          }`}
                      >
                        <div
                          className={`mb-1.5 flex h-12 w-12 items-center justify-center rounded-2xl p-2.5 transition ${isSelected
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

              {/* Category Filtered Results Section — displays directly below category chips */}
              {selectedCategory !== 'all' && (
                <section className="space-y-3 bg-white p-4 sm:p-6 rounded-2xl border border-orange-200/80 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
                      <div>
                        <h2 className="text-xl font-bold text-[#141b2b]">
                          {language === 'mr'
                            ? `${CATEGORIES.find((c) => c.id === selectedCategory)?.labelMr || ''} कार्यक्रम`
                            : `${CATEGORIES.find((c) => c.id === selectedCategory)?.labelEn || ''} Events`}
                        </h2>
                        <p className="text-xs text-[#64748b]">
                          {selectedCity} • {categoryFilteredEvents.length} {language === 'mr' ? 'कार्यक्रम उपलब्ध' : 'events available'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="text-xs font-bold text-[#ea580c] hover:text-[#c2410c] hover:underline cursor-pointer"
                    >
                      {language === 'mr' ? '✕ सर्व दाखवा' : '✕ Show all'}
                    </button>
                  </div>

                  {categoryFilteredEvents.length === 0 ? (
                    <div className="py-8 text-center text-[#64748b] bg-orange-50/50 rounded-xl border border-dashed border-orange-200">
                      <p className="text-sm font-semibold">
                        {language === 'mr'
                          ? 'या श्रेणीत सध्या कार्यक्रम उपलब्ध नाहीत.'
                          : 'No events found in this category right now.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="mt-2 text-xs font-bold text-[#ea580c] hover:underline cursor-pointer"
                      >
                        {language === 'mr' ? 'सर्व कार्यक्रम पहा' : 'View all events'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-event-grid">
                      {categoryFilteredEvents.map((evt) => (
                        <EventCard
                          key={`cat-result-${evt.id}`}
                          event={evt}
                          language={language}
                          onSelect={handleSelectEvent}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Admin mid_banner ads / featured promo */}
              {!searchQuery.trim() && (
                <MiddleStripBanner announcements={announcements} language={language} />
              )}

              {/* Featured events rail (आज काय पाहायचं?) */}
              {!searchQuery.trim() &&
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
                            ? `${selectedCity}` + ' परिसरातील खास प्रयोग'
                            : `${selectedCity}` + ' Popular Shows'}
                        </p>
                      </div>
                    </div>
                    <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-4">
                      {sortedEvents
                        .filter((e) => (e as any).featured)
                        .slice(0, 4)
                        .map((evt) => (
                          <div key={`feat-${evt.id}`} className="min-w-[240px] sm:min-w-0 shrink-0 sm:shrink">
                            <EventCard
                              event={evt}
                              language={language}
                              onSelect={handleSelectEvent}
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                )}

              {/* STITCH SECTION 1: मराठी रंगभूमी विशेष (Theatrical Poster Rail) */}
              {!searchQuery.trim() && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
                      <div>
                        <h2 className="text-xl font-bold text-[#141b2b]">
                          {language === 'mr' ? 'मराठी रंगभूमी विशेष' : 'Marathi Theatre Specials'}
                        </h2>
                        <p className="text-sm text-[#64748b]">
                          {language === 'mr' ? 'सध्याचे गाजलेले व प्रेक्षकप्रिय मराठी नाटके' : 'Acclaimed & blockbuster Marathi plays'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('plays')}
                      className="text-xs font-bold text-[#ea580c] hover:text-[#c2410c] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{language === 'mr' ? 'सर्व पहा' : 'View all'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-4">
                    {(sortedEvents.filter((e) => e.category === 'plays' || (e as any).categoryMr === 'नाटक').length > 0
                      ? sortedEvents.filter((e) => e.category === 'plays' || (e as any).categoryMr === 'नाटक')
                      : sortedEvents
                    )
                      .slice(0, 4)
                      .map((evt) => (
                        <div key={`theatre-${evt.id}`} className="min-w-[240px] sm:min-w-0 shrink-0 sm:shrink">
                          <EventCard
                            event={evt}
                            language={language}
                            onSelect={handleSelectEvent}
                          />
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* STITCH SECTION 2: महानाट्य महोत्सव २०२६ Festive Promotional Banner */}
              {!searchQuery.trim() && (
                <div className="rounded-2xl bg-gradient-to-r from-[#9A3412] via-[#C2410C] to-[#EA580C] p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-orange-200 text-xs font-bold">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>{language === 'mr' ? 'मर्यादित काळासाठी विशेष ऑफर' : 'Limited Time Special Offer'}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {language === 'mr' ? 'महानाट्य महोत्सव २०२६' : 'Mahanatya Mahotsav 2026'}
                    </h3>
                    <p className="text-xs sm:text-sm text-orange-100 font-medium leading-relaxed">
                      {language === 'mr'
                        ? 'सर्व नाटकांच्या आगाऊ बुकिंगवर २०% पर्यंत भरघोस सूट! आजच आपले आणि आपल्या कुटुंबीयांचे तिकीट आरक्षित करा.'
                        : 'Get up to 20% discount on advance ticket bookings for all Marathi plays across Maharashtra.'}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/30 text-white font-mono font-bold text-xs tracking-wider">
                        {language === 'mr' ? 'कोड: MAHA20' : 'CODE: MAHA20'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('plays')}
                        className="px-4 py-1.5 rounded-lg bg-white text-[#C2410C] font-bold text-xs hover:bg-orange-50 transition shadow-xs cursor-pointer active:scale-95"
                      >
                        {language === 'mr' ? 'नाटके पहा व सवलत मिळवा' : 'Explore Theatre'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STITCH SECTION 1: विकेंड प्लॅनर - या आठवड्याचे लोकप्रिय कार्यक्रम (Popular Shows of the Week) */}
              {!searchQuery.trim() && (
                <section className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#ea580c] tracking-wide mb-1">
                        {language === 'mr' ? 'विकेंड प्लॅनर' : 'Weekend Planner'}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141b2b] tracking-tight">
                        {language === 'mr' ? 'या आठवड्याचे लोकप्रिय कार्यक्रम' : 'Trending Shows This Week'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748b] mt-0.5">
                        {language === 'mr'
                          ? 'प्रेक्षकांची पहिली पसंती आणि झपाट्याने भरणारे आगामी प्रयोग'
                          : 'Top audience picks and rapidly filling upcoming shows'}
                      </p>
                    </div>

                    {/* Status Legend on Right */}
                    <div className="flex items-center gap-3.5 text-xs font-bold text-[#64748b] pt-1 sm:pt-0 shrink-0">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                        <span>{language === 'mr' ? 'उपलब्ध' : 'Available'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
                        <span>{language === 'mr' ? 'लवकर भरत आहे' : 'Filling Fast'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#94a3b8]" />
                        <span>{language === 'mr' ? 'हाउसफुल्ल' : 'Housefull'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 3 Horizontal Cards matching screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Card 1: लावणी बहार २०२५ */}
                    <div
                      onClick={() => {
                        const target = sortedEvents.find(e => e.titleMr?.includes('लावणी') || e.title?.toLowerCase().includes('lavani')) || sortedEvents[0];
                        if (target) handleSelectEvent(target);
                      }}
                      className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-300 p-3 shadow-2xs hover:shadow-xs transition cursor-pointer flex gap-3 items-center justify-between"
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        <img
                          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80"
                          alt="लावणी बहार २०२५"
                          className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100 group-hover:scale-[1.02] transition"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#ea580c]">
                                {language === 'mr' ? 'लोककला' : 'Folk Art'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] flex items-center gap-0.5">
                                <span>⚡</span>
                                <span>{language === 'mr' ? 'लवकर भरत आहे' : 'Fast Filling'}</span>
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-[#141b2b] truncate group-hover:text-[#ea580c] transition">
                              {language === 'mr' ? 'लावणी बहार २०२५' : 'Lavani Bahar 2025'}
                            </h3>
                            <p className="text-xs text-[#64748b] truncate">
                              {language === 'mr' ? 'सुरेखा पुणेकर व सहकारी' : 'Surekha Punekar & Troupe'}
                            </p>
                          </div>
                          <div className="text-[11px] text-[#64748b] flex items-center gap-1 truncate pt-1">
                            <Clock className="w-3 h-3 text-[#ea580c] shrink-0" />
                            <span className="truncate">
                              {language === 'mr' ? 'शनिवार, संध्याकाळी ८:०० • टिळक स्मारक' : 'Sat, 8:00 PM • Tilak Smarak'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                        <span className="text-[10px] text-[#64748b]">
                          {language === 'mr' ? 'स्टॉल आसने शिल्लक' : 'Stall Seats Left'}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] hover:bg-orange-100 text-[#ea580c] font-bold text-xs border border-orange-200 transition shadow-2xs whitespace-nowrap"
                        >
                          {language === 'mr' ? 'आरक्षण करा' : 'Book'}
                        </button>
                      </div>
                    </div>

                    {/* Card 2: सवाई गंधर्व स्मरण मैफल */}
                    <div
                      onClick={() => {
                        const target = sortedEvents.find(e => e.category === 'music' || e.titleMr?.includes('संगीत') || e.title?.toLowerCase().includes('music')) || sortedEvents[1] || sortedEvents[0];
                        if (target) handleSelectEvent(target);
                      }}
                      className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-300 p-3 shadow-2xs hover:shadow-xs transition cursor-pointer flex gap-3 items-center justify-between"
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        <img
                          src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80"
                          alt="सवाई गंधर्व स्मरण मैफल"
                          className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100 group-hover:scale-[1.02] transition"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#ea580c]">
                                {language === 'mr' ? 'शास्त्रीय' : 'Classical'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 flex items-center gap-0.5">
                                <span>🟢</span>
                                <span>{language === 'mr' ? 'तिकिटे उपलब्ध' : 'Tickets Open'}</span>
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-[#141b2b] truncate group-hover:text-[#ea580c] transition">
                              {language === 'mr' ? 'सवाई गंधर्व स्मरण मैफल' : 'Sawai Gandharva Smaran'}
                            </h3>
                            <p className="text-xs text-[#64748b] truncate">
                              {language === 'mr' ? 'पंडित संजीव अभ्यंकर यांचे गायन' : 'Pt. Sanjeev Abhyankar Vocal'}
                            </p>
                          </div>
                          <div className="text-[11px] text-[#64748b] flex items-center gap-1 truncate pt-1">
                            <Clock className="w-3 h-3 text-[#ea580c] shrink-0" />
                            <span className="truncate">
                              {language === 'mr' ? 'रविवार, सकाळी ९:०० • बालगंधर्व' : 'Sun, 9:00 AM • Bal Gandharva'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                        <span className="text-[10px] text-[#64748b]">
                          {language === 'mr' ? 'सकलनी खास बैठक' : 'Balcony Reserved'}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] hover:bg-orange-100 text-[#ea580c] font-bold text-xs border border-orange-200 transition shadow-2xs whitespace-nowrap"
                        >
                          {language === 'mr' ? 'आरक्षण करा' : 'Book'}
                        </button>
                      </div>
                    </div>

                    {/* Card 3: पुरुषोत्तम करंडक विजेते एकांकिका */}
                    <div
                      onClick={() => {
                        const target = sortedEvents.find(e => e.category === 'plays' || e.titleMr?.includes('नाटक')) || sortedEvents[2] || sortedEvents[0];
                        if (target) handleSelectEvent(target);
                      }}
                      className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-300 p-3 shadow-2xs hover:shadow-xs transition cursor-pointer flex gap-3 items-center justify-between"
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        <img
                          src="https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=300&q=80"
                          alt="पुरुषोत्तम करंडक विजेते एकांकिका"
                          className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100 group-hover:scale-[1.02] transition"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#ea580c]">
                                {language === 'mr' ? 'युवा नाट्य' : 'Youth Theatre'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] flex items-center gap-0.5">
                                <span>⚡</span>
                                <span>{language === 'mr' ? '८५% भरले' : '85% Filled'}</span>
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-[#141b2b] truncate group-hover:text-[#ea580c] transition">
                              {language === 'mr' ? 'पुरुषोत्तम करंडक विजेते ए...' : 'Purushottam Karandak Winners'}
                            </h3>
                            <p className="text-xs text-[#64748b] truncate">
                              {language === 'mr' ? 'संशोधक तीन युवा सादरीकरणे' : 'Three Award-Winning One Acts'}
                            </p>
                          </div>
                          <div className="text-[11px] text-[#64748b] flex items-center gap-1 truncate pt-1">
                            <Clock className="w-3 h-3 text-[#ea580c] shrink-0" />
                            <span className="truncate">
                              {language === 'mr' ? 'रविवार, दु. ३:०० • भरत नाट्य मंदिर' : 'Sun, 3:00 PM • Bharat Natya'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                        <span className="text-[10px] text-[#ea580c] font-bold">
                          {language === 'mr' ? 'केवळ ४५ जागा बाकी' : 'Only 45 Seats Left'}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] hover:bg-orange-100 text-[#ea580c] font-bold text-xs border border-orange-200 transition shadow-2xs whitespace-nowrap"
                        >
                          {language === 'mr' ? 'आरक्षण करा' : 'Book'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Main discovery grid */}
              <section>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
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

              {/* STITCH SECTION 2: नाट्यगृह दर्शन (Theatres in Selected City) */}
              {!searchQuery.trim() && (
                <section className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#ea580c] tracking-wide mb-1">
                        {language === 'mr' ? 'नाट्यगृह दर्शन' : 'Theatres Directory'}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141b2b] tracking-tight">
                        {language === 'mr'
                          ? selectedCity === 'महाराष्ट्र (All)'
                            ? 'महाराष्ट्रातील प्रमुख नाट्यगृहे (Theatres in Maharashtra)'
                            : `${selectedCity} मधील प्रमुख नाट्यगृहे (Theatres in ${selectedCity})`
                          : `Iconic Theatres in ${selectedCity === 'महाराष्ट्र (All)' ? 'Maharashtra' : selectedCity}`}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748b] mt-0.5">
                        {language === 'mr'
                          ? 'आपल्या पसंतीच्या नाट्यगृहातील सर्व चालू व आगामी प्रयोगांचे वेळापत्रक पहा'
                          : 'Explore scheduled live performances and upcoming showtimes'}
                      </p>
                    </div>

                    <div className="text-xs text-[#64748b] font-medium pt-1 sm:pt-0 shrink-0">
                      {language === 'mr'
                        ? `एकूण ${venuesList.length} नाट्यगृहे सक्रिय`
                        : `${venuesList.length} Active Theatres`}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {venuesList.length > 0 ? (
                      venuesList.map((v: any) => (
                        <div
                          key={v.id}
                          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-300 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                                <Theater className="h-6 w-6" />
                              </div>
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-[#c2410c]">
                                {language === 'mr' ? `आज ${v.showCount || 2} प्रयोग` : `${v.showCount || 2} Shows Today`}
                              </span>
                            </div>

                            <h3 className="text-lg font-extrabold text-[#141b2b]">
                              {language === 'mr' ? (v.nameMr || v.name) : v.name}
                            </h3>
                            <p className="text-xs text-[#64748b] flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                              <span className="truncate">{v.address || v.city}</span>
                            </p>
                            <p className="text-xs text-[#64748b] leading-relaxed mt-2.5 line-clamp-2">
                              {language === 'mr'
                                ? `${v.city} मधील प्रमुख सांस्कृतिक केंद्र. अत्याधुनिक ध्वनी यंत्रणा व आरामदायक वातानुकूलित सभागृह.`
                                : `Premier cultural venue in ${v.city} featuring acoustics and climate control.`}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#64748b]">
                                {v.totalCapacity || 600} आसने
                              </span>
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#64748b]">
                                AC सभागृह
                              </span>
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#64748b]">
                                वाहनतळ
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/venues/${v.id}`}
                            className="mt-4 w-full py-2.5 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 text-[#ea580c] font-bold text-xs sm:text-sm border border-orange-200 flex items-center justify-center gap-1.5 transition active:scale-95 text-center"
                          >
                            <span>{language === 'mr' ? 'येथील प्रयोग पहा' : 'View Shows Here'}</span>
                            <ArrowRight className="w-4 h-4 inline" />
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 px-6 text-center bg-white rounded-2xl border border-dashed border-orange-200 shadow-2xs">
                        <div className="w-12 h-12 rounded-full bg-orange-50 text-[#ea580c] flex items-center justify-center mx-auto mb-3">
                          <Theater className="h-6 w-6" />
                        </div>
                        <h4 className="text-base font-bold text-[#141b2b]">
                          {language === 'mr'
                            ? `${selectedCity} मध्ये सध्या थेट नोंदणीकृत नाट्यगृहे उपलब्ध नाहीत.`
                            : `No active theatres found in ${selectedCity} right now.`}
                        </h4>
                        <p className="text-xs text-[#64748b] mt-1 max-w-md mx-auto">
                          {language === 'mr'
                            ? 'आम्ही लवकरच या शहरातील अधिक नाट्यगृहे जोडत आहोत. महाराष्ट्रातील इतर प्रमुख नाट्यगृहे पाहण्यासाठी खालील बटण दाबा.'
                            : 'We are expanding to more venues across Maharashtra. Explore other active theatres.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedCity('महाराष्ट्र (All)')}
                          className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition cursor-pointer"
                        >
                          {language === 'mr' ? 'सर्व महाराष्ट्र नाट्यगृहे पहा' : 'View All Maharashtra Theatres'}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* STITCH SECTION 3: Trust & Value Proposition Strip (Exact 4 Columns from Screenshot) */}
              {!searchQuery.trim() && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Item 1: झटपट एम-तिकीट */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#141b2b]">
                          {language === 'mr' ? 'झटपट एम-तिकीट' : 'Instant M-Ticket'}
                        </h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          {language === 'mr'
                            ? 'व्हॉट्सॲप आणि ई-मेल वर त्वरित डिजिटल पास. रांगेची कटकट नाही.'
                            : 'Direct pass via WhatsApp and E-Mail. Skip all ticket counter queues.'}
                        </p>
                      </div>
                    </div>

                    {/* Item 2: थेट आसन निवड */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                        <Armchair className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#141b2b]">
                          {language === 'mr' ? 'थेट आसन निवड' : 'Live Seat Selection'}
                        </h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          {language === 'mr'
                            ? 'रंगभूमीची प्रत्यक्ष रचना पाहून आवडते आसन स्वतः निवडा.'
                            : 'Interactive real-time theatre map to handpick your favorite seats.'}
                        </p>
                      </div>
                    </div>

                    {/* Item 3: १००% सुरक्षित व्यवहार */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#141b2b]">
                          {language === 'mr' ? '१००% सुरक्षित व्यवहार' : '100% Safe Payments'}
                        </h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          {language === 'mr'
                            ? 'UPI, नेटबँकिंग व कार्ड्ससह पूर्णतः अधिकृत आणि संरक्षित प्रणाली.'
                            : 'Authorized multi-tier encrypted gateway supporting UPI and cards.'}
                        </p>
                      </div>
                    </div>

                    {/* Item 4: महाटिकिट ग्राहक सहाय्यता */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#141b2b]">
                          {language === 'mr' ? 'महाटिकिट ग्राहक सहाय्यता' : 'Marathi Customer Support'}
                        </h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          {language === 'mr'
                            ? 'सकाळी ८ ते रात्री ११ पर्यंत तुमच्या मदतीसाठी समर्पित महाटिकिट सपोर्ट टीम.'
                            : 'Dedicated MahaTicket-speaking support team from 8 AM to 11 PM.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* STITCH SECTION 5: आयोजक आहात का? (Organizer CTA Card) */}
              <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-[#FFF7ED] via-white to-[#FFF7ED] p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#ea580c] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#141b2b]">
                      {language === 'mr' ? 'आयोजक आहात का? महाटिकिटवर प्रयोग नोंदवा!' : 'Are you an Organizer? List with MahaTicket!'}
                    </h3>
                    <p className="text-xs text-[#64748b]">
                      {language === 'mr'
                        ? 'महाराष्ट्रातील हजारो नाट्यप्रेमींपर्यंत पोहोचा. शून्य सेटअप फी, थेट आसन आरक्षण व जलद सेटलमेंट.'
                        : 'Reach thousands of theatregoers across Maharashtra. Zero setup fees & instant settlements.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition shadow-sm whitespace-nowrap cursor-pointer active:scale-95 shrink-0"
                >
                  {language === 'mr' ? 'कार्यक्रम नोंदवा (Post Event)' : 'Post Event'}
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

          {/* Brand strip — compact with official Google Play Store app link */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#f97316] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="text-base font-black tracking-tight sm:text-xl">
                <span className="text-white">महा</span>
                <span className="text-slate-950">टिकिट</span>
                <span className="text-xs font-extrabold text-white/90 ml-2">MahaTicket</span>
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/95 sm:text-sm">
                {language === 'mr' ? 'महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ' : "Maharashtra's Official Ticketing Platform"}
              </p>
            </div>

            {/* Official Google Play Store Badge */}
            <a
              href="https://play.google.com/store/apps/details?id=com.kalpkrutinfotech.mahaticket"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-black hover:bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg border border-white/20 transition-all hover:scale-[1.03] active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer group"
              title="Google Play Store वरून ॲप डाउनलोड करा"
            >
              <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.608 1.808C3.376 2.052 3.24 2.428 3.24 2.924V21.076C3.24 21.572 3.376 21.948 3.608 22.192L3.684 22.256L13.784 12.156V11.844L3.684 1.744L3.608 1.808Z" fill="#20C997"/>
                <path d="M17.148 15.52L13.784 12.156V11.844L17.148 8.48L17.228 8.528L21.204 10.792C22.34 11.44 22.34 12.56 21.204 13.208L17.228 15.472L17.148 15.52Z" fill="#FFC107"/>
                <path d="M17.228 15.472L13.784 12L3.608 22.192C3.992 22.596 4.636 22.648 5.376 22.228L17.228 15.472Z" fill="#FF3D00"/>
                <path d="M17.228 8.528L5.376 1.772C4.636 1.352 3.992 1.404 3.608 1.808L13.784 12L17.228 8.528Z" fill="#4285F4"/>
              </svg>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">
                  {language === 'mr' ? 'गूगल प्ले वर उपलब्ध' : 'GET IT ON'}
                </span>
                <span className="text-xs font-black text-white tracking-wide mt-0.5 font-sans">
                  Google Play
                </span>
              </div>
            </a>
          </div>

          {/* =====================================================
        BRAND + LINK COLUMNS
        ===================================================== */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-orange-500/20 shrink-0">
                  <img src="/logo.png" alt="MahaTicket" className="w-full h-full object-contain" />
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    <span className="text-[#ea580c]">महा</span>
                    <span className="text-white">टिकिट</span>
                    <span className="text-xs font-extrabold text-slate-400 ml-1.5">MahaTicket</span>
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
