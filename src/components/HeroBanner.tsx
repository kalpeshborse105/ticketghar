'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EventItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  Calendar,
  MapPin,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Star,
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
  loading?: boolean;
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
  rating?: number | null;
  ratingCount?: number | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  events,
  announcements = [],
  language,
  onSelectEvent,
  loading = false,
}) => {
  const t = translations[language];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Combine featured events and admin announcement promo banners into slides
  const slides: BannerSlide[] = React.useMemo(() => {
    const list: BannerSlide[] = [];

    // 1. Add genuine database events (prioritizing featured events, but including active events)
    let candidateEvents = events.filter(
      (e) => (e.featured === 1 || e.category === 'plays' || e.category === 'music') && Boolean(e.bannerUrl || e.posterUrl),
    );
    if (candidateEvents.length === 0) {
      candidateEvents = events.filter((e) => Boolean(e.bannerUrl || e.posterUrl));
    }

    candidateEvents.slice(0, 6).forEach((ev) => {
      const displayTitle = language === 'mr' ? ev.titleMr || ev.title : ev.title;
      const displayCat = language === 'mr' ? ev.categoryMr || ev.category : ev.category;
      const venue = language === 'mr' ? ev.venue?.nameMr || ev.venue?.name : ev.venue?.name;
      const session = ev.sessions && ev.sessions.length > 0 ? ev.sessions[0] : null;

      list.push({
        type: 'event',
        id: `ev-${ev.id}`,
        title: displayTitle,
        category: displayCat,
        imageUrl: ev.bannerUrl || ev.posterUrl || '',
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
        rating: ev.rating ?? null,
        ratingCount: ev.ratingCount ?? null,
      });
    });

    // 2. Admin hero_banner only (with real image URL from admin)
    const promoBanners = announcements.filter(
      (a) => a.active !== 0 && a.category === 'hero_banner' && a.imageUrl && a.imageUrl.trim() !== '',
    );

    promoBanners.forEach((promo) => {
      list.push({
        type: 'promo',
        id: `promo-${promo.id}`,
        title: promo.title,
        subtitle: promo.message,
        category: promo.category === 'flash_sale' ? '⚡ महा ऑफर' : '📢 विशेष सूचना',
        imageUrl: promo.imageUrl || '',
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

  if (loading || total === 0) {
    return (
      <div className="relative w-full overflow-hidden select-none">
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg h-[210px] xs:h-[240px] sm:h-[300px] md:h-[360px] flex flex-col justify-end p-4 sm:p-6 animate-pulse border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <div className="h-6 sm:h-8 w-2/3 rounded-lg bg-white/20" />
            <div className="h-4 w-1/3 rounded-lg bg-white/15" />
          </div>
          {/* Subtle star placeholder in corner */}
          <div className="absolute top-4 right-4 h-6 w-16 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  const handleSlideClick = (slide: BannerSlide) => {
    if (slide.type === 'event' && slide.rawEvent) {
      onSelectEvent(slide.rawEvent);
    } else if (slide.ctaUrl) {
      if (slide.ctaUrl.startsWith('http')) {
        window.open(slide.ctaUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(slide.ctaUrl);
      }
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Stitch cinematic hero slider */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-[#141b2b] shadow-xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="group relative w-full shrink-0 h-[210px] xs:h-[240px] sm:h-[300px] md:h-[360px] cursor-pointer overflow-hidden rounded-2xl"
              onClick={() => handleSlideClick(slide)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSlideClick(slide);
              }}
            >
              {/* Full landscape banner image filling the slide */}
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Cinematic Vignette & Bottom Readability Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />

              {/* Right Side Corner: Rating Badge (No bulky buttons/badges) */}
              {slide.type === 'event' && typeof slide.rating === 'number' && slide.rating > 0 && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 px-2.5 sm:px-3 py-1 text-xs font-black text-white shadow-lg">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="text-amber-300 font-bold">
                    {slide.rating > 5 ? (slide.rating / 2).toFixed(1) : slide.rating.toFixed(1)}
                  </span>
                  {typeof slide.ratingCount === 'number' && slide.ratingCount > 0 && (
                    <span className="text-white/70 font-medium text-[10px] hidden xs:inline">
                      ({slide.ratingCount})
                    </span>
                  )}
                </div>
              )}

              {/* Left Side: Clean Title, Date, Venue (No badges, No button) */}
              <div className="absolute bottom-4 left-4 right-14 sm:bottom-6 sm:left-6 sm:right-24 z-10 space-y-1 sm:space-y-1.5 text-white">
                <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow-md line-clamp-2 leading-tight">
                  {slide.title}
                </h2>

                {slide.type === 'event' && (slide.dateStr || slide.venueName) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-white/90 drop-shadow">
                    {slide.dateStr && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#ea580c] shrink-0" />
                        <span>{[slide.dateStr, slide.timeStr].filter(Boolean).join(' • ')}</span>
                      </span>
                    )}
                    {slide.venueName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#ea580c] shrink-0" />
                        <span className="truncate max-w-[190px] sm:max-w-[320px]">{slide.venueName}</span>
                      </span>
                    )}
                  </div>
                )}

                {slide.subtitle && (
                  <p className="text-xs sm:text-sm text-white/80 line-clamp-1 drop-shadow">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Navigation Arrow: Left (Desktop) */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="hidden sm:flex absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Carousel Navigation Arrow: Right (Desktop) */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="hidden sm:flex absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer z-10"
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
