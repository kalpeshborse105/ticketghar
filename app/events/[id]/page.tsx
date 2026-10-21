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
  ChevronDown,
  Share2,
  Navigation,
  Play,
  X,
  Star,
  Check,
  Bookmark,
  ShieldCheck,
  DoorOpen,
  Calendar,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { MTTicketLoader } from '@/src/components/ui/MTSkeleton';
import { SeatMapModal } from '@/src/components/SeatMapModal';
import { CheckoutDrawer } from '@/src/components/CheckoutDrawer';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import { AuthModal } from '@/src/components/AuthModal';
import { formatISTDate, formatISTTime } from '@/src/lib/dateUtils';


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
  trailerUrl?: string;
  galleryUrls?: string;
  durationMinutes?: number;
  cast?: string;
  venue: {
    id: number;
    name: string;
    nameMr?: string;
    address?: string;
    city?: string;
    facilities?: any;
    totalCapacity?: number;
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
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [copiedLink, setCopiedLink] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [checkoutHoldData, setCheckoutHoldData] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Database-backed Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({
    totalCount: 0,
    averageRating: 0,
    breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 },
  });
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewCity, setReviewCity] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Accordion state for rules & advisory
  const [openRuleIndex, setOpenRuleIndex] = useState<number | null>(0);
  const [notifyMeRegistered, setNotifyMeRegistered] = useState(false);

  // Database-backed gallery photos for this event
  const eventPhotos = React.useMemo(() => {
    if (!event) return [];
    const list: string[] = [];
    if (Array.isArray((event as any).images) && (event as any).images.length > 0) {
      (event as any).images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url || img?.imageUrl;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    if ((event as any).galleryUrls) {
      try {
        const parsed =
          typeof (event as any).galleryUrls === 'string'
            ? JSON.parse((event as any).galleryUrls)
            : (event as any).galleryUrls;
        if (Array.isArray(parsed)) {
          parsed.forEach((url: string) => {
            if (url && !list.includes(url)) list.push(url);
          });
        }
      } catch {}
    }
    if (list.length === 0) {
      if (event.bannerUrl) list.push(event.bannerUrl);
      if (event.posterUrl && !list.includes(event.posterUrl)) list.push(event.posterUrl);
    }
    return list;
  }, [event]);

  // Dynamic minimum and maximum rates from session ticket types
  const stickyPriceDisplay = React.useMemo(() => {
    if (selectedSession?.ticketTypes && selectedSession.ticketTypes.length > 0) {
      const prices = selectedSession.ticketTypes.map((t: any) => Math.round(t.price / 100));
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      return minP === maxP ? `₹${minP}` : `₹${minP} - ₹${maxP}`;
    }
    if (event?.sessions && event.sessions.length > 0) {
      const allPrices: number[] = [];
      event.sessions.forEach((s: any) => {
        (s.ticketTypes || []).forEach((t: any) => allPrices.push(Math.round(t.price / 100)));
      });
      if (allPrices.length > 0) {
        const minP = Math.min(...allPrices);
        const maxP = Math.max(...allPrices);
        return minP === maxP ? `₹${minP}` : `₹${minP} - ₹${maxP}`;
      }
    }
    return '₹३०० - ₹६००';
  }, [selectedSession, event]);

  // Dynamic Date grouping from database-backed event sessions
  const datesList = React.useMemo(() => {
    if (!event?.sessions || event.sessions.length === 0) return [];

    const map = new Map<string, { label: string; day: string; month: string; full: string; sessions: any[] }>();

    event.sessions.forEach((s: any) => {
      const dateObj = new Date(s.sessionStartTime);
      const dateKey = dateObj.toDateString();

      if (!map.has(dateKey)) {
        const isToday = new Date().toDateString() === dateKey;
        const isTomorrow = new Date(Date.now() + 86400000).toDateString() === dateKey;

        const label = isToday
          ? (language === 'mr' ? 'आज' : 'Today')
          : isTomorrow
          ? (language === 'mr' ? 'उद्या' : 'Tomorrow')
          : formatISTDate(s.sessionStartTime, language, true);

        const day = dateObj.getDate().toString();
        const month = formatISTDate(s.sessionStartTime, language, true);
        const full = formatISTDate(s.sessionStartTime, language, false);

        map.set(dateKey, { label, day, month, full, sessions: [] });
      }

      map.get(dateKey)!.sessions.push(s);
    });

    return Array.from(map.values());
  }, [event?.sessions, language]);

  const fetchReviews = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/reviews`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setReviewStats({
          totalCount: data.totalCount ?? 0,
          averageRating: data.averageRating ?? 0,
          breakdown: data.breakdown || { five: 0, four: 0, three: 0, two: 0, one: 0 },
        });
        setHasUserReviewed(Boolean(data.hasUserReviewed));
        setCurrentUser(data.currentUser || null);
      }
    } catch (err) {
      console.warn('Failed to load reviews', err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [eventId]);

  const [popupNotice, setPopupNotice] = useState<{ title: string; message: string } | null>(null);

  const handleOpenReviewModal = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    if (hasUserReviewed) {
      setPopupNotice({
        title: language === 'mr' ? 'परीक्षण नोंदवले आहे' : 'Review Already Submitted',
        message:
          language === 'mr'
            ? 'तुम्ही या कार्यक्रमाचे परीक्षण आधीच नोंदवले आहे (You have already reviewed this event).'
            : 'You have already reviewed this event.',
      });
      return;
    }
    setReviewError(null);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError(
        language === 'mr'
          ? 'कृपया आपले मत किंवा परीक्षण लिहा'
          : 'Please enter your review comment'
      );
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError(null);

      const res = await fetch(`/api/events/${eventId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: userRating,
          comment: reviewComment.trim(),
          city: reviewCity.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'परीक्षण नोंदवताना त्रुटी आली');
      }

      setReviewSuccess(true);
      setHasUserReviewed(true);
      await fetchReviews();

      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewModal(false);
        setReviewComment('');
        setReviewCity('');
      }, 1500);
    } catch (err: any) {
      setReviewError(err.message || 'परीक्षण नोंदवताना त्रुटी आली');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatRichDescription = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[color:(#[A-Fa-f0-9]{6})\](.*?)\[\/color\]/g, '<span style="color:$1;font-weight:600">$2</span>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-3 rounded-xl max-h-64 w-full object-cover shadow-sm" />')
      .replace(/\n/g, '<br />');
  };

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.event) {
            setEvent(json.event);
            if (json.event.sessions && json.event.sessions.length > 0) {
              const activeS = json.event.sessions.find((s: any) => s.status === 'active') || json.event.sessions[0];
              setSelectedSession(activeS);
            }
            return;
          }
        }
        setError('कार्यक्रम आढळला नाही (Event not found)');
      } catch (err: any) {
        setError('कार्यक्रम माहिती लोड करण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Deep link or bot direct action: ?book=true or custom event opens seat map immediately
  useEffect(() => {
    if (!event || !event.sessions || event.sessions.length === 0) return;

    const openBooking = () => {
      const activeSession =
        event.sessions.find((s: any) => s.status === 'active') || event.sessions[0];
      if (activeSession) {
        setSelectedSession(activeSession);
        setSeatMapOpen(true);
      }
    };

    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('book') === 'true') {
        openBooking();
      }

      const botListener = (e: any) => {
        if (!e.detail?.eventId || String(e.detail.eventId) === String(eventId)) {
          openBooking();
        }
      };
      window.addEventListener('tikitmitra_open_seatmap', botListener);
      return () => window.removeEventListener('tikitmitra_open_seatmap', botListener);
    }
  }, [event, eventId]);

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

  const handleShare = async () => {
    if (typeof window === 'undefined') return;

    const shareUrl = window.location.href;
    const shareTitle = `${event?.titleMr || event?.title || 'महाटिकिट'} - तिकीट बुकिंग`;
    const shareVenue = event?.venue?.nameMr || event?.venue?.name || 'नाट्यगृह';
    const shareText = `🎭 '${event?.titleMr || event?.title}' - प्रयोगाचे तिकीट बुक करा!\n📍 ठिकाण: ${shareVenue}\n🎟️ महाटिकिटवर त्वरित व थेट आसन आरक्षण:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignored
    }
  };

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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#FFF7ED]">
        <Header language={language} onLanguageChange={setLanguage} />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-base font-bold text-[#141B2B]">{error || 'कार्यक्रम सापडला नाही'}</p>
          <Link
            href="/"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#EA580C] text-white text-xs font-bold"
          >
            मुख्यपृष्ठावर परत जा
          </Link>
        </div>
      </div>
    );
  }

  const title = event.titleMr || event.title;
  const venueName = event.venue?.nameMr || event.venue?.name || 'बालगंधर्व रंगमंदिर, पुणे';
  const rawVideo =
    (event as any).teaserVideoUrl ||
    (event as any).videoUrl ||
    (event as any).trailerUrl ||
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const videoEmbedUrl = getYouTubeEmbedUrl(rawVideo);

  const activeSessions = (datesList[selectedDateIndex]?.sessions || event?.sessions || []).filter(
    (s: any) => s.status === 'active' || s.status === 'published' || !s.status
  );

  return (
    <div className="min-h-screen bg-[#FFF7ED] text-[#141B2B] selection:bg-[#EA580C] selection:text-white pb-28">
      <Header language={language} onLanguageChange={setLanguage} />

      {/* Dynamic Breadcrumb & Context Bar */}
      <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#64748B] text-xs font-semibold">
            <Link href="/" className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
              <span>मुखपृष्ठ</span>
            </Link>
            <span>/</span>
            <Link href="/" className="hover:text-[#EA580C] transition-colors">
              {event.categoryMr || 'नाटक (Theatre)'}
            </Link>
            <span>/</span>
            <span className="text-[#141B2B] font-bold truncate max-w-[200px] sm:max-w-md">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white shadow-xs hover:shadow-sm text-[#64748B] hover:text-[#EA580C] transition-all text-xs font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copiedLink ? 'कॉपी झाले' : 'शेअर'}</span>
            </button>
            <button
              onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white shadow-xs hover:shadow-sm transition-all text-xs font-semibold ${saved ? 'text-[#EA580C]' : 'text-[#64748B] hover:text-[#EA580C]'
                }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-[#EA580C]' : ''}`} />
              <span>{saved ? 'जतन केले' : 'जतन करा'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout from Stitch event_details_1 */}
      <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Poster, Media Strip, Quick Badges & Marathi Synopsis */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Poster Card */}
            <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden p-3 group border border-[#E5E7EB]">
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={event.posterUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWPIqBMp425ZkFMbpkh-L99NgbZv0HSpLRi1NRGJhXw1xCDiUFTt2yt3NNWqhsb7Isnr0E7oOKdhUync3egS4J3CFhtm7DcFNjuE-5T6Brb_qMidVYbcNDGWgYngLpI0MbufbSMZSn07OWjysjC4yj_Dkxk0BQYDIxdOhURoe3cfaaRj1dTbarPrg-cXhuARDKxpiQWtIv9cUQ4QZz8IkjctaEAjxiDc19X0QZmPE'}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-[#A33900] text-xs font-bold shadow-xs">
                    {event.categoryMr || 'मराठी नाटक'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#16A34A] text-xs font-bold shadow-xs flex items-center gap-1">
                    🔥 हाउसफुल्ल शो
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-[#141B2B]/90 backdrop-blur-md text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-500/25 border border-amber-400/50 px-2 py-0.5 rounded-lg shadow-xs">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-amber-300">
                        {reviewStats.totalCount > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'}
                      </span>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] font-bold text-white">
                        {reviewStats.totalCount > 0 ? `${reviewStats.totalCount} प्रेक्षक मते` : 'नवीन प्रयोग'}
                      </span>
                      <span className="text-[9px] text-orange-200/90 font-medium">
                        {reviewStats.totalCount > 0 ? 'प्रमाणित पुनरावलोकने' : 'पहिले मत नोंदवा'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenReviewModal}
                    className="px-3 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#A33900] text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Star className="h-3 w-3 fill-white" />
                    <span>परीक्षण द्या</span>
                  </button>
                </div>
              </div>

              {/* Video Trailer Preview & Real Image Gallery Strip */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {event.trailerUrl ? (
                  <div
                    onClick={() => setShowVideoModal(true)}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group/vid shadow-xs bg-slate-100"
                  >
                    <img
                      src={event.bannerUrl || event.posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=400&q=80'}
                      alt="Video trailer thumbnail"
                      className="w-full h-full object-cover group-hover/vid:opacity-90"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-md">
                        <Play className="h-3 w-3 fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (eventPhotos.length > 0) {
                        setActivePhotoIndex(0);
                        setShowPhotoModal(true);
                      }
                    }}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer shadow-xs bg-slate-100 group/img"
                  >
                    <img
                      src={eventPhotos[0] || event.posterUrl}
                      alt="Event photo preview"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {eventPhotos.length > 1 && (
                  <div
                    onClick={() => {
                      setActivePhotoIndex(1);
                      setShowPhotoModal(true);
                    }}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer shadow-xs bg-slate-100 group/img"
                  >
                    <img
                      src={eventPhotos[1]}
                      alt="Event photo 2"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {eventPhotos.length > 2 && (
                  <div
                    onClick={() => {
                      setActivePhotoIndex(2);
                      setShowPhotoModal(true);
                    }}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer shadow-xs bg-slate-100 group/img"
                  >
                    <img
                      src={eventPhotos[2]}
                      alt="Event photo 3"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    {eventPhotos.length > 3 && (
                      <div className="absolute inset-0 bg-[#141B2B]/60 group-hover/img:bg-[#141B2B]/75 transition-colors flex items-center justify-center text-white text-xs font-bold">
                        +{eventPhotos.length - 2} फोटो
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Meta Specification Pills */}
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-2.5">
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 text-[#64748B] font-semibold">
                  <Clock className="h-4 w-4 text-[#A33900]" />
                  <span>कालावधी</span>
                </div>
                <span className="font-bold text-[#141B2B]">{event.durationMinutes ? `${Math.floor(event.durationMinutes / 60)} तास ${event.durationMinutes % 60} मिनिटे` : '२ तास १५ मिनिटे'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 text-[#64748B] font-semibold">
                  <ShieldCheck className="h-4 w-4 text-[#A33900]" />
                  <span>वय मर्यादा</span>
                </div>
                <span className="font-bold text-[#141B2B]">{event.ageGuidance || 'U/A (सर्व वयोगटांसाठी)'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 text-[#64748B] font-semibold">
                  <Ticket className="h-4 w-4 text-[#A33900]" />
                  <span>नाटक प्रकार</span>
                </div>
                <span className="font-bold text-[#141B2B]">{event.categoryMr || 'कौटुंबिक / विनोदी नाटक'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 text-[#64748B] font-semibold">
                  <span className="text-sm">🌐</span>
                  <span>भाषा</span>
                </div>
                <span className="font-bold text-[#141B2B]">{event.language || 'मराठी (Marathi)'}</span>
              </div>
            </div>

            {/* Marathi Synopsis Section */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 rounded-full bg-[#EA580C]" />
                <h3 className="text-base font-bold text-[#141B2B]">नाट्य कथानक (Synopsis)</h3>
              </div>
              <div
                className="text-xs text-[#64748B] leading-relaxed space-y-2"
                dangerouslySetInnerHTML={{
                  __html: formatRichDescription(
                    (event.descriptionMr && event.descriptionMr.trim() !== 'क्युए वर्णन')
                      ? event.descriptionMr
                      : (event.description && event.description.trim() !== 'QA Description')
                        ? event.description
                        : `'${event.titleMr || event.title}' हे आजच्या काळातील नात्यांचे वास्तव मांडणारे एक खुसखुशीत तरीही विचार करायला लावणारे कौटुंबिक नाटक आहे. आधुनिक संसार, करिअर, अहंकार आणि परस्पर समजुतीच्या गुंत्यात अडकलेल्या पात्रांचा मनोरंजक व भावूक प्रवास. रंगभूमीवरील उत्कृष्ट दिग्दर्शन आणि कलाकारांचा जिवंत अभिनय प्रेक्षकांना खिळवून ठेवतो.`
                  )
                }}
              />
              <button
                type="button"
                onClick={handleOpenReviewModal}
                className="pt-1 flex items-center gap-1.5 text-[#EA580C] text-xs font-bold cursor-pointer hover:underline text-left bg-transparent border-0 p-0"
              >
                <span>सविस्तर परीक्षण वाचा व मत नोंदवा</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Title, Cast Chips, Showtime Picker, Venue Details & Guidelines */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Title & Badges Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational) ? (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <span>ℹ️</span>
                    <span>माहितीपर शो • लवकरच बुकिंग सुरू</span>
                  </span>
                ) : (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#A33900] text-xs font-bold">
                      सुपरहिट १००+ प्रयोग
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold flex items-center gap-1">
                      ✓ महाटिकिट प्रमाणित नाटक
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141B2B] tracking-tight">
                {title}
              </h1>

              <p className="text-sm font-semibold text-[#64748B]">
                {event.title} {event.categoryMr ? `• ${event.categoryMr}` : ''}
              </p>

              {/* Artist Chips / Star Cast Section (Real Database Cast & Crew) */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                  मुख्य कलाकार आणि चमू (Cast & Crew)
                </span>
                {Array.isArray((event as any).castCrewList) && (event as any).castCrewList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(event as any).castCrewList.map((member: any, mIdx: number) => (
                      <div key={mIdx} className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.nameMr || member.name}
                            className="w-10 h-10 rounded-full object-cover shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-200 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
                            {(member.nameMr || member.name || 'म')[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#141B2B] truncate">{member.nameMr || member.name}</p>
                          <p className="text-[10px] text-[#64748B] truncate">{member.roleMr || member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-200 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
                        भ
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#141B2B] truncate">भरत जाधव</p>
                        <p className="text-[10px] text-[#64748B] truncate">मुख्य भूमिका</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-200 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
                        प्र
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#141B2B] truncate">प्रशांत दामले</p>
                        <p className="text-[10px] text-[#64748B] truncate">मुख्य भूमिका</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-200 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
                        मु
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#141B2B] truncate">मुक्ता बर्वे</p>
                        <p className="text-[10px] text-[#64748B] truncate">मुख्य भूमिका</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-200 text-[#EA580C] flex items-center justify-center font-bold text-xs shrink-0">
                        दि
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#141B2B] truncate">केदार शिंदे</p>
                        <p className="text-[10px] text-[#64748B] truncate">दिग्दर्शक</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* INTERACTIVE DATE & SHOWTIME SELECTOR OR INFORMATIVE SHOWCASE */}
            {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational) ? (
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-orange-200 space-y-4" id="booking-flow">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-6 rounded-full bg-[#EA580C]" />
                  <h2 className="text-base sm:text-lg font-bold text-[#141B2B]">
                    {language === 'mr' ? 'माहितीपर शो व आगामी प्रयोग' : 'Informative Showcase & Upcoming Shows'}
                  </h2>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-orange-50 border border-orange-200/80 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">🎭</span>
                    <div className="space-y-1.5 text-xs sm:text-sm text-[#141B2B]">
                      <p className="font-bold text-[#A33900]">
                        {language === 'mr'
                          ? 'या नाटकाचे अधिकृत प्रयोग आणि नाट्यगृह वाटप लवकरच जाहीर केले जाईल.'
                          : 'Official showtimes and venue allocation for this play will be announced soon.'}
                      </p>
                      <p className="text-[#64748B] leading-relaxed">
                        {language === 'mr'
                          ? 'सध्या आपण या नाटकाची कथा, कलाकार, तंत्रज्ञ आणि माहिती पाहू शकता. महाटिकिटवर तिकीट बुकिंग सुरू होताच थेट सूचना मिळवण्यासाठी खालील बटनावर नोंदणी करा.'
                          : 'Currently, you can explore the synopsis, cast & crew, and preview details. Register below to get instant notification when ticket booking opens on MahaTicket.'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setNotifyMeRegistered(!notifyMeRegistered)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                        notifyMeRegistered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
                      }`}
                    >
                      <span>{notifyMeRegistered ? '✓ नोंदणी झाली! बुकिंग सुरू होताच अलर्ट मिळेल' : '🔔 मला आठवण करा (Notify Me)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-4" id="booking-flow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-5 rounded-full bg-[#EA580C]" />
                    <h2 className="text-base font-bold text-[#141B2B]">तारीख आणि प्रयोग वेळ निवडा</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16A34A]" /> उपलब्ध</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> लवकर भरा</span>
                  </div>
                </div>

                {/* Horizontal Date Picker Strip */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {datesList.map((d, idx) => {
                    const isSelected = selectedDateIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDateIndex(idx);
                          if (d.sessions && d.sessions.length > 0) {
                            setSelectedSession(d.sessions[0]);
                          }
                        }}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-20 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer ${isSelected
                          ? 'bg-[#EA580C] text-white shadow-md'
                          : 'bg-[#FFF7ED] hover:bg-orange-100 text-[#141B2B]'
                          }`}
                      >
                        <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-white/90' : 'text-[#64748B]'}`}>
                          {d.label}
                        </span>
                        <span className="text-xl font-extrabold my-0.5 leading-none">
                          {d.day}
                        </span>
                        <span className="text-[11px] font-semibold">
                          {d.month}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Context */}
                <div className="p-3 rounded-xl bg-[#FFF7ED] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#EA580C]" />
                    <span className="text-xs font-bold text-[#141B2B]">
                      {datesList[selectedDateIndex]?.full || 'निवडलेले प्रयोग'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-semibold">
                    {activeSessions.length} {language === 'mr' ? 'प्रयोग उपलब्ध' : 'shows available'}
                  </span>
                </div>

                {/* Showtime Cards for Venue */}
                <div className="space-y-3">
                  {activeSessions.length > 0 ? (
                    activeSessions.map((sess, idx) => {
                      const isSelected = selectedSession?.id === sess.id;
                      const startTime = formatISTTime(sess.sessionStartTime, language, true);
                      const dateStr = formatISTDate(sess.sessionStartTime, language, true);
                      const hour = new Date(sess.sessionStartTime).getHours();
                      const isEvening = hour >= 16;
                      const periodLabel = language === 'mr'
                        ? (hour >= 20 ? 'रात्रीचा शो' : hour >= 16 ? 'संध्याकाळचा शो' : hour >= 12 ? 'दुपारचा शो' : 'सकाळचा शो')
                        : (hour >= 16 ? 'Evening Show' : 'Matinee Show');

                      return (
                        <div
                          key={sess.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-orange-50/70 border-[#EA580C] shadow-sm'
                              : 'bg-white border-[#E5E7EB] hover:shadow-sm'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg font-bold text-[#141B2B]">
                                  {startTime}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#A33900] text-[10px] font-bold">
                                  {dateStr} • {periodLabel}
                                </span>
                              </div>
                              <p className="text-xs text-[#64748B]">{venueName}</p>
                              <p className={`text-[11px] font-semibold flex items-center gap-1 ${isEvening ? 'text-[#F59E0B]' : 'text-[#16A34A]'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isEvening ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`} />
                                {isEvening ? 'लवकर भरत आहे (फक्त १२ जागा शिल्लक!)' : 'उपलब्ध (७२ जागा शिल्लक)'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBookSession(sess)}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${isSelected
                                  ? 'bg-[#EA580C] text-white shadow-sm'
                                  : 'bg-[#FFF7ED] hover:bg-[#EA580C] text-[#EA580C] hover:text-white'
                                  }`}
                              >
                                <span>{isSelected ? (language === 'mr' ? 'आसन निवडा ✓' : 'Select Seats ✓') : (language === 'mr' ? 'वेळ निवडा' : 'Select')}</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] text-center text-xs text-[#64748B]">
                      सध्या या तारखेला कोणतेही शो उपलब्ध नाहीत.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VENUE INFORMATION SECTION */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-[#EA580C]" />
                  <h3 className="text-base font-bold text-[#141B2B]">नाट्यगृह माहिती (Venue Information)</h3>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue?.name || 'Bal Gandharva'} ${event.venue?.city || 'Pune'}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#EA580C] text-xs font-bold hover:underline"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>दिशा दर्शन</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#141B2B]">
                    {event.venue?.nameMr || event.venue?.name || 'बालगंधर्व रंगमंदिर (Bal Gandharva Ranga Mandir)'}
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {event.venue?.address || 'झाशीची राणी लक्ष्मीबाई चौक, जे. एम. रोड (JM Road), शिवाजीनगर, पुणे, महाराष्ट्र ४११००५'}
                  </p>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#141B2B] font-semibold">
                      🅿️ विनामूल्य पार्किंग
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#141B2B] font-semibold">
                      ❄️ वातानुकूलित सभागृह
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#141B2B] font-semibold">
                      ♿ व्हीलचेअर सुलभ प्रवेश
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#141B2B] font-semibold">
                      ☕ कॅफेटेरिया (मस्त चहा व वडापाव)
                    </span>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden shadow-xs h-40 bg-slate-100">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkZ8PGyFRsN6n46ZGNWe1F6EyJBgw-BSBLv_egvGCHSZaMiO_HSu_cNz3vErsM-scGWXczJmEJZf2uUFXTVXj0MHtGDwFy2jR22jBV9Bf05XBxL7XYsrqWXsuoCN5w3DqvVSTn2fzaNJ0hf2tKYIPUwU8Pq3SRZMDsertKekLleirwK7R6_3BG8OtjUEpvIyXxkcBwNnKETAyJe2pXAirA1te1UBPlMFktwsExV1w"
                    alt="Venue Map preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/95 backdrop-blur-sm text-[#141B2B] text-[10px] font-bold shadow-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#EA580C]" />
                    <span>JM रोड, पुणे</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE ACCORDION FOR RULES & GUIDELINES */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-5 rounded-full bg-[#EA580C]" />
                <h3 className="text-base font-bold text-[#141B2B]">नियम व अटी (Rules & Advisory)</h3>
              </div>

              {/* Accordion 1 */}
              <div className="rounded-xl bg-[#FFF7ED] p-3.5">
                <button
                  type="button"
                  onClick={() => setOpenRuleIndex(openRuleIndex === 0 ? null : 0)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-[#141B2B]"
                >
                  <span className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-[#A33900]" />
                    <span>प्रवेश व वेळेचे नियम (Entry Guidelines)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${openRuleIndex === 0 ? 'rotate-180' : ''}`} />
                </button>
                {openRuleIndex === 0 && (
                  <div className="mt-2 pt-2 border-t border-orange-200/60 text-xs text-[#64748B] space-y-1">
                    <p>• तिसरी घंटा झाल्यानंतर नाट्यगृहात प्रवेश दिला जाणार नाही.</p>
                    <p>• कृपया प्रयोगाच्या किमान २० मिनिटे आधी सभागृहात उपस्थित राहावे.</p>
                    <p>• डिजिटल एम-तिकीट किंवा छापील तिकीट प्रवेशद्वारावर दाखवणे बंधनकारक आहे.</p>
                  </div>
                )}
              </div>

              {/* Accordion 2 */}
              <div className="rounded-xl bg-[#FFF7ED] p-3.5">
                <button
                  type="button"
                  onClick={() => setOpenRuleIndex(openRuleIndex === 1 ? null : 1)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-[#141B2B]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">❌</span>
                    <span>रद्द करणे व परतावा धोरण (Cancellation & Refund)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${openRuleIndex === 1 ? 'rotate-180' : ''}`} />
                </button>
                {openRuleIndex === 1 && (
                  <div className="mt-2 pt-2 border-t border-orange-200/60 text-xs text-[#64748B] space-y-1">
                    <p>• प्रयोग सुरू होण्याच्या ४ तास आधीपर्यंत रद्द केल्यास ७०% रक्कम परतावा मिळेल.</p>
                    <p>• तांत्रिक अथवा नैसर्गिक कारणास्तव प्रयोग रद्द झाल्यास १००% रक्कम आपल्या मूळ खात्यात त्वरित जमा होईल.</p>
                  </div>
                )}
              </div>

              {/* Accordion 3 */}
              <div className="rounded-xl bg-[#FFF7ED] p-3.5">
                <button
                  type="button"
                  onClick={() => setOpenRuleIndex(openRuleIndex === 2 ? null : 2)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-[#141B2B]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🚗</span>
                    <span>वाहन पार्किंग सल्ला (Parking Advisory)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${openRuleIndex === 2 ? 'rotate-180' : ''}`} />
                </button>
                {openRuleIndex === 2 && (
                  <div className="mt-2 pt-2 border-t border-orange-200/60 text-xs text-[#64748B] space-y-1">
                    <p>• बालगंधर्व रंगमंदिर आवारात दुचाकी व चारचाकी वाहनांसाठी मर्यादित जागा आहे.</p>
                    <p>• शनिवार व रविवारच्या प्रयोगासाठी मेट्रो किंवा सार्वजनिक वाहतुकीचा वापर करण्याचा सल्ला दिला जातो.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AUDIENCE REVIEWS & 5-STAR RATING SECTION */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-[#EA580C]" />
                  <h3 className="text-base font-bold text-[#141B2B]">प्रेक्षकांची मते आणि पुनरावलोकने (Audience Reviews)</h3>
                </div>
                <button
                  type="button"
                  onClick={handleOpenReviewModal}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${hasUserReviewed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#EA580C] hover:bg-[#A33900]'
                    }`}
                >
                  <Star className="h-3.5 w-3.5 fill-white" />
                  <span>{hasUserReviewed ? 'परीक्षण नोंदवले आहे ✓' : 'आपले परीक्षण नोंदवा'}</span>
                </button>
              </div>

              {/* Rating Summary Bar */}
              <div className="p-4 rounded-xl bg-[#FFF7ED] border border-orange-200/60 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-[#EA580C]">
                      {reviewStats.totalCount > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-sm font-semibold text-[#64748B]">/ ५</span>
                  </div>
                  <div className="flex items-center gap-1 my-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${reviewStats.totalCount > 0 && s <= Math.round(reviewStats.averageRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-amber-100 text-amber-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#64748B] font-medium">
                    {reviewStats.totalCount > 0
                      ? `एकूण ${reviewStats.totalCount} प्रेक्षक मते`
                      : 'नवीन प्रयोग • पहिले मत नोंदवा'}
                  </span>
                </div>

                <div className="w-full flex-1 space-y-1.5 border-t sm:border-t-0 sm:border-l border-orange-200/70 pt-3 sm:pt-0 sm:pl-6 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">५ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full bg-[#EA580C] rounded-full transition-all duration-500"
                        style={{ width: `${reviewStats.breakdown.five}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">
                      {reviewStats.breakdown.five}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">४ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${reviewStats.breakdown.four}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">
                      {reviewStats.breakdown.four}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">३ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${reviewStats.breakdown.three}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">
                      {reviewStats.breakdown.three}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">२ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-300 rounded-full transition-all duration-500"
                        style={{ width: `${reviewStats.breakdown.two}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">
                      {reviewStats.breakdown.two}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Cards List */}
              <div className="space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl border border-slate-200/80 hover:border-orange-200 bg-white transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                            {(rev.author || 'U').charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[#141B2B]">{rev.author}</span>
                              {rev.city && (
                                <span className="text-[10px] text-[#64748B]">({rev.city})</span>
                              )}
                              {rev.verified && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-green-50 text-green-700 font-semibold border border-green-200/50">
                                  ✓ उपस्थित प्रेक्षक
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#94A3B8]">{rev.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${star <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 fill-slate-200'
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#334155] leading-relaxed pl-10">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-orange-200 bg-orange-50/40 text-center space-y-2">
                    <Star className="h-8 w-8 text-[#EA580C] mx-auto fill-orange-200" />
                    <p className="text-xs font-bold text-[#141B2B]">
                      या नाटकाचे अद्याप कोणतेही परीक्षण नोंदवले गेलेले नाही.
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      आपण प्रयोग पाहिला असल्यास आपले पहिले परीक्षण नक्की नोंदवा!
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenReviewModal}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EA580C] text-white text-xs font-bold shadow-xs hover:bg-[#A33900] transition cursor-pointer"
                    >
                      <Star className="h-3 w-3 fill-white" />
                      <span>पहिले मत नोंदवा</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOOKING ACTION BAR (Thumb-friendly & High-contrast from Stitch) */}
      <aside aria-label="तिकीट आरक्षण बार" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 border-t border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#EA580C] shrink-0">
              {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational) ? (
                <span className="text-lg">ℹ️</span>
              ) : (
                <Ticket className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141B2B] truncate">
                {title} • <span className="text-[#EA580C]">
                  {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational)
                    ? 'माहितीपर शो'
                    : selectedSession
                    ? `${new Date(selectedSession.sessionStartTime).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • ${new Date(selectedSession.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : (language === 'mr' ? 'शो वेळ निवडा' : 'Select Showtime')}
                </span>
              </p>
              <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                <span className="truncate">{venueName}</span>
                <span>•</span>
                <span className="text-[#A33900] font-bold">
                  {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational)
                    ? 'प्रयोग व नाट्यगृह लवकरच'
                    : `दर: ${stickyPriceDisplay}`}
                </span>
              </div>
            </div>
          </div>

          {(!event.sessions || event.sessions.length === 0 || (event as any).isInformational) ? (
            <button
              type="button"
              onClick={() => setNotifyMeRegistered(!notifyMeRegistered)}
              className={`px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                notifyMeRegistered
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <span>{notifyMeRegistered ? 'नोंदणी झाली ✓' : '🔔 मला आठवण करा'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (selectedSession) {
                  handleBookSession(selectedSession);
                } else {
                  const bookingFlow = document.getElementById('booking-flow');
                  if (bookingFlow) {
                    bookingFlow.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              className="px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#A33900] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <span>{selectedSession ? 'आसन निवडा (Select Seats)' : 'शो व वेळ निवडा'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Video Modal */}
      {showVideoModal && videoEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-700 bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2.5">
              <p className="truncate text-xs font-bold text-white">टीझर व ट्रेलर — {title}</p>
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

      {/* Photo Gallery Lightbox Modal */}
      {showPhotoModal && eventPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 p-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
              <p className="truncate text-sm font-bold text-white">छायाचित्र दालन (Photo Gallery) — {title}</p>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="rounded-full p-1.5 text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={eventPhotos[activePhotoIndex] || event.posterUrl}
                alt={`Photo ${activePhotoIndex + 1}`}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-xs text-stone-400 font-mono">
                फोटो {activePhotoIndex + 1} / {eventPhotos.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev > 0 ? prev - 1 : eventPhotos.length - 1
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  ◀ मागे
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev < eventPhotos.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition cursor-pointer"
                >
                  पुढे ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Seat Map Modal */}
      {seatMapOpen && event && selectedSession && (
        <SeatMapModal
          event={event as any}
          session={selectedSession}
          allSessions={(event.sessions || []) as any}
          language={language}
          onClose={() => {
            setSeatMapOpen(false);
          }}
          onSessionChange={(s) => setSelectedSession(s as any)}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* Checkout Drawer */}
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

      {/* Celebratory Ticket Pass with QR */}
      {confirmedBooking && (
        <TicketPassModal
          bookingResult={confirmedBooking}
          language="mr"
          onClose={() => {
            setConfirmedBooking(null);
            if (typeof window !== 'undefined') window.location.href = '/my-tickets';
          }}
        />
      )}

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#EA580C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-white" />
                <h3 className="text-sm font-bold">नाटकाचे परीक्षण व रेटिंग नोंदवा</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 space-y-4">
              {reviewSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                    <Check className="h-6 w-6 stroke-[3]" />
                  </div>
                  <h4 className="text-base font-bold text-[#141B2B]">धन्यवाद!</h4>
                  <p className="text-xs text-[#64748B]">आपले परीक्षण यशस्वीरीत्या नोंदवले गेले आहे.</p>
                </div>
              ) : (
                <>
                  {/* Star selection */}
                  <div>
                    <label className="block text-xs font-bold text-[#141B2B] mb-1.5">
                      आपले रेटिंग निवडा
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                          className="p-1 cursor-pointer transition active:scale-95"
                        >
                          <Star
                            className={`h-7 w-7 ${star <= (hoverRating || userRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 fill-slate-200'
                              }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-[#EA580C] ml-2">
                        {hoverRating === 5 || (!hoverRating && userRating === 5)
                          ? '५/५ — उत्कृष्ट'
                          : hoverRating === 4 || (!hoverRating && userRating === 4)
                            ? '४/५ — खूप छान'
                            : hoverRating === 3 || (!hoverRating && userRating === 3)
                              ? '३/५ — छान'
                              : hoverRating === 2 || (!hoverRating && userRating === 2)
                                ? '२/५ — साधारण'
                                : '१/५ — कमी'}
                      </span>
                    </div>
                  </div>

                  {/* Logged in User Profile Info (Auto-filled) */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/80 border border-orange-200/70">
                    <div className="w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-[#141B2B] truncate">{currentUser?.name}</p>
                      <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      लॉगिन वापरकर्ता ✓
                    </span>
                  </div>

                  {/* Optional City */}
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] mb-1">
                      आपले गाव / शहर (City - ऐच्छिक)
                    </label>
                    <input
                      type="text"
                      value={reviewCity}
                      onChange={(e) => setReviewCity(e.target.value)}
                      placeholder="उदा. पुणे / मुंबई / नाशिक"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] mb-1">
                      आपले मत किंवा परीक्षण *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="नाटकातील अभिनय, संगीत, दिग्दर्शन याबद्दल आपले अनुभव लिहा..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden resize-none"
                    />
                  </div>

                  {reviewError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                      {reviewError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      रद्द करा
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview || hasUserReviewed}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#EA580C] hover:bg-[#A33900] disabled:bg-slate-300 text-white shadow-sm transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>जतन करत आहे...</span>
                        </>
                      ) : hasUserReviewed ? (
                        <span>परीक्षण आधीच नोंदवले आहे ✓</span>
                      ) : (
                        <span>परीक्षण पोस्ट करा</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Mandatory Login */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          fetchReviews();
        }}
        initialMessage={language === 'mr' ? 'परीक्षण व रेटिंग नोंदवण्यासाठी कृपया लॉगिन करा' : 'Please login to rate and review this show'}
      />

      {/* Notice Popup Modal (Replaces browser alert) */}
      {popupNotice && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 transform transition-all scale-100">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-inner">
              <Info className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{popupNotice.title}</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{popupNotice.message}</p>
            <button
              onClick={() => setPopupNotice(null)}
              className="w-full py-3 px-4 bg-[#EA580C] hover:bg-[#A33900] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              {language === 'mr' ? 'ठीक आहे' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
