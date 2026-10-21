'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { EventItem } from '@/src/lib/types';
import { Language } from '@/src/lib/i18n';

/** BookMyShow / BookNgo-style compact ranked poster strip with crisp Devanagari font rendering */
export function TrendingRankedRow({
  events,
  language,
  customTitle,
  customBadge,
  onSelect,
  onBook,
}: {
  events: EventItem[];
  language: Language;
  customTitle?: string;
  customBadge?: string;
  onSelect: (e: EventItem) => void;
  onBook?: (e: EventItem) => void;
}) {
  // Rank logic: strictly sorted by rating score & booking count
  const list = [...events]
    .sort((a, b) => {
      const rA = Number(a.rating) || 4.5;
      const rB = Number(b.rating) || 4.5;
      const bA = Number((a as any).bookingCount || (a as any).totalBookings || 0);
      const bB = Number((b as any).bookingCount || (b as any).totalBookings || 0);
      return rB * 1000 + bB - (rA * 1000 + bA);
    })
    .slice(0, 10);

  if (list.length === 0) return null;

  const badgeText = customBadge || (language === 'mr' ? '🔥 लोकप्रिय ट्रेंडिंग' : '🔥 POPULAR TRENDING');
  const titleText = customTitle || (language === 'mr' ? 'या आठवड्यातील लोकप्रिय प्रयोग' : 'Trending Shows This Week');

  return (
    <section className="space-y-3 pt-1">
      <div className="flex items-end justify-between px-0.5">
        <div>
          <div className="flex items-center gap-1.5 text-[#ea580c] mb-0.5">
            <span className="text-[11px] font-bold tracking-wide">
              {badgeText}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141b2b] tracking-normal leading-normal font-sans">
            {titleText}
          </h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {list.map((ev, i) => {
          const title = language === 'mr' ? ev.titleMr || ev.title : ev.title;
          const rating =
            ev.rating && ev.rating > 0
              ? ev.rating > 5
                ? (ev.rating / 2).toFixed(1)
                : ev.rating.toFixed(1)
              : '4.8';

          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelect(ev)}
              className="shrink-0 w-[124px] sm:w-[136px] text-left group cursor-pointer focus:outline-none"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/90 shadow-sm group-hover:shadow-md group-hover:border-[#ea580c] transition duration-300">
                {ev.posterUrl ? (
                  <img
                    src={ev.posterUrl}
                    alt={title}
                    className="h-full w-full object-cover object-top group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                ) : null}

                {/* Subtle bottom gradient for rating and rank legibility */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                {/* Ranking number (BookMyShow style) with outline */}
                <span className="absolute bottom-0.5 left-1.5 text-4xl sm:text-5xl font-black text-white leading-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {i + 1}
                </span>

                {/* Rating badge at bottom right */}
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm border border-white/15">
                  <Star className="w-2.5 h-2.5 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{rating}</span>
                </span>
              </div>

              <p className="mt-2 text-xs font-bold text-[#141b2b] group-hover:text-[#ea580c] line-clamp-2 leading-relaxed tracking-normal font-sans transition-colors">
                {title}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
