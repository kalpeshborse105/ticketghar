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
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Navigation,
  Award,
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
    sections?: any[];
  };
  organizer: {
    id: number;
    name: string;
    companyName?: string;
    email?: string;
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

  // Booking flow state — all inline on this page (no redirect to home!)
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [checkoutHoldData, setCheckoutHoldData] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [sessionSort, setSessionSort] = useState<'time_asc' | 'price_asc' | 'price_desc'>('time_asc');
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
      } catch (err) {
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

  const activeSessions = React.useMemo(() => {
    return (event?.sessions || []).filter((s) => s.status === 'active');
  }, [event?.sessions]);

  const uniqueDates = React.useMemo(() => {
    return Array.from(
      new Set(
        activeSessions.map((s) => {
          const d = new Date(s.sessionStartTime);
          return d.toISOString().split('T')[0];
        })
      )
    );
  }, [activeSessions]);

  const filteredSessions = React.useMemo(() => {
    let list =
      selectedDate === 'all'
        ? [...activeSessions]
        : activeSessions.filter(
            (s) => new Date(s.sessionStartTime).toISOString().split('T')[0] === selectedDate
          );

    // Filter by time of day (BookMyShow style)
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

    // Sort by price or time
    if (sessionSort === 'price_asc') {
      list.sort((a, b) => {
        const pA = a.ticketTypes?.length > 0 ? Math.min(...a.ticketTypes.map((t: any) => t.price)) : 30000;
        const pB = b.ticketTypes?.length > 0 ? Math.min(...b.ticketTypes.map((t: any) => t.price)) : 30000;
        return pA - pB;
      });
    } else if (sessionSort === 'price_desc') {
      list.sort((a, b) => {
        const pA = a.ticketTypes?.length > 0 ? Math.max(...a.ticketTypes.map((t: any) => t.price)) : 30000;
        const pB = b.ticketTypes?.length > 0 ? Math.max(...b.ticketTypes.map((t: any) => t.price)) : 30000;
        return pB - pA;
      });
    } else {
      list.sort(
        (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
      );
    }

    return list;
  }, [activeSessions, selectedDate, timeFilter, sessionSort]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <MTTicketLoader
          message="कार्यक्रमाचा तपशील लोड होत आहे..."
          submessage="MahaTicket अधिकृत बुकिंग पोर्टल"
        />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#ea580c] flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{error || 'कार्यक्रम सापडला नाही'}</h1>
          <p className="text-xs text-slate-600">
            आपण शोधत असलेला कार्यक्रम उपलब्ध नाही किंवा मुदत संपली आहे.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl text-xs font-bold transition shadow-lg shadow-orange-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>इतर नाटके व कार्यक्रम पहा</span>
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabel: Record<string, string> = {
    plays: 'नाटक व रंगभूमी',
    music: 'संगीत व मैफल',
    comedy: 'हास्यविनोद',
    cultural: 'सांस्कृतिक महोत्सव',
    workshops: 'कार्यशाळा',
    movies: 'चित्रपट',
    sports: 'क्रीडा',
  };

  let parsedDbCast: Array<{ name: string; role?: string; roleMr?: string; image?: string }> | null = null;
  if ((event as any).castCrew) {
    try {
      const parsed =
        typeof (event as any).castCrew === 'string'
          ? JSON.parse((event as any).castCrew)
          : (event as any).castCrew;
      if (Array.isArray(parsed) && parsed.length > 0) parsedDbCast = parsed;
    } catch {}
  }

  let facilitiesList: string[] = [];
  if ((event.venue as any)?.facilities) {
    try {
      const parsed =
        typeof (event.venue as any).facilities === 'string'
          ? JSON.parse((event.venue as any).facilities)
          : (event.venue as any).facilities;
      if (Array.isArray(parsed)) facilitiesList = parsed;
    } catch {}
  }

  const minSessionPrice =
    activeSessions.length > 0 && activeSessions[0].ticketTypes.length > 0
      ? Math.min(...activeSessions.flatMap((s) => s.ticketTypes.map((t) => t.price / 100)))
      : 0;

  // Extract YouTube / Video URL from event (supports videoUrl, trailerUrl, or castCrew JSON / description)
  const rawVideo =
    (event as any).videoUrl ||
    (event as any).trailerUrl ||
    (parsedDbCast as any)?.videoUrl ||
    (typeof (event as any).castCrew === 'string' && (event as any).castCrew.includes('youtu')
      ? (event as any).castCrew.match(/https?:\/\/[^\s",]+/)?.[0]
      : null) ||
    (event.description && event.description.includes('youtu')
      ? event.description.match(/https?:\/\/[^\s",]+/)?.[0]
      : null);

  const videoEmbedUrl = rawVideo ? getYouTubeEmbedUrl(rawVideo) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Constant Header across all pages */}
      <Header language={language} onLanguageChange={setLanguage} />

      {/* Sub-bar: Breadcrumb & Share */}
      <div className="bg-white/95 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#ea580c] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>मुख्य पृष्ठ</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-semibold truncate max-w-[180px] sm:max-w-sm">
              {event.titleMr || event.title}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {videoEmbedUrl && (
              <button
                type="button"
                onClick={() => setShowVideoModal(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ea580c] text-xs font-extrabold transition border border-orange-200 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-[#ea580c]" />
                <span className="hidden sm:inline">ट्रेलर पहा</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>थेट आरक्षण उपलब्ध</span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
              title="लिंक शेअर करा"
            >
              <Share2 className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{copiedLink ? 'कॉपी झाली ✓' : 'शेअर'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-25 filter blur-3xl scale-110 pointer-events-none"
          style={{
            backgroundImage: `url(${event.bannerUrl || event.posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
            {/* Poster Card */}
            <div className="relative shrink-0 w-44 sm:w-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 group cursor-pointer">
              {event.posterUrl ? (
                <img
                  src={event.posterUrl}
                  alt={event.title}
                  className="w-full h-64 sm:h-72 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-64 sm:h-72 bg-slate-800 flex items-center justify-center">
                  <Ticket className="w-16 h-16 text-slate-600" />
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 bg-[#ea580c] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                {event.language || 'मराठी'}
              </div>

              {videoEmbedUrl && (
                <button
                  type="button"
                  onClick={() => setShowVideoModal(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ea580c] flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110">
                    <Play className="w-6 h-6 ml-0.5 fill-white" />
                  </div>
                  <span className="text-[11px] font-black mt-2 text-white bg-black/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    ट्रेलर पहा
                  </span>
                </button>
              )}
            </div>

            {/* Event Info */}
            <div className="flex-1 space-y-3.5 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ea580c]/20 text-orange-400 border border-orange-500/30">
                  {event.categoryMr || categoryLabel[event.category] || event.category}
                </span>
                {event.ageGuidance && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10">
                    प्रमाणपत्र: {event.ageGuidance}
                  </span>
                )}
                {event.durationMinutes && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#ea580c]" />
                    <span>{event.durationMinutes} मिनिटे</span>
                  </span>
                )}
                {(event as any).rating && (event as any).rating > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{(event as any).rating.toFixed(1)}</span>
                    {(event as any).ratingCount ? (
                      <span className="text-[10px] text-slate-300">({(event as any).ratingCount})</span>
                    ) : null}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-serif tracking-tight leading-tight">
                  {event.titleMr || event.title}
                </h1>
                {event.titleMr && event.title !== event.titleMr && (
                  <p className="text-sm sm:text-base text-slate-400 font-medium mt-1">{event.title}</p>
                )}
              </div>

              {/* Next Show Information Hierarchy (Parity with Section 7 Specification) */}
              {activeSessions.length > 0 && (() => {
                const nextSession = activeSessions[0];
                const nextDate = new Date(nextSession.sessionStartTime);
                const formattedDate = nextDate.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedTime = nextDate.toLocaleTimeString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const totalAvailableSeats = activeSessions.reduce(
                  (sum, s) => sum + s.ticketTypes.reduce((acc, t) => acc + (t.availableQuota || 0), 0),
                  0
                );
                const sessionMinPrice = nextSession.ticketTypes.length > 0
                  ? Math.min(...nextSession.ticketTypes.map((t) => t.price / 100))
                  : minSessionPrice;

                return (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/15 max-w-xl text-left space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{formattedDate}</span>
                        <span className="text-white/40">•</span>
                        <span className="font-bold text-amber-300 text-xs sm:text-sm">{formattedTime}</span>
                      </div>

                      {totalAvailableSeats > 0 ? (
                        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                          {totalAvailableSeats} जागा उपलब्ध
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-400/30">
                          हाउसफुल्ल (Sold Out)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="truncate">{event.venue.nameMr || event.venue.name}, {event.venue.city}</span>
                      </div>
                      {sessionMinPrice > 0 && (
                        <span className="text-amber-300 font-extrabold font-mono text-xs sm:text-sm shrink-0">
                          From ₹{sessionMinPrice}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs max-w-xl">
                <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <MapPin className="w-4 h-4 text-[#ea580c] shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-white">{event.venue.nameMr || event.venue.name}</p>
                    <p className="text-slate-400 text-[11px]">{event.venue.city}, महाराष्ट्र</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-white">अधिकृत तिकीट</p>
                    <p className="text-slate-400 text-[11px]">M-Ticket सह थेट प्रवेश</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="#sessions"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Ticket className="w-4 h-4" />
                  <span>शो निवडा (Select Show){minSessionPrice > 0 ? ` — From ₹${minSessionPrice}` : ''}</span>
                </a>

                {videoEmbedUrl && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs sm:text-sm border border-white/20 backdrop-blur-xs transition active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-orange-400 fill-orange-400" />
                    <span>ट्रेलर पहा</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Trailer Modal */}
      {showVideoModal && videoEmbedUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#ea580c]" />
                <h3 className="text-xs sm:text-sm font-bold truncate">{event.titleMr || event.title} — अधिकृत ट्रेलर</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={videoEmbedUrl}
                title="Event Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Cast & Crew */}
        {parsedDbCast && parsedDbCast.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">कलाकार व तंत्रज्ञ</h2>
                <p className="text-xs text-slate-600">Cast & Crew</p>
              </div>
              <Award className="w-5 h-5 text-[#ea580c]" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {parsedDbCast.map((member, idx) => (
                <div key={idx} className="flex flex-col items-center text-center space-y-2 group">
                  {member.image ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-200 p-0.5 shadow group-hover:border-[#ea580c] transition duration-200">
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition duration-300" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-orange-600 font-bold text-lg">
                      {member.name ? member.name[0] : 'C'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ea580c] transition">{member.name}</h4>
                    {(member.roleMr || member.role) && (
                      <p className="text-[11px] text-slate-600 font-medium">{member.roleMr || member.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">नाटकाविषयी</h2>
              <p className="text-xs text-slate-600">About The Show</p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-sm text-slate-700 leading-relaxed space-y-3">
            <p className={showFullDesc ? '' : 'line-clamp-4'}>
              {event.descriptionMr || event.description || 'या कार्यक्रमाविषयी अधिक माहिती लवकरच उपलब्ध होईल.'}
            </p>
            {event.description && event.description !== event.descriptionMr && (
              <p className={`text-slate-600 text-xs pt-1 border-t border-slate-100 italic ${showFullDesc ? '' : 'hidden'}`}>
                {event.description}
              </p>
            )}
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-xs font-bold text-[#ea580c] hover:underline pt-1 inline-block"
            >
              {showFullDesc ? 'कमी वाचा ▲' : 'पूर्ण माहिती वाचा ▼'}
            </button>
          </div>
          {facilitiesList.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
              {event.language && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">🗣️ {event.language}</span>
              )}
              {event.durationMinutes && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">⏱️ {event.durationMinutes} मिनिटे</span>
              )}
              {facilitiesList.map((fac, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">✨ {fac}</span>
              ))}
            </div>
          )}
        </section>

        {/* Sessions — BOOKING HAPPENS HERE, no redirect! */}
        <section id="sessions" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
                उपलब्ध प्रयोग व वेळा
              </h2>
              <p className="text-xs text-slate-600">आपल्या सोयीनुसार तारीख व वेळ निवडून जागा निश्चित करा</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>थेट आरक्षण उपलब्ध</span>
            </div>
          </div>

          {/* Modern Date Tab Pills — BookMyShow style swipeable */}
          {uniqueDates.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap touch-pan-x -mx-1 px-1">
              <button
                onClick={() => setSelectedDate('all')}
                className={`flex items-center justify-center px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition border shrink-0 ${
                  selectedDate === 'all'
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/20 border-transparent'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                सर्व तारखा
              </button>
              {uniqueDates.map((dateStr) => {
                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleDateString('mr-IN', { weekday: 'short' });
                const dayNumber = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('mr-IN', { month: 'short' });
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center min-w-[56px] sm:min-w-[64px] px-3 py-1.5 rounded-2xl whitespace-nowrap transition border shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-orange-500 to-[#ea580c] text-white border-[#ea580c] shadow-md shadow-orange-500/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>{dayName}</span>
                    <span className="text-base sm:text-lg font-black leading-tight">{dayNumber}</span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>{monthName}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* BookMyShow Style Time-of-Day Filter & Sorting Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">वेळ:</span>
              {[
                { id: 'all', label: 'सर्व वेळा' },
                { id: 'morning', label: '🌅 सकाळ (१२ पूर्वी)' },
                { id: 'afternoon', label: '☀️ दुपार (१२-४)' },
                { id: 'evening', label: '🌆 संध्याकाळ (४-८)' },
                { id: 'night', label: '🌙 रात्री (८ नंतर)' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeFilter(tf.id as any)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition whitespace-nowrap cursor-pointer shrink-0 border ${
                    timeFilter === tf.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:border-orange-300'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs ml-auto">
              <span className="text-[11px] font-bold text-slate-500">क्रमवारी:</span>
              <select
                value={sessionSort}
                onChange={(e) => setSessionSort(e.target.value as any)}
                aria-label="शो क्रमवारी"
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-2 py-1 outline-none hover:border-orange-300 cursor-pointer"
              >
                <option value="time_asc">⚡ वेळेनुसार (लवकर आधी)</option>
                <option value="price_asc">💰 दर: कमी ते जास्त</option>
                <option value="price_desc">💎 दर: जास्त ते कमी</option>
              </select>
            </div>
          </div>

          {/* Session Cards */}
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="text-4xl">🗓️</div>
              <p className="text-sm font-bold text-slate-700">निवडलेल्या तारखेला प्रयोग उपलब्ध नाही</p>
              <p className="text-xs text-slate-500">कृपया इतर तारीख किंवा सर्व तारखा निवडा.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const sDate = new Date(session.sessionStartTime);
                const dateStr = sDate.toLocaleDateString('mr-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                const timeStr = sDate.toLocaleTimeString('mr-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const minPrice =
                  session.ticketTypes.length > 0
                    ? Math.min(...session.ticketTypes.map((t) => t.price / 100))
                    : 300;
                const maxPrice =
                  session.ticketTypes.length > 0
                    ? Math.max(...session.ticketTypes.map((t) => t.price / 100))
                    : 500;
                const availableSeats = session.ticketTypes.reduce((sum, t) => sum + t.availableQuota, 0);

                return (
                  <div
                    key={session.id}
                    className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#ea580c] hover:shadow-md transition duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group cursor-pointer"
                    onClick={() => handleBookSession(session)}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-orange-100 text-[#ea580c] text-xs font-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeStr}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-800">{dateStr}</span>
                        {availableSeats < 50 && availableSeats > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                            भरत आले! Filling Fast
                          </span>
                        )}
                        {availableSeats === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                            Housefull
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.venue.nameMr || event.venue.name}</span>
                        <span>•</span>
                        <span>{event.venue.city}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {session.ticketTypes.map((tt) => (
                          <span key={tt.id} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                            {tt.nameMr || tt.name}: ₹{tt.price / 100}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] text-slate-500">तिकीट दर</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          ₹{minPrice}{minPrice !== maxPrice ? ` - ₹${maxPrice}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBookSession(session); }}
                        disabled={availableSeats === 0}
                        className="px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95 flex items-center gap-1.5 group-hover:shadow-orange-500/40"
                      >
                        <span>{availableSeats === 0 ? 'Housefull' : 'आसन निवडा'}</span>
                        {availableSeats > 0 && <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Venue Info */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">नाट्यगृह व पत्ता</h2>
              <p className="text-xs text-slate-600">Venue Location & Directions</p>
            </div>
            <MapPin className="w-5 h-5 text-[#ea580c]" />
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">{event.venue.nameMr || event.venue.name}</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {event.venue.address || 'नाट्यगृह परिसर, मुख्य रस्ता'}, {event.venue.city}, महाराष्ट्र
            </p>
            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${event.venue.name} ${event.venue.city}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#ea580c] text-[#ea580c] text-xs font-bold transition shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Google Maps वर दिशा पहा</span>
              </a>
            </div>
          </div>
        </section>

        {/* Organizer */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">आयोजक (Organized By)</p>
            <h3 className="text-sm font-bold text-slate-900">{event.organizer.name}</h3>
            {event.organizer.companyName && (
              <p className="text-xs text-slate-500">{event.organizer.companyName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>व्हेरिफाइड</span>
          </div>
        </section>
      </main>

      {/* Floating Bottom Sticky Bar */}
      <aside
        aria-label="Quick booking"
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-30 shadow-2xl"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">
              {event.titleMr || event.title}
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              {event.venue.nameMr || event.venue.name} · {event.venue.city}
              {minSessionPrice > 0 && ` · ₹${minSessionPrice} पासून`}
            </p>
          </div>
          <a
            href="#sessions"
            className="shrink-0 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition active:scale-95 flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            <span>तिकीट बुक करा</span>
          </a>
        </div>
      </aside>

      {/* Inline SeatMapModal — no redirect needed! */}
      {seatMapOpen && event && selectedSession && (
        <SeatMapModal
          event={event as any}
          session={selectedSession}
          language="mr"
          onClose={() => { setSeatMapOpen(false); setSelectedSession(null); }}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* Inline CheckoutDrawer */}
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

      {/* Ticket Pass Modal after success */}
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
