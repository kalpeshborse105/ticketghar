'use client';

import React, { useState, useEffect } from 'react';
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Brand Logo - Orange & White Cinemax Style */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onHomeClick}>
            <div className="w-10 h-10 rounded-2xl bg-[#ea580c] flex items-center justify-center shadow-md shadow-orange-500/25 transform hover:scale-105 transition">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-950 font-serif">
                  {language === 'mr' ? 'महाटिकिट' : 'MahaTicket'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#ea580c] border border-orange-200">
                  MH
                </span>
              </div>
              <p className="text-[10px] text-slate-600 hidden sm:block truncate max-w-[210px] font-medium">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* City Selector */}
          <div className="relative hidden md:flex items-center">
            <MapPin className="absolute left-3 w-4 h-4 text-[#ea580c] pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:border-[#ea580c] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 transition appearance-none cursor-pointer"
            >
              {cityList.map((c) => (
                <option key={c} value={c} className="bg-white text-slate-900">
                  {c === 'महाराष्ट्र (All)' ? t.allMaharashtra : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Categories for Desktop */}
          <nav className="hidden xl:flex items-center gap-4 text-xs font-bold text-slate-600">
            <button
              onClick={() => onCategorySelect?.('plays')}
              className="hover:text-[#ea580c] transition"
            >
              {language === 'mr' ? 'नाटक' : 'Theatre'}
            </button>
            <button
              onClick={() => onCategorySelect?.('movies')}
              className="hover:text-[#ea580c] transition"
            >
              {language === 'mr' ? 'चित्रपट' : 'Movies'}
            </button>
            <button
              onClick={() => onCategorySelect?.('music')}
              className="hover:text-[#ea580c] transition"
            >
              {language === 'mr' ? 'संगीत' : 'Music'}
            </button>
            <button
              onClick={() => onCategorySelect?.('comedy')}
              className="hover:text-[#ea580c] transition"
            >
              {language === 'mr' ? 'कॉमेडी' : 'Comedy'}
            </button>
          </nav>

          {/* Search Bar */}
          <div className="flex-1 max-w-sm mx-2 relative hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c] transition"
            />
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            {/* My Tickets Button */}
            <button
              onClick={handleMyTicketsClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-xs font-extrabold text-[#ea580c] transition shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{t.myTickets}</span>
            </button>

            {/* Auth Button / User Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-[10px]">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {user.fullName || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] text-slate-600 uppercase font-bold">Signed in as</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenMyTickets();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-800 hover:bg-orange-50 hover:text-[#ea580c] transition flex items-center gap-2"
                    >
                      <Bookmark className="w-4 h-4 text-[#ea580c]" />
                      <span>{t.myTickets} (माझी तिकिटे)</span>
                    </button>
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-xs font-bold text-slate-800 hover:bg-orange-50 hover:text-[#ea580c] transition"
                    >
                      माझे प्रोफाइल (My Profile)
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      लॉगआउट (Logout)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-extrabold transition shadow-md shadow-orange-500/20 active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>लॉगिन</span>
              </button>
            )}

            {/* Partner With Us */}
            <button
              onClick={onOpenPartnerModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#ea580c] text-xs font-bold text-slate-700 hover:text-[#ea580c] transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.partnerWithUs}</span>
            </button>

            {/* PWA Install */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & City Bar */}
        <div className="sm:hidden pb-3 pt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-[#ea580c] max-w-[130px] truncate"
          >
            {cityList.map((c) => (
              <option key={c} value={c}>
                {c === 'महाराष्ट्र (All)' ? 'सर्व महाराष्ट्र' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-2 bg-white">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleMyTicketsClick();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-orange-50 text-xs font-bold text-[#ea580c] border border-orange-200"
            >
              <Bookmark className="w-4 h-4 text-[#ea580c]" />
              <span>{t.myTickets}</span>
            </button>

            {!user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLoginClick();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-bold"
              >
                <User className="w-4 h-4" />
                <span>लॉगिन करा (Sign In)</span>
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
              onClick={() => {
                onOpenPartnerModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{t.partnerWithUs}</span>
            </button>

            {isInstallable && (
              <button
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>{t.installApp}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal with smart login flow */}
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
