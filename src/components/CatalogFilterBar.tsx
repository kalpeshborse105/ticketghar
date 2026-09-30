'use client';

import React from 'react';
import { Language } from '../lib/i18n.ts';
import {
  SlidersHorizontal,
  Calendar,
  IndianRupee,
  RotateCcw,
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
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {/* Left: Filter Header */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center text-[#6366f1]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#111827] flex items-center gap-2">
              <span>{language === 'mr' ? 'किंमत व तारीख फिल्टर' : 'Price & Date Filters'}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#f5f5f5] text-[#6366f1] border border-[#e5e7eb]">
                {totalFiltered} {language === 'mr' ? 'उपलब्ध' : 'found'}
              </span>
            </h3>
          </div>
        </div>

        {/* Right: Quick Action Reset */}
        {isFilterActive && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#f5f5f5] hover:bg-[#e5e5e5] border border-[#e5e7eb] text-[11px] font-medium text-[#6b7280] hover:text-[#111827] transition"
          >
            <RotateCcw className="w-3 h-3 text-[#6366f1]" />
            <span>{language === 'mr' ? 'रीसेट' : 'Reset'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#e5e7eb]">
        {/* 1. Price Range Slider */}
        <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#111827] flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>{language === 'mr' ? 'कमाल बजेट:' : 'Max Budget:'}</span>
            </span>
            <span className="font-bold text-xs text-[#6366f1] bg-[#6366f1]/10 px-1.5 py-0.5 rounded border border-[#6366f1]/20">
              {priceRange >= 2000
                ? language === 'mr'
                  ? 'सर्व किमती'
                  : 'Any Price'
                : `₹${priceRange} ${language === 'mr' ? 'पर्यंत' : 'max'}`}
            </span>
          </div>

          <div className="relative pt-1">
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={priceRange}
              onChange={(e) => onPriceRangeChange(Number(e.target.value))}
              className="w-full h-1.5 bg-[#e5e7eb] rounded-lg appearance-none cursor-pointer accent-[#6366f1] focus:outline-none"
            />
          </div>

          {/* Quick Price Preset Chips */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
            {PRESET_BUDGETS.map((chip) => {
              const isSelected = priceRange === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => onPriceRangeChange(chip.value)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#6366f1] text-white font-semibold'
                      : 'bg-white text-[#6b7280] hover:text-[#111827] border border-[#e5e7eb]'
                  }`}
                >
                  {language === 'mr' ? chip.labelMr : chip.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Date Picker Dropdown & Exact Date Input */}
        <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#111827] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>{language === 'mr' ? 'तारीख निवडा:' : 'Select Date:'}</span>
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
                className="w-full bg-white border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:border-[#6366f1]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 appearance-none cursor-pointer"
              >
                <option value="all">{language === 'mr' ? 'सर्व तारखा' : 'All Dates'}</option>
                <option value="today">{language === 'mr' ? 'आजचे कार्यक्रम' : 'Today'}</option>
                <option value="tomorrow">{language === 'mr' ? 'उद्या' : 'Tomorrow'}</option>
                <option value="weekend">{language === 'mr' ? 'या वीकेंडला' : 'This Weekend'}</option>
                <option value="week">{language === 'mr' ? 'पुढील ७ दिवस' : 'Next 7 Days'}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
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
                className="w-full bg-white border border-[#e5e7eb] rounded-lg px-2.5 py-1 text-xs font-medium text-[#111827] hover:border-[#6366f1]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
