'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import { MapPin, Calendar, Clock, Ticket } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  language: Language;
  onSelect: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  language,
  onSelect,
}) => {
  const t = translations[language];
  const displayTitle = language === 'mr' ? event.titleMr : event.title;
  const secondaryTitle = language === 'mr' ? event.title : event.titleMr;
  const displayCategory = language === 'mr' ? event.categoryMr : event.category;
  const venueName = language === 'mr' ? event.venue?.nameMr : event.venue?.name;

  const nextSession = event.sessions && event.sessions.length > 0 ? event.sessions[0] : null;

  return (
    <div
      onClick={() => onSelect(event)}
      className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={event.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30 shadow-md">
            {displayCategory}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900/90 text-slate-300 border border-slate-700 backdrop-blur-md">
            {event.language}
          </span>
        </div>

        {/* Showtime pill overlay at bottom of poster */}
        {nextSession && (
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-slate-200 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {new Date(nextSession.sessionStartTime).toLocaleDateString(
                  language === 'mr' ? 'mr-IN' : 'en-IN',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 font-medium">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>
                {new Date(nextSession.sessionStartTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Main Title */}
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 font-serif">
            {displayTitle}
          </h3>

          {/* Secondary Title (Marathi/English subtitle) */}
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-sans">
            {secondaryTitle}
          </p>

          {/* Venue & City */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{venueName}</span>
            <span className="text-slate-400 font-semibold">• {event.venue?.city}</span>
          </div>
        </div>

        {/* Card Footer: Price & CTA */}
        <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">{t.fromPrice}</span>
            <span className="text-sm sm:text-base font-extrabold text-amber-400">
              ₹{((event.minPrice || 35000) / 100).toFixed(0)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition transform group-hover:scale-105"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{t.bookNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
