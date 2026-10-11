'use client';

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { MTEmptyState } from './ui/MTEmptyState';
import { AuthModal } from './AuthModal';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Lock,
  User,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface MyTicketsViewProps {
  language: Language;
  onBack: () => void;
  onViewTicket: (orderData: any) => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  language,
  onBack,
  onViewTicket,
}) => {
  const t = translations[language];
  const [user, setUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Guest lookup state
  const [guestQuery, setGuestQuery] = useState('');
  const [guestSearching, setGuestSearching] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestOrder, setGuestOrder] = useState<any | null>(null);

  /**
   * Check user authentication session and load tickets strictly for that verified user.
   */
  const checkAuthAndLoadTickets = async () => {
    setAuthChecking(true);
    let currentUser: any | null = null;

    try {
      const sessionRes = await fetch('/api/auth/flow/session', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        currentUser = sessionData?.user || null;
      }
    } catch (e) {
      console.warn('Session verification error:', e);
      currentUser = null;
    }

    setUser(currentUser);
    setAuthChecking(false);

    // If user is not authenticated, DO NOT show any tickets and do not load localStorage indiscriminately
    if (!currentUser || !currentUser.email) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // User is verified -> load authenticated user's tickets
    setLoading(true);
    let onlineOrders: any[] = [];
    try {
      const res = await fetch('/api/orders', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        onlineOrders = data.orders || [];
      }
    } catch (e) {
      console.warn('Error fetching online orders:', e);
    }

    // If network failed or offline, only match cached orders belonging to THIS verified user's email
    let cachedOrders: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mahaticket_offline_orders');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const userEmailLower = currentUser.email.toLowerCase().trim();
            cachedOrders = parsed.filter(
              (o: any) =>
                (o.userEmail && o.userEmail.toLowerCase().trim() === userEmailLower) ||
                (o.email && o.email.toLowerCase().trim() === userEmailLower)
            );
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // Deduplicate by orderNumber
    const orderMap = new Map();
    for (const o of onlineOrders) {
      if (o.orderNumber) orderMap.set(o.orderNumber, o);
    }
    for (const c of cachedOrders) {
      if (c.orderNumber && !orderMap.has(c.orderNumber)) {
        orderMap.set(c.orderNumber, c);
      }
    }

    setOrders(Array.from(orderMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    checkAuthAndLoadTickets();

    const handleProfileUpdate = () => {
      checkAuthAndLoadTickets();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mahaticket_customer_session' || e.key === 'mahaticket_lang') {
        checkAuthAndLoadTickets();
      }
    };

    window.addEventListener('mahaticket_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('mahaticket_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Guest lookup by order number or ticket code for users without login
   */
  const handleGuestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = guestQuery.trim();
    if (!query) return;

    setGuestSearching(true);
    setGuestError(null);
    setGuestOrder(null);

    try {
      const isTicketCode = query.startsWith('TG-TK') || query.includes('TK');
      const param = isTicketCode ? `ticketCode=${encodeURIComponent(query)}` : `orderNumber=${encodeURIComponent(query)}`;
      const res = await fetch(`/api/orders?${param}`);
      const data = await res.json();

      if (!res.ok || !data.order) {
        setGuestError(
          language === 'mr'
            ? 'ही ऑर्डर किंवा तिकीट क्रमांक आढळले नाही. कृपया क्रमांक तपासा.'
            : 'Order or ticket code not found. Please verify your reference.'
        );
      } else {
        setGuestOrder(data.order);
      }
    } catch {
      setGuestError(
        language === 'mr'
          ? 'तिकीट शोधताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Unable to search ticket. Please try again.'
      );
    } finally {
      setGuestSearching(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(term) ||
      o.userName?.toLowerCase().includes(term) ||
      o.event?.title?.toLowerCase().includes(term) ||
      o.event?.titleMr?.toLowerCase().includes(term)
    );
  });

  // 1. Loading State during Initial Auth Verification
  if (authChecking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-300">
          {language === 'mr' ? 'खाते पडताळणी होत आहे... (Verifying Account)' : 'Verifying account authentication...'}
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State (User not logged in)
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToHome}</span>
          </button>
        </div>

        {/* Secure Login Required Card */}
        <div className="bg-[#111827] border border-[#243044] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#ea580c]/10 border border-[#ea580c]/30 text-[#ea580c] mx-auto flex items-center justify-center shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {language === 'mr' ? 'आपली तिकिटे पाहण्यासाठी लॉगिन करा' : 'Please Log In to View Your Tickets'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {language === 'mr'
                ? 'आपण बुक केलेली सर्व डिजिटल तिकिटे, QR कोड पासेस आणि आरक्षण तपशील पाहण्यासाठी आपल्या अधिकृत खात्यात प्रवेश आवश्यक आहे.'
                : 'Please log in to your account to securely view your booked digital tickets, entry QR passes, and seat reservations.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{language === 'mr' ? 'लॉगिन किंवा नवीन खाते' : 'Log In / Register'}</span>
            </button>
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white text-xs font-semibold border border-[#334155] transition cursor-pointer"
            >
              {t.backToHome}
            </button>
          </div>
        </div>

        {/* Guest Ticket Lookup Section (For users who received an order ID/ticket code via SMS or email) */}
        <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#ea580c]" />
            <h2 className="text-sm font-bold text-white">
              {language === 'mr' ? 'किंवा थेट ऑर्डर क्रमांकाने तिकीट शोधा' : 'Or Look Up Ticket with Booking Reference'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'mr'
              ? 'आपल्याकडे बुकिंग क्रमांक (उदा. TG-2026-...) किंवा तिकीट कोड असल्यास येथे शोधून थेट पास उघडा.'
              : 'If you have an Order Number (e.g. TG-2026-...) or Ticket Code, enter it below to access your pass directly.'}
          </p>

          <form onSubmit={handleGuestSearch} className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              placeholder={language === 'mr' ? 'उदा. TG-2026-94812 किंवा TG-TK-...' : 'e.g. TG-2026-94812 or TG-TK-...'}
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
              className="flex-1 bg-[#111827] border border-[#243044] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
            />
            <button
              type="submit"
              disabled={guestSearching || !guestQuery.trim()}
              className="px-4 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {guestSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'mr' ? 'शोधत आहे...' : 'Searching...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'शोधा' : 'Find Ticket'}</span>
                </>
              )}
            </button>
          </form>

          {guestError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{guestError}</span>
            </div>
          )}

          {guestOrder && (
            <div className="mt-3 p-4 rounded-xl bg-[#111827] border border-[#ea580c]/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#ea580c] bg-[#ea580c]/10 px-2 py-0.5 rounded border border-[#ea580c]/30">
                  {guestOrder.orderNumber}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  ✓ {guestOrder.paymentStatus === 'captured' ? 'PAID' : guestOrder.paymentStatus}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white">
                {language === 'mr' ? guestOrder.event?.titleMr || guestOrder.event?.title : guestOrder.event?.title}
              </h3>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">
                  {guestOrder.tickets?.length || 0} {language === 'mr' ? 'तिकीट(े)' : 'Ticket(s)'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onViewTicket({
                      order: guestOrder,
                      tickets: guestOrder.tickets || [],
                      event: guestOrder.event || {},
                      pricing: {},
                    })
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition shadow-sm"
                >
                  {language === 'mr' ? 'पास उघडा' : 'View Pass'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auth Modal for Login */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            checkAuthAndLoadTickets();
          }}
          initialMessage={
            language === 'mr'
              ? 'आपली तिकिटे पाहण्यासाठी कृपया लॉगिन करा'
              : 'Please log in to view your tickets'
          }
        />
      </div>
    );
  }

  // 3. Authenticated State (User is logged in)
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Top Navigation & User Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Authenticated user badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium truncate max-w-[180px] sm:max-w-none">
              {user.fullName || user.email}
            </span>
          </div>

          <button
            onClick={checkAuthAndLoadTickets}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#243044] text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ea580c] ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'mr' ? 'ताजे करा' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {t.myTickets}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {language === 'mr'
            ? 'आपण बुक केलेली सर्व तिकिटे आणि डिजिटल QR पासेस येथे उपलब्ध आहेत.'
            : 'All your booked digital passes and entry QR codes are available here.'}
        </p>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={
            language === 'mr'
              ? 'ऑर्डर क्रमांक किंवा नाटकाच्या नावाने शोधा...'
              : 'Search by booking ID or event name...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111827] border border-[#243044] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
        />
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-6 h-6 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">
            {language === 'mr' ? 'तिकिटे शोधत आहे... (Loading Passes)' : 'Loading passes...'}
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <MTEmptyState
          type="tickets"
          title={language === 'mr' ? 'कोणतीही तिकिटे आढळली नाहीत' : 'No booked tickets yet'}
          description={
            language === 'mr'
              ? 'आपण या खात्यावर अद्याप कोणतेही तिकीट बुक केलेले नाही. नाटके व कार्यक्रम पाहा आणि सहज तिकीट मिळवा.'
              : 'No tickets booked on this account yet. Explore upcoming Marathi events to get started.'
          }
          actionText={language === 'mr' ? 'कार्यक्रम पाहा' : 'Explore Events'}
          onAction={onBack}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((ord) => {
            const ev = ord.event || {};
            const displayTitle = language === 'mr' ? ev.titleMr || ev.title : ev.title;
            const tks = ord.tickets || [];
            const seatCodes = tks.map((tk: any) => tk.seatCode).join(', ');

            return (
              <div
                key={ord.id || ord.orderNumber}
                className="bg-[#111827] border border-[#243044] hover:border-[#ea580c] rounded-xl p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-[#ea580c]/10 border border-[#ea580c]/30 flex items-center justify-center text-[#ea580c] shrink-0">
                    <Ticket className="w-6 h-6" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#ea580c] bg-[#ea580c]/10 px-2 py-0.5 rounded border border-[#ea580c]/30">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        ✓ {ord.paymentStatus === 'captured' ? 'PAID' : ord.paymentStatus}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {displayTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#ea580c]" />
                        <span>{ev.venue?.name || 'सभागृह'}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#ea580c]" />
                        <span>
                          {new Date(ord.createdAt).toLocaleDateString(
                            language === 'mr' ? 'mr-IN' : 'en-IN',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                        </span>
                      </span>

                      {seatCodes && (
                        <span className="font-mono text-[#ea580c]">
                          आसने: {seatCodes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#243044] gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block">{t.grandTotal}</span>
                    <span className="text-sm font-bold text-white font-mono">
                      ₹{((ord.grandTotal || 0) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onViewTicket({
                          order: ord,
                          tickets: tks,
                          event: ev,
                          pricing: {},
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <span>{language === 'mr' ? 'पास उघडा' : 'View Pass'}</span>
                    </button>
                    {(tks[0]?.ticketCode || ord.orderNumber) && (
                      <a
                        href={`/tickets/${encodeURIComponent(tks[0]?.ticketCode || ord.orderNumber)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
                        title="थेट URL वर तिकीट पहा"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">URL</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auth Modal if user wants to switch or re-auth */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          checkAuthAndLoadTickets();
        }}
      />
    </div>
  );
};
