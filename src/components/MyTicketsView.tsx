'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { formatISTDate, formatISTTime } from '../lib/dateUtils';

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
  // Start true so we never flash "No booked tickets yet" before first fetch finishes
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadGeneration = useRef(0);

  /**
   * Private tickets require a verified server session.
   * localStorage / email alone is never authorization.
   */
  const checkAuthAndLoadTickets = useCallback(async () => {
    const myId = ++loadGeneration.current;
    setAuthChecking(true);
    setLoading(true);
    // Clear private UI until identity is proven (prevents account-switch / logout leaks)
    setOrders([]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('mahaticket_token') : null;
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    let currentUser: any | null = null;
    try {
      const sessionRes = await fetch('/api/auth/flow/session', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: authHeaders,
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.email) {
          currentUser = sessionData.user;
        }
      }
    } catch (e) {
      console.warn('Session verification error:', e);
    }

    if (myId !== loadGeneration.current) return;

    if (!currentUser) {
      setUser(null);
      setOrders([]);
      setAuthChecking(false);
      setLoading(false);
      return;
    }

    setUser(currentUser);
    setAuthChecking(false);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mahaticket_user', JSON.stringify(currentUser));
      }
    } catch {
      /* ignore */
    }

    let onlineOrders: any[] = [];
    try {
      const res = await fetch('/api/orders', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: authHeaders,
      });
      if (res.status === 401) {
        if (myId === loadGeneration.current) {
          setUser(null);
          setOrders([]);
        }
        return;
      }
      if (res.ok) {
        const data = await res.json();
        onlineOrders = data.orders || [];
      }
    } catch (e) {
      console.warn('Error fetching online orders:', e);
    }

    if (myId !== loadGeneration.current) return;

    setOrders(onlineOrders);
    if (typeof window !== 'undefined' && onlineOrders.length > 0) {
      try {
        localStorage.setItem(
          'mahaticket_my_orders',
          JSON.stringify(onlineOrders.slice(0, 40))
        );
      } catch {
        /* ignore */
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthAndLoadTickets();

    const handleProfileUpdate = () => {
      checkAuthAndLoadTickets();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'mahaticket_token' ||
        e.key === 'mahaticket_customer_session' ||
        e.key === null
      ) {
        checkAuthAndLoadTickets();
      }
    };

    window.addEventListener('mahaticket_profile_updated', handleProfileUpdate);
    window.addEventListener('auth_changed', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      loadGeneration.current += 1;
      window.removeEventListener('mahaticket_profile_updated', handleProfileUpdate);
      window.removeEventListener('auth_changed', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthAndLoadTickets]);


  const getCleanDisplayName = (u: any) => {
    if (!u) return '';
    if (u.fullName && u.fullName.trim() && !u.fullName.includes('@')) {
      return u.fullName.trim();
    }
    if (u.name && u.name.trim() && !u.name.includes('@')) {
      return u.name.trim();
    }
    const emailPrefix = (u.email || '').split('@')[0];
    if (!emailPrefix) return language === 'mr' ? 'ग्राहक' : 'Customer';
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
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
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-600">
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
            className="flex items-center gap-1.5 text-xs font-bold text-[#ea580c] hover:text-[#c2410c] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToHome}</span>
          </button>
        </div>

        {/* Secure Login Required Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c] mx-auto flex items-center justify-center shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {language === 'mr' ? 'आपली तिकिटे पाहण्यासाठी लॉगिन करा' : 'Please Log In to View Your Tickets'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {language === 'mr'
                ? 'आपण बुक केलेली सर्व डिजिटल तिकिटे, QR कोड पासेस आणि आरक्षण तपशील पाहण्यासाठी आपल्या अधिकृत खात्यात प्रवेश आवश्यक आहे.'
                : 'Please log in to your account to securely view your booked digital tickets, entry QR passes, and seat reservations.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{language === 'mr' ? 'लॉगिन किंवा नवीन खाते' : 'Log In / Register'}</span>
            </button>
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
            >
              {t.backToHome}
            </button>
          </div>
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
          className="flex items-center gap-1.5 text-xs font-bold text-[#ea580c] hover:text-[#c2410c] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Authenticated user badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-none">
              {getCleanDisplayName(user)}
            </span>
          </div>

          <button
            onClick={checkAuthAndLoadTickets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ea580c] ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'mr' ? 'ताजे करा' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="pb-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.myTickets}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
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
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c] shadow-2xs"
        />
      </div>

      {/* Ticket List — never show empty while still loading (avoids flash) */}
      {loading && filteredOrders.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="w-7 h-7 border-3 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600">
            {language === 'mr' ? 'तिकिटे शोधत आहे... (Loading Passes)' : 'Loading passes...'}
          </p>
        </div>
      ) : !loading && filteredOrders.length === 0 ? (
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
        <div className="space-y-3.5">
          {filteredOrders.map((ord) => {
            const ev = ord.event || {};
            const displayTitle = language === 'mr' ? ev.titleMr || ev.title : ev.title;
            const tks = ord.tickets || [];
            const seatCodes = tks.map((tk: any) => tk.seatCode).join(', ');
            const venueName =
              (language === 'mr' ? ev.venue?.nameMr || ev.venue?.name : ev.venue?.name || ev.venue?.nameMr) ||
              ord.venue?.name ||
              ord.venueName ||
              (language === 'mr' ? 'सभागृह' : 'Auditorium Venue');

            return (
              <div
                key={ord.id || ord.orderNumber}
                className="bg-white border border-slate-200/90 hover:border-[#ea580c]/60 rounded-2xl p-4 sm:p-5 transition shadow-2xs hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ea580c] shrink-0 shadow-2xs">
                    <Ticket className="w-6 h-6" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#ea580c] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ {ord.paymentStatus === 'captured' ? 'PAID' : ord.paymentStatus}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {displayTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                        <span className="truncate max-w-[220px]">{venueName}</span>
                      </span>

                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                        <span>
                          {ord.session?.sessionStartTime
                            ? `${formatISTDate(ord.session.sessionStartTime, language, false)} · ${formatISTTime(ord.session.sessionStartTime, language, true)}`
                            : language === 'mr'
                              ? 'तारीख उपलब्ध नाही'
                              : 'Date unavailable'}
                        </span>
                      </span>

                      {seatCodes && (
                        <span className="font-mono font-semibold text-[#ea580c] bg-orange-50/60 px-2 py-0.5 rounded border border-orange-100">
                          आसने: {seatCodes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-3">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">{t.grandTotal}</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      ₹{((ord.grandTotal || 0) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onViewTicket({
                          order: {
                            ...ord,
                            session: ord.session,
                            sessionId: ord.sessionId || ord.session?.id,
                          },
                          tickets: tks,
                          event: ev,
                          session: ord.session,
                          sessionId: ord.sessionId || ord.session?.id,
                          pricing: {},
                        })
                      }
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <span>{language === 'mr' ? 'पास उघडा' : 'View Pass'}</span>
                    </button>
                    {(tks[0]?.ticketCode || ord.orderNumber) && (
                      <a
                        href={`/tickets/${encodeURIComponent(tks[0]?.ticketCode || ord.orderNumber)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition"
                        title="थेट URL वर तिकीट पहा"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
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
