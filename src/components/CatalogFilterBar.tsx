'use client';

import React from 'react';
import { Language, translations } from '../lib/i18n.ts';
import {
  SlidersHorizontal,
  Calendar,
  IndianRupee,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface CatalogFilterBarProps {
  language: Language;
  priceRange: number;
  onPriceRangeChange: (price: number) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  customDate: string;
  onCustomDateChange: (date: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

const PRESET_BUDGETS = [
  { labelEn: 'All', labelMr: 'सर्व', value: 2000 },
  { labelEn: '< ₹300', labelMr: '< ₹३००', value: 300 },
  { labelEn: '< ₹500', labelMr: '< ₹५००', value: 500 },
  { labelEn: '< ₹1,000', labelMr: '< ₹१०००', value: 1000 },
];

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  language,
  priceRange,
  onPriceRangeChange,
  selectedDate,
  onDateChange,
  customDate,
  onCustomDateChange,
  onResetFilters,
  totalFiltered,
}) => {
  const isFilterActive = priceRange < 2000 || selectedDate !== 'all' || customDate !== '';

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Filter Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{language === 'mr' ? 'किंमत व तारीख फिल्टर' : 'Price & Date Filters'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {totalFiltered} {language === 'mr' ? 'उपलब्ध' : 'found'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'mr'
                ? 'आपल्या बजेट आणि नियोजनानुसार कार्यक्रम शोधा'
                : 'Filter experiences by ticket budget and preferred show date'}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Reset */}
        {isFilterActive && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'mr' ? 'फिल्टर रीसेट करा' : 'Reset Filters'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center pt-1 border-t border-slate-800/60">
        {/* 1. Price Range Slider (5 Columns on Desktop) */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'mr' ? 'कमाल तिकीट बजेट:' : 'Max Ticket Budget:'}</span>
            </span>
            <span className="font-bold text-sm text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {priceRange >= 2000
                ? language === 'mr'
                  ? 'सर्व किमती (₹० - ₹२,०००+)'
                  : 'Any Price (Up to ₹2,000+)'
                : `₹${priceRange} ${language === 'mr' ? 'पर्यंत' : 'max'}`}
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="relative pt-1">
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={priceRange}
              onChange={(e) => onPriceRangeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium px-0.5 pt-1">
              <span>₹100</span>
              <span>₹500</span>
              <span>₹1,000</span>
              <span>₹1,500</span>
              <span>₹2,000+</span>
            </div>
          </div>

          {/* Quick Price Preset Chips */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
            {PRESET_BUDGETS.map((chip) => {
              const isSelected = priceRange === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => onPriceRangeChange(chip.value)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {language === 'mr' ? chip.labelMr : chip.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Date Picker Dropdown & Exact Date Input (6 Columns on Desktop) */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'mr' ? 'तारीख निवडा:' : 'Showtimes Date:'}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {customDate
                ? customDate
                : selectedDate === 'all'
                ? language === 'mr'
                  ? 'सर्व आगामी तारखा'
                  : 'All Upcoming'
                : selectedDate === 'today'
                ? language === 'mr'
                  ? 'आज'
                  : 'Today'
                : selectedDate === 'tomorrow'
                ? language === 'mr'
                  ? 'उद्या'
                  : 'Tomorrow'
                : selectedDate === 'weekend'
                ? language === 'mr'
                  ? 'या वीकेंडला'
                  : 'This Weekend'
                : language === 'mr'
                ? 'येत्या ७ दिवसांत'
                : 'Next 7 Days'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Quick Date Dropdown */}
            <div className="relative">
              <select
                value={selectedDate}
                onChange={(e) => {
                  onDateChange(e.target.value);
                  if (e.target.value !== 'custom') {
                    onCustomDateChange('');
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer"
              >
                <option value="all">
                  {language === 'mr' ? '📅 सर्व तारखा (All Dates)' : '📅 All Dates'}
                </option>
                <option value="today">
                  {language === 'mr' ? '⚡ आजचे कार्यक्रम (Today)' : '⚡ Today'}
                </option>
                <option value="tomorrow">
                  {language === 'mr' ? '🌅 उद्या (Tomorrow)' : '🌅 Tomorrow'}
                </option>
                <option value="weekend">
                  {language === 'mr' ? '🎉 शनिवार/रविवार (This Weekend)' : '🎉 This Weekend'}
                </option>
                <option value="week">
                  {language === 'mr' ? '🗓️ पुढील ७ दिवस (Next 7 Days)' : '🗓️ Next 7 Days'}
                </option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Custom Exact Date Picker */}
            <div className="relative">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  onCustomDateChange(e.target.value);
                  if (e.target.value) {
                    onDateChange(e.target.value);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            {language === 'mr'
              ? 'टीप: विशिष्ट तारखेवर किंवा वीकेंडला उपलब्ध असणारे शोज आपोआप दाखवले जातील.'
              : 'Tip: Automatically filters sessions scheduled on the selected date or weekend.'}
          </p>
        </div>
      </div>
    </div>
  );
};
