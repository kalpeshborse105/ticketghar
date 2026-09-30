'use client';

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { usePWAInstall } from '@/hooks/use-pwa';
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

  return (
    <header className="sticky top-0 z-40 bg-[#0d131f] border-b border-[#243044] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onHomeClick}>
            <div className="w-10 h-10 rounded-xl bg-[#ea580c] flex items-center justify-center shadow-md transform hover:scale-105 transition">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                  {language === 'mr' ? 'महाटिकिट' : 'MahaTicket'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/30">
                  MH
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[200px]">
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
              className="bg-[#111827] border border-[#243044] rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-200 hover:border-[#ea580c]/50 focus:outline-none focus:ring-1 focus:ring-[#ea580c] transition appearance-none cursor-pointer"
            >
              {cityList.map((c) => (
                <option key={c} value={c} className="bg-[#111827] text-white">
                  {c === 'महाराष्ट्र (All)' ? t.allMaharashtra : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Categories for Desktop */}
          <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-slate-300">
            <button onClick={() => onCategorySelect?.('plays')} className="hover:text-[#ea580c] transition">
              {language === 'mr' ? 'नाटक' : 'Theatre'}
            </button>
            <button onClick={() => onCategorySelect?.('movies')} className="hover:text-[#ea580c] transition">
              {language === 'mr' ? 'चित्रपट' : 'Movies'}
            </button>
            <button onClick={() => onCategorySelect?.('music')} className="hover:text-[#ea580c] transition">
              {language === 'mr' ? 'संगीत' : 'Music'}
            </button>
            <button onClick={() => onCategorySelect?.('comedy')} className="hover:text-[#ea580c] transition">
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
              className="w-full bg-[#111827] border border-[#243044] rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#ea580c] focus:border-[#ea580c] transition"
            />
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#243044] bg-[#111827] hover:bg-[#1a2333] text-xs font-medium text-slate-200 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            {/* My Tickets */}
            <button
              onClick={onOpenMyTickets}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#243044] hover:border-slate-500 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{t.myTickets}</span>
            </button>

            {/* Partner With Us */}
            <button
              onClick={onOpenPartnerModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#243044] hover:border-[#ea580c]/50 text-xs font-medium text-slate-300 hover:text-[#ea580c] transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.partnerWithUs}</span>
            </button>

            {/* PWA Install */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-[#111827] border border-[#243044] text-slate-300 hover:text-white"
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
              className="w-full bg-[#111827] border border-[#243044] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-[#111827] border border-[#243044] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#ea580c] max-w-[130px] truncate"
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
          <div className="md:hidden border-t border-[#243044] py-3 space-y-2 bg-[#0d131f]">
            <button
              onClick={() => {
                onOpenMyTickets();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111827] text-sm font-medium text-slate-200"
            >
              <Bookmark className="w-4 h-4 text-[#ea580c]" />
              <span>{t.myTickets}</span>
            </button>
            <button
              onClick={() => {
                onOpenPartnerModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111827] text-sm font-medium text-slate-200"
            >
              <Building2 className="w-4 h-4 text-[#ea580c]" />
              <span>{t.partnerWithUs}</span>
            </button>
            {isInstallable && (
              <button
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#ea580c] text-white font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span>{t.installApp}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
