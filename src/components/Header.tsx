'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { usePWAInstall } from '@/hooks/use-pwa';
import { AuthModal } from './AuthModal.tsx';
import {
  Ticket,
  MapPin,
  Search,
  Bookmark,
  Building2,
  Download,
  Menu,
  X,
  ChevronDown,
  User,
  Navigation,
  Loader2,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export interface HeaderProps {
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenMyTickets?: () => void;
  onOpenPartnerModal?: () => void;
  onHomeClick?: () => void;
  onCategorySelect?: (cat: string) => void;
  availableCities?: string[];
}

const DEFAULT_CITIES = [
  'महाराष्ट्र (All)',
  'Pune',
  'Mumbai',
  'Thane',
  'Nagpur',
  'Nashik',
  'Chhatrapati Sambhaji Nagar',
  'Kolhapur',
  'Solapur',
  'Sangli',
  'Satara',
  'Amravati',
  'Nanded',
  'Ratnagiri',
  'Jalgaon',
];

const CITY_ALIASES: Record<string, string> = {
  Pune: 'Pune',
  Pimpri: 'Pune',
  'Pimpri-Chinchwad': 'Pune',
  Mumbai: 'Mumbai',
  'Navi Mumbai': 'Mumbai',
  Thane: 'Thane',
  Nagpur: 'Nagpur',
  Nashik: 'Nashik',
  Aurangabad: 'Chhatrapati Sambhaji Nagar',
  Sambhajinagar: 'Chhatrapati Sambhaji Nagar',
  'Chhatrapati Sambhaji Nagar': 'Chhatrapati Sambhaji Nagar',
  Kolhapur: 'Kolhapur',
  Solapur: 'Solapur',
  Sangli: 'Sangli',
  Satara: 'Satara',
  Amravati: 'Amravati',
  Nanded: 'Nanded',
  Ratnagiri: 'Ratnagiri',
  Jalgaon: 'Jalgaon',
};

const CITY_STORAGE_KEY = 'mahaticket_user_city';

const getCityFromApiName = (cityName: string): string | null => {
  const normalized = cityName.trim().toLowerCase();

  const found = Object.entries(CITY_ALIASES).find(([source]) =>
    normalized.includes(source.toLowerCase()),
  );

  return found?.[1] || null;
};

export const Header: React.FC<HeaderProps> = ({
  language: propLanguage,
  onLanguageChange,
  selectedCity: propSelectedCity,
  onCityChange,
  searchQuery: propSearchQuery,
  onSearchChange,
  onOpenMyTickets,
  onOpenPartnerModal,
  onHomeClick,
  onCategorySelect,
  availableCities,
}) => {
  const [internalLanguage, setInternalLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mahaticket_lang');
      if (saved === 'en' || saved === 'mr') return saved;
    }
    return 'mr';
  });
  const language = propLanguage || internalLanguage;
  const handleLanguageChange = (lang: Language) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      setInternalLanguage(lang);
      if (typeof window !== 'undefined') localStorage.setItem('mahaticket_lang', lang);
    }
  };

  const [internalCity, setInternalCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CITY_STORAGE_KEY);
      if (saved) return saved;
    }
    return 'महाराष्ट्र (All)';
  });
  const selectedCity = propSelectedCity || internalCity;

  const [internalSearch, setInternalSearch] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearch;
  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setInternalSearch(q);
    }
  };

  const handleHomeClickAction = () => {
    if (onHomeClick) {
      onHomeClick();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleOpenMyTickets = () => {
    if (onOpenMyTickets) {
      onOpenMyTickets();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/profile';
    }
  };

  const handleOpenPartnerModal = () => {
    if (onOpenPartnerModal) {
      onOpenPartnerModal();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/contact';
    }
  };

  const t = translations[language];
  const { isInstallable, install } = usePWAInstall();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityList, setCityList] = useState<string[]>(
    availableCities?.length ? availableCities : DEFAULT_CITIES,
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>();
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [searchFocused, setSearchFocused] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [detectingCity, setDetectingCity] = useState(false);
  const [cityDetectedLive, setCityDetectedLive] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityDetectionStartedRef = useRef(false);

  /*
   * ---------------------------------------------------------
   * Load cities from backend
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const loadCities = async () => {
      try {
        const res = await fetch('/api/cities', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled && Array.isArray(data.cities) && data.cities.length > 0) {
          setCityList(data.cities);
        }
      } catch {
        // Keep default city list.
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Keep parent-provided availableCities synchronized
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (availableCities?.length) {
      setCityList(availableCities);
    }
  }, [availableCities]);

  /*
   * ---------------------------------------------------------
   * Session
   * ---------------------------------------------------------
   */
  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/flow/session', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const handleCityChange = (city: string) => {
    if (onCityChange) {
      onCityChange(city);
    } else {
      setInternalCity(city);
    }

    if (typeof window !== 'undefined') {
      if (city === 'महाराष्ट्र (All)') {
        localStorage.removeItem(CITY_STORAGE_KEY);
      } else {
        localStorage.setItem(CITY_STORAGE_KEY, city);
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * LIVE CITY DETECTION
   *
   * Priority:
   * 1. Existing user selection in localStorage
   * 2. Live IP city from ipapi.co
   * 3. Existing parent selectedCity
   * 4. Maharashtra fallback
   *
   * localStorage works on localhost AND production.
   * It is browser/device-specific.
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (cityDetectionStartedRef.current) return;
    cityDetectionStartedRef.current = true;

    let cancelled = false;

    const detectLiveCity = async () => {
      if (typeof window === 'undefined') return;

      // First respect a city the user explicitly selected.
      const savedCity = localStorage.getItem(CITY_STORAGE_KEY);

      if (
        savedCity &&
        savedCity !== 'महाराष्ट्र (All)' &&
        cityList.includes(savedCity)
      ) {
        if (!cancelled && savedCity !== selectedCity) {
          handleCityChange(savedCity);
        }
        return;
      }

      setDetectingCity(true);

      try {
        /*
         * no-store is intentional:
         * we want a fresh live location lookup instead of an old
         * browser/network cached response.
         */
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) throw new Error('IP location request failed');

        const geo = await response.json();

        if (cancelled) return;

        const detected = getCityFromApiName(String(geo.city || ''));

        if (detected && cityList.includes(detected)) {
          handleCityChange(detected);
          localStorage.setItem(CITY_STORAGE_KEY, detected);
          setCityDetectedLive(true);

          window.setTimeout(() => {
            if (!cancelled) setCityDetectedLive(false);
          }, 4000);
        }
      } catch {
        // Do not block the site if IP location service fails.
      } finally {
        if (!cancelled) {
          setDetectingCity(false);
        }
      }
    };

    detectLiveCity();

    return () => {
      cancelled = true;
    };
  }, [cityList, onCityChange, selectedCity]);



  /*
   * ---------------------------------------------------------
   * LIVE SEARCH
   *
   * 250ms debounce
   * Abort previous request
   * No-store API request
   * Results update while typing across all cities & categories
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }

    const query = searchQuery.trim();

    if (!query) {
      setLiveResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    searchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const params = new URLSearchParams();

        params.set('search', query);
        params.set('limit', '8');

        const res = await fetch(`/api/events?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('Search failed');
        }

        const data = await res.json();

        setLiveResults(
          Array.isArray(data.events) ? data.events.slice(0, 8) : [],
        );
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setLiveResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }

      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    };
  }, [searchQuery]);

  /*
   * ---------------------------------------------------------
   * Close dropdowns on outside click
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchFocused(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Keyboard support
   * ---------------------------------------------------------
   */
  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Escape') {
      handleSearchChange('');
      setLiveResults([]);
      setSearchFocused(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      setSearchFocused(false);

      // Parent already receives the live search query.
      // Keep the query active rather than navigating to a
      // potentially unavailable route.
    }
  };

  /*
   * ---------------------------------------------------------
   * User actions
   * ---------------------------------------------------------
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/flow/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Still clear local UI state.
    }

    setUser(null);
    setUserMenuOpen(false);
  };

  const handleMyTicketsClick = () => {
    setUserMenuOpen(false);

    if (!user) {
      setAuthModalMessage(
        language === 'mr'
          ? 'तिकिटे पाहण्यासाठी कृपया लॉगिन करा'
          : 'Please sign in to view your tickets',
      );
      setAuthModalOpen(true);
      return;
    }

    handleOpenMyTickets();
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);

    if (!user) {
      setAuthModalMessage(
        language === 'mr'
          ? 'प्रोफाइल पाहण्यासाठी कृपया लॉगिन करा'
          : 'Please sign in to view your profile',
      );
      setAuthModalOpen(true);
      return;
    }

    window.location.href = '/profile';
  };

  const handleLoginClick = () => {
    setAuthModalMessage(undefined);
    setAuthModalOpen(true);
  };

  const handleSearchResultClick = (event: any) => {
    setSearchFocused(false);
    handleSearchChange('');
    setLiveResults([]);

    if (typeof window !== 'undefined') {
      window.location.assign(`/events/${event.id}`);
    }
  };

  const showResults =
    searchFocused && searchQuery.trim().length > 0;


  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e5e4] bg-white/95 text-[#111827] shadow-sm backdrop-blur-md">

      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">

        <div className="flex h-14 items-center gap-2 sm:gap-3">

          {/* BRAND */}
          <button
            type="button"
            onClick={handleHomeClickAction}
            className="flex shrink-0 items-center gap-2 text-left"
            aria-label="MahaTicket Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ea580c] shadow-sm shadow-orange-500/20">
              <Ticket className="h-4 w-4 -rotate-12 text-white" />
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-[#111827]">
                  {language === 'mr' ? 'महाटिकिट' : 'MahaTicket'}
                </span>
              </div>

              <p className="max-w-[200px] truncate text-[9px] font-medium text-[#64748b]">
                {language === 'mr'
                  ? 'महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ'
                  : "Maharashtra's ticket marketplace"}
              </p>
            </div>
          </button>

          {/* CITY SELECTOR */}
          <div className="relative hidden shrink-0 md:flex md:items-center">

            <MapPin className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#ea580c]" />

            <select
              value={selectedCity}
              onChange={(event) => handleCityChange(event.target.value)}
              className="max-w-[175px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs font-bold text-slate-800 outline-none transition hover:border-orange-300 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20"
              aria-label="Select city"
            >
              {cityList.map((city) => (
                <option
                  key={city}
                  value={city}
                  className="bg-white text-slate-900"
                >
                  {city === 'महाराष्ट्र (All)' ? t.allMaharashtra : city}
                </option>
              ))}
            </select>

            {detectingCity ? (
              <Loader2 className="pointer-events-none absolute right-2 h-3.5 w-3.5 animate-spin text-[#ea580c]" />
            ) : (
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
            )}
          </div>

          {/* LIVE SEARCH */}
          <div
            ref={searchRef}
            className="relative min-w-0 flex-1 max-w-md lg:max-w-lg mx-auto"
          >
            <div className="relative">

              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  language === 'mr'
                    ? 'नाटक, संगीत, शहर, कार्यक्रम शोधा...'
                    : 'Search plays, music, cities, events...'
                }
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 focus:bg-white shadow-xs"
                aria-label="Search events"
              />

              {/* IMPORTANT:
                  spinner now correctly shows while searching.
                  The previous code had !searchQuery here,
                  which prevented the spinner from appearing
                  during an actual search. */}
              {searching ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#ea580c]" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSearchChange('');
                    setLiveResults([]);
                    setSearchFocused(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* LIVE RESULTS */}
            {showResults && (
              <div className="absolute left-0 right-0 top-full z-[60] mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                {searching ? (
                  <div className="flex items-center gap-3 px-4 py-4 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#ea580c]" />
                    <span>
                      {language === 'mr'
                        ? 'कार्यक्रम शोधत आहे...'
                        : 'Searching events...'}
                    </span>
                  </div>
                ) : liveResults.length > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2.5">
                      <TrendingUp className="h-3.5 w-3.5 text-[#ea580c]" />

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {language === 'mr'
                          ? `तुमच्यासाठी ${liveResults.length} कार्यक्रम`
                          : `${liveResults.length} matching events`}
                      </p>
                    </div>

                    {liveResults.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => handleSearchResultClick(event)}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-orange-50"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {event.posterUrl ? (
                            <img
                              src={event.posterUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#ea580c]">
                              <Ticket className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900 transition group-hover:text-[#ea580c]">
                            {language === 'mr'
                              ? event.titleMr || event.title
                              : event.title || event.titleMr}
                          </p>

                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <MapPin className="h-3 w-3 shrink-0" />

                            <span>
                              {event.venue?.nameMr ||
                                event.venue?.name ||
                                ''}

                              {event.venue?.city
                                ? ` · ${event.venue.city}`
                                : ''}
                            </span>
                          </p>
                        </div>

                        <div className="shrink-0 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-black text-[#ea580c]">
                          {event.minPrice
                            ? `₹${event.minPrice}`
                            : 'View'}
                        </div>
                      </button>
                    ))}

                    <div className="border-t border-slate-100 px-4 py-2 text-center">
                      <p className="text-[10px] text-slate-400">
                        {language === 'mr'
                          ? 'Enter दाबा किंवा कार्यक्रम निवडा'
                          : 'Select an event above'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-5 text-xs text-slate-500">
                    <Search className="h-4 w-4 text-slate-300" />

                    <span>
                      {language === 'mr'
                        ? `"${searchQuery}" साठी कार्यक्रम आढळला नाही`
                        : `No events found for "${searchQuery}"`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

            {/* =================================================
                LANGUAGE SWITCH
                En / म
                Active language = ORANGE
                ================================================= */}
            <div
              className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 sm:flex"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`min-w-[34px] rounded-lg px-2 py-1.5 text-[11px] font-black transition-all ${language === 'en'
                  ? 'bg-[#ea580c] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                aria-pressed={language === 'en'}
              >
                En
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange('mr')}
                className={`min-w-[34px] rounded-lg px-2 py-1.5 text-[11px] font-black transition-all ${language === 'mr'
                  ? 'bg-[#ea580c] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                aria-pressed={language === 'mr'}
              >
                म
              </button>
            </div>

            {/* USER / ACCOUNT */}
            {user ? (
              <div
                ref={userMenuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-bold transition ${userMenuOpen
                    ? 'border-orange-300 bg-orange-50 text-[#ea580c]'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  {/* Fixed profile icon */}
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition ${userMenuOpen
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-orange-100 text-[#ea580c]'
                      }`}
                  >
                    <User className="h-4 w-4" />
                  </span>

                  <span className="hidden sm:block">
                    {language === 'mr' ? 'माझे खाते' : 'My Account'}
                  </span>

                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* ONLY TWO SUB OPTIONS */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-[70] mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">

                    <button
                      type="button"
                      onClick={handleMyTicketsClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-800 transition hover:bg-orange-50 hover:text-[#ea580c]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#ea580c]">
                        <Bookmark className="h-4 w-4" />
                      </span>

                      <span>
                        {language === 'mr'
                          ? 'माझी तिकिटे'
                          : 'My Tickets'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-800 transition hover:bg-orange-50 hover:text-[#ea580c]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <User className="h-4 w-4" />
                      </span>

                      <span>
                        {language === 'mr'
                          ? 'माझे प्रोफाइल'
                          : 'My Profile'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 rounded-xl bg-[#ea580c] px-3 py-2 text-xs font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-[#c2410c] active:scale-95 sm:px-4"
              >
                <User className="h-3.5 w-3.5" />

                <span>
                  {language === 'mr' ? 'लॉगिन' : 'Login'}
                </span>
              </button>
            )}

            {/* Post Event / Partner CTA Desktop */}
            <button
              type="button"
              onClick={handleOpenPartnerModal}
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100/80 px-3 py-2 text-xs font-bold text-[#ea580c] transition active:scale-95"
              title={language === 'mr' ? 'आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा' : 'Post your event on MahaTicket'}
            >
              <Building2 className="h-3.5 w-3.5 text-[#ea580c]" />
              <span>{language === 'mr' ? 'कार्यक्रम पोस्ट करा' : 'Post Event'}</span>
            </button>

            {/* MOBILE MENU */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-orange-300 hover:text-[#ea580c] md:hidden"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* ===================================================
            MOBILE CITY + LANGUAGE
            =================================================== */}
        <div className="flex items-center gap-2 pb-2 pt-1 sm:hidden">

          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ea580c]" />

            <select
              value={selectedCity}
              onChange={(event) => handleCityChange(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs font-bold text-slate-800 outline-none focus:border-[#ea580c]"
              aria-label="Select city"
            >
              {cityList.map((city) => (
                <option key={city} value={city}>
                  {city === 'महाराष्ट्र (All)'
                    ? language === 'mr'
                      ? 'सर्व महाराष्ट्र'
                      : 'All Maharashtra'
                    : city}
                </option>
              ))}
            </select>

            {detectingCity ? (
              <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#ea580c]" />
            ) : (
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            )}
          </div>

          {/* Mobile En / म switch */}
          <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${language === 'en'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'text-slate-500'
                }`}
              aria-pressed={language === 'en'}
            >
              En
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('mr')}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${language === 'mr'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'text-slate-500'
                }`}
              aria-pressed={language === 'mr'}
            >
              म
            </button>
          </div>
        </div>

        {/* ===================================================
            MOBILE MENU
            =================================================== */}
        {mobileMenuOpen && (
          <div className="space-y-2 border-t border-slate-100 bg-white py-3 md:hidden">

            {/* My Tickets */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleMyTicketsClick();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-bold text-[#ea580c]"
            >
              <Bookmark className="h-4 w-4" />

              <span>
                {language === 'mr'
                  ? 'माझी तिकिटे'
                  : 'My Tickets'}
              </span>
            </button>

            {/* My Profile */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleProfileClick();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800"
            >
              <User className="h-4 w-4 text-[#ea580c]" />

              <span>
                {language === 'mr'
                  ? 'माझे प्रोफाइल'
                  : 'My Profile'}
              </span>
            </button>

            {/* Login only when not authenticated */}
            {!user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLoginClick();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-3 py-2.5 text-xs font-bold text-white"
              >
                <User className="h-4 w-4" />

                <span>
                  {language === 'mr'
                    ? 'लॉगिन करा'
                    : 'Login'}
                </span>
              </button>
            )}

            {/* Post Event / Partner */}
            <button
              type="button"
              onClick={() => {
                handleOpenPartnerModal();
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-bold text-[#ea580c] transition hover:bg-orange-100"
            >
              <Building2 className="h-4 w-4 text-[#ea580c]" />

              <span>
                {language === 'mr'
                  ? 'कार्यक्रम पोस्ट करा'
                  : 'Post Event'}
              </span>
            </button>

            {/* Install */}
            {isInstallable && (
              <button
                type="button"
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white"
              >
                <Download className="h-4 w-4 text-orange-400" />

                <span>{t.installApp}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          LIVE CITY DETECTED MINI BANNER
          ===================================================== */}
      {cityDetectedLive && selectedCity !== 'महाराष्ट्र (All)' && (
        <div className="border-t border-orange-100 bg-orange-50">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 px-4 py-1.5 text-[10px] font-bold text-orange-700">
            <Navigation className="h-3 w-3" />

            <span>
              {language === 'mr'
                ? `तुमचे शहर ${selectedCity} निवडले आहे`
                : `${selectedCity} selected for you`}
            </span>
          </div>
        </div>
      )}

      {/* =====================================================
          AUTH MODAL
          ===================================================== */}
      <AuthModal
        isOpen={authModalOpen}
        initialMessage={authModalMessage}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          checkUserSession();
          handleOpenMyTickets();
        }}
      />
    </header>
  );
};
