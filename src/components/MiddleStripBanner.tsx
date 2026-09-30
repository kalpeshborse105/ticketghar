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
    <div
      onClick={handleClick}
      className={`my-6 relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-[#ea580c] via-orange-600 to-amber-600 p-5 sm:p-6 text-white shadow-lg transition hover:shadow-xl ${
        midBanner.ctaUrl ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
      }`}
    >
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
              <Sparkles className="w-3 h-3" />
              <span>MahaTicket Special</span>
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight">{midBanner.title}</h3>
          <p className="text-xs sm:text-sm text-orange-100 line-clamp-2">{midBanner.message}</p>
        </div>

        {midBanner.ctaUrl && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs shadow-md">
            <span>{midBanner.ctaLabel || (language === 'mr' ? 'आता पहा' : 'Explore Now')}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ea580c]" />
          </div>
        )}
      </div>

      {/* Decorative background image if present */}
      {midBanner.imageUrl && (
        <img
          src={midBanner.imageUrl}
          alt=""
          className="absolute right-0 top-0 w-1/3 h-full object-cover opacity-15 pointer-events-none"
        />
      )}
    </div>
  );
};
