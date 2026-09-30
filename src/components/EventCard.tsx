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
      className="group bg-[#111827] border border-[#243044] hover:border-[#ea580c] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer transform hover:-translate-y-0.5"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-[#0a0e17]">
        <img
          src={event.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#111827] text-slate-100 border border-[#243044]">
            {displayCategory}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#0a0e17] text-slate-300 border border-[#243044]">
            {event.language}
          </span>
        </div>

        {/* Showtime pill overlay at bottom of poster */}
        {nextSession && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-slate-200 bg-[#0a0e17] px-2 py-1 rounded border border-[#243044]">
            <div className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 text-[#ea580c] shrink-0" />
              <span className="truncate">
                {new Date(nextSession.sessionStartTime).toLocaleDateString(
                  language === 'mr' ? 'mr-IN' : 'en-IN',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3 h-3 text-[#ea580c]" />
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
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Main Title */}
          <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#ea580c] transition-colors line-clamp-1">
            {displayTitle}
          </h3>

          {/* Secondary Title (Marathi/English subtitle) */}
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {secondaryTitle}
          </p>

          {/* Venue & City */}
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
            <span className="truncate">{venueName}</span>
            <span className="text-slate-400 font-normal">• {event.venue?.city}</span>
          </div>
        </div>

        {/* Card Footer: Price & CTA */}
        <div className="pt-3 mt-3 border-t border-[#243044] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block">{t.fromPrice}</span>
            <span className="text-sm sm:text-base font-bold text-[#ea580c]">
              ₹{((event.minPrice || 35000) / 100).toFixed(0)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium text-xs shadow-sm transition active:scale-95"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{t.bookNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
