'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { usePWAInstall } from '@/hooks/use-pwa';
import { AuthModal } from './AuthModal.tsx';
import { TheatreMaskLogo } from './ui/TheatreMaskLogo';
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
  Check,
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
      window.location.href = '/my-tickets';
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
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
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
      let u = data.user || null;
      if (u && typeof window !== 'undefined') {
        const localAvatar =
          localStorage.getItem('mahaticket_user_avatar') ||
          (u.email ? localStorage.getItem(`mahaticket_avatar_${u.email}`) : null);
        if (localAvatar && !u.avatarUrl) {
          u = { ...u, avatarUrl: localAvatar };
        }
      }
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserSession();

    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        setUser((prev: any) => ({
          ...(prev || {}),
          ...e.detail,
          avatarUrl: e.detail.avatarUrl || prev?.avatarUrl,
        }));
      }
      checkUserSession();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mahaticket_user_avatar' && e.newValue) {
        setUser((prev: any) => (prev ? { ...prev, avatarUrl: e.newValue } : prev));
      }
    };

    window.addEventListener('mahaticket_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('mahaticket_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
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

      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setCityDropdownOpen(false);
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
    <header className="sticky top-0 z-50 w-full bg-white/95 text-[#141B2B] shadow-[0_1px_6px_rgba(0,0,0,0.03)] backdrop-blur-md">
      <div className="mx-auto max-w-[1280px] px-3 sm:px-5 lg:px-8">
        {/* Tier 1: Brand, City, Search, Actions */}
        <div className="flex h-16 items-center justify-between gap-3 md:gap-5">
          {/* Brand & City */}
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <button
              type="button"
              onClick={handleHomeClickAction}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
              aria-label="MahaTicket Home"
            >
              <img
                src="/logo.png"
                alt="MahaTicket Logo"
                className="w-14 h-14 object-contain rounded-xl shrink-0 group-hover:scale-105 transition-transform drop-shadow-xs"
              />

              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tight">
                  {language === 'mr' ? (
                    <>
                      <span className="text-[#EA580C]">महा</span>
                      <span className="text-[#141B2B]">टिकिट</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#EA580C]">MAHA</span>
                      <span className="text-[#141B2B]">TICKET</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold mt-0.5 flex items-center">
                  <span className="text-[#EA580C]">MAHA</span>
                  <span className="text-[#141B2B]">TICKET</span>
                </span>
              </div>
            </button>

            {/* Modern City Selector Dropdown */}
            <div ref={cityDropdownRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setCityDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 border border-orange-200/70 px-2.5 sm:px-3 py-1.5 font-bold text-xs text-[#141B2B] shadow-xs transition-all active:scale-95 cursor-pointer"
                aria-label="Select city"
                aria-expanded={cityDropdownOpen}
              >
                <MapPin className="h-4 w-4 text-[#EA580C] shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[130px]">
                  {selectedCity === 'महाराष्ट्र (All)' ? t.allMaharashtra : selectedCity}
                </span>
                {detectingCity ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EA580C]" />
                ) : (
                  <ChevronDown className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-200 ${cityDropdownOpen ? 'rotate-180 text-[#EA580C]' : ''}`} />
                )}
              </button>

              {cityDropdownOpen && (
                <div className="absolute left-0 top-full z-[70] mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {language === 'mr' ? 'पसंतीचे शहर निवडा' : 'Select City'}
                    </span>
                    <span className="text-[10px] text-[#EA580C] font-semibold">
                      {cityList.length} {language === 'mr' ? 'शहरे' : 'Cities'}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0.5">
                    {cityList.map((city) => {
                      const isSelected = selectedCity === city;
                      const label = city === 'महाराष्ट्र (All)' ? t.allMaharashtra : city;
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            handleCityChange(city);
                            setCityDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${isSelected
                              ? 'bg-[#EA580C] text-white shadow-xs font-bold'
                              : 'text-slate-800 hover:bg-orange-50 hover:text-[#EA580C]'
                            }`}
                        >
                          <span className="truncate">{label}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div ref={searchRef} className="relative hidden md:block flex-1 max-w-xl mx-2">
            <div className="relative flex items-center w-full">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#64748B]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  language === 'mr'
                    ? 'कार्यक्रम, कलाकार, नाटक, संगीत शोधा...'
                    : 'Search plays, artists, venues, music...'
                }
                autoComplete="off"
                spellCheck={false}
                className="w-full h-10 pl-10 pr-9 rounded-full bg-[#FFF7ED] border border-[#E5E7EB] text-xs font-medium text-[#141B2B] placeholder:text-[#64748B] focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all"
                aria-label="Search events"
              />
              {searching ? (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-[#EA580C]" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSearchChange('');
                    setLiveResults([]);
                    setSearchFocused(false);
                  }}
                  className="absolute right-3 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
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
                    <Loader2 className="h-4 w-4 animate-spin text-[#EA580C]" />
                    <span>{language === 'mr' ? 'कार्यक्रम शोधत आहे...' : 'Searching events...'}</span>
                  </div>
                ) : liveResults.length > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2">
                      <TrendingUp className="h-3.5 w-3.5 text-[#EA580C]" />
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
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {event.posterUrl ? (
                            <img src={event.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#EA580C]">
                              <Ticket className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900 group-hover:text-[#EA580C]">
                            {language === 'mr' ? event.titleMr || event.title : event.title || event.titleMr}
                          </p>
                          <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{event.venue?.nameMr || event.venue?.name || ''}</span>
                          </p>
                        </div>
                        <div className="shrink-0 rounded-md bg-[#FFF7ED] px-2 py-1 text-[10px] font-bold text-[#EA580C]">
                          {event.minPrice ? `₹${event.minPrice}` : 'View'}
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-4 text-xs text-slate-500">
                    <Search className="h-4 w-4 text-slate-300" />
                    <span>{language === 'mr' ? `"${searchQuery}" साठी कार्यक्रम आढळला नाही` : `No events found`}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Post Event / Partner */}
            <button
              type="button"
              onClick={handleOpenPartnerModal}
              className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FFF7ED] hover:bg-orange-100 text-[#A33900] text-xs font-bold transition-colors"
            >
              {language === 'mr' ? 'कार्यक्रम आयोजित करा' : 'List Your Show'}
            </button>

            {/* My Tickets */}
            <button
              type="button"
              onClick={handleMyTicketsClick}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#64748B] hover:text-[#141B2B] transition-colors"
            >
              <Bookmark className="h-4 w-4" />
              <span>{language === 'mr' ? 'माझी तिकिटे' : 'My Tickets'}</span>
            </button>

            {/* Language Switch Pill */}
            <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-[#FFF7ED] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${language === 'en' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#64748B]'
                  }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('mr')}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${language === 'mr' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#64748B]'
                  }`}
              >
                म
              </button>
            </div>

            {/* User Profile Avatar / Menu */}
            {user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="w-8 h-8 rounded-full bg-[#A33900] overflow-hidden flex items-center justify-center text-white shadow-sm hover:opacity-90 transition border border-orange-200"
                  title={user.fullName || (language === 'mr' ? 'माझे प्रोफाइल' : 'My Profile')}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-[70] mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 mb-1">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || 'User'}
                          className="w-7 h-7 rounded-full object-cover border border-orange-300 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.fullName || 'User'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleMyTicketsClick}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-orange-50 hover:text-[#EA580C]"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{language === 'mr' ? 'माझी तिकिटे' : 'My Tickets'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-orange-50 hover:text-[#EA580C]"
                    >
                      <User className="h-4 w-4" />
                      <span>{language === 'mr' ? 'माझे प्रोफाइल' : 'Profile'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <span>{language === 'mr' ? 'लॉगआउट' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLoginClick}
                className="w-8 h-8 rounded-full bg-[#A33900] flex items-center justify-center text-white shadow-sm hover:opacity-90 transition"
                title={language === 'mr' ? 'लॉगिन करा' : 'Login'}
              >
                <User className="h-4 w-4" />
              </button>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || 'User'}
                  className="w-5 h-5 rounded-full object-cover border border-orange-300 shrink-0"
                />
              ) : (
                <User className="h-4 w-4 text-[#ea580c] shrink-0" />
              )}

              <span className="truncate">
                {user?.fullName || (language === 'mr' ? 'माझे प्रोफाइल' : 'My Profile')}
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
