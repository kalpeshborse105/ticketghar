'use client';

import React from 'react';
import { X, ExternalLink, MapPin, Calendar, Tag, Clapperboard } from 'lucide-react';
import { Language } from '../../lib/i18n.ts';

type SessionLite = {
  id?: number | string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  status?: string;
};

type EventLite = {
  id: number | string;
  title?: string;
  titleMr?: string;
  category?: string;
  status?: string;
  tag?: string;
  language?: string;
  durationMinutes?: number;
  description?: string;
  descriptionMr?: string;
  posterUrl?: string;
  venueId?: number;
  venue?: { name?: string; nameMr?: string; city?: string; address?: string };
  minPrice?: number;
  sessions?: SessionLite[];
};

interface Props {
  event: EventLite;
  language: Language;
  onClose: () => void;
  onEdit?: () => void;
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(iso);
  }
}

export const AdminEventDetailModal: React.FC<Props> = ({
  event,
  language,
  onClose,
  onEdit,
}) => {
  const mr = language === 'mr';
  const title = mr ? event.titleMr || event.title : event.title || event.titleMr;
  const desc = mr ? event.descriptionMr || event.description : event.description || event.descriptionMr;
  const venueName = mr
    ? event.venue?.nameMr || event.venue?.name
    : event.venue?.name || event.venue?.nameMr;
  const sessions = Array.isArray(event.sessions) ? event.sessions : [];
  const publicUrl = `/events/${event.id}`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={title || ''}
            className="w-full h-44 object-cover bg-slate-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-28 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
            {mr ? 'पोस्टर नाही' : 'No poster'}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                {event.category || 'event'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  event.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {event.status || '—'}
              </span>
              {event.tag ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {event.tag}
                </span>
              ) : null}
            </div>
            <h3 className="text-lg font-black text-[#141B2B] leading-snug">{title}</h3>
            {event.title && event.titleMr && event.title !== event.titleMr ? (
              <p className="text-xs text-slate-500 mt-0.5">
                {mr ? event.title : event.titleMr}
              </p>
            ) : null}
            <p className="text-[11px] text-slate-400 mt-1">ID #{event.id}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs text-slate-700">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#A33900] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{venueName || '—'}</p>
                <p className="text-slate-500">
                  {[event.venue?.address, event.venue?.city].filter(Boolean).join(', ') ||
                    (event.venueId ? `Venue #${event.venueId}` : '')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-[#A33900] shrink-0" />
              <span>
                {event.language || '—'} • {event.durationMinutes || 150}{' '}
                {mr ? 'मिनिटे' : 'min'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#A33900] shrink-0" />
              <span>
                {mr ? 'किमान' : 'From'} ₹
                {Math.round((event.minPrice || 0) / 100).toLocaleString('en-IN') || '—'}
              </span>
            </div>
          </div>

          {desc ? (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-3">
              {desc}
            </p>
          ) : null}

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-[#A33900]" />
              <h4 className="text-xs font-black text-[#141B2B]">
                {mr ? 'शो वेळा / Sessions' : 'Showtimes / Sessions'} ({sessions.length})
              </h4>
            </div>
            {sessions.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {mr ? 'सत्र माहिती उपलब्ध नाही.' : 'No session rows on this payload.'}
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {sessions.map((s, i) => (
                  <li
                    key={String(s.id ?? i)}
                    className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 flex justify-between gap-2"
                  >
                    <span>{fmt(s.sessionStartTime)}</span>
                    <span className="text-slate-500 shrink-0">{s.status || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FFF7ED] text-[#A33900] border border-orange-200 text-xs font-bold hover:bg-orange-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {mr ? 'सार्वजनिक पृष्ठ' : 'Public page'}
              </a>
              <a
                href={`${publicUrl}?book=true#booking-flow`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {mr ? 'बुकिंग लिंक' : 'Booking link'}
              </a>
            </div>
            <p className="text-[10px] text-slate-400 font-mono break-all">{publicUrl}</p>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="w-full px-4 py-2.5 rounded-xl bg-[#A33900] text-white text-xs font-bold hover:bg-[#832600]"
              >
                {mr ? 'संपादित करा' : 'Edit event'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
