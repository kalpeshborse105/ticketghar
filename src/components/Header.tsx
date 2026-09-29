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
  ShieldCheck,
  Download,
  Menu,
  X,
  ChevronDown,
  Sparkles,
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
  onOpenAdmin: () => void;
  onHomeClick: () => void;
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
  onOpenAdmin,
  onHomeClick,
  availableCities,
}) => {
  const t = translations[language];
  const { isInstallable, install } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityList, setCityList] = useState<string[]>(availableCities || DEFAULT_CITIES);

  // Fetch dynamic cities from API if available
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
      } catch (e) {
        // Fallback to default
      }
    }
    loadCities();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onHomeClick}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 transform hover:scale-105 transition">
              <Ticket className="w-6 h-6 text-slate-950 transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white font-serif">
                  {language === 'mr' ? 'तिकीटघर' : 'TicketGhar'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
            <MapPin className="absolute left-3 w-4 h-4 text-amber-400 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500 transition appearance-none cursor-pointer"
            >
              {cityList.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c === 'महाराष्ट्र (All)' ? t.allMaharashtra : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-2 relative hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 transition"
            />
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={() => onLanguageChange(language === 'mr' ? 'en' : 'mr')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-400 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            {/* My Tickets */}
            <button
              onClick={onOpenMyTickets}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.myTickets}</span>
            </button>

            {/* Partner With Us */}
            <button
              onClick={onOpenPartnerModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-xs font-medium text-slate-300 hover:text-amber-400 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.partnerWithUs}</span>
            </button>

            {/* Prominent Admin Console Button */}
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 text-xs font-bold transition shadow-sm"
              title="Visit Admin Control Panel (सुपर ॲडमिन, ऑपरेशन्स, लेजर, गेट स्कॅनर)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">
                {language === 'mr' ? 'ॲडमिन कक्ष' : 'Admin Panel'}
              </span>
              <span className="sm:hidden font-bold">Admin</span>
            </button>

            {/* PWA Install */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-400 max-w-[130px] truncate"
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
          <div className="md:hidden border-t border-slate-800 py-3 space-y-2">
            <button
              onClick={() => {
                onOpenAdmin();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm font-bold text-amber-400"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{language === 'mr' ? 'ॲडमिन कंट्रोल कक्ष' : 'Admin Control Center'}</span>
            </button>
            <button
              onClick={() => {
                onOpenMyTickets();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 text-sm font-medium text-slate-200"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>{t.myTickets}</span>
            </button>
            <button
              onClick={() => {
                onOpenPartnerModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 text-sm font-medium text-slate-200"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>{t.partnerWithUs}</span>
            </button>
            {isInstallable && (
              <button
                onClick={() => {
                  install();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm"
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
