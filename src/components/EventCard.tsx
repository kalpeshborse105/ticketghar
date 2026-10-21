'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language } from '../lib/i18n.ts';
import { MapPin, Ticket, Star } from 'lucide-react';
import { formatEventCardDateTime } from '../lib/dateUtils';

interface EventCardProps {
  event: EventItem;
  language: Language;
  onSelect: (event: EventItem) => void;
  onBook?: (event: EventItem) => void;
  onWatchTrailer?: (event: EventItem) => void;
  /** BookNgo compact poster width */
  compact?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  language,
  onSelect,
  onBook,
  compact = false,
}) => {
  const displayTitle = language === 'mr' ? event.titleMr || event.title : event.title;
  const displayCategory = language === 'mr' ? event.categoryMr || event.category : event.category;
  const venueName = language === 'mr' ? event.venue?.nameMr || event.venue?.name : event.venue?.name;

  const getMinPriceRupees = (): number => {
    if (event.minPrice && event.minPrice > 0) {
      return event.minPrice > 1000 ? Math.round(event.minPrice / 100) : event.minPrice;
    }
    return 0;
  };

  const minPrice = getMinPriceRupees();
  const ratingValue =
    event.rating && Number(event.rating) > 0
      ? Number(event.rating) > 5
        ? (Number(event.rating) / 2).toFixed(1)
        : Number(event.rating).toFixed(1)
      : (4.7 + ((Math.abs(Number(event.id) || 1) * 3) % 3) * 0.1).toFixed(1);
  const { fullStr: dateTimeLabel } = formatEventCardDateTime(event, language, true);

  return (
    <article
      onClick={() => onSelect(event)}
      className={`group flex flex-col w-full bg-white rounded-xl p-1.5 border border-[#E5E7EB] hover:border-[#ea580c] shadow-2xs hover:shadow-sm transition cursor-pointer overflow-hidden select-none ${
        compact ? 'max-w-[140px]' : ''
      }`}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 shrink-0">
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={displayTitle}
            className="h-full w-full object-cover object-top transition duration-400 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#141b2b] to-[#293040]">
            <Ticket className="h-8 w-8 text-amber-500/80" />
          </div>
        )}
        {displayCategory ? (
          <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {displayCategory}
          </span>
        ) : null}
        {ratingValue ? (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm border border-white/10">
            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
            <span>{ratingValue}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-2 px-1 flex flex-col gap-1 min-w-0">
        <h3 className="text-xs sm:text-[13px] font-extrabold leading-snug text-[#141b2b] group-hover:text-[#ea580c] line-clamp-2 transition-colors">
          {displayTitle}
        </h3>
        <p className="text-[11px] text-[#64748b] truncate flex items-center gap-1">
          <MapPin className="h-3 w-3 text-[#ea580c] shrink-0" />
          <span className="truncate">{venueName || event.venue?.city || 'महाराष्ट्र'}</span>
        </p>
        <p className="text-[10px] sm:text-[11px] text-[#ea580c] font-bold truncate">{dateTimeLabel}</p>
      </div>
    </article>
  );
};
