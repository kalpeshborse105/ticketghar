'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/src/components/Header';
import {
  Theater,
  MapPin,
  Calendar,
  Clock,
  Ticket,
  ChevronRight,
  ExternalLink,
  Navigation,
  ShieldCheck,
  Armchair,
  Sparkles,
  PhoneCall,
  Car,
  Wifi,
  Coffee,
} from 'lucide-react';
import { Language } from '@/src/lib/types';
import { MTTicketLoader } from '@/src/components/ui/MTSkeleton';

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params?.id as string;

  const [language, setLanguage] = useState<Language>('mr');
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [totalShowsCount, setTotalShowsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) return;

    const fetchVenue = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/venues/${venueId}`);
        if (!res.ok) {
          throw new Error('नाट्यगृह आढळले नाही');
        }
        const data = await res.json();
        setVenue(data.venue);
        setUpcomingEvents(data.upcomingEvents || []);
        setTotalShowsCount(data.totalShowsCount || 0);
      } catch (err: any) {
        setError(err.message || 'नाट्यगृहाची माहिती लोड करताना अडचण आली.');
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [venueId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7ED]">
        <Header language={language} onLanguageChange={setLanguage} />
        <div className="flex h-96 items-center justify-center">
          <MTTicketLoader />
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-[#FFF7ED]">
        <Header language={language} onLanguageChange={setLanguage} />
        <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center mx-auto">
            <Theater className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#141B2B]">नाट्यगृह आढळले नाही</h2>
          <p className="text-xs text-[#64748B]">
            {error || 'विनंती केलेले नाट्यगृह उपलब्ध नाही.'}
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#EA580C] text-white text-xs font-bold hover:bg-[#C2410C] transition shadow-xs"
          >
            मुख्यपृष्ठावर परत जा
          </Link>
        </div>
      </div>
    );
  }

  const facilities: string[] = (() => {
    try {
      if (typeof venue.facilities === 'string') return JSON.parse(venue.facilities);
      if (Array.isArray(venue.facilities)) return venue.facilities;
    } catch {}
    return ['वातानुकूलित सभागृह', 'पार्किंग', 'कॅफेटेरिया', 'व्हीआयपी लाउंज'];
  })();

  const mapUrl = venue.latitude && venue.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + (venue.city || 'Pune'))}`;

  return (
    <div className="min-h-screen bg-[#FFF7ED] text-[#141B2B] selection:bg-[#EA580C] selection:text-white pb-20">
      <Header language={language} onLanguageChange={setLanguage} />

      {/* Breadcrumb Strip */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Link href="/" className="hover:text-[#EA580C] transition">
            मुखपृष्ठ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>नाट्यगृह दर्शन</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-bold text-[#141B2B] truncate">{venue.nameMr || venue.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Theatre Hero Card (Stitch Exact Look) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-200/80 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-orange-100 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0 shadow-xs">
                <Theater className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-orange-100 text-[#EA580C] text-xs font-bold">
                    🏛️ ऐतिहासिक नाट्यगृह
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    {totalShowsCount > 0 ? `आज ${totalShowsCount} प्रयोग नियोजित` : 'सक्रिय नाट्यगृह'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2B]">
                  {venue.nameMr || venue.name}
                </h1>
                <p className="text-sm font-semibold text-[#64748B]">
                  {venue.name} • <span className="text-[#EA580C]">{venue.city || 'पुणे'}</span>
                </p>
                <p className="text-xs text-[#64748B] flex items-center gap-1.5 pt-1">
                  <MapPin className="w-4 h-4 text-[#EA580C] shrink-0" />
                  <span>{venue.address || 'JM रोड, पुणे'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 text-[#EA580C] border border-orange-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>गुगल मॅप्सवर दिशा पहा</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B]">
                <Armchair className="w-4 h-4 text-[#EA580C]" />
                <span className="font-bold text-[#141B2B]">{venue.totalCapacity || 950}</span>
                <span>एकूण आसन क्षमता</span>
              </div>
            </div>
          </div>

          {/* Amenities Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#64748B] mr-1">सुविधा व वैशिष्ट्ये:</span>
            {facilities.map((fac, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-lg bg-orange-50 text-[#A33900] text-xs font-semibold border border-orange-200/60"
              >
                ✓ {fac}
              </span>
            ))}
          </div>
        </div>

        {/* Section: चालू व आगामी प्रयोग (Upcoming Shows at this Theatre) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 rounded-full bg-[#EA580C]" />
              <div>
                <h2 className="text-xl font-bold text-[#141B2B]">
                  येथील चालू व आगामी प्रयोग (Upcoming Shows)
                </h2>
                <p className="text-xs text-[#64748B]">
                  {venue.nameMr || venue.name} मधील सध्याचे व पुढील प्रयोगांचे वेळापत्रक
                </p>
              </div>
            </div>
            {upcomingEvents.length > 0 && (
              <span className="text-xs font-bold text-[#EA580C] bg-orange-100 px-3 py-1 rounded-full">
                {upcomingEvents.length} नाटके उपलब्ध
              </span>
            )}
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-orange-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex gap-3.5">
                    <img
                      src={evt.posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=400&q=80'}
                      alt={evt.title}
                      className="w-24 h-32 rounded-xl object-cover shrink-0 shadow-xs bg-slate-100"
                    />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-[#EA580C] text-[10px] font-bold">
                          {evt.categoryMr || 'मराठी नाटक'}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          उपलब्ध
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#141B2B] truncate">
                        {evt.titleMr || evt.title}
                      </h3>
                      <p className="text-xs text-[#64748B] line-clamp-2">
                        {evt.descriptionMr || evt.description}
                      </p>

                      {/* Sessions strip */}
                      {evt.sessions && evt.sessions.length > 0 ? (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {evt.sessions.slice(0, 3).map((sess: any) => (
                            <span
                              key={sess.id}
                              className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#141B2B] border border-slate-200"
                            >
                              🕒 {new Date(sess.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-[#64748B] block">तिकीट दर</span>
                      <span className="text-sm font-extrabold text-[#EA580C]">
                        ₹{(evt.minPrice / 100).toFixed(0)} पासून
                      </span>
                    </div>

                    <Link
                      href={`/events/${evt.id}`}
                      className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>तिकीट निवडा आणि बुक करा</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* EXACT REQUIRED EMPTY STATE MESSAGE */
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-orange-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#141B2B]">
                  सध्या या नाट्यगृहात कोणतेही प्रयोग उपलब्ध नाहीत
                </h3>
                <p className="text-xs text-[#64748B]">
                  Currently no upcoming shows scheduled at this theatre.
                </p>
                <p className="text-xs text-[#64748B] max-w-md mx-auto pt-1">
                  नवीन प्रयोगांचे वेळापत्रक लवकरच जाहीर केले जाईल. आपण इतर प्रमुख नाट्यगृहांचे प्रयोग पाहू शकता.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition shadow-xs"
                >
                  सर्व कार्यक्रम व नाटके पहा
                </Link>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#141B2B] transition cursor-pointer"
                >
                  मागे जा
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Theatre Historical Context & Advisory */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#EA580C]" />
            <h3 className="text-sm font-bold text-[#141B2B]">नाट्यगृह माहिती व मार्गदर्शक सूचना</h3>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            {venue.description || 'महाराष्ट्राच्या नाट्य परंपरेचे साक्षीदार असलेले हे नाट्यगृह रसिकांच्या सेवेत सातत्याने कार्यरत आहे.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-orange-100 flex items-center gap-2.5">
              <Car className="w-5 h-5 text-[#EA580C] shrink-0" />
              <div>
                <span className="font-bold text-[#141B2B] block">वाहनतळ (Parking)</span>
                <span className="text-[11px] text-[#64748B]">दुचाकी व चारचाकी पार्किंग उपलब्ध</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-orange-100 flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#EA580C] shrink-0" />
              <div>
                <span className="font-bold text-[#141B2B] block">प्रवेश वेळ (Entry Time)</span>
                <span className="text-[11px] text-[#64748B]">शो सुरू होण्यापूर्वी ३० मि. आधी</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-orange-100 flex items-center gap-2.5">
              <Coffee className="w-5 h-5 text-[#EA580C] shrink-0" />
              <div>
                <span className="font-bold text-[#141B2B] block">कॅफेटेरिया (Snack Bar)</span>
                <span className="text-[11px] text-[#64748B]">मध्यंतरामध्ये चहा, कॉफी व नाश्ता</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
