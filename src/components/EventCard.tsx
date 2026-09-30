'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import { MapPin, Calendar, Clock, Ticket, ChevronRight } from 'lucide-react';

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
  const displayTitle = language === 'mr' ? event.titleMr || event.title : event.title;
  const secondaryTitle = language === 'mr' ? event.title : event.titleMr;
  const displayCategory = language === 'mr' ? event.categoryMr || event.category : event.category;
  const venueName = language === 'mr' ? event.venue?.nameMr || event.venue?.name : event.venue?.name;

  const nextSession = event.sessions && event.sessions.length > 0 ? event.sessions[0] : null;

  return (
    <div className="group bg-white border border-slate-200/90 hover:border-orange-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col transform hover:-translate-y-1 cursor-pointer">
      {/* Poster Image Container — BookMyShow Portrait 2:3 Aspect Ratio */}
      <a
        href={`/events/${event.id}`}
        className="relative w-full aspect-[2/3] overflow-hidden bg-slate-900 block cursor-pointer"
      >
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={displayTitle}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Ticket className="w-12 h-12 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="bg-[#ea580c] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">
            {event.language || 'मराठी'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white border border-white/20">
            {displayCategory}
          </span>
        </div>

        {/* Showtime pill overlay at bottom of poster */}
        {nextSession && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white bg-slate-950/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/10">
            <div className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="truncate">
                {new Date(nextSession.sessionStartTime).toLocaleDateString(
                  language === 'mr' ? 'mr-IN' : 'en-IN',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-200">
              <Clock className="w-3 h-3 text-orange-400" />
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
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Main Title */}
          <a href={`/events/${event.id}`} className="block">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#ea580c] transition-colors line-clamp-1 font-serif">
              {displayTitle}
            </h3>
          </a>

          {/* Secondary Subtitle */}
          {secondaryTitle && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              {secondaryTitle}
            </p>
          )}

          {/* Venue & City */}
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-600">
            <MapPin className="w-3 h-3 text-[#ea580c] shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[160px] font-medium">{venueName}</span>
            {event.venue?.city && (
              <span className="text-slate-400 font-medium">• {event.venue.city}</span>
            )}
          </div>
        </div>

        {/* Card Footer: Book Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold text-slate-400">
            {event.durationMinutes ? `${event.durationMinutes} मि.` : 'थेट प्रयोग'}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#ea580c] hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-[11px] sm:text-xs shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{t.bookNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
