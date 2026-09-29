'use client';

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
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
        const cached = localStorage.getItem('ticketghar_offline_orders');
        if (cached) {
          cachedOrders = JSON.parse(cached);
        }
      } catch (e) {
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        <button
          onClick={loadTickets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>ताजे करा (Refresh)</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
          {t.myTickets}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          आपण बुक केलेली सर्व तिकिटे आणि डिजिटल QR पासेस येथे उपलब्ध आहेत. हे ऑफलाइनही पाहता येतील.
        </p>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="ऑर्डर क्रमांक किंवा नाटकाच्या नावाने शोधा..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">तिकिटे शोधत आहे...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800 p-8 space-y-3">
          <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">कोणतीही तिकिटे आढळली नाहीत</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            आपण अद्याप कोणतेही तिकीट बुक केलेले नाही किंवा आपल्या शोधाशी जुळणारे तिकीट नाही.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            कार्यक्रम शोधा आणि बुक करा
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const event = order.event || {};
            const venue = order.venue || event.venue || {};
            const session = order.session || {};
            const displayTitle = language === 'mr' ? event.titleMr || event.title : event.title;

            return (
              <div
                key={order.id || order.orderNumber}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ✓ CONFIRMED
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      {order.orderNumber}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white font-serif">
                    {displayTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{venue.nameMr || venue.name || 'सभागृह'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString(
                          language === 'mr' ? 'mr-IN' : 'en-IN',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </span>
                    </div>

                    <div className="text-amber-400 font-semibold">
                      {order.ticketCount} {language === 'mr' ? 'तिकीट' : 'tickets'} • ₹
                      {(order.grandTotal / 100).toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onViewTicket({
                        order,
                        event,
                        tickets: order.tickets || [],
                        pricing: { grandTotal: order.grandTotal },
                      })
                    }
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR पास दाखवा (View Pass)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
