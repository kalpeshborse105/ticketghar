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
    <div className="group bg-white border border-slate-200 hover:border-orange-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col transform hover:-translate-y-1 cursor-pointer">
      {/* Poster Image Container — BookMyShow/Ticketalay Portrait Aspect Ratio */}
      <a
        href={`/events/${event.id}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 block cursor-pointer"
      >
        <img
          src={event.posterUrl}
          alt={displayTitle}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-white/95 text-slate-900 border border-slate-200 shadow-xs">
            {displayCategory}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white border border-white/20">
            {event.language}
          </span>
        </div>

        {/* Showtime pill overlay at bottom of poster */}
        {nextSession && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] sm:text-[11px] text-white bg-slate-950/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
            <div className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="truncate">
                {new Date(nextSession.sessionStartTime).toLocaleDateString(
                  language === 'mr' ? 'mr-IN' : 'en-IN',
                  { weekday: 'short', day: 'numeric', month: 'short' }
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-white/90">
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
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Main Title */}
          <a href={`/events/${event.id}`} className="block">
            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#ea580c] transition-colors line-clamp-1">
              {displayTitle}
            </h3>
          </a>

          {/* Secondary Subtitle */}
          {secondaryTitle && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              {secondaryTitle}
            </p>
          )}

          {/* Venue & City */}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
            <span className="truncate max-w-[150px]">{venueName}</span>
            {event.venue?.city && (
              <span className="text-slate-400 font-medium">• {event.venue.city}</span>
            )}
          </div>
        </div>

        {/* Card Footer: Clean Book Button without Price (Prices appear on details & seat selection) */}
        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {event.durationMinutes ? `${event.durationMinutes} मिनिटे` : 'Live Show'}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{t.bookNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
