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
    <header className="sticky top-0 z-40 bg-white border-b border-[#e5e7eb] text-[#111827] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onHomeClick}>
            <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center shadow-sm transform hover:scale-105 transition">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#111827]">
                  {language === 'mr' ? 'महाटिकिट' : 'MahaTicket'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/30">
                  MH
                </span>
              </div>
              <p className="text-[10px] text-[#6b7280] hidden sm:block truncate max-w-[200px]">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* City Selector */}
          <div className="relative hidden md:flex items-center">
            <MapPin className="absolute left-3 w-4 h-4 text-[#6366f1] pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-white border border-[#e5e7eb] rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-[#111827] hover:border-[#6366f1]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition appearance-none cursor-pointer"
            >
              {cityList.map((c) => (
                <option key={c} value={c} className="bg-white text-[#111827]">
                  {c === 'महाराष्ट्र (All)' ? t.allMaharashtra : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          </div>

          {/* Quick Categories for Desktop */}
          <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-[#6b7280]">
            <button onClick={() => onCategorySelect?.('plays')} className="hover:text-[#6366f1] transition">
              {language === 'mr' ? 'नाटक' : 'Theatre'}
            </button>
            <button onClick={() => onCategorySelect?.('movies')} className="hover:text-[#6366f1] transition">
              {language === 'mr' ? 'चित्रपट' : 'Movies'}
            </button>
            <button onClick={() => onCategorySelect?.('music')} className="hover:text-[#6366f1] transition">
              {language === 'mr' ? 'संगीत' : 'Music'}
            </button>
            <button onClick={() => onCategorySelect?.('comedy')} className="hover:text-[#6366f1] transition">
              {language === 'mr' ? 'कॉमेडी' : 'Comedy'}
            </button>
          </nav>

          {/* Search Bar */}
          <div className="flex-1 max-w-sm mx-2 relative hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-[#e5e7eb] rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] transition"
            />
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f5f5f5] text-xs font-medium text-[#111827] transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            {/* My Tickets */}
            <button
              onClick={onOpenMyTickets}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#6366f1] text-xs font-medium text-[#111827] hover:text-[#6366f1] transition"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>{t.myTickets}</span>
            </button>

            {/* Partner With Us */}
            <button
              onClick={onOpenPartnerModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#6366f1] text-xs font-medium text-[#6b7280] hover:text-[#6366f1] transition"
            >
              <Building2 className="w-3.5 h-3.5 text-[#9ca3af]" />
              <span>{t.partnerWithUs}</span>
            </button>

            {/* PWA Install */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white border border-[#e5e7eb] text-[#6b7280] hover:text-[#111827]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & City Bar */}
        <div className="sm:hidden pb-3 pt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-[#e5e7eb] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-white border border-[#e5e7eb] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#6366f1] max-w-[130px] truncate"
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
          <div className="md:hidden border-t border-[#e5e7eb] py-3 space-y-2 bg-white">
            <button
              onClick={() => {
                onOpenMyTickets();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#f5f5f5] text-sm font-medium text-[#111827]"
            >
              <Bookmark className="w-4 h-4 text-[#6366f1]" />
              <span>{t.myTickets}</span>
            </button>
            <button
              onClick={() => {
                onOpenPartnerModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#f5f5f5] text-sm font-medium text-[#111827]"
            >
              <Building2 className="w-4 h-4 text-[#6366f1]" />
              <span>{t.partnerWithUs}</span>
            </button>
            {isInstallable && (
              <button
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#6366f1] text-white font-medium text-sm"
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
