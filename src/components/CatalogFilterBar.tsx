import React from 'react';
import { Language } from '../lib/types';
import { SlidersHorizontal, RotateCcw, Calendar, IndianRupee, ChevronDown } from 'lucide-react';

interface CatalogFilterBarProps {
  language: Language;
  priceRange: number;
  onPriceRangeChange: (price: number) => void;
  selectedDate: string;
  onDateChange: (dateKey: string) => void;
  customDate: string;
  onCustomDateChange: (dateStr: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

const PRESET_BUDGETS = [
  { labelMr: '₹३०० आत', labelEn: 'Under ₹300', value: 300 },
  { labelMr: '₹५०० आत', labelEn: 'Under ₹500', value: 500 },
  { labelMr: '₹१००० आत', labelEn: 'Under ₹1000', value: 1000 },
  { labelMr: 'सर्व', labelEn: 'All', value: 2000 },
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
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {/* Left: Filter Header */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{language === 'mr' ? 'किंमत व तारीख फिल्टर' : 'Price & Date Filters'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                {totalFiltered} {language === 'mr' ? 'उपलब्ध' : 'found'}
              </span>
            </h3>
          </div>
        </div>

        {/* Right: Quick Action Reset */}
        {isFilterActive && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <RotateCcw className="w-3 h-3 text-orange-600" />
            <span>{language === 'mr' ? 'रीसेट' : 'Reset'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        {/* 1. Price Range Slider */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-orange-600" />
              <span>{language === 'mr' ? 'कमाल बजेट:' : 'Max Budget:'}</span>
            </span>
            <span className="font-extrabold text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
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
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none"
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
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-orange-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {language === 'mr' ? chip.labelMr : chip.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Date Picker Dropdown & Exact Date Input */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
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
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer"
              >
                <option value="all">{language === 'mr' ? 'सर्व तारखा' : 'All Dates'}</option>
                <option value="today">{language === 'mr' ? 'आजचे कार्यक्रम' : 'Today'}</option>
                <option value="tomorrow">{language === 'mr' ? 'उद्या' : 'Tomorrow'}</option>
                <option value="weekend">{language === 'mr' ? 'या वीकेंडला' : 'This Weekend'}</option>
                <option value="week">{language === 'mr' ? 'पुढील ७ दिवस' : 'Next 7 Days'}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
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
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-900 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
