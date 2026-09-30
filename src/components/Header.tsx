'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { usePWAInstall } from '@/hooks/use-pwa';
import { AuthModal } from './AuthModal.tsx';
import {
  Ticket,
  MapPin,
  Globe,
  Search,
  Bookmark,
  Building2,
  Download,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMyTickets: () => void;
  onOpenPartnerModal: () => void;
  onHomeClick: () => void;
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

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchChange,
  onOpenMyTickets,
  onOpenPartnerModal,
  onHomeClick,
  onCategorySelect,
  availableCities,
}) => {
  const t = translations[language];
  const { isInstallable, install } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityList, setCityList] = useState<string[]>(availableCities || DEFAULT_CITIES);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch('/api/cities');
        if (res.ok) {
          const data = await res.json();
          if (data.cities && Array.isArray(data.cities)) {
            setCityList(data.cities);
          }
        }
      } catch {
        // Fallback to default
      }
    }
    loadCities();
  }, []);

  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/flow/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  // Live search with debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setLiveResults([]);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data.events?.slice(0, 5) || []);
        }
      } catch {
        setLiveResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/flow/logout', { method: 'POST' });
      setUser(null);
      setUserMenuOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMyTicketsClick = () => {
    if (!user) {
      setAuthModalMessage('तिकिटे पाहण्यासाठी कृपया लॉगिन करा (Please sign in to view your tickets)');
      setAuthModalOpen(true);
    } else {
      onOpenMyTickets();
    }
  };

  const handleLoginClick = () => {
    setAuthModalMessage(undefined);
    setAuthModalOpen(true);
  };

  const handleSearchResultClick = (event: any) => {
    setSearchFocused(false);
    onSearchChange('');
    setLiveResults([]);
    if (typeof window !== 'undefined') {
      window.location.href = `/events/${event.id}`;
    }
  };

  const showResults = searchFocused && searchQuery.trim().length > 0;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer select-none shrink-0" onClick={onHomeClick}>
            <div className="w-9 h-9 rounded-2xl bg-[#ea580c] flex items-center justify-center shadow-md shadow-orange-500/25 transform hover:scale-105 transition">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-950 font-serif">
                  {language === 'mr' ? 'महाटिकिट' : 'MahaTicket'}
                </span>
                <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-full bg-orange-100 text-[#ea580c] border border-orange-200">
                  MH
                </span>
              </div>
              <p className="text-[9px] text-slate-500 truncate max-w-[160px]">
                Maharashtra-First Ticket Marketplace
              </p>
            </div>
          </div>

          {/* City Selector */}
          <div className="relative hidden md:flex items-center shrink-0">
            <MapPin className="absolute left-3 w-3.5 h-3.5 text-[#ea580c] pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => { onCityChange(e.target.value); localStorage.setItem('mahaticket_user_city', e.target.value); }}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs font-bold text-slate-800 hover:border-[#ea580c] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 transition appearance-none cursor-pointer max-w-[160px]"
            >
              {cityList.map((c) => (
                <option key={c} value={c} className="bg-white text-slate-900">
                  {c === 'महाराष्ट्र (All)' ? t.allMaharashtra : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* LIVE SEARCH BAR — Full width, prominent */}
          <div className="flex-1 max-w-md relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'नाटक, संगीत, कार्यक्रम शोधा...' : 'Search plays, music, events...'}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-[#ea580c] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); setLiveResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {searching && !searchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {searching ? (
                  <div className="flex items-center gap-3 px-4 py-3 text-xs text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>शोधत आहे...</span>
                  </div>
                ) : liveResults.length > 0 ? (
                  <>
                    <div className="px-4 pt-2.5 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-[#ea580c]" />
                        <span>शोध परिणाम ({liveResults.length} कार्यक्रम)</span>
                      </p>
                    </div>
                    {liveResults.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handleSearchResultClick(ev)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                          {ev.posterUrl ? (
                            <img src={ev.posterUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#ea580c]">
                              <Ticket className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-[#ea580c] truncate transition">
                            {ev.titleMr || ev.title}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{ev.venue?.nameMr || ev.venue?.name || ''} · {ev.venue?.city || ''}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-[10px] font-bold text-[#ea580c] bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                          ₹{ev.minPrice || '—'}
                        </div>
                      </button>
                    ))}
                    <div className="px-4 py-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 text-center">Enter दाबा किंवा वरील कार्यक्रम निवडा</p>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-4 text-xs text-slate-500 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-300" />
                    <span>"{searchQuery}" साठी कोणताही कार्यक्रम आढळला नाही</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switch */}
            <button
              onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{language === 'mr' ? 'EN' : 'मरा'}</span>
            </button>

            {/* My Tickets Button */}
            <button
              onClick={handleMyTicketsClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-xs font-extrabold text-[#ea580c] transition shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t.myTickets}</span>
            </button>

            {/* Auth Button / User Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-[10px]">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline truncate max-w-[90px]">
                    {user.fullName || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">लॉगिन केले आहे</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); onOpenMyTickets(); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-800 hover:bg-orange-50 hover:text-[#ea580c] transition flex items-center gap-2"
                    >
                      <Bookmark className="w-4 h-4 text-[#ea580c]" />
                      <span>माझी तिकिटे</span>
                    </button>
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-xs font-bold text-slate-800 hover:bg-orange-50 hover:text-[#ea580c] transition"
                    >
                      माझे प्रोफाइल
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      लॉगआउट
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-extrabold transition shadow-md shadow-orange-500/20 active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>लॉगिन</span>
              </button>
            )}

            {/* PWA Install */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden xl:inline">{t.installApp}</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile City Bar */}
        <div className="sm:hidden pb-2 pt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#ea580c] pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => { onCityChange(e.target.value); localStorage.setItem('mahaticket_user_city', e.target.value); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-6 py-1.5 text-xs font-bold text-[#ea580c] appearance-none cursor-pointer focus:outline-none focus:border-[#ea580c]"
            >
              {cityList.map((c) => (
                <option key={c} value={c}>
                  {c === 'महाराष्ट्र (All)' ? 'सर्व महाराष्ट्र' : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shrink-0"
          >
            {language === 'mr' ? 'EN' : 'मरा'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-2 bg-white">
            <button
              onClick={() => { setMobileMenuOpen(false); handleMyTicketsClick(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-orange-50 text-xs font-bold text-[#ea580c] border border-orange-200"
            >
              <Bookmark className="w-4 h-4" />
              <span>{t.myTickets}</span>
            </button>

            {!user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); handleLoginClick(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-bold"
              >
                <User className="w-4 h-4" />
                <span>लॉगिन करा</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-50 text-xs font-bold text-rose-600 border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                <span>लॉगआउट करा</span>
              </button>
            )}

            <button
              onClick={() => { onOpenPartnerModal(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{t.partnerWithUs}</span>
            </button>

            {isInstallable && (
              <button
                onClick={() => { install(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>{t.installApp}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMessage={authModalMessage}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          checkUserSession();
          onOpenMyTickets();
        }}
      />
    </header>
  );
};
