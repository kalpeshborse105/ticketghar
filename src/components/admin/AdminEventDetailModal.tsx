'use client';

import React, { useMemo, useState } from 'react';
import {
  X,
  ExternalLink,
  MapPin,
  Calendar,
  Tag,
  Clapperboard,
  Users,
  Plus,
  Building2,
} from 'lucide-react';
import { Language } from '../../lib/i18n.ts';

type SessionLite = {
  id?: number | string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  status?: string;
};

type VenueLite = {
  id?: number;
  name?: string;
  nameMr?: string;
  city?: string;
  cityName?: string;
  address?: string;
  verificationStatus?: string;
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
  venue?: VenueLite;
  minPrice?: number;
  sessions?: SessionLite[];
  cast?: string | null;
  castCrew?: string | null;
  organizerId?: number;
};

interface Props {
  event: EventLite;
  /** Same-title sibling rows (multi-theatre catalogue) */
  relatedEvents?: EventLite[];
  /** Verified venues for “add theatre” picker */
  venues?: VenueLite[];
  language: Language;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
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

function normalizeTitle(t?: string) {
  return (t || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCastCrew(raw: string | null | undefined): { label: string; name: string }[] {
  if (!raw || !String(raw).trim()) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed
        .map((row: any) => {
          if (typeof row === 'string') return { label: '', name: row };
          return {
            label: String(row?.role || row?.label || row?.type || '').trim(),
            name: String(row?.name || row?.person || row?.title || '').trim(),
          };
        })
        .filter((r) => r.name);
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([label, name]) => ({
        label,
        name: String(name),
      }));
    }
  } catch {
    // plain text / comma list
  }
  return String(raw)
    .split(/[\n,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ label: '', name }));
}

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AdminEventDetailModal: React.FC<Props> = ({
  event,
  relatedEvents = [],
  venues = [],
  language,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const mr = language === 'mr';
  const title = mr ? event.titleMr || event.title : event.title || event.titleMr;
  const desc = mr ? event.descriptionMr || event.description : event.description || event.descriptionMr;
  const castRows = parseCastCrew(event.castCrew || event.cast);
  const publicUrl = `/events/${event.id}`;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionForEventId, setSessionForEventId] = useState<string>(String(event.id));
  const [showDate, setShowDate] = useState(() => toDatetimeLocalValue().slice(0, 10));
  const [showTime, setShowTime] = useState(() => {
    const t = toDatetimeLocalValue().slice(11, 16);
    return t || '18:00';
  });
  const [selectedVenueIds, setSelectedVenueIds] = useState<number[]>([]);
  const [venuePickerQ, setVenuePickerQ] = useState('');

  const combinedShowIso = () => {
    const d = new Date(`${showDate}T${showTime}:00`);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const family = useMemo(() => {
    const keyEn = normalizeTitle(event.title);
    const keyMr = normalizeTitle(event.titleMr);
    const pool = [event, ...relatedEvents];
    const seen = new Set<string>();
    const rows: EventLite[] = [];
    for (const e of pool) {
      const id = String(e.id);
      if (seen.has(id)) continue;
      const matchTitle =
        (keyEn && normalizeTitle(e.title) === keyEn) ||
        (keyMr && normalizeTitle(e.titleMr) === keyMr) ||
        String(e.id) === String(event.id);
      if (!matchTitle) continue;
      if (
        event.organizerId != null &&
        e.organizerId != null &&
        Number(e.organizerId) !== Number(event.organizerId)
      ) {
        continue;
      }
      seen.add(id);
      rows.push(e);
    }
    return rows;
  }, [event, relatedEvents]);

  const theatreBlocks = useMemo(() => {
    const byVenue = new Map<
      number,
      { venueId: number; venue?: VenueLite; events: EventLite[] }
    >();
    for (const e of family) {
      const vid = Number(e.venueId || e.venue?.id || 0);
      if (!vid) continue;
      const cur = byVenue.get(vid) || { venueId: vid, venue: e.venue, events: [] };
      if (!cur.venue && e.venue) cur.venue = e.venue;
      cur.events.push(e);
      byVenue.set(vid, cur);
    }
    return Array.from(byVenue.values());
  }, [family]);

  const usedVenueIds = new Set(theatreBlocks.map((t) => t.venueId));
  const availableVenues = venues.filter(
    (v) => v.id && !usedVenueIds.has(Number(v.id))
  );

  const venueLabel = (v?: VenueLite) =>
    mr ? v?.nameMr || v?.name : v?.name || v?.nameMr;

  async function postAction(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      onRefresh?.();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl relative">
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
            className="w-full h-48 object-cover bg-slate-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-28 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
            {mr ? 'पोस्टर नाही' : 'No poster'}
          </div>
        )}

        <div className="p-5 space-y-5">
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
            <h3 className="text-xl font-black text-[#141B2B] leading-snug">{title}</h3>
            {event.title && event.titleMr && event.title !== event.titleMr ? (
              <p className="text-xs text-slate-500 mt-0.5">
                {mr ? event.title : event.titleMr}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-[#A33900] shrink-0" />
              <span>
                {event.language || '—'} · {event.durationMinutes || 150}{' '}
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
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-black text-[#141B2B] mb-1.5">
                {mr ? 'वर्णन' : 'Description'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{desc}</p>
            </div>
          ) : null}

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-[#A33900]" />
              <h4 className="text-xs font-black text-[#141B2B]">
                {mr ? 'कलाकार / क्रू' : 'Cast & crew'}
              </h4>
            </div>
            {castRows.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {mr ? 'कलाकार माहिती जोडलेली नाही.' : 'No cast/crew listed yet.'}
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {castRows.map((row, i) => (
                  <li
                    key={`${row.name}-${i}`}
                    className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5"
                  >
                    {row.label ? (
                      <span className="text-slate-500 block text-[10px]">{row.label}</span>
                    ) : null}
                    <span className="font-semibold text-slate-800">{row.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Theatres + showtimes */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#A33900]" />
              <h4 className="text-xs font-black text-[#141B2B]">
                {mr ? 'नाट्यगृह व शो वेळा' : 'Theatres & showtimes'} ({theatreBlocks.length})
              </h4>
            </div>

            {theatreBlocks.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {mr ? 'कोणतेही नाट्यगृह जोडलेले नाही.' : 'No theatres linked.'}
              </p>
            ) : (
              <div className="space-y-3">
                {theatreBlocks.map((block) => {
                  const vName = venueLabel(block.venue) || `Theatre #${block.venueId}`;
                  const city = block.venue?.cityName || block.venue?.city;
                  const sessions = block.events.flatMap((e) =>
                    (Array.isArray(e.sessions) ? e.sessions : []).map((s) => ({
                      ...s,
                      eventId: e.id,
                    }))
                  );
                  return (
                    <div
                      key={block.venueId}
                      className="rounded-xl border border-slate-200 bg-[#FAFBFC] p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#A33900] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#141B2B] truncate">{vName}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {[block.venue?.address, city].filter(Boolean).join(', ') ||
                              `ID #${block.venueId}`}
                          </p>
                        </div>
                      </div>
                      {sessions.length === 0 ? (
                        <p className="text-[11px] text-slate-500 pl-5">
                          {mr ? 'शो वेळ नाही' : 'No showtimes'}
                        </p>
                      ) : (
                        <ul className="space-y-1 pl-1">
                          {sessions.map((s, i) => (
                            <li
                              key={String(s.id ?? `${block.venueId}-${i}`)}
                              className="text-[11px] bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 flex justify-between gap-2"
                            >
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {fmt(s.sessionStartTime)}
                              </span>
                              <span className="text-slate-500 shrink-0">{s.status || '—'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add showtime — modern date + time (not native datetime-local) */}
            <div className="rounded-xl border border-dashed border-slate-200 p-3 space-y-2">
              <p className="text-[11px] font-bold text-slate-700">
                {mr ? 'शो वेळ जोडा' : 'Add showtime'}
              </p>
              <select
                value={sessionForEventId}
                onChange={(e) => setSessionForEventId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs"
              >
                {family.map((e) => (
                  <option key={String(e.id)} value={String(e.id)}>
                    {venueLabel(e.venue) || (mr ? 'नाट्यगृह' : 'Theatre')}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-bold text-slate-600 block">
                  {mr ? 'दिनांक' : 'Date'}
                  <input
                    type="date"
                    value={showDate}
                    onChange={(e) => setShowDate(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-600 block">
                  {mr ? 'वेळ' : 'Time'}
                  <input
                    type="time"
                    value={showTime}
                    onChange={(e) => setShowTime(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy || !showDate || !showTime}
                onClick={() =>
                  void postAction({
                    action: 'addSession',
                    eventId: Number(sessionForEventId),
                    sessionStartTime: combinedShowIso(),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-[11px] font-bold disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {mr ? 'वेळ सेव्ह करा' : 'Save showtime'}
              </button>
            </div>

            {/* Multi-theatre checkbox picker */}
            <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-3 space-y-2">
              <p className="text-[11px] font-bold text-[#A33900]">
                {mr ? 'अधिक नाट्यगृहांमध्ये हा शो जोडा' : 'Add this show at more theatres'}
              </p>
              <p className="text-[10px] text-slate-500">
                {mr
                  ? 'वर्णन / पोस्टर / कलाकार समान; खालील दिनांक-वेळ सर्व निवडलेल्या नाट्यगृहांना लागू.'
                  : 'Same description/poster/cast; date-time below applies to all checked theatres.'}
              </p>
              <input
                type="search"
                value={venuePickerQ}
                onChange={(e) => setVenuePickerQ(e.target.value)}
                placeholder={mr ? 'नाट्यगृह / शहर शोधा…' : 'Search theatre / city…'}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {availableVenues
                  .filter((v) => {
                    const q = venuePickerQ.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(v.nameMr || '')
                        .toLowerCase()
                        .includes(q) ||
                      String(v.name || '')
                        .toLowerCase()
                        .includes(q) ||
                      String(v.city || v.cityName || '')
                        .toLowerCase()
                        .includes(q)
                    );
                  })
                  .slice(0, 80)
                  .map((v) => {
                    const id = Number(v.id);
                    const checked = selectedVenueIds.includes(id);
                    return (
                      <label
                        key={id}
                        className="flex items-start gap-2 px-2.5 py-2 text-[11px] cursor-pointer hover:bg-orange-50/80"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedVenueIds((prev) =>
                              checked ? prev.filter((x) => x !== id) : [...prev, id]
                            );
                          }}
                          className="mt-0.5 rounded border-slate-300 text-[#A33900] focus:ring-[#A33900]"
                        />
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-800 block truncate">
                            {venueLabel(v)}
                          </span>
                          <span className="text-slate-500 truncate block">
                            {v.cityName || v.city || ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                />
                <input
                  type="time"
                  value={showTime}
                  onChange={(e) => setShowTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                />
              </div>
              <button
                type="button"
                disabled={busy || selectedVenueIds.length === 0 || !showDate || !showTime}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const start = combinedShowIso();
                      for (const venueId of selectedVenueIds) {
                        const res = await fetch('/api/admin/events', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'addVenueShow',
                            eventId: Number(event.id),
                            venueId,
                            sessionStartTime: start,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
                      }
                      setSelectedVenueIds([]);
                      onRefresh?.();
                    } catch (err: any) {
                      setError(err?.message || 'Failed');
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#A33900] text-white text-[11px] font-bold disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {mr
                  ? `निवडलेली नाट्यगृहे जोडा (${selectedVenueIds.length})`
                  : `Add selected theatres (${selectedVenueIds.length})`}
              </button>
            </div>

            {error ? <p className="text-[11px] text-rose-600 font-medium">{error}</p> : null}
          </div>

          <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
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
    </div>
  );
};
