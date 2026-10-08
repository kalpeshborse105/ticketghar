'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Ticket,
  ChevronRight,
  Share2,
  Navigation,
  Play,
  X,
  Star,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { MTTicketLoader } from '@/src/components/ui/MTSkeleton';
import { SeatMapModal } from '@/src/components/SeatMapModal';
import { CheckoutDrawer } from '@/src/components/CheckoutDrawer';
import { TicketPassModal } from '@/src/components/TicketPassModal';

interface EventDetail {
  id: number;
  title: string;
  titleMr?: string;
  category: string;
  categoryMr?: string;
  language?: string;
  ageGuidance?: string;
  description?: string;
  descriptionMr?: string;
  posterUrl?: string;
  bannerUrl?: string;
  durationMinutes?: number;
  venue: {
    id: number;
    name: string;
    nameMr?: string;
    address?: string;
    city?: string;
    facilities?: any;
  };
  organizer: {
    id: number;
    name: string;
    companyName?: string;
  };
  sessions: Array<{
    id: number;
    sessionStartTime: string;
    sessionEndTime?: string;
    status: string;
    ticketTypes: Array<{
      id: number;
      name: string;
      nameMr?: string;
      price: number;
      availableQuota: number;
      totalQuota: number;
    }>;
  }>;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
    : url;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [copiedLink, setCopiedLink] = useState(false);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [checkoutHoldData, setCheckoutHoldData] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Event not found' : 'Unable to load event details');
          return;
        }
        const json = await res.json();
        setEvent(json.event);
      } catch {
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleBookSession = (session: any) => {
    setSelectedSession(session);
    setSeatMapOpen(true);
  };

  const handleProceedToCheckout = (holdData: any) => {
    setCheckoutHoldData(holdData);
    setSeatMapOpen(false);
    setCheckoutOpen(true);
  };

  const handleBookingConfirmed = (result: any) => {
    setCheckoutOpen(false);
    setConfirmedBooking(result);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const activeSessions = React.useMemo(
    () => (event?.sessions || []).filter((s) => s.status === 'active'),
    [event?.sessions],
  );

  const uniqueDates = React.useMemo(
    () =>
      Array.from(
        new Set(
          activeSessions.map((s) => new Date(s.sessionStartTime).toISOString().split('T')[0]),
        ),
      ),
    [activeSessions],
  );

  const timeBuckets = React.useMemo(() => {
    const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const s of activeSessions) {
      const hour = new Date(s.sessionStartTime).getHours();
      if (hour < 12) buckets.morning += 1;
      else if (hour < 16) buckets.afternoon += 1;
      else if (hour < 20) buckets.evening += 1;
      else buckets.night += 1;
    }
    return buckets;
  }, [activeSessions]);

  const filteredSessions = React.useMemo(() => {
    let list =
      selectedDate === 'all'
        ? [...activeSessions]
        : activeSessions.filter(
            (s) => new Date(s.sessionStartTime).toISOString().split('T')[0] === selectedDate,
          );

    if (timeFilter !== 'all') {
      list = list.filter((s) => {
        const hour = new Date(s.sessionStartTime).getHours();
        if (timeFilter === 'morning') return hour < 12;
        if (timeFilter === 'afternoon') return hour >= 12 && hour < 16;
        if (timeFilter === 'evening') return hour >= 16 && hour < 20;
        if (timeFilter === 'night') return hour >= 20;
        return true;
      });
    }

    list.sort(
      (a, b) =>
        new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime(),
    );
    return list;
  }, [activeSessions, selectedDate, timeFilter]);

  if (loading) {
    return (
      <div className="mt-shell flex min-h-screen items-center justify-center">
        <MTTicketLoader message="कार्यक्रम लोड होत आहे..." submessage="MahaTicket" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mt-shell flex min-h-screen items-center justify-center px-4">
        <div className="mt-card w-full max-w-md space-y-3 p-6 text-center">
          <Ticket className="mx-auto h-8 w-8 text-[#ea580c]" />
          <h1 className="text-base font-extrabold text-[#111827]">
            {error || 'कार्यक्रम सापडला नाही'}
          </h1>
          <p className="text-xs text-[#64748b]">हा कार्यक्रम उपलब्ध नसू शकतो.</p>
          <Link href="/" className="mt-btn mt-btn-primary inline-flex">
            <ArrowLeft className="h-3.5 w-3.5" />
            मुख्यपृष्ठ
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabel: Record<string, string> = {
    plays: 'नाटक',
    music: 'संगीत',
    comedy: 'कॉमेडी',
    cultural: 'सांस्कृतिक',
    workshops: 'कार्यशाळा',
    movies: 'चित्रपट',
    sports: 'क्रीडा',
  };

  let parsedDbCast: Array<{ name: string; role?: string; roleMr?: string; image?: string }> | null =
    null;
  if ((event as any).castCrew) {
    try {
      const parsed =
        typeof (event as any).castCrew === 'string'
          ? JSON.parse((event as any).castCrew)
          : (event as any).castCrew;
      if (Array.isArray(parsed) && parsed.length > 0) parsedDbCast = parsed;
    } catch {
      /* ignore */
    }
  }

  const minSessionPrice =
    activeSessions.length > 0 && activeSessions.some((s) => s.ticketTypes?.length)
      ? Math.min(
          ...activeSessions.flatMap((s) => s.ticketTypes.map((t) => t.price / 100)).filter((p) => p > 0),
        )
      : 0;

  const rawVideo =
    (event as any).videoUrl ||
    (event as any).trailerUrl ||
    null;
  const videoEmbedUrl = rawVideo ? getYouTubeEmbedUrl(rawVideo) : null;
  const title = event.titleMr || event.title;
  const venueName = event.venue?.nameMr || event.venue?.name || '';
  const rating =
    typeof (event as any).rating === 'number' && (event as any).rating > 0
      ? (event as any).rating
      : null;

  const timeFilters = [
    { id: 'all' as const, label: 'सर्व', count: activeSessions.length },
    { id: 'morning' as const, label: 'सकाळ', count: timeBuckets.morning },
    { id: 'afternoon' as const, label: 'दुपार', count: timeBuckets.afternoon },
    { id: 'evening' as const, label: 'संध्याकाळ', count: timeBuckets.evening },
    { id: 'night' as const, label: 'रात्री', count: timeBuckets.night },
  ].filter((tf) => tf.id === 'all' || tf.count > 0);

  return (
    <div className="mt-shell pb-20 text-[#111827]">
      <Header language={language} onLanguageChange={setLanguage} />

      <div className="border-b border-[#e7e5e4] bg-white">
        <div className="mt-container flex items-center justify-between gap-3 py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748b] hover:text-[#ea580c]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            मुख्यपृष्ठ
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e7e5e4] px-2.5 py-1 text-xs font-bold text-[#64748b] hover:border-orange-300 hover:text-[#ea580c]"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copiedLink ? 'कॉपी झाले' : 'शेअर'}
          </button>
        </div>
      </div>

      <main className="mt-container py-4">
        {/* Stitch-style compact event header: poster + meta */}
        <section className="mt-detail-grid">
          <div className="mx-auto w-40 sm:w-48 md:mx-0 md:w-full">
            <div className="mt-card overflow-hidden">
              {event.posterUrl ? (
                <img
                  src={event.posterUrl}
                  alt={title}
                  className="mt-poster"
                />
              ) : (
                <div className="mt-poster flex items-center justify-center bg-stone-800">
                  <Ticket className="h-12 w-12 text-stone-500" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[#ea580c] px-2 py-0.5 text-[10px] font-bold text-white">
                {event.categoryMr || categoryLabel[event.category] || event.category}
              </span>
              {event.language ? (
                <span className="rounded-md border border-[#e7e5e4] bg-white px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                  {event.language}
                </span>
              ) : null}
              {event.durationMinutes ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e7e5e4] bg-white px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                  <Clock className="h-3 w-3 text-[#ea580c]" />
                  {event.durationMinutes} मिनिटे
                </span>
              ) : null}
              {rating ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-stone-800">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#111827] sm:text-2xl">
                {title}
              </h1>
              {event.titleMr && event.title !== event.titleMr ? (
                <p className="mt-0.5 text-xs text-[#64748b]">{event.title}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-start gap-3 text-xs text-[#64748b]">
              <div className="inline-flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ea580c]" />
                <div>
                  <p className="font-bold text-[#111827]">{venueName}</p>
                  <p>
                    {[event.venue?.address, event.venue?.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              {minSessionPrice > 0 ? (
                <div className="rounded-lg border border-orange-200 bg-[#fff7ed] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold text-[#c2410c]">पासून</p>
                  <p className="text-sm font-extrabold text-[#ea580c]">₹{minSessionPrice}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="#sessions" className="mt-btn mt-btn-primary">
                <Ticket className="h-3.5 w-3.5" />
                शो निवडा
              </a>
              {videoEmbedUrl ? (
                <button
                  type="button"
                  onClick={() => setShowVideoModal(true)}
                  className="mt-btn mt-btn-ghost"
                >
                  <Play className="h-3.5 w-3.5 text-[#ea580c]" />
                  ट्रेलर
                </button>
              ) : null}
              {event.venue?.name ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${event.venue.name} ${event.venue.city || ''}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-btn mt-btn-ghost"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  नकाशा
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {/* Showtimes — primary booking block, immediately after header */}
        <section id="sessions" className="mt-card mt-4 space-y-3 p-3.5 sm:p-4">
          <div>
            <h2 className="mt-section-title">उपलब्ध शो</h2>
            <p className="mt-section-sub">तारीख व वेळ निवडा, नंतर आसने निवडा</p>
          </div>

          {uniqueDates.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedDate('all')}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  selectedDate === 'all'
                    ? 'bg-[#ea580c] text-white'
                    : 'border border-[#e7e5e4] bg-white text-[#64748b]'
                }`}
              >
                सर्व
              </button>
              {uniqueDates.map((dateStr) => {
                const dateObj = new Date(dateStr);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex min-w-[52px] shrink-0 flex-col items-center rounded-lg px-2.5 py-1.5 ${
                      isSelected
                        ? 'bg-[#ea580c] text-white'
                        : 'border border-[#e7e5e4] bg-white text-[#111827]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      {dateObj.toLocaleDateString('mr-IN', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-black leading-none">{dateObj.getDate()}</span>
                    <span className="text-[10px] font-bold opacity-80">
                      {dateObj.toLocaleDateString('mr-IN', { month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {timeFilters.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {timeFilters.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeFilter(tf.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    timeFilter === tf.id
                      ? 'bg-[#111827] text-white'
                      : 'border border-[#e7e5e4] bg-[#fff7ed] text-[#64748b]'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e7e5e4] bg-[#faf7f2] py-6 text-center">
              <p className="text-sm font-bold text-[#111827]">या निवडीसाठी शो उपलब्ध नाही</p>
              <p className="mt-1 text-xs text-[#64748b]">इतर तारीख किंवा वेळ निवडा</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((session) => {
                const sDate = new Date(session.sessionStartTime);
                const dateStr = sDate.toLocaleDateString('mr-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                const timeStr = sDate.toLocaleTimeString('mr-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const prices = session.ticketTypes.map((t) => t.price / 100).filter((p) => p > 0);
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const availableSeats = session.ticketTypes.reduce(
                  (sum, t) => sum + (t.availableQuota || 0),
                  0,
                );
                const soldOut = availableSeats === 0;

                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#e7e5e4] bg-[#faf7f2] p-3 transition hover:border-orange-300 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-black text-[#ea580c] ring-1 ring-orange-200">
                          <Clock className="h-3 w-3" />
                          {timeStr}
                        </span>
                        <span className="text-xs font-bold text-[#111827]">{dateStr}</span>
                        {soldOut ? (
                          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                            Housefull
                          </span>
                        ) : availableSeats < 30 ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                            {availableSeats} जागा
                          </span>
                        ) : null}
                      </div>
                      <p className="flex items-center gap-1 text-[11px] text-[#64748b]">
                        <MapPin className="h-3 w-3" />
                        {venueName}
                        {event.venue?.city ? ` · ${event.venue.city}` : ''}
                      </p>
                      {session.ticketTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {session.ticketTypes.map((tt) => (
                            <span
                              key={tt.id}
                              className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-[#111827] ring-1 ring-[#e7e5e4]"
                            >
                              {tt.nameMr || tt.name}: ₹{tt.price / 100}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      {minPrice > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-[#64748b]">दर</p>
                          <p className="text-sm font-extrabold text-[#111827]">
                            ₹{minPrice}
                            {minPrice !== maxPrice ? `–₹${maxPrice}` : ''}
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => handleBookSession(session)}
                        className="mt-btn mt-btn-primary disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        {soldOut ? 'Housefull' : 'आसन निवडा'}
                        {!soldOut && <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* About — after shows */}
        {(event.descriptionMr || event.description) && (
          <section className="mt-card mt-3 space-y-2 p-3.5 sm:p-4">
            <h2 className="mt-section-title">कार्यक्रमाविषयी</h2>
            <p
              className={`text-sm leading-relaxed text-[#64748b] ${
                showFullDesc ? '' : 'line-clamp-3'
              }`}
            >
              {event.descriptionMr || event.description}
            </p>
            <button
              type="button"
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-xs font-bold text-[#ea580c]"
            >
              {showFullDesc ? 'कमी वाचा' : 'अधिक वाचा'}
            </button>
          </section>
        )}

        {/* Cast — only real DB data */}
        {parsedDbCast && parsedDbCast.length > 0 && (
          <section className="mt-card mt-3 space-y-2 p-3.5 sm:p-4">
            <h2 className="mt-section-title">कलाकार</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {parsedDbCast.map((member, idx) => (
                <div key={idx} className="w-20 shrink-0 text-center">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="mx-auto h-14 w-14 rounded-full object-cover ring-2 ring-orange-100"
                    />
                  ) : (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff7ed] text-sm font-bold text-[#ea580c] ring-2 ring-orange-100">
                      {member.name?.[0] || '•'}
                    </div>
                  )}
                  <p className="mt-1 text-[11px] font-bold text-[#111827]">{member.name}</p>
                  {(member.roleMr || member.role) && (
                    <p className="text-[10px] text-[#64748b]">{member.roleMr || member.role}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {event.organizer?.name && (
          <section className="mt-card mt-3 flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
                आयोजक
              </p>
              <p className="text-sm font-bold text-[#111827]">{event.organizer.name}</p>
              {event.organizer.companyName && (
                <p className="text-xs text-[#64748b]">{event.organizer.companyName}</p>
              )}
            </div>
          </section>
        )}
      </main>

      <aside
        aria-label="Quick booking"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e7e5e4] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0 truncate">
            <p className="truncate text-xs font-bold text-[#111827]">{title}</p>
            <p className="truncate text-[10px] text-[#64748b]">
              {venueName}
              {minSessionPrice > 0 ? ` · ₹${minSessionPrice}+` : ''}
            </p>
          </div>
          <a href="#sessions" className="mt-btn mt-btn-primary shrink-0">
            <Ticket className="h-3.5 w-3.5" />
            बुक करा
          </a>
        </div>
      </aside>

      {showVideoModal && videoEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-stone-700 bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-800 px-3 py-2">
              <p className="truncate text-xs font-bold text-white">ट्रेलर — {title}</p>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="rounded-full p-1 text-stone-300 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={videoEmbedUrl}
                title="Trailer"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {seatMapOpen && event && selectedSession && (
        <SeatMapModal
          event={event as any}
          session={selectedSession}
          language="mr"
          onClose={() => {
            setSeatMapOpen(false);
            setSelectedSession(null);
          }}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {checkoutOpen && event && selectedSession && checkoutHoldData && (
        <CheckoutDrawer
          event={event as any}
          session={selectedSession}
          holdData={checkoutHoldData}
          language="mr"
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleBookingConfirmed}
        />
      )}

      {confirmedBooking && (
        <TicketPassModal
          bookingResult={confirmedBooking}
          language="mr"
          onClose={() => setConfirmedBooking(null)}
        />
      )}
    </div>
  );
}
