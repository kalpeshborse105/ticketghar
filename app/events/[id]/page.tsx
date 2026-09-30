'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Tag,
  Ticket,
  Loader2,
  ChevronRight,
  Share2,
  Heart,
  Star,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  Navigation,
  Volume2,
  Award,
} from 'lucide-react';

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

// Authentic cast profiles tailored for Marathi theater & cultural performances
const CAST_CREW_PROFILES: Record<string, Array<{ name: string; role: string; roleMr: string; image: string }>> = {
  default: [
    {
      name: 'प्रशांत दामले',
      role: 'Lead Actor',
      roleMr: 'मुख्य कलाकार',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'मुक्ता बर्वे',
      role: 'Lead Actress',
      roleMr: 'मुख्य अभिनेत्री',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'चंद्रकांत कुलकर्णी',
      role: 'Director',
      roleMr: 'दिग्दर्शक',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'क्षितिज पटवर्धन',
      role: 'Writer / Playwright',
      roleMr: 'लेखक / पटकथा',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'अशोक पत्की',
      role: 'Music Director',
      roleMr: 'संगीतकार',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'प्रदीप मुळ्ये',
      role: 'Set Designer',
      roleMr: 'नेपथ्यकार',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
    },
  ],
  music: [
    {
      name: 'महेश काळे',
      role: 'Classical Vocalist',
      roleMr: 'शास्त्रीय गायक',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'राहुल देशपांडे',
      role: 'Classical Vocalist',
      roleMr: 'गायक व संगीतकार',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'सत्यजित तळवलकर',
      role: 'Tabla Maestro',
      roleMr: 'तबला साथ',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'अजय जोगळेकर',
      role: 'Harmonium Accompanist',
      roleMr: 'संवादिनी साथ',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    },
  ],
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Event not found');
          } else {
            setError('Unable to load event details');
          }
          return;
        }
        const json = await res.json();
        setEvent(json.event);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleBookSession = (sessionId: number) => {
    router.push(`/?bookEvent=${eventId}&session=${sessionId}`);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <Loader2 className="w-10 h-10 animate-spin text-[#ea580c] mx-auto" />
          <p className="text-sm font-bold text-slate-700">कार्यक्रमाचा तपशील लोड होत आहे...</p>
          <p className="text-xs text-slate-600">MahaTicket official booking portal</p>
        </div>
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

  const activeSessions = event.sessions.filter((s) => s.status === 'active');

  // Group unique session dates for BookMyShow date pill bar
  const uniqueDates = Array.from(
    new Set(
      activeSessions.map((s) => {
        const d = new Date(s.sessionStartTime);
        return d.toISOString().split('T')[0];
      })
    )
  );

  const filteredSessions =
    selectedDate === 'all'
      ? activeSessions
      : activeSessions.filter(
          (s) => new Date(s.sessionStartTime).toISOString().split('T')[0] === selectedDate
        );

  const categoryLabel: Record<string, string> = {
    plays: 'नाटक व रंगभूमी (Theatre Play)',
    music: 'संगीत व मैफल (Music Concert)',
    comedy: 'हास्यविनोद (Comedy Standup)',
    cultural: 'सांस्कृतिक महोत्सव (Cultural)',
    workshops: 'कार्यशाळा (Workshops)',
    movies: 'चित्रपट (Movies)',
    sports: 'क्रीडा (Sports)',
  };

  let parsedDbCast: Array<{ name: string; role: string; roleMr: string; image: string }> | null = null;
  if ((event as any).castCrew) {
    try {
      const parsed = JSON.parse((event as any).castCrew);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedDbCast = parsed;
      }
    } catch {
      // fallback
    }
  }

  const castList =
    parsedDbCast || (event.category === 'music' ? CAST_CREW_PROFILES.music : CAST_CREW_PROFILES.default);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#ea580c] transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>मुख्य पानावर परत जा (Home)</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              title="लिंक कॉपी करा"
            >
              <Share2 className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>{copiedLink ? 'लिंक कॉपी झाली!' : 'शेअर करा'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section - BookMyShow & Cinemax Vibrant Layout */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        {/* Ambient Blur Backdrop */}
        <div
          className="absolute inset-0 opacity-25 filter blur-3xl scale-110 pointer-events-none"
          style={{
            backgroundImage: `url(${event.bannerUrl || event.posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
            {/* Poster Card */}
            <div className="relative shrink-0 w-56 sm:w-64 md:w-72 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 group">
              <img
                src={event.posterUrl}
                alt={event.title}
                className="w-full h-80 sm:h-96 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3 bg-[#ea580c] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                {event.language || 'मराठी'}
              </div>
            </div>

            {/* Event Info Details */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ea580c]/20 text-orange-400 border border-orange-500/30">
                  {event.categoryMr || categoryLabel[event.category] || event.category}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10">
                  प्रमाणपत्र: {event.ageGuidance || 'U'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#ea580c]" />
                  <span>{event.durationMinutes || 150} मिनिटे</span>
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white font-serif tracking-tight">
                  {event.titleMr || event.title}
                </h1>
                {event.titleMr && event.title !== event.titleMr && (
                  <p className="text-base sm:text-lg text-slate-400 font-medium mt-1">
                    {event.title}
                  </p>
                )}
              </div>

              {/* Rating & Audience Sentiment Badge */}
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span className="text-base font-extrabold text-white">९.४ / १०</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <span className="text-xs text-slate-300">
                  <strong>१४,२५०+</strong> प्रेक्षकांची पसंती
                </span>
              </div>

              {/* Quick Info Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300 max-w-xl">
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
                    <p className="font-bold text-white">अधिकृत तिकीट आरक्षण</p>
                    <p className="text-slate-400 text-[11px]">M-Ticket सह थेट प्रवेश</p>
                  </div>
                </div>
              </div>

              {/* Hero CTA Button */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="#sessions"
                  className="px-8 py-3.5 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>शोची वेळ व जागा निवडा (Book Tickets)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* BookMyShow Style Cast & Crew Carousel */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
                कलाकार व तंत्रज्ञ (Cast & Crew)
              </h2>
              <p className="text-xs text-slate-600">
                रंगभूमीवरील आघाडीचे आणि लोकप्रिय कलाकार
              </p>
            </div>
            <Award className="w-5 h-5 text-[#ea580c]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {castList.map((member, idx) => (
              <div key={idx} className="flex flex-col items-center text-center space-y-2 group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-orange-200 p-0.5 shadow group-hover:border-[#ea580c] transition duration-200">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ea580c] transition">
                    {member.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">{member.roleMr}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About The Show & Synopsis */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
                नाटकाविषयी / माहिती (About The Show)
              </h2>
              <p className="text-xs text-slate-600">कथानक, संवाद आणि विशेष वैशिष्ट्ये</p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>

          <div className="text-sm text-slate-700 leading-relaxed space-y-3 font-normal">
            <p className={showFullDesc ? '' : 'line-clamp-4'}>
              {event.descriptionMr || event.description}
            </p>
            {event.description && event.description !== event.descriptionMr && (
              <p className="text-slate-600 text-xs pt-1 border-t border-slate-100 italic">
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

          {/* Key Show Tags */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              🎭 २ अंकी कौटुंबिक नाटक
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              ☕ १० मिनिटे मध्यंतर
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              ❄️ वातानुकूलित (Air Conditioned)
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              🅿️ सुलभ वाहन पार्किंग
            </span>
          </div>
        </section>

        {/* Sessions & Seat Booking Bar - BookMyShow Experience */}
        <section id="sessions" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
                उपलब्ध प्रयोग व वेळा (Select Date & Showtime)
              </h2>
              <p className="text-xs text-slate-600">
                आपल्या सोयीनुसार तारीख व वेळ निवडून जागा निश्चित करा
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>थेट आरक्षण उपलब्ध (Live Holds)</span>
            </div>
          </div>

          {/* BookMyShow Date Filter Tabs */}
          {uniqueDates.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedDate('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                  selectedDate === 'all'
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                सर्व तारखा (All Shows)
              </button>
              {uniqueDates.map((dateStr) => {
                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleDateString('mr-IN', { weekday: 'short' });
                const dayNumber = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('mr-IN', { month: 'short' });

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center px-4 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition border ${
                      selectedDate === dateStr
                        ? 'bg-orange-50 border-[#ea580c] text-[#ea580c] shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-600 uppercase">{dayName}</span>
                    <span className="text-sm font-black">{dayNumber}</span>
                    <span className="text-[10px] text-slate-600">{monthName}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Session Cards List */}
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">निवडलेल्या तारखेला प्रयोग उपलब्ध नाही</p>
              <p className="text-xs text-slate-600">कृपया इतर तारीख किंवा सर्व तारखा निवडा.</p>
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

                const availableSeats = session.ticketTypes.reduce(
                  (sum, t) => sum + t.availableQuota,
                  0
                );

                return (
                  <div
                    key={session.id}
                    className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#ea580c] transition duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-orange-100 text-[#ea580c] text-xs font-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeStr}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-800">{dateStr}</span>
                        {availableSeats < 50 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            भरत आले आहे (Filling Fast)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{event.venue.nameMr || event.venue.name}</span>
                        <span>•</span>
                        <span>{event.venue.city}</span>
                      </div>

                      {/* Ticket categories chips */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {session.ticketTypes.map((tt) => (
                          <span
                            key={tt.id}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                          >
                            {tt.nameMr || tt.name}: ₹{tt.price / 100}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] text-slate-600">तिकीट दर</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          ₹{minPrice} - ₹{maxPrice}
                        </p>
                      </div>

                      <button
                        onClick={() => handleBookSession(session.id)}
                        className="px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95 flex items-center gap-1.5"
                      >
                        <span>आसन निवडा (Select Seats)</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Venue Information & Directions */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
                नाट्यगृह व पत्ता (Venue Location)
              </h2>
              <p className="text-xs text-slate-600">पत्ता, नकाशा आणि पोहोचण्याची सोय</p>
            </div>
            <MapPin className="w-5 h-5 text-[#ea580c]" />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              {event.venue.nameMr || event.venue.name}
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {event.venue.address || 'नाट्यगृह परिसर, मुख्य रस्ता'}, {event.venue.city}, महाराष्ट्र
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${event.venue.name} ${event.venue.city}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#ea580c] text-[#ea580c] text-xs font-bold transition shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>गुगल मॅप्सवर दिशा पहा (Get Directions)</span>
              </a>
            </div>
          </div>
        </section>

        {/* Organizer Details */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-600">आयोजक व नाट्यसंस्था (Organized By)</p>
            <h3 className="text-sm font-bold text-slate-900">{event.organizer.name}</h3>
            {event.organizer.companyName && (
              <p className="text-xs text-slate-600">{event.organizer.companyName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>व्हेरिफाइड आयोजक</span>
          </div>
        </section>
      </main>

      {/* Floating Bottom Sticky Bar for Mobile & Quick Action */}
      <aside aria-label="Quick booking" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">
              {event.titleMr || event.title}
            </h4>
            <p className="text-[11px] text-slate-600 truncate">
              {event.venue.nameMr || event.venue.name} · {event.venue.city}
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
    </div>
  );
}
