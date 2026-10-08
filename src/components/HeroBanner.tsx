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

    // 2. Admin hero_banner only (mid_banner goes to MiddleStripBanner)
    const promoBanners = announcements.filter(
      (a) => a.active !== 0 && a.category === 'hero_banner' && a.imageUrl,
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
              className="group relative w-full shrink-0 min-h-[280px] cursor-pointer sm:min-h-[380px] md:min-h-[460px]"
              onClick={() => handleSlideClick(slide)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSlideClick(slide);
              }}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-50 transition-transform duration-1000 group-hover:scale-[1.02]"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141b2b] via-[#141b2b]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141b2b] via-[#141b2b]/80 to-transparent" />

              <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end p-4 sm:min-h-[380px] sm:p-8 md:min-h-[460px] md:p-12">
                <div className="max-w-2xl space-y-3 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ea580c] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      {slide.type === 'promo'
                        ? language === 'mr'
                          ? 'विशेष ऑफर'
                          : 'Special offer'
                        : language === 'mr'
                          ? 'लवकर भरत आहे'
                          : 'Fast filling'}
                    </span>
                    {slide.category ? (
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                        {slide.category}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="line-clamp-2 text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                    {slide.title}
                  </h2>

                  {slide.type === 'event' ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 sm:text-sm">
                      {slide.dateStr || slide.timeStr ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-white/15 px-3 py-1.5 backdrop-blur-md">
                          <Calendar className="h-4 w-4 text-[#ea580c]" />
                          <span className="font-semibold">
                            {[slide.dateStr, slide.timeStr].filter(Boolean).join(' • ')}
                          </span>
                        </span>
                      ) : null}
                      {slide.venueName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-md">
                          <MapPin className="h-4 w-4 text-[#ea580c]" />
                          <span className="truncate max-w-[240px]">{slide.venueName}</span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {slide.subtitle ? (
                    <p className="line-clamp-2 max-w-xl text-sm text-white/80">{slide.subtitle}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-[#ea580c] px-5 py-3 text-sm font-bold text-white shadow-lg transition group-hover:bg-[#ac3400] active:scale-95">
                      <Ticket className="h-5 w-5" />
                      {slide.ctaLabel || t.bookNow}
                    </span>
                    {slide.ctaUrl && slide.type === 'promo' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-white/70">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {language === 'mr' ? 'अधिक माहिती' : 'Learn more'}
                      </span>
                    ) : null}
                  </div>
                </div>
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
