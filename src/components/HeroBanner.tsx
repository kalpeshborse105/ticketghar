'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export interface AnnouncementItem {
  id: number;
  title: string;
  message?: string;
  category?: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  active?: number;
  city?: string;
}

interface HeroBannerProps {
  events: EventItem[];
  announcements?: AnnouncementItem[];
  language: Language;
  onSelectEvent: (event: EventItem) => void;
}

interface BannerSlide {
  type: 'event' | 'promo';
  id: string | number;
  title: string;
  subtitle?: string;
  category?: string;
  imageUrl: string;
  city?: string;
  venueName?: string;
  dateStr?: string;
  timeStr?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  rawEvent?: EventItem;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  events,
  announcements = [],
  language,
  onSelectEvent,
}) => {
  const t = translations[language];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Combine featured events and admin announcement promo banners into slides
  const slides: BannerSlide[] = React.useMemo(() => {
    const list: BannerSlide[] = [];

    // 1. Add featured events / plays
    const featuredEvents = events.filter(
      (e) => e.featured === 1 || e.category === 'plays' || e.category === 'music',
    );

    featuredEvents.forEach((ev) => {
      const displayTitle = language === 'mr' ? ev.titleMr || ev.title : ev.title;
      const displayCat = language === 'mr' ? ev.categoryMr || ev.category : ev.category;
      const venue = language === 'mr' ? ev.venue?.nameMr || ev.venue?.name : ev.venue?.name;
      const session = ev.sessions && ev.sessions.length > 0 ? ev.sessions[0] : null;

      list.push({
        type: 'event',
        id: `ev-${ev.id}`,
        title: displayTitle,
        category: displayCat,
        imageUrl: ev.bannerUrl || ev.posterUrl,
        city: ev.venue?.city,
        venueName: venue,
        dateStr: session
          ? new Date(session.sessionStartTime).toLocaleDateString(
              language === 'mr' ? 'mr-IN' : 'en-IN',
              { weekday: 'short', day: 'numeric', month: 'short' },
            )
          : undefined,
        timeStr: session
          ? new Date(session.sessionStartTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        ctaLabel: t.bookNow,
        rawEvent: ev,
      });
    });

    // 2. Add active admin announcements (hero_banner, mid_banner, or with imageUrl)
    const promoBanners = announcements.filter(
      (a) =>
        a.active !== 0 &&
        (a.category === 'hero_banner' || a.category === 'mid_banner' || a.imageUrl),
    );

    promoBanners.forEach((promo) => {
      list.push({
        type: 'promo',
        id: `promo-${promo.id}`,
        title: promo.title,
        subtitle: promo.message,
        category: promo.category === 'flash_sale' ? '⚡ महा ऑफर' : '📢 विशेष सूचना',
        imageUrl:
          promo.imageUrl ||
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1240&q=80',
        city: promo.city,
        ctaLabel: promo.ctaLabel || (language === 'mr' ? 'अधिक माहिती' : 'Explore'),
        ctaUrl: promo.ctaUrl,
      });
    });

    return list;
  }, [events, announcements, language, t.bookNow]);

  const total = slides.length;

  // Auto-scrolling carousel with hover pause
  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  useEffect(() => {
    if (total <= 1 || isPaused) return;
    autoPlayRef.current = setInterval(nextSlide, 4500);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [total, isPaused, nextSlide]);

  if (total === 0) return null;

  const handleSlideClick = (slide: BannerSlide) => {
    if (slide.type === 'event' && slide.rawEvent) {
      onSelectEvent(slide.rawEvent);
    } else if (slide.ctaUrl) {
      if (slide.ctaUrl.startsWith('http')) {
        window.open(slide.ctaUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = slide.ctaUrl;
      }
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* BookMyShow / Ticketalay Style Multi-peek Slider Track */}
      <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 shadow-lg">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="w-full shrink-0 relative aspect-[21/9] sm:aspect-[24/9] md:aspect-[28/9] min-h-[190px] sm:min-h-[260px] md:min-h-[320px] max-h-[420px] cursor-pointer group"
              onClick={() => handleSlideClick(slide)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSlideClick(slide);
              }}
            >
              {/* Poster/Banner Image */}
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Dynamic Gradient Overlays (preserving visual clarity while showcasing artwork) */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/30 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-7 md:p-9 max-w-2xl text-white">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-[#ea580c] text-white shadow-md shadow-orange-500/30">
                    <Sparkles className="w-3 h-3" />
                    <span>{slide.type === 'promo' ? 'विशेष ऑफर' : 'विशेष शिफारस'}</span>
                  </span>

                  {slide.category && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {slide.category}
                    </span>
                  )}

                  {slide.city && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-black/40 text-slate-200">
                      📍 {slide.city}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-base sm:text-2xl md:text-3xl font-extrabold font-serif text-white tracking-tight leading-tight drop-shadow-md line-clamp-2 mb-1 group-hover:text-orange-300 transition-colors">
                  {slide.title}
                </h2>

                {/* Subtitle / Venue & Timing */}
                {slide.type === 'event' && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-300 mb-3">
                    {slide.venueName && (
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="truncate max-w-[220px]">{slide.venueName}</span>
                      </div>
                    )}
                    {slide.dateStr && (
                      <div className="flex items-center gap-1 text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>{slide.dateStr}</span>
                      </div>
                    )}
                    {slide.timeStr && (
                      <div className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>{slide.timeStr}</span>
                      </div>
                    )}
                  </div>
                )}

                {slide.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-1 mb-3 max-w-xl">
                    {slide.subtitle}
                  </p>
                )}

                {/* Action CTA */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#ea580c] hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition transform group-hover:scale-105 active:scale-95">
                    <Ticket className="w-4 h-4" />
                    <span>{slide.ctaLabel || t.bookNow}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Navigation Arrow: Left */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Carousel Navigation Arrow: Right */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Dot Pagination Indicators */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xs border border-white/10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  i === currentIndex
                    ? 'w-6 h-1.5 bg-[#ea580c] shadow-xs shadow-orange-500/50'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
