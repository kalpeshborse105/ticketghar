'use client';

import React from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
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
  const secondaryTitle = language === 'mr' ? event.title : event.titleMr;
  const displayCategory = language === 'mr' ? event.categoryMr || event.category : event.category;
  const venueName = language === 'mr' ? event.venue?.nameMr || event.venue?.name : event.venue?.name;

  const nextSession = event.sessions && event.sessions.length > 0 ? event.sessions[0] : null;

  // Real available seat calculation from DB session ticket types
  const availableSeats = nextSession?.ticketTypes?.reduce(
    (sum: number, tt: any) => sum + (tt.availableQuota !== undefined ? tt.availableQuota : 0),
    0
  );

  return (
    <div
      onClick={() => onSelect(event)}
      className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 group cursor-pointer"
    >
      {/* 1. Poster Container with 2:3 Aspect Ratio (Stitch / MahaTicket Specification) */}
      <a
        href={`/events/${event.id}`}
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900 block"
        aria-label={displayTitle}
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

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
          {nextSession && (
            <span className="px-2 py-0.5 rounded-md bg-white/95 text-slate-900 text-[10px] font-bold shadow-xs backdrop-blur-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {new Date(nextSession.sessionStartTime).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {' • '}
                {new Date(nextSession.sessionStartTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          )}
          <span className="self-start px-2 py-0.5 rounded-md bg-[#ea580c] text-white text-[10px] font-bold shadow-xs">
            {displayCategory}
          </span>
        </div>

        {/* Rating Badge (ONLY when real rating > 0, Parity rule) */}
        {event.rating && event.rating > 0 ? (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{event.rating.toFixed(1)}</span>
          </div>
        ) : null}

        {/* Bottom Right: Real Availability Pill */}
        <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
          {availableSeats !== undefined && (
            availableSeats <= 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-xs text-slate-300 text-[10px] font-bold shadow-xs">
                हाउसफुल्ल
              </span>
            ) : availableSeats < 50 ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-600/95 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs animate-pulse">
                शेवटची {availableSeats} आसने
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-emerald-800 text-[10px] font-bold shadow-xs">
                तिकिटे उपलब्ध
              </span>
            )
          )}
        </div>
      </a>

      {/* 2. Card Content (Venue, Title, Subtitle, Availability, Action CTA) */}
      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-2">
        <div>
          {/* Venue */}
          <span className="text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3 h-3 text-[#ea580c] shrink-0" />
            <span className="truncate">
              {venueName}
              {event.venue?.city ? ` · ${event.venue.city}` : ''}
            </span>
          </span>

          {/* Title */}
          <a
            href={`/events/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block mt-1"
          >
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#ea580c] transition-colors line-clamp-1 font-serif">
              {displayTitle}
            </h3>
            {secondaryTitle && secondaryTitle !== displayTitle && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {secondaryTitle}
              </p>
            )}
          </a>
        </div>

        {/* 3. Footer: Booking Status + Select CTA (NO PRICE on card!) */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <Ticket className="w-3 h-3 text-emerald-600" />
            <span>फास्ट बुकिंग सुरू</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-orange-50 group-hover:bg-[#ea580c] text-[#ea580c] group-hover:text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            {language === 'mr' ? 'निवडा' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
};


