'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language } from '../lib/i18n.ts';
import { MapPin, Ticket, Star } from 'lucide-react';

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

  const dateLabel = nextSession
    ? new Date(nextSession.sessionStartTime).toLocaleDateString(
        language === 'mr' ? 'mr-IN' : 'en-IN',
        { weekday: 'short', day: 'numeric', month: 'short' },
      )
    : null;

  const timeLabel = nextSession
    ? new Date(nextSession.sessionStartTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <article
      onClick={() => onSelect(event)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-xs transition hover:shadow-md border border-[#E5E7EB]/60 hover:border-orange-200"
    >
      <a
        href={`/events/${event.id}`}
        onClick={(e) => e.stopPropagation()}
        className="relative block aspect-[2/3] w-full overflow-hidden bg-[#e9edff]"
        aria-label={displayTitle}
      >
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={displayTitle}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#141b2b] to-[#293040]">
            <Ticket className="h-8 w-8 text-stone-500" />
          </div>
        )}

        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
          {dateLabel ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#141b2b] shadow-xs backdrop-blur-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  availableSeats !== undefined && availableSeats <= 20
                    ? 'bg-[#ea580c]'
                    : 'bg-[#16A34A]'
                }`}
              />
              {language === 'mr' ? 'आज' : 'Live'}
              {timeLabel ? ` • ${timeLabel}` : ` • ${dateLabel}`}
            </span>
          ) : null}
          {displayCategory ? (
            <span className="w-fit rounded-md bg-[#ea580c] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white shadow-xs">
              {displayCategory}
            </span>
          ) : null}
        </div>

        {availableSeats !== undefined && availableSeats <= 0 ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-[#ea580c] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-xs">
            {language === 'mr' ? 'हाउसफुल्ल' : 'Housefull'}
          </span>
        ) : availableSeats !== undefined && availableSeats <= 20 ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-[#ac3400] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-xs">
            {language === 'mr' ? 'शेवटची आसने' : 'Last seats'}
          </span>
        ) : (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#994100] shadow-xs backdrop-blur-md">
            {language === 'mr' ? 'तिकिटे उपलब्ध' : 'Tickets open'}
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5 sm:p-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#64748b]">
            <MapPin className="h-3 w-3 shrink-0 text-[#ea580c]" />
            <span className="truncate">
              {venueName || '—'}
              {event.venue?.city ? `, ${event.venue.city}` : ''}
            </span>
          </p>
          <a
            href={`/events/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 block"
          >
            <h3 className="line-clamp-1 text-xs sm:text-sm font-bold leading-snug text-[#141b2b] transition group-hover:text-[#ea580c]">
              {displayTitle}
            </h3>
          </a>
        </div>

        {/* Bottom: 5-Star rating with review count · Book CTA */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141b2b]">
            <Star className={`h-3 w-3 ${event.rating && event.rating > 0 ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-slate-300'}`} />
            <span>
              {event.rating && event.rating > 0
                ? (event.rating > 5 ? (event.rating / 2).toFixed(1) : event.rating.toFixed(1))
                : (language === 'mr' ? 'नवीन' : 'New')}
            </span>
            {event.ratingCount && event.ratingCount > 0 ? (
              <span className="text-[10px] text-[#64748B] font-normal">
                ({event.ratingCount})
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="rounded-lg bg-[#FFF7ED] px-2.5 py-1 text-[11px] font-bold text-[#ea580c] transition group-hover:bg-[#ea580c] group-hover:text-white"
          >
            {language === 'mr' ? 'बुक करा' : 'Book'}
          </button>
        </div>
      </div>
    </article>
  );
};
