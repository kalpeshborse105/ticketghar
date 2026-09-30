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
    <div className="group bg-white border border-[#e5e7eb] hover:border-[#6366f1] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col transform hover:-translate-y-0.5">
      {/* Poster Image Container */}
      <a href={`/events/${event.id}`} className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-[#f5f5f5] block">
        <img
          src={event.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-[#111827] border border-[#e5e7eb] shadow-sm">
            {displayCategory}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/90 text-[#6b7280] border border-[#e5e7eb]">
            {event.language}
          </span>
        </div>

        {/* Showtime pill overlay at bottom of poster */}
        {nextSession && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white bg-[#111827]/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
            <div className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 text-[#6366f1] shrink-0" />
              <span className="truncate">
                {new Date(nextSession.sessionStartTime).toLocaleDateString(
                  language === 'mr' ? 'mr-IN' : 'en-IN',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-white/90">
              <Clock className="w-3 h-3 text-[#6366f1]" />
              <span>
                {new Date(nextSession.sessionStartTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </a>

      {/* Card Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Main Title */}
          <a href={`/events/${event.id}`} className="block">
            <h3 className="text-sm sm:text-base font-semibold text-[#111827] group-hover:text-[#6366f1] transition-colors line-clamp-1">
              {displayTitle}
            </h3>
          </a>

          {/* Secondary Title (Marathi/English subtitle) */}
          <p className="text-xs text-[#6b7280] line-clamp-1 mt-0.5">
            {secondaryTitle}
          </p>

          {/* Venue & City */}
          <div className="flex items-center gap-1 mt-2 text-xs text-[#111827]">
            <MapPin className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
            <span className="truncate">{venueName}</span>
            <span className="text-[#9ca3af] font-normal">• {event.venue?.city}</span>
          </div>
        </div>

        {/* Card Footer: Price & CTA */}
        <div className="pt-3 mt-3 border-t border-[#e5e7eb] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#9ca3af] block">{t.fromPrice}</span>
            <span className="text-sm sm:text-base font-bold text-[#6366f1]">
              ₹{((event.minPrice || 35000) / 100).toFixed(0)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs shadow-sm transition active:scale-95"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{t.bookNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
