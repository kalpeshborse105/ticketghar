'use client';

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { MTEmptyState } from './ui/MTEmptyState';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    let onlineOrders: any[] = [];
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        onlineOrders = data.orders || [];
      }
    } catch (e) {
      console.warn('Network offline or fetch error, falling back to local cache:', e);
    }

    // Merge with localStorage offline orders
    let cachedOrders: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const cached =
          localStorage.getItem('mahaticket_offline_orders') ||
          localStorage.getItem('ticketghar_offline_orders');
        if (cached) {
          cachedOrders = JSON.parse(cached);
        }
      } catch {
        // ignore parse error
      }
    }

    // Deduplicate by orderNumber
    const orderMap = new Map();
    for (const o of onlineOrders) {
      orderMap.set(o.orderNumber, o);
    }
    for (const c of cachedOrders) {
      if (!orderMap.has(c.orderNumber)) {
        orderMap.set(c.orderNumber, c);
      }
    }

    setOrders(Array.from(orderMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        <button
          onClick={loadTickets}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#243044] text-xs font-medium text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>{language === 'mr' ? 'ताजे करा' : 'Refresh'}</span>
        </button>
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
          <p className="text-xs">तिकिटे शोधत आहे... (Loading Passes)</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <MTEmptyState
          type="tickets"
          title={language === 'mr' ? 'कोणतीही तिकिटे आढळली नाहीत' : 'No booked tickets yet'}
          description={
            language === 'mr'
              ? 'आपण अद्याप कोणतेही तिकीट बुक केलेले नाही. नाटके व कार्यक्रम पाहा आणि सहज तिकीट मिळवा.'
              : 'Your booked tickets will appear here after confirmation. Explore events to get started.'
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
            const seatCodes = tks.map((t: any) => t.seatCode).join(', ');

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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium text-xs shadow-sm transition active:scale-95"
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
    </div>
  );
};
