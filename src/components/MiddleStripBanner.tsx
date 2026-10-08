'use client';

import React from 'react';
import { ArrowRight, Sparkles, Tag } from 'lucide-react';
import { Language } from '../lib/i18n.ts';

interface AnnouncementItem {
  id: number;
  title: string;
  message: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  category?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active: number;
}

interface MiddleStripBannerProps {
  announcements: AnnouncementItem[];
  language: Language;
}

export const MiddleStripBanner: React.FC<MiddleStripBannerProps> = ({
  announcements,
  language,
}) => {
  // Find active middle banner
  const midBanner = announcements.find((a) => {
    if (a.active !== 1) return false;
    if (a.category !== 'mid_banner') return false;
    const now = new Date().getTime();
    if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
    if (a.endsAt && new Date(a.endsAt).getTime() < now) return false;
    return true;
  });

  if (!midBanner) return null;

  const handleClick = () => {
    if (!midBanner.ctaUrl) return;
    if (midBanner.ctaUrl.startsWith('http')) {
      window.open(midBanner.ctaUrl, '_blank');
    } else {
      window.location.href = midBanner.ctaUrl;
    }
  };

  return (
    <section
      onClick={handleClick}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#a33900] via-[#994100] to-[#ea580c] p-5 text-white shadow-xl sm:p-8 ${
        midBanner.ctaUrl ? 'cursor-pointer transition hover:opacity-95 active:scale-[0.99]' : ''
      }`}
    >
      <div className="relative z-10 grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            {language === 'mr' ? 'विशेष जाहिरात / ऑफर' : 'Featured promo'}
          </span>
          <h3 className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {midBanner.title}
          </h3>
          {midBanner.message ? (
            <p className="max-w-2xl text-sm text-white/90 line-clamp-2 sm:text-base">
              {midBanner.message}
            </p>
          ) : null}
          {midBanner.ctaUrl ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#a33900] shadow-md">
              <Tag className="h-4 w-4" />
              <span>{midBanner.ctaLabel || (language === 'mr' ? 'आता पहा' : 'Explore Now')}</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        {midBanner.imageUrl ? (
          <div className="hidden lg:col-span-4 lg:block">
            <div className="aspect-square max-w-xs overflow-hidden rounded-2xl bg-black/20 p-1 shadow-2xl">
              <img
                src={midBanner.imageUrl}
                alt=""
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
    </section>
  );
};
