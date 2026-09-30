import React from 'react';
import { Language } from '../lib/types';
import { SlidersHorizontal, RotateCcw, IndianRupee } from 'lucide-react';
import { ModernDatePicker } from './ui/ModernDatePicker';

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
  sortBy?: 'date' | 'price_asc' | 'price_desc';
  onSortByChange?: (sort: 'date' | 'price_asc' | 'price_desc') => void;
}

const BUDGET_PLANS = [
  { labelMr: 'सर्व दर', labelEn: 'All Prices', value: 2000 },
  { labelMr: '₹३०० पर्यंत', labelEn: 'Under ₹300', value: 300 },
  { labelMr: '₹५०० पर्यंत', labelEn: 'Under ₹500', value: 500 },
  { labelMr: '₹१००० पर्यंत', labelEn: 'Under ₹1000', value: 1000 },
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
  sortBy = 'date',
  onSortByChange,
}) => {
  const isFilterActive = priceRange < 2000 || selectedDate !== 'all' || customDate !== '' || sortBy !== 'date';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
      {/* Header Row: Filter title + Active Reset + Quick Sort */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ea580c] shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-extrabold text-slate-900 font-serif">
            {language === 'mr' ? 'तारीख, दर व क्रम' : 'Date, Price & Sort'}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#ea580c] border border-orange-200">
            {totalFiltered} {language === 'mr' ? 'उपलब्ध' : 'events'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting Dropdown/Selector */}
          {onSortByChange && (
            <div className="flex items-center gap-1 text-[11px]">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                aria-label={language === 'mr' ? 'क्रमवारी' : 'Sort by'}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-2 py-1 outline-none hover:border-orange-300 cursor-pointer"
              >
                <option value="date">{language === 'mr' ? '⚡ लवकर होणारे प्रयोग' : '⚡ Soonest First'}</option>
                <option value="price_asc">{language === 'mr' ? '💰 कमी दर आधी' : '💰 Price: Low to High'}</option>
                <option value="price_desc">{language === 'mr' ? '💎 जास्त दर आधी' : '💎 Price: High to Low'}</option>
              </select>
            </div>
          )}

          {isFilterActive && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#ea580c]" />
              <span className="hidden sm:inline">{language === 'mr' ? 'फिल्टर काढा' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1: BookMyShow Modern Date Strip */}
      <div className="pt-0.5">
        <ModernDatePicker
          selectedDate={selectedDate}
          customDate={customDate}
          onSelectDate={(dateKey, customDateStr) => {
            onDateChange(dateKey);
            onCustomDateChange(customDateStr || (dateKey !== 'all' && dateKey !== 'today' && dateKey !== 'tomorrow' ? dateKey : ''));
          }}
          language={language}
        />
      </div>

      {/* Row 2: Sleek Budget Plan Chips — Mobile swipeable */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap pb-0.5">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mr-1 shrink-0">
          <IndianRupee className="w-3 h-3 text-[#ea580c]" />
          <span>{language === 'mr' ? 'बजेट:' : 'Budget:'}</span>
        </div>
        {BUDGET_PLANS.map((plan) => {
          const isSelected = priceRange === plan.value;
          return (
            <button
              key={plan.value}
              type="button"
              onClick={() => onPriceRangeChange(plan.value)}
              className={`text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:text-[#ea580c] border border-slate-200 hover:border-orange-300'
              }`}
            >
              {language === 'mr' ? plan.labelMr : plan.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
