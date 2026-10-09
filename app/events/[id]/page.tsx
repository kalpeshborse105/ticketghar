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

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([
    {
      id: 'rev-1',
      author: 'राहुल जोशी',
      city: 'पुणे',
      rating: 5,
      date: 'काल',
      comment: 'अतिशय विचार करायला लावणारे कौटुंबिक नाटक. शेवटच्या २० मिनिटांतील संवाद डोळ्यात पाणी आणतात. प्रसाद ओक आणि मुक्ता बर्वे यांचा अभिनय अप्रतिम!',
      verified: true,
      helpful: 42,
    },
    {
      id: 'rev-2',
      author: 'स्नेहल कुलकर्णी',
      city: 'मुंबई',
      rating: 5,
      date: '३ दिवसांपूर्वी',
      comment: 'मुक्ता बर्वे आणि प्रसाद ओक यांच्यातील जुगलबंदी पाहण्यासारखी आहे. आधुनिक संसारातील खरीखुरी गोष्ट. सहकुटुंब जरूर पाहावे.',
      verified: true,
      helpful: 28,
    },
    {
      id: 'rev-3',
      author: 'अमित देसाई',
      city: 'नाशिक',
      rating: 4,
      date: '५ दिवसांपूर्वी',
      comment: 'दिग्दर्शन उत्तम. संगीताची जोड सुरेख आहे. बालगंधर्व रंगमंदिरात प्रयोग पाहण्याचा आनंद वेगळाच!',
      verified: true,
      helpful: 19,
    },
  ]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewCity, setReviewCity] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Accordion state for rules & advisory
  const [openRuleIndex, setOpenRuleIndex] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && eventId) {
      try {
        const stored = localStorage.getItem(`mahaticket_reviews_${eventId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReviews((prev) => [...parsed, ...prev]);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [eventId]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || !reviewerName.trim()) return;

    setSubmittingReview(true);
    const newRev = {
      id: `rev-${Date.now()}`,
      author: reviewerName.trim(),
      city: reviewCity.trim() || 'महाराष्ट्र',
      rating: userRating,
      date: 'आत्ताच',
      comment: reviewComment.trim(),
      verified: true,
      helpful: 1,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);

    if (typeof window !== 'undefined' && eventId) {
      try {
        const stored = localStorage.getItem(`mahaticket_reviews_${eventId}`);
        const parsed = stored ? JSON.parse(stored) : [];
        localStorage.setItem(`mahaticket_reviews_${eventId}`, JSON.stringify([newRev, ...parsed]));
      } catch {
        // ignore
      }
    }

    setSubmittingReview(false);
    setReviewSuccess(true);
    setTimeout(() => {
      setReviewSuccess(false);
      setShowReviewModal(false);
      setReviewComment('');
      setReviewerName('');
      setReviewCity('');
    }, 1500);
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
              setSelectedSession(json.event.sessions[0]);
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

  const activeSessions = (event.sessions || []).filter((s) => s.status === 'active');
  const title = event.titleMr || event.title;
  const venueName = event.venue?.nameMr || event.venue?.name || 'बालगंधर्व रंगमंदिर, पुणे';
  const rawVideo =
    (event as any).teaserVideoUrl ||
    (event as any).videoUrl ||
    (event as any).trailerUrl ||
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const videoEmbedUrl = getYouTubeEmbedUrl(rawVideo);

  // Dates strip for Bal Gandharva sessions
  const datesList = [
    { label: 'आज', day: '१२', month: 'शनिवार', full: 'आज, १२ ऑक्टोबर २०२५' },
    { label: 'उद्या', day: '१३', month: 'रविवार', full: 'उद्या, १३ ऑक्टोबर २०२५' },
    { label: 'सोम', day: '१४', month: 'ऑक्टो', full: 'सोमवार, १४ ऑक्टोबर २०२५' },
    { label: 'मंगळ', day: '१५', month: 'ऑक्टो', full: 'मंगळवार, १५ ऑक्टोबर २०२५' },
    { label: 'पुढील शनि', day: '१९', month: 'ऑक्टो', full: 'शनिवार, १९ ऑक्टोबर २०२५' },
  ];

  const currentShowSession = selectedSession || activeSessions[0] || null;

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
              className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white shadow-xs hover:shadow-sm transition-all text-xs font-semibold ${
                saved ? 'text-[#EA580C]' : 'text-[#64748B] hover:text-[#EA580C]'
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
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold">४.८ / ५</span>
                    <span className="text-[10px] text-white/70">({reviews.length} मते)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#EA580C] text-white text-[10px] font-bold hover:bg-[#A33900] transition-colors cursor-pointer"
                  >
                    परीक्षण द्या
                  </button>
                </div>
              </div>

              {/* Video Trailer Preview & Image Gallery Strip */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div
                  onClick={() => setShowVideoModal(true)}
                  className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group/vid shadow-xs bg-slate-100"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDncKch8yhmaYapDOV6PPRolCn_3aitnTKD3iQ97CQZ23f5wQyvDvzDIRtBTzcfHLHCb5jxTvoSiKYZnNFFlCGSPZSqNVyuep_Xxh_k8l7VXze1PAu7cy2FMP6vlYRxu0W4f44v1HIGCLPNqRGATSVjO49tPT8qEu4gyEV3OsCUxh_Nh3VZBqxA1LVCy2UGn4Z0ovj7EmuTh0_34djgfHwu4UgceZ6XOaDnhZAI8yI"
                    alt="Video thumbnail"
                    className="w-full h-full object-cover group-hover/vid:opacity-90"
                  />
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-md">
                      <Play className="h-3 w-3 fill-white" />
                    </div>
                  </div>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden cursor-pointer shadow-xs bg-slate-100">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi380G45imoiU_ykp9lqaSetPxGCs4JixChO1OysCiXvWZTjDdqWanVFvDqLKLDyak4apv7GVJQKDeUkzGge-S1o64M94T0voAk_TwYaUme8YerJFhJZ37rt2tD-S7cF-bhXk3Mz1JmfOSEHa5JDNRFEJygtOdNVvZFd0P99-ddy7c6u2JDPNAqAQpsA-ko9OaZkyglII5Md9cJnPxadW8ujcj6hZR6pkrLtXPBnY"
                    alt="Play photo 1"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden cursor-pointer shadow-xs bg-slate-100">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVL9_Ox5vPd0mccgYaRBsJxQWJy_q_OZmBPboNnJGZcCJezx1kr90Ig5FaY7yWUAl-6CKqqJoxnjuK37wjPSLzSdMRgNBGw6xM4G8rtiZUXEa4brEdWAnqmjEv8-ZnwC5lYIfYsKNd_CvrgaBkWuQdbF02e-iiiPFo1QEntOepqM9LLs_6V_TTmxGlMpzuKAw4m5vYUVoLV1jxHT3yvHB_ce6g09mSZfHPvv99nBY"
                    alt="Play photo 2"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-[#141B2B]/60 flex items-center justify-center text-white text-xs font-bold">
                    +१२ फोटो
                  </div>
                </div>
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
                    event.descriptionMr || event.description || "'नियम व अटी लागू' हे आजच्या काळातील नात्यांचे वास्तव मांडणारे एक खुसखुशीत तरीही विचार करायला लावणारे कौटुंबिक नाटक आहे. आधुनिक संसार, करिअर, अहंकार आणि अटींच्या गुंत्यात अडकलेल्या एका जोडप्याचा मनोरंजक व भावूक प्रवास."
                  )
                }}
              />
              <div 
                onClick={() => setShowReviewModal(true)}
                className="pt-1 flex items-center gap-1.5 text-[#EA580C] text-xs font-bold cursor-pointer hover:underline"
              >
                <span>सविस्तर परीक्षण वाचा व मत नोंदवा</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Title, Cast Chips, Showtime Picker, Venue Details & Guidelines */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Title & Badges Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E5E7EB] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#A33900] text-xs font-bold">
                  सुपरहिट १००+ प्रयोग
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold flex items-center gap-1">
                  ✓ महाटिकिट प्रमाणित नाटक
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141B2B] tracking-tight">
                {title}
              </h1>

              <p className="text-sm font-semibold text-[#64748B]">
                {event.title} • <span className="font-normal">दिग्दर्शन: चंद्रकांत कुलकर्णी</span>
              </p>

              {/* Artist Chips / Star Cast Section */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                  मुख्य कलाकार आणि चमू (Cast & Crew)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWiNwrgplEqHqtbnBXasF9CpPCjK16GTnwvF6XzJxvbOcrCcJyc23CifwONCKfFyAc3LWl2K4KxpHlqT4tMKfT_qEvZe6DSpwIL4hg3SmyQTlWz8MMZ5JYUqTBRKSv0RcUhH48kb2dOEjewafgScjjmNJza9pMtlsKAwWg-TOpWk87jBVEmfFm1I3AEDfFYUr54pDyV_sO1jmhnI9UGzW_s0jhcHUnlZQLB7hm4Y0"
                      alt="Prasad Oak"
                      className="w-10 h-10 rounded-full object-cover shadow-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#141B2B] truncate">प्रसाद ओक</p>
                      <p className="text-[10px] text-[#64748B] truncate">मुख्य भूमिका</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgC7qg2FNK9blGgU22br1A7K-iwkIhQlf4pxPpubVRZ1bqUvWq2npVBZUFI0LzDIrsmbhtIJ5DHEJUXuFUrUXh--EcSEkiZQllG4HpgEYuw3A8eBgKz3J8maAQ8Kzip7VObzOX_L8XVfnKmJzVKNoO40dVAbpQq7Nj36yKb2OFCnl_VQOLfQCsTL9I-gVo30mnc-ezTSbh-t2WS-DybVZ4DrYmbpqLjKwgHoc-sZc"
                      alt="Mukta Barve"
                      className="w-10 h-10 rounded-full object-cover shadow-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#141B2B] truncate">मुक्ता बर्वे</p>
                      <p className="text-[10px] text-[#64748B] truncate">मुख्य भूमिका</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcQ8m9dAq6r-XJu3fcpOnTgz4lKB0ueJsC2lHV50cZX6rd3TiEOH53iXedsJGVvr2EVf0H0KbnIrwCn5qgvTwksY3pS_M4Wof-n6G2NN7G7EwjGQW0d7p_v_prm-7vtlsRpHEW34lH5ms2KoTUZuWTRCt5EyCmN9dCRZeWKZGsFEs4DPw6ulOLn6wkEZEjzSnqOvy64YwrbUI8TaG8PpuOpA_n-4YraYBF1X2T72w"
                      alt="Chandrakant Kulkarni"
                      className="w-10 h-10 rounded-full object-cover shadow-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#141B2B] truncate">चंद्रकांत कुलकर्णी</p>
                      <p className="text-[10px] text-[#64748B] truncate">दिग्दर्शक</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FFF7ED] hover:bg-orange-100 transition-colors">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBU4kf5zs4linpmGzKH4TnHt97MG9116bxJb8dTZILFF9bd9GQxvAy9RSQZT9qF5R-peOKYGltrY2m3yEFleT5JU1JHN4cEO_0lbBlMtzcjTkRGLjMtCbbr9DkEmTRyzpM-_LxvxxXvfu5GmLT7efg8sVYXz9vMXc755HYnyMCkHO0LqXHba_JmFOnLsU7knNNSbkgMaK5AcjDp6fF-f-P4MnMGEz_m-uZgKLcXUAc"
                      alt="Kshitee Jog"
                      className="w-10 h-10 rounded-full object-cover shadow-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#141B2B] truncate">क्षिती जोग</p>
                      <p className="text-[10px] text-[#64748B] truncate">निर्माते</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* INTERACTIVE DATE & SHOWTIME SELECTOR */}
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
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-20 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer ${
                        isSelected
                          ? 'bg-[#EA580C] text-white'
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
                    {datesList[selectedDateIndex]?.full} चे प्रयोग
                  </span>
                </div>
                <span className="text-[10px] text-[#64748B] font-semibold">२ प्रयोग नियोजित</span>
              </div>

              {/* Showtime Cards for Venue */}
              <div className="space-y-3">
                {activeSessions.length > 0 ? (
                  activeSessions.map((sess, idx) => {
                    const isSelected = selectedSession?.id === sess.id;
                    const startTime = new Date(sess.sessionStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isEvening = idx > 0;

                    return (
                      <div
                        key={sess.id}
                        className="p-4 rounded-xl bg-white border border-[#E5E7EB] shadow-xs hover:shadow-sm transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-[#141B2B]">
                                {startTime}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#A33900] text-[10px] font-bold">
                                {isEvening ? 'संध्याकाळचा शो' : 'दुपारचा शो'}
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
                              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#EA580C] text-white shadow-sm'
                                  : 'bg-[#FFF7ED] hover:bg-[#EA580C] text-[#EA580C] hover:text-white'
                              }`}
                            >
                              <span>{isSelected ? 'निवडले ✓' : 'निवडा'}</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] text-center text-xs text-[#64748B]">
                    सध्या कोणतेही शो उपलब्ध नाहीत.
                  </div>
                )}
              </div>
            </div>

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
                  onClick={() => setShowReviewModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#A33900] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Star className="h-3.5 w-3.5 fill-white" />
                  <span>आपले परीक्षण नोंदवा</span>
                </button>
              </div>

              {/* Rating Summary Bar */}
              <div className="p-4 rounded-xl bg-[#FFF7ED] border border-orange-200/60 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-[#141B2B]">४.८</span>
                    <span className="text-sm font-semibold text-[#64748B]">/ ५</span>
                  </div>
                  <div className="flex items-center gap-1 my-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-[#64748B] font-medium">एकूण {reviews.length} प्रेक्षक मते</span>
                </div>

                <div className="w-full flex-1 space-y-1.5 border-t sm:border-t-0 sm:border-l border-orange-200/70 pt-3 sm:pt-0 sm:pl-6 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">५ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div className="h-full bg-[#EA580C] rounded-full w-[88%]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">८८%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">४ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[9%]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">९%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">३ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-[2%]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">२%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-semibold text-[#64748B]">२ ★</span>
                    <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div className="h-full bg-slate-300 rounded-full w-[1%]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#141B2B]">१%</span>
                  </div>
                </div>
              </div>

              {/* Review Cards List */}
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-orange-200 bg-white transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                          {rev.author.charAt(0)}
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
                            className={`h-3.5 w-3.5 ${
                              star <= rev.rating
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOOKING ACTION BAR (Thumb-friendly & High-contrast from Stitch) */}
      <aside aria-label="तिकीट आरक्षण बार" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 border-t border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#EA580C] shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141B2B] truncate">
                {title} • <span className="text-[#EA580C]">{currentShowSession ? new Date(currentShowSession.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '०४:३० PM'}</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                <span className="truncate">{venueName}</span>
                <span>•</span>
                <span className="text-[#A33900] font-bold">दर: ₹ २५० - ₹ ६००</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentShowSession) {
                handleBookSession(currentShowSession);
              }
            }}
            className="px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#A33900] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>शो निवडा आणि आसन निवडा</span>
            <ChevronRight className="h-4 w-4" />
          </button>
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

      {/* Interactive Seat Map Modal */}
      {seatMapOpen && event && selectedSession && (
        <SeatMapModal
          event={event as any}
          session={selectedSession}
          language="mr"
          onClose={() => {
            setSeatMapOpen(false);
          }}
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
                            className={`h-7 w-7 ${
                              star <= (hoverRating || userRating)
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

                  {/* Name and City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] mb-1">
                        आपले पूर्ण नाव *
                      </label>
                      <input
                        type="text"
                        required
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="उदा. राहुल जोशी"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] mb-1">
                        गाव / शहर
                      </label>
                      <input
                        type="text"
                        value={reviewCity}
                        onChange={(e) => setReviewCity(e.target.value)}
                        placeholder="उदा. पुणे / मुंबई"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden"
                      />
                    </div>
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
                      disabled={submittingReview}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#EA580C] hover:bg-[#A33900] text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {submittingReview ? 'जतन करत आहे...' : 'परीक्षण पोस्ट करा'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
