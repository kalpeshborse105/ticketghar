'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Language } from '@/src/lib/types';

interface ModernDatePickerProps {
  selectedDate: string; // 'all' | 'today' | 'tomorrow' | 'weekend' | 'YYYY-MM-DD'
  customDate: string;
  onSelectDate: (dateKey: string, customDateStr?: string) => void;
  language: Language;
}

const MARATHI_MONTHS = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const MARATHI_DAYS_SHORT = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  selectedDate,
  customDate,
  onSelectDate,
  language,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate next 7 days for quick strip
  const quickDays: Array<{
    dateStr: string;
    dayName: string;
    dateNum: number;
    monthName: string;
    isToday: boolean;
    isTomorrow: boolean;
  }> = [];

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayIndex = d.getDay();
    const monthIndex = d.getMonth();

    quickDays.push({
      dateStr,
      dayName: language === 'mr' ? MARATHI_DAYS_SHORT[dayIndex] : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      monthName: language === 'mr' ? MARATHI_MONTHS[monthIndex].slice(0, 4) : d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }

  // Calendar grid generator
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handlePickDate = (dNum: number) => {
    const picked = new Date(year, month, dNum);
    const formatted = picked.toISOString().split('T')[0];
    onSelectDate(formatted, formatted);
    setCalendarOpen(false);
  };

  const isCurrentSelection = (dStr: string) => {
    return customDate === dStr || selectedDate === dStr;
  };

  return (
    <div className="space-y-2">
      {/* Horizontal BookMyShow style Quick Date Strip — Smooth swipeable on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap touch-pan-x -mx-1 px-1">
        {/* All Dates pill */}
        <button
          type="button"
          onClick={() => onSelectDate('all', '')}
          className={`flex items-center justify-center px-3.5 py-2 rounded-2xl text-xs font-black transition whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
            selectedDate === 'all' && !customDate
              ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/25 border border-transparent'
              : 'bg-white text-slate-700 hover:text-[#ea580c] border border-slate-200 hover:border-orange-300'
          }`}
        >
          {language === 'mr' ? 'सर्व तारखा' : 'All Dates'}
        </button>

        {/* Quick Days */}
        {quickDays.map((q) => {
          const isSelected = isCurrentSelection(q.dateStr) || (q.isToday && selectedDate === 'today') || (q.isTomorrow && selectedDate === 'tomorrow');
          return (
            <button
              key={q.dateStr}
              type="button"
              onClick={() => {
                if (q.isToday) onSelectDate('today', q.dateStr);
                else if (q.isTomorrow) onSelectDate('tomorrow', q.dateStr);
                else onSelectDate(q.dateStr, q.dateStr);
              }}
              className={`flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] px-2.5 py-1.5 rounded-2xl transition cursor-pointer active:scale-95 shrink-0 border ${
                isSelected
                  ? 'bg-gradient-to-b from-orange-500 to-[#ea580c] text-white border-[#ea580c] shadow-md shadow-orange-500/30'
                  : 'bg-white text-slate-800 hover:text-[#ea580c] border-slate-200 hover:border-orange-300'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                {q.isToday ? (language === 'mr' ? 'आज' : 'Today') : q.isTomorrow ? (language === 'mr' ? 'उद्या' : 'Tom') : q.dayName}
              </span>
              <span className="text-sm sm:text-base font-black leading-tight">
                {q.dateNum}
              </span>
              <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                {q.monthName}
              </span>
            </button>
          );
        })}

        {/* Calendar Picker Modal Trigger */}
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 shrink-0 border ${
            customDate && !quickDays.some((q) => q.dateStr === customDate)
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50 text-slate-700 hover:text-[#ea580c] border-slate-200 hover:border-orange-300'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>{customDate || (language === 'mr' ? 'कॅलेंडर' : 'Calendar')}</span>
        </button>
      </div>

      {/* Modern Popover Calendar Modal */}
      {calendarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#ea580c]" />
                <h4 className="font-extrabold text-sm text-slate-900 font-serif">
                  {language === 'mr' ? MARATHI_MONTHS[month] : currentMonth.toLocaleDateString('en-US', { month: 'long' })} {year}
                </h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
              {(language === 'mr' ? MARATHI_DAYS_SHORT : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((d, i) => (
                <div key={i} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dObj = new Date(year, month, dayNum);
                const dStr = dObj.toISOString().split('T')[0];
                const isSelected = customDate === dStr;
                const isPast = dObj.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isPast}
                    onClick={() => handlePickDate(dayNum)}
                    className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      isPast
                        ? 'text-slate-300 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                        : 'hover:bg-orange-50 hover:text-[#ea580c] text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  onSelectDate('all', '');
                  setCalendarOpen(false);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                {language === 'mr' ? 'सर्व तारखा दाखवा' : 'Show All'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = today.toISOString().split('T')[0];
                  onSelectDate('today', todayStr);
                  setCalendarOpen(false);
                }}
                className="text-[#ea580c] font-bold hover:underline cursor-pointer"
              >
                {language === 'mr' ? 'आजचे कार्यक्रम' : "Today's Events"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
