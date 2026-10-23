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
import { TrendingRankedRow } from '@/src/components/TrendingRankedRow';
import { NavTab } from '@/src/components/ui/MTBottomNavigation';
import { MTSkeleton, MTEventCardSkeleton } from '@/src/components/ui/MTSkeleton';
import { MTEmptyState } from '@/src/components/ui/MTEmptyState';
import { MTToastContainer, ToastMessage } from '@/src/components/ui/MTToast';
import { useOnlineStatus } from '@/hooks/use-pwa';
import { formatEventCardDateTime } from '@/src/lib/dateUtils';
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
  Star,
  Search,
  X,
  Grid,
  List,
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
  const [selectedCity, setSelectedCity] = useState('Pune');
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
  const [viewState, setViewState] = useState<'home' | 'explore' | 'my_tickets' | 'offers' | 'profile'>('home');
  const [exploreSearch, setExploreSearch] = useState('');
  const [explorePriceFilter, setExplorePriceFilter] = useState<'all' | 'free' | 'under500' | 'under1000' | 'above1000'>('all');
  const [exploreViewMode, setExploreViewMode] = useState<'grid' | 'list'>('grid');
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
  const [sectionsMap, setSectionsMap] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc'>('date');
  const [venuesList, setVenuesList] = useState<any[]>([]);

  const getSec = (
    key: string,
    defTitleMr: string,
    defTitleEn: string,
    defSubMr = '',
    defSubEn = '',
    defBadgeMr = '',
    defBadgeEn = ''
  ) => {
    const conf = sectionsMap[key];
    if (!conf) {
      return {
        title: language === 'mr' ? defTitleMr : defTitleEn,
        subtitle: language === 'mr' ? defSubMr : defSubEn,
        badge: language === 'mr' ? defBadgeMr : defBadgeEn,
        visible: true,
      };
    }
    return {
      title: language === 'mr' ? conf.titleMr || defTitleMr : conf.titleEn || defTitleEn,
      subtitle: language === 'mr' ? conf.subtitleMr || defSubMr : conf.subtitleEn || defSubEn,
      badge: language === 'mr' ? conf.badgeMr || defBadgeMr : conf.badgeEn || defBadgeEn,
      visible: conf.isVisible === 1 || conf.isVisible === true,
    };
  };

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const cacheKey = `mahaticket_cached_venues_${selectedCity}`;
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setVenuesList(parsed);
              }
            } catch { }
          }
        }

        const url = `/api/venues${selectedCity && selectedCity !== 'महाराष्ट्र (All)' ? `?city=${encodeURIComponent(selectedCity)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const venuesData = data.venues || [];
          setVenuesList(venuesData);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(venuesData));
            } catch { }
          }
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
      // If landed from Supabase OAuth with ?code=..., forward to callback page for instant exchange
      const urlParams = new URLSearchParams(window.location.search);
      const oauthCode = urlParams.get('code');
      if (oauthCode) {
        window.location.replace(`/auth/callback?code=${encodeURIComponent(oauthCode)}`);
        return;
      }

      const savedCity = localStorage.getItem('mahaticket_user_city');
      if (savedCity && savedCity !== 'महाराष्ट्र (All)') {
        setSelectedCity(savedCity);
      }
      const cached = localStorage.getItem('mahaticket_cached_events');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const unique = parsed.filter(
              (ev: any, index: number, self: any[]) => index === self.findIndex((e: any) => e.id === ev.id)
            );
            setEvents(unique);
            setLoading(false);
          }
        } catch { }
      }
    }

    // Fetch public active announcements from admin
    const loadAnnouncements = async () => {
      try {
        const [annRes, secRes] = await Promise.all([
          fetch('/api/announcements'),
          fetch('/api/sections'),
        ]);

        if (annRes.ok) {
          const data = await annRes.json();
          setAnnouncements(data.announcements || []);
        }

        if (secRes.ok) {
          const sData = await secRes.json();
          if (Array.isArray(sData.sections)) {
            const map: Record<string, any> = {};
            sData.sections.forEach((s: any) => {
              map[s.sectionKey] = s;
            });
            setSectionsMap(map);
          }
        }
      } catch (e) {
        console.warn('Failed to load announcements or sections', e);
      }
    };
    loadAnnouncements();

    // City is manual only: default Pune, or last user pick from localStorage.
    // No IP / geo auto-detect (avoids endless refresh + wrong city).
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mahaticket_user_city');
      if (!saved) {
        localStorage.setItem('mahaticket_user_city', 'Pune');
        setSelectedCity('Pune');
      }
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
      const rawEvents = data.events || [];
      const uniqueEvents = rawEvents.filter(
        (ev: any, index: number, self: any[]) => index === self.findIndex((e: any) => e.id === ev.id)
      );
      setEvents(uniqueEvents);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mahaticket_cached_events', JSON.stringify(uniqueEvents));
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
              const unique = parsed.filter(
                (ev: any, index: number, self: any[]) => index === self.findIndex((e: any) => e.id === ev.id)
              );
              setEvents(unique);
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

  // Handle Bottom Nav Changes — Instant 0ms response
  const handleNavTabChange = (tab: NavTab) => {
    setActiveNavTab(tab);
    if (tab === 'home') {
      setViewState('home');
      setSelectedCategory('all');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/');
    } else if (tab === 'explore') {
      setViewState('explore');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/?tab=explore');
    } else if (tab === 'tickets') {
      setViewState('my_tickets');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/?tab=tickets');
    } else if (tab === 'profile') {
      router.push('/profile');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTab = () => {
      const q = new URLSearchParams(window.location.search);
      const tab = q.get('tab');
      if (tab === 'explore') {
        setViewState('explore');
        setActiveNavTab('explore');
      } else if (tab === 'tickets') {
        setViewState('my_tickets');
        setActiveNavTab('tickets');
      } else if (tab === 'profile') {
        setViewState('profile');
        setActiveNavTab('profile');
      } else if (!tab || tab === 'home') {
        setViewState('home');
        setActiveNavTab('home');
      }
    };
    syncTab();

    const handleSwitchNav = (e: any) => {
      const t = e?.detail;
      if (t === 'home') {
        setViewState('home');
        setActiveNavTab('home');
        setSelectedCategory('all');
      } else if (t === 'explore') {
        setViewState('explore');
        setActiveNavTab('explore');
      } else if (t === 'tickets') {
        setViewState('my_tickets');
        setActiveNavTab('tickets');
      } else if (t === 'profile') {
        setViewState('profile');
        setActiveNavTab('profile');
      }
    };

    window.addEventListener('mahaticket_switch_nav_tab', handleSwitchNav);
    window.addEventListener('popstate', syncTab);
    return () => {
      window.removeEventListener('mahaticket_switch_nav_tab', handleSwitchNav);
      window.removeEventListener('popstate', syncTab);
    };
  }, []);

  // Card / poster → event details
  const handleSelectEvent = (event: EventItem) => {
    router.push(`/events/${event.id}`);
  };

  // Book Now → fast popup: date → time → seats → checkout
  const handleBookEvent = (event: EventItem) => {
    const sessions = (event.sessions || []).filter(
      (s: any) => !s.status || s.status === 'active'
    );
    if (sessions.length === 0) {
      router.push(`/events/${event.id}`);
      return;
    }
    const nowMs = Date.now() + 5 * 60 * 1000;
    const homeId = (event as any).homeSessionId;
    const homeSession =
      (homeId && sessions.find((s: any) => Number(s.id) === Number(homeId))) ||
      (event as any).homeSession ||
      sessions
        .filter((s: any) => {
          const t = new Date(s.sessionStartTime).getTime();
          return !Number.isNaN(t) && t > nowMs && s.status !== 'sold_out' && s.status !== 'cancelled';
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
        )[0] ||
      sessions[0];
    setSelectedEventForBooking(event);
    setSelectedSessionForBooking(homeSession);
    setSeatMapOpen(true);
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
      // Default: soonest *bookable* home session (not past sessions[0])
      list.sort((a, b) => {
        const pickStart = (ev: any) => {
          if (ev.homeSession?.sessionStartTime) return new Date(ev.homeSession.sessionStartTime).getTime();
          if (ev.homeSessionId && Array.isArray(ev.sessions)) {
            const s = ev.sessions.find((x: any) => Number(x.id) === Number(ev.homeSessionId));
            if (s?.sessionStartTime) return new Date(s.sessionStartTime).getTime();
          }
          const nowMs = Date.now() + 5 * 60 * 1000;
          const upcoming = (ev.sessions || [])
            .filter((s: any) => {
              const t = new Date(s.sessionStartTime).getTime();
              return !Number.isNaN(t) && t > nowMs;
            })
            .sort(
              (x: any, y: any) =>
                new Date(x.sessionStartTime).getTime() - new Date(y.sessionStartTime).getTime()
            );
          return upcoming[0]?.sessionStartTime
            ? new Date(upcoming[0].sessionStartTime).getTime()
            : Number.MAX_SAFE_INTEGER;
        };
        return pickStart(a) - pickStart(b);
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

  // Explore filtered events (parity with Android ExploreScreen)
  const exploreFilteredEvents = React.useMemo(() => {
    let list = [...events];

    // Filter by city
    if (selectedCity && selectedCity !== 'महाराष्ट्र (All)') {
      list = list.filter((e) => !e.venue?.city || e.venue.city.toLowerCase().includes(selectedCity.toLowerCase()));
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((e) => {
        if (selectedCategory === 'plays') return e.category === 'plays' || (e as any).categoryMr === 'नाटक';
        if (selectedCategory === 'music') return e.category === 'music' || (e as any).categoryMr?.includes('संगीत');
        if (selectedCategory === 'comedy') return e.category === 'comedy' || (e as any).categoryMr?.includes('कॉमेडी');
        if (selectedCategory === 'cultural') return e.category === 'cultural' || (e as any).categoryMr?.includes('सांस्कृतिक');
        if (selectedCategory === 'workshops') return e.category === 'workshops' || (e as any).categoryMr?.includes('कार्यशाळा');
        if (selectedCategory === 'movies') return e.category === 'movies' || (e as any).categoryMr?.includes('चित्रपट');
        if (selectedCategory === 'sports') return e.category === 'sports' || (e as any).categoryMr?.includes('क्रीडा');
        return e.category === selectedCategory;
      });
    }

    // Filter by search
    const q = (exploreSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const titleEn = (e.title || '').toLowerCase();
        const titleMr = (e.titleMr || '').toLowerCase();
        const venue = (e.venue?.name || '').toLowerCase();
        const venueMr = (e.venue?.nameMr || '').toLowerCase();
        const city = (e.venue?.city || '').toLowerCase();
        return titleEn.includes(q) || titleMr.includes(q) || venue.includes(q) || venueMr.includes(q) || city.includes(q);
      });
    }

    // Filter by price
    if (explorePriceFilter === 'free') {
      list = list.filter((e) => !e.minPrice || e.minPrice === 0);
    } else if (explorePriceFilter === 'under500') {
      list = list.filter((e) => e.minPrice && (e.minPrice > 1000 ? e.minPrice < 50000 : e.minPrice < 500));
    } else if (explorePriceFilter === 'under1000') {
      list = list.filter((e) => e.minPrice && (e.minPrice > 1000 ? e.minPrice < 100000 : e.minPrice < 1000));
    } else if (explorePriceFilter === 'above1000') {
      list = list.filter((e) => e.minPrice && (e.minPrice > 1000 ? e.minPrice >= 100000 : e.minPrice >= 1000));
    }

    return list;
  }, [events, selectedCity, selectedCategory, exploreSearch, searchQuery, explorePriceFilter]);

  return (
    <div className="mt-shell flex min-h-screen flex-col font-sans selection:bg-[#ea580c] selection:text-white">
      <MTToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {mounted && !isOnline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#f59e0b] px-4 py-1.5 text-center text-xs font-bold text-white">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t.offlineBanner}</span>
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
      <main className="flex-1 pb-10 md:pb-3">
        {viewState === 'my_tickets' ? (
          <MyTicketsView
            language={language}
            onBack={() => {
              setViewState('home');
              setActiveNavTab('home');
            }}
            onViewTicket={(data) => setConfirmedBookingResult(data)}
          />
        ) : viewState === 'explore' ? (
          <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 space-y-4">
            {/* Top Bar with Search & View Toggle (Matching Android ExploreScreen) */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ea580c]" />
                <input
                  type="text"
                  placeholder={
                    language === 'mr'
                      ? 'कार्यक्रम, कलाकार, नाटक शोधा... (Search)'
                      : 'Search plays, artists, venues...'
                  }
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 shadow-2xs"
                />
                {exploreSearch && (
                  <button
                    type="button"
                    onClick={() => setExploreSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Grid / List View Toggle */}
              <button
                type="button"
                onClick={() => setExploreViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
                className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ea580c] transition cursor-pointer shadow-2xs"
                title={exploreViewMode === 'grid' ? 'List View' : 'Grid View'}
              >
                {exploreViewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
            </div>

            {/* Category Pills (Horizontal Scroll) */}
            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#ea580c] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>{language === 'mr' ? cat.labelMr : cat.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Price Filter Chips (Matching Android PRICE_FILTERS) */}
            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none no-scrollbar">
              {[
                { id: 'all', labelMr: 'सर्व दर (All)', labelEn: 'All Prices' },
                { id: 'free', labelMr: 'मोफत (Free)', labelEn: 'Free' },
                { id: 'under500', labelMr: '₹५०० च्या आत', labelEn: 'Under ₹500' },
                { id: 'under1000', labelMr: '₹१००० च्या आत', labelEn: 'Under ₹1000' },
                { id: 'above1000', labelMr: '₹१०००+', labelEn: '₹1000+' },
              ].map((pf) => {
                const isSelected = explorePriceFilter === pf.id;
                return (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() => setExplorePriceFilter(pf.id as any)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'mr' ? pf.labelMr : pf.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Results Count & City Tag */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-bold text-slate-800">
                {exploreFilteredEvents.length} {language === 'mr' ? 'कार्यक्रम सापडले' : 'events found'}
              </span>
              <span className="text-[11px] text-[#ea580c] font-medium">
                {selectedCity}
              </span>
            </div>

            {/* Explore Events Cards (Grid vs List View) */}
            {exploreFilteredEvents.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {language === 'mr' ? 'कोणतेही कार्यक्रम सापडले नाहीत' : 'No matching events found'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'mr' ? 'कृपया शोध शब्द किंवा फिल्टर बदलून पहा.' : 'Try adjusting search or filter options.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setExploreSearch('');
                    setSelectedCategory('all');
                    setExplorePriceFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-bold shadow-xs hover:bg-[#c2410c] transition cursor-pointer"
                >
                  {language === 'mr' ? 'फिल्टर रीसेट करा' : 'Reset Filters'}
                </button>
              </div>
            ) : exploreViewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {exploreFilteredEvents.map((evt) => (
                  <EventCard
                    key={`exp-grid-${evt.id}`}
                    event={evt}
                    language={language}
                    onSelect={handleSelectEvent}
                    onBook={handleBookEvent}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {exploreFilteredEvents.map((evt) => {
                  const displayTitle = language === 'mr' ? evt.titleMr || evt.title : evt.title;
                  const displayCategory = language === 'mr' ? evt.categoryMr || evt.category : evt.category;
                  const venueName = language === 'mr' ? evt.venue?.nameMr || evt.venue?.name : evt.venue?.name;
                  return (
                    <div
                      key={`exp-list-${evt.id}`}
                      onClick={() => handleSelectEvent(evt)}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-300 p-3 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
                    >
                      <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                        {evt.posterUrl ? (
                          <img
                            src={evt.posterUrl}
                            alt={displayTitle}
                            className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-500">
                            <Ticket className="w-6 h-6" />
                          </div>
                        )}
                        {evt.rating && evt.rating > 0 && (
                          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[9px] font-bold text-white bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5 fill-[#F59E0B] text-[#F59E0B]" />
                            <span>{evt.rating > 5 ? (evt.rating / 2).toFixed(1) : evt.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
                        <div>
                          {displayCategory && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-[#ea580c] inline-block mb-1">
                              {displayCategory}
                            </span>
                          )}
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ea580c] transition truncate">
                            {displayTitle}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#ea580c] shrink-0" />
                            <span className="truncate">{venueName || evt.venue?.city || 'महाराष्ट्र'}</span>
                          </p>
                          <p className="text-[10px] text-[#ea580c] font-bold truncate mt-0.5">
                            {formatEventCardDateTime(evt, language, true).fullStr}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-1">
                          <span className="text-[11px] font-bold text-slate-900">
                            {evt.minPrice ? `₹${evt.minPrice > 1000 ? Math.round(evt.minPrice / 100) : evt.minPrice}` : ''}
                          </span>
                          <span className="text-[11px] text-[#ea580c] font-bold">
                            {language === 'mr' ? 'तिकीट बुक करा →' : 'Book Tickets →'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
            <div className="mt-container space-y-3.5 pt-3">
              {/* BookNgo-style cinematic hero — tighter height */}
              {!searchQuery.trim() && getSec('hero', 'विशेष शिफारस व थेट बुकिंग', 'Featured Shows').visible && (
                <HeroBanner
                  events={sortedEvents}
                  announcements={announcements}
                  language={language}
                  onSelectEvent={handleSelectEvent}
                  loading={loading}
                />
              )}

              {!searchQuery.trim() && sortedEvents.length > 0 && getSec('trending', 'या आठवड्यातील लोकप्रिय प्रयोग', 'Trending Shows This Week').visible && (
                <TrendingRankedRow
                  events={sortedEvents}
                  language={language}
                  customTitle={getSec('trending', 'या आठवड्यातील लोकप्रिय प्रयोग', 'Trending Shows This Week').title}
                  customBadge={getSec('trending', '', '', '', '', '🔥 लोकप्रिय ट्रेंडिंग', '🔥 POPULAR TRENDING').badge}
                  onSelect={handleSelectEvent}
                  onBook={handleBookEvent}
                />
              )}

              {/* Category chips — compact rail */}
              {getSec('categories', 'कॅटेगरीनुसार शोधा', 'Pick a type').visible && (
                <section className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#ea580c]">
                        {getSec('categories', '', '', '', '', 'श्रेणी', 'Category').badge}
                      </p>
                      <h2 className="text-base font-bold text-[#141b2b]">
                        {getSec('categories', 'कॅटेगरीनुसार शोधा', 'Pick a type').title}
                      </h2>
                    </div>
                    {selectedCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="text-xs font-bold text-[#ea580c] hover:underline cursor-pointer"
                      >
                        {language === 'mr' ? 'सर्व दाखवा' : 'Show all'}
                      </button>
                    )}
                  </div>
                <div className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-2 scrollbar-none no-scrollbar">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`group flex flex-col items-center justify-center rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs transition min-w-[70px] sm:min-w-[85px] shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[#ea580c] text-white shadow-md'
                            : 'bg-white text-[#141b2b] hover:bg-[#FFF7ED]'
                        }`}
                      >
                        <div
                          className={`mb-1 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl p-2 transition ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#FFF7ED] text-[#ea580c] group-hover:bg-[#ea580c] group-hover:text-white'
                          }`}
                        >
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold leading-tight">
                          {language === 'mr' ? cat.labelMr : cat.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              )}

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
                    <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none mt-2">
                      {categoryFilteredEvents.map((evt) => (
                        <div key={`cat-result-${evt.id}`} className="w-[170px] sm:w-[210px] shrink-0">
                          <EventCard
                            event={evt}
                            language={language}
                            onSelect={handleSelectEvent} onBook={handleBookEvent}
                          />
                        </div>
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
                sortedEvents.filter((e) => e.featured).length > 0 &&
                getSec('today', 'आज काय पाहायचं?', "What's on today?").visible && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
                      <div>
                        <h2 className="text-xl font-bold text-[#141b2b]">
                          {getSec('today', 'आज काय पाहायचं?', "What's on today?").title}
                        </h2>
                        <p className="text-sm text-[#64748b]">
                          {getSec('today', '', '', `${selectedCity} परिसरातील खास प्रयोग`, `${selectedCity} Popular Shows`).subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none">
                      {sortedEvents
                        .filter((e) => e.featured)
                        .map((evt) => (
                          <div key={`feat-${evt.id}`} className="w-[170px] sm:w-[210px] shrink-0">
                            <EventCard
                              event={evt}
                              language={language}
                              onSelect={handleSelectEvent} onBook={handleBookEvent}
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                )}

              {/* STITCH SECTION 1: मराठी रंगभूमी विशेष (Theatrical Poster Rail) */}
              {!searchQuery.trim() && getSec('drama', 'मराठी रंगभूमी विशेष 🎭', 'Marathi Theatre Specials').visible && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1.5 rounded-full bg-[#ea580c]" />
                      <div>
                        <h2 className="text-xl font-bold text-[#141b2b]">
                          {getSec('drama', 'मराठी रंगभूमी विशेष 🎭', 'Marathi Theatre Specials').title}
                        </h2>
                        <p className="text-sm text-[#64748b]">
                          {getSec('drama', '', '', 'सध्याचे गाजलेले व प्रेक्षकप्रिय मराठी नाटके', 'Acclaimed & blockbuster Marathi plays').subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('plays');
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-[#ea580c] hover:text-[#c2410c] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{language === 'mr' ? 'सर्व पहा' : 'View all'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none">
                    {(sortedEvents.filter((e) => e.category === 'plays' || (e as any).categoryMr === 'नाटक').length > 0
                      ? sortedEvents.filter((e) => e.category === 'plays' || (e as any).categoryMr === 'नाटक')
                      : sortedEvents
                    )
                      .map((evt) => (
                        <div key={`theatre-${evt.id}`} className="w-[170px] sm:w-[210px] shrink-0">
                          <EventCard
                            event={evt}
                            language={language}
                            onSelect={handleSelectEvent} onBook={handleBookEvent}
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

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="text-xs sm:text-sm font-bold text-[#C2410C] hover:text-[#EA580C] flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>{language === 'mr' ? 'सर्व पहा' : 'View all'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Dynamic Database Fetched High-Rating Events (1 Row, 3 Cards Only) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {(events.length > 0
                      ? [...events]
                        .sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5))
                        .slice(0, 3)
                      : []
                    ).map((evt) => {
                      const displayTitle = language === 'mr' ? evt.titleMr || evt.title : evt.title;
                      const displayCategory = language === 'mr' ? evt.categoryMr || evt.category : evt.category;
                      const venueName = language === 'mr' ? evt.venue?.nameMr || evt.venue?.name : evt.venue?.name;

                      return (
                        <div
                          key={`popular-${evt.id}`}
                          onClick={() => handleSelectEvent(evt)}
                          className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-orange-300 p-3 sm:p-4 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center gap-3 sm:gap-4"
                        >
                          {/* Image Box with Star Rating Badge at Bottom-Left Corner */}
                          <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-100 flex items-center justify-center">
                            {evt.posterUrl || evt.bannerUrl ? (
                              <img
                                src={evt.posterUrl || evt.bannerUrl || ''}
                                alt={displayTitle}
                                className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <Ticket className="w-8 h-8 text-amber-500" />
                            )}

                            {/* Rating Star Badge Overlay on Poster */}
                            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-extrabold text-white bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/20 shadow-xs">
                              <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B] shrink-0" />
                              <span>
                                {evt.rating && evt.rating > 0
                                  ? (evt.rating > 5 ? (evt.rating / 2).toFixed(1) : evt.rating.toFixed(1))
                                  : '4.8'}
                              </span>
                            </div>
                          </div>

                          {/* Middle Info Column */}
                          <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {displayCategory && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFF7ED] text-[#C2410C] border border-orange-200/60 inline-block">
                                    {displayCategory}
                                  </span>
                                )}
                                {evt.venue?.city && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 inline-block">
                                    {evt.venue.city}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs sm:text-sm font-extrabold text-[#141B2B] truncate group-hover:text-[#EA580C] transition mt-1">
                                {displayTitle}
                              </h3>
                              <p className="text-[11px] text-[#64748B] truncate mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#EA580C] shrink-0" />
                                <span className="truncate">
                                  {venueName ? `${venueName}${evt.venue?.city ? `, ${evt.venue.city}` : ''}` : (evt.venue?.city || 'महाराष्ट्र')}
                                </span>
                              </p>
                              <p className="text-[10px] text-[#EA580C] font-bold truncate mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#EA580C] shrink-0" />
                                <span className="truncate">
                                  {formatEventCardDateTime(evt, language, true).fullStr}
                                </span>
                              </p>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-1.5">
                              <span className="text-[10px] text-[#A33900] font-bold truncate">
                                {evt.ratingCount && evt.ratingCount > 0
                                  ? `(${evt.ratingCount} ${language === 'mr' ? 'मते' : 'votes'})`
                                  : (language === 'mr' ? 'थेट बुकिंग' : 'Live Booking')}
                              </span>
                              <span className="text-[11px] text-[#EA580C] font-extrabold group-hover:underline">
                                {language === 'mr' ? 'माहिती पहा →' : 'View Details →'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Main discovery grid */}
              <section>
                <div className="flex items-center gap-2 mb-3">
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
                  <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none py-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="w-[185px] sm:w-[225px] shrink-0">
                        <MTEventCardSkeleton />
                      </div>
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
                  <div className="flex overflow-x-auto gap-3 sm:gap-3.5 pb-2 scrollbar-none snap-x snap-mandatory">
                    {sortedEvents.slice(0, 5).map((evt) => (
                      <div key={evt.id} className="w-[170px] sm:w-[215px] shrink-0 snap-start">
                        <EventCard
                          event={evt}
                          language={language}
                          onSelect={handleSelectEvent}
                          onBook={handleBookEvent}
                        />
                      </div>
                    ))}
                    {sortedEvents.length > 5 && (
                      <div className="w-[140px] sm:w-[160px] shrink-0 flex items-center justify-center snap-start">
                        <button
                          type="button"
                          onClick={() => {
                            setViewState('explore');
                            setActiveNavTab('explore');
                            if (typeof window !== 'undefined') window.history.pushState(null, '', '/?tab=explore');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="h-full min-h-[220px] w-full rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/70 hover:bg-orange-100/90 flex flex-col items-center justify-center p-4 text-center group transition cursor-pointer shadow-2xs"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#ea580c] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-[#141b2b] group-hover:text-[#ea580c]">
                            {language === 'mr' ? 'अधिक पहा' : 'View All'}
                          </span>
                          <span className="text-[10px] text-[#64748b] mt-0.5 font-medium">
                            +{sortedEvents.length - 5} {language === 'mr' ? 'आणखी' : 'more'}
                          </span>
                        </button>
                      </div>
                    )}
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

                    {/* <div className="text-xs text-[#64748b] font-medium pt-1 sm:pt-0 shrink-0">
                      {language === 'mr'
                        ? `एकूण ${venuesList.length} नाट्यगृहे सक्रिय`
                        : `${venuesList.length} Active Theatres`}
                    </div> */}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {venuesList.length > 0 ? (
                      venuesList.map((v: any, index: number) => (
                        <div
                          key={`venue-${v.id}-${index}`}
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
              <br></br>
              {/* Official Google Play Store Badge */}
              <a
                href="https://play.google.com/store/apps/details?id=com.kalpkrutinfotech.mahaticket"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-black hover:bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg border border-white/20 transition-all hover:scale-[1.03] active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer group"
                title="Google Play Store वरून ॲप डाउनलोड करा"
              >
                <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.608 1.808C3.376 2.052 3.24 2.428 3.24 2.924V21.076C3.24 21.572 3.376 21.948 3.608 22.192L3.684 22.256L13.784 12.156V11.844L3.684 1.744L3.608 1.808Z" fill="#20C997" />
                  <path d="M17.148 15.52L13.784 12.156V11.844L17.148 8.48L17.228 8.528L21.204 10.792C22.34 11.44 22.34 12.56 21.204 13.208L17.228 15.472L17.148 15.52Z" fill="#FFC107" />
                  <path d="M17.228 15.472L13.784 12L3.608 22.192C3.992 22.596 4.636 22.648 5.376 22.228L17.228 15.472Z" fill="#FF3D00" />
                  <path d="M17.228 8.528L5.376 1.772C4.636 1.352 3.992 1.404 3.608 1.808L13.784 12L17.228 8.528Z" fill="#4285F4" />
                </svg>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">
                    {language === 'mr' ? 'गूगल प्ले स्टोअर वर उपलब्ध' : 'GET IT ON'}
                  </span>
                  <span className="text-xs font-black text-white tracking-wide mt-0.5 font-sans">
                    Google Play Store
                  </span>
                </div>
              </a>
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



      {/* MODAL 1: Interactive Seat Map */}
      {seatMapOpen && selectedEventForBooking && selectedSessionForBooking && (
        <SeatMapModal
          event={selectedEventForBooking}
          session={selectedSessionForBooking}
          allSessions={selectedEventForBooking.sessions || []}
          language={language}
          onClose={() => setSeatMapOpen(false)}
          onSessionChange={(s) => setSelectedSessionForBooking(s)}
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
