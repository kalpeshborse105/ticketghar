'use client';

import React, { useState, useEffect } from 'react';
import { translations } from '@/src/lib/i18n';
import { Language, EventCategory, EventItem, EventSessionItem } from '@/src/lib/types';
import { Header } from '@/src/components/Header';
import { HeroBanner } from '@/src/components/HeroBanner';
import { EventCard } from '@/src/components/EventCard';
import { SeatMapModal } from '@/src/components/SeatMapModal';
import { CheckoutDrawer } from '@/src/components/CheckoutDrawer';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import { MyTicketsView } from '@/src/components/MyTicketsView';
import { PartnerWithUsModal } from '@/src/components/PartnerWithUsModal';
import { AdminPanel } from '@/src/components/AdminPanel';
import { useOnlineStatus } from '@/hooks/use-pwa';
import {
  Sparkles,
  Flame,
  Theater,
  Music,
  Smile,
  Film,
  Compass,
  Trophy,
  Palette,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Building2,
  PhoneCall,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';

const CATEGORIES: { id: EventCategory; labelEn: string; labelMr: string; icon: any }[] = [
  { id: 'all', labelEn: 'All Experiences', labelMr: 'सर्व कार्यक्रम', icon: Sparkles },
  { id: 'plays', labelEn: 'Plays & Theatre', labelMr: 'नाटक', icon: Theater },
  { id: 'music', labelEn: 'Music & Concerts', labelMr: 'संगीत व मैफिली', icon: Music },
  { id: 'comedy', labelEn: 'Standup Comedy', labelMr: 'स्टँडअप कॉमेडी', icon: Smile },
  { id: 'cultural', labelEn: 'Cultural & Festivals', labelMr: 'सांस्कृतिक महोत्सव', icon: Compass },
  { id: 'workshops', labelEn: 'Workshops', labelMr: 'कार्यशाळा', icon: Palette },
  { id: 'movies', labelEn: 'Movies', labelMr: 'चित्रपट', icon: Film },
  { id: 'sports', labelEn: 'Sports', labelMr: 'क्रीडा', icon: Trophy },
];

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('mr');
  const t = translations[language];
  const isOnline = useOnlineStatus();

  // Navigation and Filtering State
  const [selectedCity, setSelectedCity] = useState('महाराष्ट्र (All)');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Events Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Surface view controllers
  const [viewState, setViewState] = useState<'home' | 'my_tickets' | 'admin'>('home');
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  // Booking Flow State
  const [selectedEventForBooking, setSelectedEventForBooking] = useState<EventItem | null>(null);
  const [selectedSessionForBooking, setSelectedSessionForBooking] = useState<EventSessionItem | null>(null);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [checkoutHoldData, setCheckoutHoldData] = useState<any | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBookingResult, setConfirmedBookingResult] = useState<any | null>(null);

  // Fetch Events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCity && selectedCity !== 'महाराष्ट्र (All)') {
        params.append('city', selectedCity);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);

      // Cache event cards in localStorage for offline availability
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ticketghar_cached_events', JSON.stringify(data.events || []));
        } catch (e) {
          // ignore cache error
        }
      }
    } catch (err: any) {
      console.warn('Network error fetching events:', err);
      // Fallback to offline cached events
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('ticketghar_cached_events');
        if (cached) {
          try {
            setEvents(JSON.parse(cached));
            setError(null);
            setLoading(false);
            return;
          } catch (e) {}
        }
      }
      setError(err.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCity, selectedCategory, searchQuery]);

  // Initiate booking from event card
  const handleSelectEvent = (event: EventItem) => {
    setSelectedEventForBooking(event);
    if (event.sessions && event.sessions.length > 0) {
      setSelectedSessionForBooking(event.sessions[0]);
    }
    setSeatMapOpen(true);
  };

  // From Seat Map to Checkout
  const handleProceedToCheckout = (holdData: any) => {
    setCheckoutHoldData(holdData);
    setSeatMapOpen(false);
    setCheckoutOpen(true);
  };

  // From Checkout to Success Ticket Pass
  const handleBookingConfirmed = (result: any) => {
    setCheckoutOpen(false);
    setConfirmedBookingResult(result);
  };

  // Render Admin Surface if active
  if (viewState === 'admin') {
    return (
      <AdminPanel
        language={language}
        onBack={() => setViewState('home')}
      />
    );
  }

  // Filter theatre/plays events for Marathi spotlight
  const theatreEvents = events.filter(
    (e) => e.category === 'plays' || e.title.includes('Sahi')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-bold text-slate-950 flex items-center justify-center gap-2 shadow-lg sticky top-0 z-50">
          <AlertTriangle className="w-4 h-4 fill-current shrink-0" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMyTickets={() => setViewState('my_tickets')}
        onOpenPartnerModal={() => setPartnerModalOpen(true)}
        onOpenAdmin={() => setViewState('admin')}
        onHomeClick={() => setViewState('home')}
      />

      {/* Render My Tickets or Discovery Content */}
      {viewState === 'my_tickets' ? (
        <MyTicketsView
          language={language}
          onBack={() => setViewState('home')}
          onViewTicket={(data) => setConfirmedBookingResult(data)}
        />
      ) : (
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 sm:space-y-10">
          {/* Top Hero Banner */}
          {!searchQuery && selectedCategory === 'all' && (
            <HeroBanner
              events={events}
              language={language}
              onSelectEvent={handleSelectEvent}
            />
          )}

          {/* Category Navigation Pills */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer transform active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>{language === 'mr' ? cat.labelMr : cat.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Marathi Theatre Spotlight (मराठी रंगभूमी विशेष) */}
          {selectedCategory === 'all' && !searchQuery && theatreEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Theater className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">
                      {t.theatreSpotlight}
                    </h2>
                    <p className="text-xs text-slate-400">
                      महाराष्ट्रातील नामवंत रंगमंदिरांमधील लोकप्रिय व पुरस्कृत नाटके
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {theatreEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    language={language}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: All Events / Filtered Catalog */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">
                  {selectedCategory === 'all'
                    ? language === 'mr'
                      ? 'सर्व आगामी कार्यक्रम (All Upcoming Experiences)'
                      : 'All Upcoming Experiences'
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.labelMr || 'कार्यक्रम'}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedCity} • {events.length} कार्यक्रम उपलब्ध
                </p>
              </div>

              <button
                onClick={fetchEvents}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">रिफ्रेश</span>
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-slate-900/60 rounded-2xl h-80 animate-pulse border border-slate-800 p-4 space-y-3"
                  >
                    <div className="w-full h-44 bg-slate-800 rounded-xl" />
                    <div className="w-3/4 h-5 bg-slate-800 rounded" />
                    <div className="w-1/2 h-4 bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-bold text-white">{error}</h3>
                <button
                  onClick={fetchEvents}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  पुन्हा प्रयत्न करा
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800 p-8 space-y-2">
                <Theater className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  सध्या या शहरात किंवा वर्गात कार्यक्रम उपलब्ध नाहीत
                </h3>
                <p className="text-xs text-slate-400">
                  कृपया दुसरे शहर निवडा किंवा &apos;महाराष्ट्र (सर्व शहरे)&apos; निवडून तपासा.
                </p>
                <button
                  onClick={() => {
                    setSelectedCity('महाराष्ट्र (All)');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  सर्व कार्यक्रम दाखवा
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    language={language}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Maharashtra Producer & Organizer Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 flex items-center justify-center md:justify-start gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>नाट्य व कार्यक्रम आयोजकांसाठी</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
                आपला कार्यक्रम तिकीटघरवर सूचीबद्ध करा
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                पारदर्शक लेजर, सुरक्षित पेमेंट, थेट गेट स्कॅनर सपोर्ट आणि महाराष्ट्रातील लक्षावधी रसिकांपर्यंत थेट पोहोच.
              </p>
            </div>
            <button
              onClick={() => setPartnerModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl transition transform hover:scale-105 whitespace-nowrap cursor-pointer"
            >
              {t.partnerWithUs}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-8 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300 font-bold text-sm">
              <span className="font-serif">TicketGhar (तिकीटघर)</span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                महाराष्ट्र
              </span>
            </div>
            <p className="mt-1 text-slate-500">
              पुणे • मुंबई • नागपूर • नाशिक • ठाणे • संभाजीनगर • कोल्हापूर
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <button
              onClick={() => setPartnerModalOpen(true)}
              className="hover:text-amber-400 transition"
            >
              आयोजक नोंदणी
            </button>
            <button
              onClick={() => setViewState('admin')}
              className="hover:text-amber-400 transition"
            >
              प्रशासक लॉगिन
            </button>
            <span className="text-slate-600">|</span>
            <span>© {new Date().getFullYear()} Kalpkrut Infotech</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Interactive Seat Map */}
      {seatMapOpen && selectedEventForBooking && selectedSessionForBooking && (
        <SeatMapModal
          event={selectedEventForBooking}
          session={selectedSessionForBooking}
          language={language}
          onClose={() => setSeatMapOpen(false)}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* MODAL 2: Transparent Checkout Drawer */}
      {checkoutOpen && selectedEventForBooking && selectedSessionForBooking && checkoutHoldData && (
        <CheckoutDrawer
          event={selectedEventForBooking}
          session={selectedSessionForBooking}
          holdData={checkoutHoldData}
          language={language}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleBookingConfirmed}
        />
      )}

      {/* MODAL 3: Celebratory Ticket Pass with QR */}
      {confirmedBookingResult && (
        <TicketPassModal
          bookingResult={confirmedBookingResult}
          language={language}
          onClose={() => setConfirmedBookingResult(null)}
        />
      )}

      {/* MODAL 4: Partner With Us / Producer Application */}
      {partnerModalOpen && (
        <PartnerWithUsModal
          language={language}
          onClose={() => setPartnerModalOpen(false)}
        />
      )}
    </div>
  );
}
