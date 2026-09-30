'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Clock, Tag } from 'lucide-react';
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

interface AnnouncementPopupModalProps {
  announcements: AnnouncementItem[];
  language: Language;
}

export const AnnouncementPopupModal: React.FC<AnnouncementPopupModalProps> = ({
  announcements,
  language,
}) => {
  const [activePopup, setActivePopup] = useState<AnnouncementItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Find the first active popup_poster that hasn't been dismissed in this session
    const popup = announcements.find((a) => {
      if (a.active !== 1) return false;
      // Allow popup_poster or any announcement with image/timer
      if (a.category && a.category !== 'popup_poster') return false;

      // Check timer window if set
      const now = new Date().getTime();
      if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
      if (a.endsAt && new Date(a.endsAt).getTime() < now) return false;

      // Check session dismissal
      if (typeof window !== 'undefined') {
        const dismissedKey = `mahaticket_dismissed_popup_${a.id}`;
        if (sessionStorage.getItem(dismissedKey)) {
          return false;
        }
      }
      return true;
    });

    if (popup) {
      setActivePopup(popup);
      // Gentle dwell timer before showing popup (avoid jarring immediate flash)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [announcements]);

  const handleClose = () => {
    setIsOpen(false);
    if (activePopup && typeof window !== 'undefined') {
      sessionStorage.setItem(`mahaticket_dismissed_popup_${activePopup.id}`, 'true');
    }
  };

  const handleCtaClick = () => {
    if (!activePopup?.ctaUrl) {
      handleClose();
      return;
    }
    handleClose();
    if (activePopup.ctaUrl.startsWith('http')) {
      window.open(activePopup.ctaUrl, '_blank');
    } else {
      window.location.href = activePopup.ctaUrl;
    }
  };

  if (!isOpen || !activePopup) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Floating Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition active:scale-95"
          title="Close announcement"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Poster Image */}
        {activePopup.imageUrl ? (
          <div className="relative w-full h-56 sm:h-64 bg-slate-900 overflow-hidden cursor-pointer" onClick={handleCtaClick}>
            <img
              src={activePopup.imageUrl}
              alt={activePopup.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 rounded-full bg-[#ea580c] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3" />
                <span>विशेष घोषणा / Special Event</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>MahaTicket Announcement</span>
            </span>
            <h2 className="text-xl font-black">{activePopup.title}</h2>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-3 bg-white text-slate-900">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
              {activePopup.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {activePopup.message}
            </p>
          </div>

          {/* Schedule Timer Notice */}
          {activePopup.endsAt && (
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between text-xs text-orange-900">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>मर्यादित वेळ ऑफर (Limited Time):</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#ea580c]">
                {new Date(activePopup.endsAt).toLocaleDateString()} पर्यंत
              </span>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleCtaClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition active:scale-95"
            >
              <span>{activePopup.ctaLabel || (language === 'mr' ? 'आताच बुक करा' : 'Explore Now')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              {language === 'mr' ? 'बंद करा' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
