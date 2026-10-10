'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language } from '../lib/i18n.ts';
import { MapPin, Ticket, Star, Clock } from 'lucide-react';

import { formatEventCardDateTime } from '../lib/dateUtils';

interface EventCardProps {
  event: EventItem;
  language: Language;
  onSelect: (event: EventItem) => void;
  onWatchTrailer?: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  language,
  onSelect,
}) => {
  const displayTitle = language === 'mr' ? event.titleMr || event.title : event.title;
  const displayCategory = language === 'mr' ? event.categoryMr || event.category : event.category;
  const venueName = language === 'mr' ? event.venue?.nameMr || event.venue?.name : event.venue?.name;
  const nextSession = event.sessions && event.sessions.length > 0 ? event.sessions[0] : null;

  const availableSeats = nextSession?.ticketTypes?.reduce(
    (sum: number, tt: any) => sum + (tt.availableQuota !== undefined ? tt.availableQuota : 0),
    0,
  );

  const { fullStr: dateTimeLabel } = formatEventCardDateTime(event, language, true);

  // Calculate starting price in Rupees
  const getMinPriceRupees = (): number => {
    if (event.minPrice && event.minPrice > 0) {
      return event.minPrice > 1000 ? Math.round(event.minPrice / 100) : event.minPrice;
    }
    if (event.sessions && event.sessions.length > 0) {
      let minP = Infinity;
      event.sessions.forEach((s) => {
        s.ticketTypes?.forEach((tt) => {
          if (tt.price && tt.price < minP) minP = tt.price;
        });
      });
      if (minP !== Infinity) {
        return minP > 1000 ? Math.round(minP / 100) : minP;
      }
    }
    return 250;
  };

  const minPrice = getMinPriceRupees();
  const ratingValue = event.rating && event.rating > 0
    ? (event.rating > 5 ? (event.rating / 2).toFixed(1) : event.rating.toFixed(1))
    : '4.8';

  return (
    <article
      onClick={() => onSelect(event)}
      className="group flex flex-col w-full bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E7EB] hover:border-[#ea580c] shadow-2xs hover:shadow-md transition duration-200 cursor-pointer overflow-hidden select-none"
    >
      {/* Poster Image Container */}
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-slate-100 shrink-0">
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={displayTitle}
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#141b2b] to-[#293040]">
            <Ticket className="h-10 w-10 text-amber-500/80" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {availableSeats !== undefined && availableSeats <= 20 ? (
            <span className="rounded-md bg-[#ea580c] px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-white shadow-md">
              {language === 'mr' ? 'शेवटची आसने' : 'Selling Fast'}
            </span>
          ) : (event as any).tag ? (
            <span className="rounded-md bg-[#ea580c] px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-white shadow-md">
              {(event as any).tag}
            </span>
          ) : displayCategory ? (
            <span className="rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-xs">
              {displayCategory}
            </span>
          ) : null}
        </div>

        {/* Poster Left-Bottom Corner Rating Star Badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-white/95 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#141b2b] shadow-md backdrop-blur-xs border border-white/60">
          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-[#F59E0B] text-[#F59E0B] shrink-0" />
          <span>{ratingValue}</span>
          {event.ratingCount && event.ratingCount > 0 ? (
            <span className="text-[9px] text-slate-500 font-medium">({event.ratingCount})</span>
          ) : null}
        </div>
      </div>

      {/* Details below poster */}
      <div className="mt-2.5 flex flex-col flex-1 justify-between min-w-0">
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold leading-snug text-[#141b2b] transition group-hover:text-[#ea580c] line-clamp-1">
            {displayTitle}
          </h3>
          <p className="mt-0.5 text-[11px] sm:text-xs text-[#64748b] truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#ea580c] shrink-0" />
            <span className="truncate">
              {venueName ? `${venueName}${event.venue?.city ? `, ${event.venue.city}` : ''}` : (event.venue?.city || 'महाराष्ट्र')}
            </span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-[#ea580c] font-semibold truncate">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {dateTimeLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
