'use client';

import React, { useState, useEffect } from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import { Calendar, MapPin, Ticket, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface HeroBannerProps {
  events: EventItem[];
  language: Language;
  onSelectEvent: (event: EventItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  events,
  language,
  onSelectEvent,
}) => {
  const t = translations[language];
  const featured = events.filter((e) => e.featured === 1 || e.category === 'plays');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const current = featured[currentIndex];
  const displayTitle = language === 'mr' ? current.titleMr : current.title;
  const displayCategory = language === 'mr' ? current.categoryMr : current.category;
  const venueName = language === 'mr' ? current.venue?.nameMr : current.venue?.name;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-white border border-[#e5e7eb] shadow-md my-3">
      {/* Background image with solid gradient protection */}
      <div className="relative h-[220px] sm:h-[280px] lg:h-[320px] w-full overflow-hidden">
        <img
          src={current.bannerUrl || current.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111827]/90 via-[#111827]/50 to-transparent" />

        {/* Content Box */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 max-w-2xl">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-600 text-white shadow-sm">
              <Sparkles className="w-3 h-3" />
              {language === 'mr' ? 'विशेष शिफारस' : 'Featured'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/90 text-slate-900 border border-white/20">
              {displayCategory}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-white/80 text-slate-600 border border-white/20">
              {current.language} • {current.durationMinutes} {language === 'mr' ? 'मिनिटे' : 'mins'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight mb-1.5">
            {displayTitle}
          </h1>

          {/* Subtitle / Venue & Timing */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs sm:text-sm text-slate-200 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="font-medium text-white">{venueName}</span>
              <span className="text-slate-300">({current.venue?.city})</span>
            </div>
            {current.sessions && current.sessions.length > 0 && (
              <div className="flex items-center gap-1 text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>
                  {new Date(current.sessions[0].sessionStartTime).toLocaleDateString(
                    language === 'mr' ? 'mr-IN' : 'en-IN',
                    { weekday: 'short', day: 'numeric', month: 'short' }
                  )}
                </span>
                <Clock className="w-3 h-3 text-slate-300 ml-1" />
                <span>
                  {new Date(current.sessions[0].sessionStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Pricing & CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectEvent(current)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              <Ticket className="w-4 h-4" />
              <span>{t.bookNow}</span>
              <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded font-medium ml-1">
                ₹{(current.minPrice || 35000) / 100} {language === 'mr' ? 'पासून' : 'onwards'}
              </span>
            </button>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        {featured.length > 1 && (
          <div className="absolute right-3 bottom-3 hidden sm:flex items-center gap-2 z-10">
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev === 0 ? featured.length - 1 : prev - 1))
              }
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#111827] border border-white/20 transition shadow-sm"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-1">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % featured.length)}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#111827] border border-white/20 transition shadow-sm"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
