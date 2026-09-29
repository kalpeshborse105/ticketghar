'use client';

import React, { useState, useEffect } from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import { Calendar, MapPin, Ticket, Clock, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

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
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl my-6">
      {/* Background with blur image and gradient overlay */}
      <div className="relative h-[340px] sm:h-[400px] lg:h-[460px] w-full overflow-hidden">
        <img
          src={current.bannerUrl || current.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center filter brightness-50 contrast-125 transform scale-105 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />

        {/* Content Box */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12 max-w-3xl">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {language === 'mr' ? 'विशेष शिफारस' : 'Featured Spotlight'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/90 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
              {displayCategory}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
              {current.language} • {current.durationMinutes} {language === 'mr' ? 'मिनिटे' : 'mins'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2 drop-shadow-md font-serif">
            {displayTitle}
          </h1>

          {/* Subtitle / Venue & Timing */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300 mb-5">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium text-white">{venueName}</span>
              <span className="text-slate-400">({current.venue?.city})</span>
            </div>
            {current.sessions && current.sessions.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {new Date(current.sessions[0].sessionStartTime).toLocaleDateString(
                    language === 'mr' ? 'mr-IN' : 'en-IN',
                    { weekday: 'short', day: 'numeric', month: 'short' }
                  )}
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSelectEvent(current)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-amber-500/25 transform hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              <Ticket className="w-5 h-5 fill-slate-950/20" />
              <span>{t.bookNow}</span>
              <span className="text-xs bg-slate-950/15 px-2 py-0.5 rounded text-slate-950 font-bold ml-1">
                ₹{(current.minPrice || 35000) / 100} पासून
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
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-sm transition"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % featured.length)}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-sm transition"
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
