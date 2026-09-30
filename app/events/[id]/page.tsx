'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Tag, 
  Languages, 
  Ticket, 
  Loader2,
  ChevronRight 
} from 'lucide-react';

interface EventDetail {
  id: number;
  title: string;
  titleMr?: string;
  category: string;
  language?: string;
  description?: string;
  descriptionMr?: string;
  posterUrl?: string;
  duration?: number;
  venue: {
    id: number;
    name: string;
    nameMr?: string;
    address?: string;
    city?: string;
    sections?: any[];
  };
  organizer: {
    name: string;
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Event not found');
          } else {
            setError('Unable to load event');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6366f1] mx-auto" />
          <p className="text-sm text-[#6b7280]">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#e5e7eb] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#fef2f2] text-[#ef4444] flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">{error || 'Event Not Found'}</h1>
          <p className="text-sm text-[#6b7280]">
            The event you're looking for doesn't exist or is no longer available.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-semibold hover:bg-[#4f46e5] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const activeSessions = event.sessions.filter(s => s.status === 'active');
  const categoryLabel: Record<string, string> = {
    plays: 'Plays & Theatre',
    music: 'Music & Concerts',
    comedy: 'Comedy',
    cultural: 'Cultural',
    workshops: 'Workshops',
    movies: 'Movies',
    sports: 'Sports',
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[#6366f1] hover:text-[#4f46e5] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Event Hero */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-lg">
          
          {/* Poster */}
          {event.posterUrl ? (
            <div
              className="h-72 sm:h-96 bg-cover bg-center"
              style={{ backgroundImage: `url(${event.posterUrl})` }}
            />
          ) : (
            <div className="h-72 sm:h-96 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Ticket className="w-24 h-24 text-white/30" />
            </div>
          )}

          {/* Event Info */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Title & Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-[#6366f1]/10 text-[#6366f1] text-xs font-semibold rounded-full border border-[#6366f1]/20">
                  {categoryLabel[event.category] || event.category}
                </span>
                {event.language && (
                  <span className="px-2.5 py-1 bg-[#f5f5f5] text-[#6b7280] text-xs font-semibold rounded-full border border-[#e5e7eb]">
                    {event.language}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#111827]">
                {event.titleMr || event.title}
              </h1>
              {event.titleMr && (
                <p className="text-lg text-[#6b7280]">{event.title}</p>
              )}
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-t border-b border-[#e5e7eb]">
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Venue</p>
                  <p className="text-sm font-semibold text-[#111827]">
                    {event.venue.nameMr || event.venue.name}
                  </p>
                  <p className="text-xs text-[#6b7280]">{event.venue.city}</p>
                </div>
              </div>

              {event.duration && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280]">Duration</p>
                    <p className="text-sm font-semibold text-[#111827]">
                      {event.duration} minutes
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Starting from</p>
                  <p className="text-sm font-semibold text-[#111827]">
                    {activeSessions.length > 0 && activeSessions[0].ticketTypes.length > 0
                      ? `₹${Math.min(...activeSessions[0].ticketTypes.map(t => t.price / 100))}`
                      : 'TBA'}
                  </p>
                </div>
              </div>

            </div>

            {/* Description */}
            {(event.descriptionMr || event.description) && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-[#111827]">About This Event</h2>
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                  {event.descriptionMr || event.description}
                </p>
              </div>
            )}

            {/* Organizer */}
            <div className="bg-[#f5f5f5] rounded-lg p-4 text-sm">
              <p className="text-xs text-[#6b7280] mb-1">Organized by</p>
              <p className="font-semibold text-[#111827]">{event.organizer.name}</p>
            </div>

          </div>
        </div>

        {/* Sessions & Booking */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111827]">Available Sessions</h2>
              <p className="text-xs text-[#6b7280]">Select a show time to book your seats</p>
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-[#6b7280]">No sessions currently available</p>
              <p className="text-xs text-[#9ca3af]">Check back later for updated schedule</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => {
                const sessionDate = new Date(session.sessionStartTime);
                const formattedDate = sessionDate.toLocaleString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedTime = sessionDate.toLocaleString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const minPrice = session.ticketTypes.length > 0
                  ? Math.min(...session.ticketTypes.map(t => t.price / 100))
                  : 0;
                const maxPrice = session.ticketTypes.length > 0
                  ? Math.max(...session.ticketTypes.map(t => t.price / 100))
                  : 0;

                const totalAvailable = session.ticketTypes.reduce(
                  (sum, t) => sum + t.availableQuota,
                  0
                );

                return (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-[#e5e7eb] rounded-xl hover:border-[#6366f1] hover:shadow-sm transition"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#6366f1]" />
                        <span className="text-sm font-semibold text-[#111827]">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#6b7280]" />
                        <span className="text-sm text-[#6b7280]">{formattedTime}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Tag className="w-4 h-4 text-[#22c55e]" />
                        <span className="text-sm font-semibold text-[#111827]">
                          ₹{minPrice} - ₹{maxPrice}
                        </span>
                        <span className="text-xs text-[#6b7280]">
                          • {totalAvailable} seats available
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBookSession(session.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] text-white rounded-lg text-sm font-semibold hover:bg-[#4f46e5] transition shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      <span>Book Seats</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Venue Details */}
        {event.venue.address && (
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 space-y-3 shadow-sm">
            <h3 className="text-lg font-bold text-[#111827]">Venue Details</h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#6366f1] shrink-0 mt-0.5" />
              <div className="text-sm text-[#374151] leading-relaxed">
                <p className="font-semibold text-[#111827]">{event.venue.nameMr || event.venue.name}</p>
                <p>{event.venue.address}</p>
                <p>{event.venue.city}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280] py-4">
          <Link href="/terms" className="hover:text-[#6366f1] transition">Terms</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-[#6366f1] transition">Privacy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-[#6366f1] transition">Support</Link>
        </div>

      </main>
    </div>
  );
}
