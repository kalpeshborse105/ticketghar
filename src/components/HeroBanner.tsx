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
    <div className="relative w-full rounded-xl overflow-hidden bg-[#111827] border border-[#243044] shadow-lg my-4">
      {/* Background image with solid gradient protection */}
      <div className="relative h-[260px] sm:h-[340px] lg:h-[380px] w-full overflow-hidden">
        <img
          src={current.bannerUrl || current.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center brightness-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e17]/90 via-[#0a0e17]/50 to-transparent" />

        {/* Content Box */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 lg:p-10 max-w-2xl">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ea580c] text-white">
              <Sparkles className="w-3 h-3" />
              {language === 'mr' ? 'विशेष शिफारस' : 'Featured Spotlight'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1a2333] text-slate-200 border border-[#243044]">
              {displayCategory}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-[#111827] text-slate-400 border border-[#243044]">
              {current.language} • {current.durationMinutes} {language === 'mr' ? 'मिनिटे' : 'mins'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-2">
            {displayTitle}
          </h1>

          {/* Subtitle / Venue & Timing */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-slate-300 mb-4">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
              <span className="font-medium text-white">{venueName}</span>
              <span className="text-slate-400">({current.venue?.city})</span>
            </div>
            {current.sessions && current.sessions.length > 0 && (
              <div className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                <span>
                  {new Date(current.sessions[0].sessionStartTime).toLocaleDateString(
                    language === 'mr' ? 'mr-IN' : 'en-IN',
                    { weekday: 'short', day: 'numeric', month: 'short' }
                  )}
                </span>
                <Clock className="w-3 h-3 text-slate-400 ml-1" />
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectEvent(current)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95"
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
          <div className="absolute right-4 bottom-4 hidden sm:flex items-center gap-2 z-10">
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev === 0 ? featured.length - 1 : prev - 1))
              }
              className="p-1.5 rounded-lg bg-[#111827] hover:bg-[#1a2333] text-white border border-[#243044] transition"
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
                    i === currentIndex ? 'w-5 bg-[#ea580c]' : 'w-1.5 bg-[#334155]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % featured.length)}
              className="p-1.5 rounded-lg bg-[#111827] hover:bg-[#1a2333] text-white border border-[#243044] transition"
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
