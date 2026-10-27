'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  TrendingUp,
  QrCode,
  Armchair,
  X,
  Plus,
  Play,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Ticket,
  Clock,
  Sparkles,
  MapPin,
  HelpCircle,
  Download
} from 'lucide-react';
import { Language } from '../../lib/i18n.ts';
import { EventItem, VenueItem } from '../../lib/types.ts';
import { AdminScanner } from '../AdminScanner';
import { TheatreSeatDesigner } from './TheatreSeatDesigner';
import { AdminEventDetailModal } from './AdminEventDetailModal';

interface OrganizerConsoleProps {
  language: Language;
  currentUser?: any;
  onBack?: () => void;
  onLogout?: () => void;
}

export const OrganizerConsole: React.FC<OrganizerConsoleProps> = ({
  language,
  currentUser,
  onBack,
  onLogout
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showSeatDesigner, setShowSeatDesigner] = useState<boolean>(false);
  const [venuesList, setVenuesList] = useState<VenueItem[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [settlementsList, setSettlementsList] = useState<any[]>([]);
  const [venueForDesigner, setVenueForDesigner] = useState<VenueItem | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const mr = language === 'mr';
  const numericOrganizerId = (() => {
    const raw = currentUser?.organizerId ?? currentUser?.organizationId;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  })();

  const [activeTab, setActiveTab] = useState<'overview' | 'shows' | 'bookings' | 'scanner' | 'seats'>('overview');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [districtsCatalog, setDistrictsCatalog] = useState<any[]>([]);
  const [citiesCatalog, setCitiesCatalog] = useState<any[]>([]);
  const [formDistrictId, setFormDistrictId] = useState('');
  const [formCityName, setFormCityName] = useState('');
  const [venueSearchInForm, setVenueSearchInForm] = useState('');
  const [gaFallbackPrice, setGaFallbackPrice] = useState(350);
  const [venuePricePreview, setVenuePricePreview] = useState<{
    loading: boolean;
    sections: { id: number; name: string; nameMr?: string; basePrice: number; seatCount: number }[];
  }>({ loading: false, sections: [] });
  const [venuePriceRefreshKey, setVenuePriceRefreshKey] = useState(0);

  const orgDisplayName =
    currentUser?.companyName ||
    currentUser?.organizationName ||
    currentUser?.organizerName ||
    currentUser?.fullName ||
    (mr ? 'माझी संस्था' : 'My organization');
  const orgVerified =
    (currentUser?.verificationStatus || currentUser?.organizerVerificationStatus || '')
      .toLowerCase() === 'verified' || currentUser?.verified === true;

  const exportBookingsCsv = () => {
    if (!ordersList.length) {
      triggerToast('सध्या कोणतेही व्यवहार उपलब्ध नाहीत');
      return;
    }
    const headers = ['OrderNumber', 'CustomerName', 'Phone', 'Email', 'Amount_INR', 'PaymentStatus', 'Showtime', 'Seats'];
    const rows = ordersList.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${(o.userName || '').replace(/"/g, '""')}"`,
      `"${o.userPhone || ''}"`,
      `"${o.userEmail || ''}"`,
      `"${((o.grandTotal || 0) / 100).toFixed(2)}"`,
      `"${o.paymentStatus || ''}"`,
      `"${o.sessionStartTime || ''}"`,
      `"${(o.tickets?.map((t: any) => t.seatCode).join(', ') || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mahaticket_organizer_bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ सर्व व्यवहारांचा अहवाल (CSV) यशस्वीरीत्या डाऊनलोड झाला!');
  };

  // Form states for new event
  const [eventTitleMr, setEventTitleMr] = useState('');
  const [eventTitleEn, setEventTitleEn] = useState('');
  const [eventCategory, setEventCategory] = useState('plays');
  const [eventVenueId, setEventVenueId] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openVenueDesigner = async (venueLite: VenueItem | any) => {
    if (!venueLite?.id) {
      setVenueForDesigner(venueLite);
      setShowSeatDesigner(true);
      return;
    }
    try {
      const res = await fetch(`/api/admin/venues?id=${venueLite.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setVenueForDesigner(data.venue || data.venues?.[0] || venueLite);
      } else {
        setVenueForDesigner(venueLite);
      }
    } catch {
      setVenueForDesigner(venueLite);
    }
    setShowSeatDesigner(true);
  };

  const fetchOrganizerData = async () => {
    setDataLoading(true);
    try {
      // Events first (overview + scanner need them); orders/venues lazy-parallel after
      const eventsRes = await fetch('/api/admin/events', { credentials: 'include' });
      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        if (Array.isArray(evData.events)) setEventsList(evData.events);
      }

      const [ordersRes, settlementsRes, venuesRes, distRes, cityRes] = await Promise.all([
        fetch('/api/admin/orders', { credentials: 'include' }),
        fetch('/api/admin/settlements', { credentials: 'include' }),
        fetch('/api/admin/venues?scope=all', { credentials: 'include' }),
        fetch('/api/locations/districts', { credentials: 'include' }),
        fetch('/api/locations/cities', { credentials: 'include' }),
      ]);

      if (venuesRes.ok) {
        const vnData = await venuesRes.json();
        if (Array.isArray(vnData.venues) && vnData.venues.length > 0) {
          setVenuesList(vnData.venues);
          setVenueForDesigner(vnData.venues[0]);
        }
      }
      if (distRes.ok) {
        const distData = await distRes.json();
        if (Array.isArray(distData.districts)) setDistrictsCatalog(distData.districts);
      }
      if (cityRes.ok) {
        const cityData = await cityRes.json();
        if (Array.isArray(cityData.cities)) setCitiesCatalog(cityData.cities);
      }

      if (ordersRes.ok) {
        const ordData = await ordersRes.json();
        if (Array.isArray(ordData.orders)) setOrdersList(ordData.orders);
      }

      if (settlementsRes.ok) {
        const stData = await settlementsRes.json();
        if (Array.isArray(stData.settlements)) setSettlementsList(stData.settlements);
      }
    } catch (err) {
      console.warn('Non-blocking organizer data fetch error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  React.useEffect(() => {
    void fetchOrganizerData();
  }, []);

  useEffect(() => {
    if (!showAddEventModal || !eventVenueId) {
      setVenuePricePreview({ loading: false, sections: [] });
      return;
    }
    let cancelled = false;
    setVenuePricePreview((p) => ({ ...p, loading: true }));
    void (async () => {
      try {
        const res = await fetch(`/api/admin/venues?id=${eventVenueId}`, {
          credentials: 'include',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const venue = data.venue || data.venues?.[0];
        const sectionsRaw = Array.isArray(venue?.sections) ? venue.sections : [];
        const sections = sectionsRaw.map((sec: any) => ({
          id: Number(sec.id),
          name: String(sec.name || ''),
          nameMr: sec.nameMr ? String(sec.nameMr) : undefined,
          basePrice: Math.round(Number(sec.basePrice || 0) / 100),
          seatCount: Array.isArray(sec.seats)
            ? sec.seats.length
            : Number(sec.rowsCount || 0) * Number(sec.colsCount || 0),
        }));
        if (!cancelled) setVenuePricePreview({ loading: false, sections });
      } catch {
        if (!cancelled) setVenuePricePreview({ loading: false, sections: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAddEventModal, eventVenueId, venuePriceRefreshKey]);

  // Compute live business metrics from database records
  const totalRevenue = ordersList.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const ticketsSold = ordersList.reduce((sum, o) => sum + (o.ticketCount || 0), 0);
  const pendingSettlement = settlementsList
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + (s.netPayableToOrganizer || 0), 0);

  const liveBookings = ordersList.slice(0, 10).map((o) => ({
    initial: o.userName?.trim().charAt(0) || 'ग',
    name: o.userName || 'ग्राहक',
    seats: `${o.ticketCount || 1} जागा`,
    details: `${o.event?.titleMr || o.event?.title || 'तिकीट'} • ${o.session?.sessionStartTime ? new Date(o.session.sessionStartTime).toLocaleDateString('mr-IN') : 'प्रयोग'}`,
    amount: `+₹${((o.grandTotal || 0) / 100).toLocaleString('en-IN')}`,
    time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' }) : 'आत्ताच',
  }));

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitleMr.trim()) return;

    const selectedVenue = venuesList.find((v: any) => v.id === Number(eventVenueId));
    if (!selectedVenue) {
      triggerToast(mr ? 'कृपया नाट्यगृह निवडा' : 'Please select a theatre');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitleEn.trim() || eventTitleMr.trim(),
          titleMr: eventTitleMr.trim(),
          category: eventCategory,
          venueId: selectedVenue.id,
          ...(venuePricePreview.sections.length === 0
            ? { ticketPrice: Math.round(gaFallbackPrice * 100) }
            : {}),
          // Always create a showtime so public Book → seats works (BMS flow)
          sessionStartTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'submitted',
          actorId: currentUser?.email || 'organizer',
        }),
      });

      if (res.ok) {
        triggerToast(`✓ "${eventTitleMr}" कार्यक्रम प्रशासक मंजुरीसाठी पाठवला गेला!`);
        setShowAddEventModal(false);
        setEventTitleMr('');
        setEventTitleEn('');
        fetchOrganizerData();
      } else {
        const errBody = await res.json().catch(() => ({}));
        triggerToast(errBody?.error || 'कार्यक्रम तयार करताना त्रुटी आली');
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2B] font-sans pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#16A34A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {viewingEvent && (
        <AdminEventDetailModal
          event={viewingEvent as any}
          relatedEvents={eventsList as any}
          venues={venuesList as any}
          language={language}
          onClose={() => setViewingEvent(null)}
          onRefresh={() => {
            void (async () => {
              try {
                const eventsRes = await fetch('/api/admin/events', { credentials: 'include' });
                if (eventsRes.ok) {
                  const data = await eventsRes.json();
                  if (Array.isArray(data.events)) {
                    setEventsList(data.events);
                    const updated = data.events.find(
                      (e: EventItem) => Number(e.id) === Number(viewingEvent.id)
                    );
                    if (updated) setViewingEvent(updated);
                  }
                }
              } catch {
                /* ignore */
              }
            })();
          }}
        />
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {dataLoading && (
          <div className="rounded-xl border border-orange-100 bg-orange-50/80 px-3 py-2 text-[11px] font-semibold text-[#A33900] flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-[#A33900] border-t-transparent rounded-full animate-spin" />
            {mr ? 'आयोजक डेटा लोड होत आहे…' : 'Loading organizer data…'}
          </div>
        )}
        {/* Producer Welcome & Status Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#FFDBCE] text-[#A33900] flex items-center justify-center font-bold text-xl shrink-0">
                🎭
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-[#141B2B] truncate leading-tight">
                  नमस्कार, {currentUser?.fullName || 'नाट्य निर्माते'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      orgVerified ? 'bg-[#16A34A]' : 'bg-amber-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold truncate max-w-[220px] ${
                      orgVerified ? 'text-[#16A34A]' : 'text-amber-700'
                    }`}
                  >
                    {orgDisplayName}
                    {orgVerified
                      ? mr
                        ? ' · प्रमाणित'
                        : ' · Verified'
                      : mr
                        ? ' · तपासणीत'
                        : ' · Pending'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOrgModal(true)}
              className="px-3 h-9 rounded-xl bg-[#E1E8FD] text-[#141B2B] flex items-center gap-1.5 hover:bg-[#DCE2F7] active:scale-95 transition shrink-0 text-xs font-bold"
              title={mr ? 'संस्था माहिती' : 'Organization'}
            >
              <Building2 className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="hidden sm:inline">{mr ? 'संस्था' : 'Org'}</span>
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mt-3 flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-[#A33900] shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">
                {mr ? 'सक्रिय शोज' : 'Active shows'}: {eventsList.length}
              </span>
            </div>
            <span className="text-xs font-extrabold text-[#A33900] shrink-0">
              {mr ? 'थेट DB' : 'Live DB'}
            </span>
          </div>
        </div>

        {/* Organizer Primary Section Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-[#E2E8F0] shadow-xs flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#A33900] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#141B2B] hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>डॅशबोर्ड (Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#A33900] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#141B2B] hover:bg-slate-50'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>बुकिंग व ग्राहक डेटा ({ordersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-[#A33900] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#141B2B] hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>गेट स्कॅनर (Live QR)</span>
          </button>

          <button
            onClick={() => setActiveTab('shows')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'shows'
                ? 'bg-[#A33900] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#141B2B] hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>माझे शोज ({eventsList.length})</span>
          </button>

          <button
            onClick={() => {
              if (venuesList[0]) {
                void openVenueDesigner(venuesList[0]);
              } else {
                triggerToast('नाट्यगृह लोड होत आहे...');
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-[#64748B] hover:text-[#141B2B] hover:bg-slate-50 cursor-pointer"
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>आसन रचना व दर</span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-base font-bold text-[#141B2B]">आजचे मुख्य निर्देशक</h3>
            <span className="text-[11px] text-[#64748B]">ताजे अपडेट: थेट डेटाबेस</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* KPI 1: Revenue */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1 text-[#64748B]">
                <span className="text-xs font-medium">आजचे एकूण उत्पन्न</span>
                <span className="w-7 h-7 rounded-lg bg-[#FFF7ED] text-[#A33900] flex items-center justify-center font-bold text-xs">
                  ₹
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[#141B2B] leading-tight">
                  {totalRevenue > 0 ? `₹${(totalRevenue / 100).toLocaleString('en-IN')}` : '₹०'}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[#16A34A] text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>थेट ऑर्डर्स नोंद</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Tickets */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1 text-[#64748B]">
                <span className="text-xs font-medium">विकलेली तिकिटे</span>
                <span className="w-7 h-7 rounded-lg bg-[#E1E8FD] text-[#A33900] flex items-center justify-center font-bold text-xs">
                  🎫
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[#141B2B] leading-tight">
                  {ticketsSold > 0 ? ticketsSold.toLocaleString('en-IN') : '०'}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-semibold flex items-center gap-1">
                  <span className="text-[#16A34A]">●</span> {ordersList.length} बुकिंग ऑर्डर्स
                </div>
              </div>
            </div>

            {/* KPI 3: Active Shows */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1 text-[#64748B]">
                <span className="text-xs font-medium">सक्रिय शोज आज</span>
                <span className="w-7 h-7 rounded-lg bg-[#E1E8FD] text-[#A33900] flex items-center justify-center font-bold text-xs">
                  🎭
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[#141B2B] leading-tight">
                  {eventsList.length > 0 ? `${eventsList.length} शोज` : '० शोज'}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">सक्रिय नाट्यगृह प्रयोग</p>
              </div>
            </div>

            {/* KPI 4: Settlement */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1 text-[#64748B]">
                <span className="text-xs font-medium">प्रलंबित सेटलमेंट</span>
                <span className="w-7 h-7 rounded-lg bg-[#FFF7ED] text-[#AC3400] flex items-center justify-center font-bold text-xs">
                  💼
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[#141B2B] leading-tight">
                  {pendingSettlement > 0 ? `₹${(pendingSettlement / 100).toLocaleString('en-IN')}` : '₹०'}
                </div>
                <p className="text-[11px] text-[#A33900] font-bold mt-1">थेट बँक खात्यात वर्ग</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid (आयोजक जलद कृती) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-base font-bold text-[#141B2B]">आयोजक जलद कृती</h3>
            <span className="text-xs font-bold text-[#A33900]">सर्व टूल्स</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Action 1: Add Event Wizard */}
            <button
              onClick={() => setShowAddEventModal(true)}
              className="bg-[#A33900] text-white p-4 rounded-2xl shadow-md text-left active:scale-[0.98] transition-transform flex flex-col justify-between relative overflow-hidden group min-h-[110px]"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold block leading-snug">नवीन कार्यक्रम</span>
                <span className="text-[11px] text-white/80 mt-0.5 block">+ Add Event Wizard</span>
              </div>
            </button>

            {/* Action 2: Gate Scanner Fast Access */}
            <button
              onClick={() => setShowScannerModal(true)}
              className="bg-[#FD6B36] text-[#5D1900] p-4 rounded-2xl shadow-sm text-left active:scale-[0.98] transition-transform flex flex-col justify-between relative overflow-hidden min-h-[110px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-[#AC3400]" />
                </div>
                <span className="text-[10px] bg-[#16A34A] text-white px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>
              <div>
                <span className="text-sm font-bold block leading-snug text-white">गेट स्कॅनर सुरू करा</span>
                <span className="text-[11px] text-white/90 mt-0.5 block">Fast Gate Check-in</span>
              </div>
            </button>

            {/* Action 3: Manage Shows */}
            <button
              onClick={() => setActiveTab('shows')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] text-left active:scale-[0.98] transition-transform flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E1E8FD] flex items-center justify-center mb-3 text-[#141B2B]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#141B2B] block leading-snug">शोज व्यवस्थापन</span>
                <span className="text-[11px] text-[#64748B] mt-0.5 block">Manage Shows (४)</span>
              </div>
            </button>

            {/* Action 4: Seat Rates & Pricing */}
            <button
              onClick={() => {
                if (venuesList[0]) {
                  void openVenueDesigner(venuesList[0]);
                } else {
                  triggerToast('नाट्यगृह लोड होत आहे...');
                }
              }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] text-left active:scale-[0.98] transition-transform flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center mb-3 text-[#A33900]">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#141B2B] block leading-snug">आसन दर व जागा</span>
                <span className="text-[11px] text-[#64748B] mt-0.5 block">Seat Rates & Pricing</span>
              </div>
            </button>
          </div>
        </div>

        {/* Live Shows & Ticket Status (आजचे थेट शोज व विक्री) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#141B2B]">आजचे थेट शोज व विक्री</h3>
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping"></span>
            </div>
            <span className="text-xs font-bold text-[#A33900]">२ सक्रीय</span>
          </div>

          <div className="space-y-3">
            {/* Show Card 1: Niyam Va Ati Lagu */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
              <div className="flex items-start gap-3.5">
                <img
                  src="https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400"
                  alt="नियम व अटी लागू"
                  className="w-16 h-22 object-cover rounded-xl shadow-sm shrink-0 border border-[#E2E8F0]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] bg-[#FFF7ED] text-[#A33900] font-bold px-2 py-0.5 rounded-full">
                      Fast Filling • ९५%
                    </span>
                    <span className="text-[11px] text-[#16A34A] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                      स्कॅनर कार्यरत
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#141B2B] truncate">नियम व अटी लागू</h4>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">📍 बालगंधर्व रंगमंदिर, पुणे</p>
                  <p className="text-[11px] text-[#64748B]">⏰ आज रात्री ८:०० वा</p>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="mt-3 pt-1">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#64748B] font-medium">६२० / ६५० जागा विकल्या गेल्या</span>
                  <span className="text-[#A33900] font-bold">३० शिल्लक</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#A33900] rounded-full transition-all duration-500" style={{ width: '95%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-3 pt-1 border-t border-[#E2E8F0]">
                <div className="text-xs text-[#64748B] flex items-center gap-1">
                  <span className="text-[#16A34A] font-bold">🚪 गेट २ स्कॅनर सक्रिय</span>
                </div>
                <button
                  onClick={() => setActiveTab('shows')}
                  className="bg-[#FFF7ED] text-[#A33900] px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1 hover:bg-[#FFEDD5]"
                >
                  <span>तपशील पहा</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Show Card 2: Albatya Galbatya */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
              <div className="flex items-start gap-3.5">
                <img
                  src="https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400"
                  alt="अलबत्या गलबत्या"
                  className="w-16 h-22 object-cover rounded-xl shadow-sm shrink-0 border border-[#E2E8F0]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] bg-red-100 text-[#DC2626] font-bold px-2 py-0.5 rounded-full">
                      हाउसफुल्ल • १००%
                    </span>
                    <span className="text-[11px] text-[#64748B]">दुपारी ४:३० शो</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#141B2B] truncate">अलबत्या गलबत्या</h4>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">📍 यशवंतराव चव्हाण नाट्यगृह, कोथरूड</p>
                  <p className="text-[11px] text-[#16A34A] font-semibold">✓ सर्व तिकिटे विकली</p>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="mt-3 pt-1">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-[#64748B] font-medium">५०० / ५०० जागा पूर्ण भरल्या</span>
                  <span className="text-[#16A34A] font-bold">Housefull</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#16A34A] rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-3 pt-1 border-t border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">एकूण संकलन: ₹१,२५,०००</span>
                <button
                  onClick={() => {
                    const targetVenue = venuesList[1] || venuesList[0];
                    if (targetVenue) {
                      void openVenueDesigner(targetVenue);
                    }
                  }}
                  className="bg-[#E1E8FD] text-[#141B2B] px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition"
                >
                  आसन लेआउट
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gate Scanner & Check-in Tracker Module */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-[#141B2B] leading-tight">
                गेट स्कॅनर व हजेरी ट्रॅकर
              </h3>
              <p className="text-xs text-[#64748B]">निवडलेल्या शोसाठी थेट QR पडताळणी</p>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
          </div>

          <div className="py-3 px-1">
            <p className="text-sm text-[#141B2B] font-semibold">लाइव्ह हजेरी गेट स्कॅनर मध्ये दिसते</p>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              कार्यक्रम + अचूक शो वेळ निवडून QR / ऑर्डर ID स्कॅन करा. फक्त त्या शोशी जुळणारी तिकिटेच मंजूर होतील —
              इतर दिनांक/वेळेची तिकिटे अधिकृत संदेशासह नाकारली जातील.
            </p>
          </div>

          {/* Quick Scan Action Button */}
          <button
            onClick={() => setShowScannerModal(true)}
            className="w-full mt-4 py-3 bg-[#A33900] hover:bg-[#832600] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>कॅमेरा स्कॅनर त्वरित सुरू करा</span>
          </button>
        </div>

        {/* Live Stream Bookings Real-time Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#141B2B]">थेट बुकिंग प्रवाह</h3>
              <span className="text-[10px] bg-[#E1E8FD] text-[#16A34A] font-bold px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-xs font-bold text-[#A33900] hover:underline"
            >
              सर्व व्यवहार →
            </button>
          </div>

          <div className="space-y-2">
            {liveBookings.map((tx, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#E2E8F0] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#FFF7ED] text-[#A33900] flex items-center justify-center font-bold text-xs shrink-0">
                    {tx.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#141B2B] truncate">{tx.name}</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-[#64748B]">
                        {tx.seats}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] truncate block">{tx.details}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-[#16A34A] block">{tx.amount}</span>
                  <span className="text-[10px] text-[#64748B]">{tx.time}</span>
                </div>
              </div>
            ))}
            </div>
          </div>
          </div>
        )}

        {/* 2. BOOKINGS & ATTENDEE DATA TAB */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#141B2B]">बुकिंग व ग्राहक तपशील (Bookings & Attendees)</h3>
                  <p className="text-xs text-[#64748B]">ग्राहकांची माहिती, आसन क्रमांक व तिकीट दर तपशील</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#FFF7ED] text-[#A33900] font-bold px-2.5 py-1 rounded-lg">
                    {ordersList.length} एकूण बुकिंग्ज
                  </span>
                  <button
                    onClick={exportBookingsCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs active:scale-95 transition"
                    title="CSV डाऊनलोड करा"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV डाऊनलोड</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="ग्राहक नाव, फोन, ईमेल किंवा तिकीट कोडने शोधा..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
              />
            </div>

            {/* Bookings List Cards */}
            <div className="space-y-3">
              {ordersList
                .filter((o) => {
                  if (!bookingSearch.trim()) return true;
                  const q = bookingSearch.toLowerCase();
                  const matchName = (o.userName || '').toLowerCase().includes(q);
                  const matchEmail = (o.userEmail || '').toLowerCase().includes(q);
                  const matchPhone = (o.userPhone || '').toLowerCase().includes(q);
                  const matchOrder = (o.orderNumber || '').toLowerCase().includes(q);
                  const matchEvent = (o.event?.title || o.event?.titleMr || '').toLowerCase().includes(q);
                  const matchTickets = (o.tickets || []).some((t: any) =>
                    (t.ticketCode || '').toLowerCase().includes(q) || (t.seatCode || '').toLowerCase().includes(q)
                  );
                  return matchName || matchEmail || matchPhone || matchOrder || matchEvent || matchTickets;
                })
                .map((order) => {
                  const seatList = (order.tickets || []).map((t: any) => t.seatCode).join(', ') || `${order.ticketCount || 1} जागा`;
                  const eventTitle = order.event?.titleMr || order.event?.title || 'तिकीट';
                  const showtimeStr = order.session?.sessionStartTime
                    ? new Date(order.session.sessionStartTime).toLocaleString('mr-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'प्रयोग';

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs space-y-3"
                    >
                      {/* Top Bar: Customer & Order Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#A33900] font-black flex items-center justify-center text-sm shrink-0">
                            {(order.userName || 'G').charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#141B2B]">{order.userName || 'ग्राहक'}</h4>
                            <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                              <span>📞 {order.userPhone || '—'}</span>
                              <span>✉️ {order.userEmail || '—'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-[#16A34A] block">
                            ₹{((order.grandTotal || 0) / 100).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-[#16A34A] border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-block mt-0.5">
                            {order.paymentStatus === 'captured' || order.paymentStatus === 'paid' ? 'Paid ✓' : order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#64748B] block">कार्यक्रम</span>
                          <span className="font-bold text-[#141B2B] truncate block">{eventTitle}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#64748B] block">तारीख व वेळ</span>
                          <span className="font-bold text-[#141B2B] block">{showtimeStr}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#64748B] block">आसन क्रमांक</span>
                          <span className="font-bold text-[#A33900] block">{seatList}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#64748B] block">ऑर्डर कोड</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700 block truncate">
                            {order.orderNumber}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Ticket Codes Strip */}
                      {(order.tickets || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                          {order.tickets.map((t: any) => (
                            <span
                              key={t.id || t.ticketCode}
                              className="text-[10px] bg-white border border-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-lg flex items-center gap-1"
                            >
                              <Ticket className="w-3 h-3 text-[#EA580C]" />
                              <span>{t.ticketCode} ({t.seatCode})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {ordersList.length === 0 && (
                <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B]">
                  <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold">सध्या कोणतीही बुकिंग नोंद उपलब्ध नाही</p>
                  <p className="text-xs text-slate-400 mt-1">थेट ग्राहक बुकिंग आल्यावर येथे दिसेल</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. LIVE GATE SCANNER TAB */}
        {activeTab === 'scanner' && (
          <div className="fixed inset-0 z-[80] bg-[#0B1220]">
            <AdminScanner
              scannerUserId={currentUser?.id || 1}
              scannerOrganizerId={numericOrganizerId}
              events={eventsList as any}
              initialGateName="मुख्य प्रवेशद्वार (Gate 1)"
              onClose={() => setActiveTab('overview')}
              onTicketVerified={(ticket) => {
                triggerToast(`✓ तिकीट ${ticket?.code || ''} यशस्वीरित्या प्रमाणित!`);
              }}
            />
          </div>
        )}

        {/* 4. SHOWS & EVENTS TAB */}
        {activeTab === 'shows' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#141B2B]">माझे शोज व आगामी कार्यक्रम</h3>
                <p className="text-xs text-[#64748B]">आपल्या संस्थेचे सर्व सक्रिय व आगामी नाट्यगृह प्रयोग</p>
              </div>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="bg-[#A33900] hover:bg-[#832600] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>नवीन कार्यक्रम जोडा</span>
              </button>
            </div>

            <div className="space-y-3">
              {eventsList.map((ev) => (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingEvent(ev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingEvent(ev);
                    }
                  }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-[#A33900]/40 transition text-left"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={ev.posterUrl || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400'}
                      alt={ev.titleMr || ev.title}
                      className="w-14 h-20 object-cover rounded-xl shadow-xs shrink-0 border border-[#E2E8F0]"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-orange-50 text-[#EA580C] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                          {ev.category === 'plays' ? (mr ? 'नाटक' : 'Play') : ev.category}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {ev.status || 'published'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-[#141B2B]">
                        {mr ? ev.titleMr || ev.title : ev.title || ev.titleMr}
                      </h4>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {mr ? ev.title : ev.titleMr}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        ⏱ {ev.durationMinutes || 150} {mr ? 'मिनिटे' : 'min'} • {ev.language || 'मराठी'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        🏛 {ev.venue?.nameMr || ev.venue?.name || '—'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingEvent(ev)}
                      className="bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition"
                    >
                      {mr ? 'तपशील' : 'Details'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetVenue = venuesList.find((v) => v.id === ev.venueId) || venuesList[0];
                        if (targetVenue) void openVenueDesigner(targetVenue);
                      }}
                      className="bg-[#E1E8FD] text-[#141B2B] px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition"
                    >
                      {mr ? 'आसन रचना' : 'Seats'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bookings')}
                      className="bg-[#FFF7ED] text-[#A33900] px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1"
                    >
                      <span>{mr ? 'बुकिंग्ज' : 'Bookings'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Event Wizard Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddEventModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-[#64748B]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#141B2B] mb-4">
              नवीन कार्यक्रम जोडा (Add Event Wizard)
            </h3>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#141B2B] block mb-1">नाटकाचे नाव (मराठी)</label>
                <input
                  type="text"
                  value={eventTitleMr}
                  onChange={e => setEventTitleMr(e.target.value)}
                  placeholder="उदा. सुंदर मी होणार"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#A33900]"
                />
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">इंग्रजी नाव (English)</label>
                <input
                  type="text"
                  value={eventTitleEn}
                  onChange={e => setEventTitleEn(e.target.value)}
                  placeholder="उदा. Sundar Mee Honaar"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">श्रेणी</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                >
                  <option value="plays">नाटक (Plays)</option>
                  <option value="music">संगीत (Music)</option>
                  <option value="comedy">हास्य (Comedy)</option>
                  <option value="movies">चित्रपट (Movies)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#141B2B] block">
                  {mr ? 'नाट्यगृह निवडा' : 'Select theatre'}
                  <span className="ml-1 font-medium text-slate-500">
                    ({venuesList.length || 0})
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={formDistrictId}
                    onChange={(e) => {
                      setFormDistrictId(e.target.value);
                      setFormCityName('');
                      setEventVenueId(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                  >
                    <option value="">{mr ? 'जिल्हा' : 'District'}</option>
                    {districtsCatalog.map((d: any) => (
                      <option key={d.id} value={String(d.id)}>
                        {mr ? d.nameMr || d.name : d.name || d.nameMr}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formCityName}
                    onChange={(e) => {
                      setFormCityName(e.target.value);
                      setEventVenueId(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                  >
                    <option value="">{mr ? 'शहर' : 'City'}</option>
                    {citiesCatalog
                      .filter(
                        (c: any) =>
                          !formDistrictId || String(c.districtId) === String(formDistrictId)
                      )
                      .map((c: any) => (
                        <option key={c.id} value={c.name}>
                          {mr ? c.nameMr || c.name : c.name || c.nameMr}
                        </option>
                      ))}
                  </select>
                </div>
                <input
                  type="search"
                  value={venueSearchInForm}
                  onChange={(e) => setVenueSearchInForm(e.target.value)}
                  placeholder={mr ? 'नाव / पत्ता शोधा…' : 'Search name / address…'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
                <select
                  value={eventVenueId || ''}
                  onChange={(e) => setEventVenueId(Number(e.target.value) || 0)}
                  required
                  size={6}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                >
                  <option value="">{mr ? '— नाट्यगृह निवडा —' : '— Select theatre —'}</option>
                  {venuesList
                    .filter((v: any) => {
                      if (formDistrictId && String(v.districtId ?? '') !== String(formDistrictId))
                        return false;
                      if (formCityName) {
                        const city = String(v.cityName || v.city || '').toLowerCase();
                        const want = formCityName.toLowerCase();
                        if (city !== want && !city.includes(want)) return false;
                      }
                      const q = venueSearchInForm.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        String(v.nameMr || '').toLowerCase().includes(q) ||
                        String(v.name || '').toLowerCase().includes(q) ||
                        String(v.city || '').toLowerCase().includes(q) ||
                        String(v.address || '').toLowerCase().includes(q)
                      );
                    })
                    .map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {mr ? v.nameMr || v.name : v.name || v.nameMr} — {v.cityName || v.city}
                      </option>
                    ))}
                </select>
              </div>

              {eventVenueId ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#141B2B]">
                        {mr ? 'विभागनिहाय तिकीट दर' : 'Section ticket prices'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {mr
                          ? 'दर सीट नकाशामधून येतात'
                          : 'Prices come from the theatre seat map'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const v = venuesList.find((x: any) => x.id === Number(eventVenueId));
                        if (v) void openVenueDesigner(v);
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A33900] text-white text-[11px] font-bold"
                    >
                      <Armchair className="w-3.5 h-3.5" />
                      {mr ? 'दर बदला' : 'Edit prices'}
                    </button>
                  </div>
                  {venuePricePreview.loading ? (
                    <p className="text-[11px] text-slate-500">
                      {mr ? 'लोड…' : 'Loading…'}
                    </p>
                  ) : venuePricePreview.sections.length > 0 ? (
                    <ul className="space-y-1">
                      {venuePricePreview.sections.map((sec) => (
                        <li
                          key={sec.id}
                          className="flex justify-between gap-2 text-[11px] bg-white border border-slate-100 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="font-semibold truncate">
                            {mr ? sec.nameMr || sec.name : sec.name || sec.nameMr}
                          </span>
                          <span className="font-mono font-bold text-[#A33900]">
                            ₹{sec.basePrice.toLocaleString('en-IN')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <label className="block text-[11px] font-bold text-slate-700">
                      {mr ? 'सामान्य प्रवेश दर (₹)' : 'GA price (₹)'}
                      <input
                        type="number"
                        min={1}
                        value={gaFallbackPrice}
                        onChange={(e) =>
                          setGaFallbackPrice(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white"
                      />
                    </label>
                  )}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-[#A33900] hover:bg-[#832600] text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
              >
                {isProcessing ? 'जतन करत आहे...' : 'प्रकाशित करा व तिकीट विक्री सुरू करा'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 relative shadow-2xl">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-[#64748B]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#141B2B] mb-3">गेट स्कॅनर सुरू करा</h3>
            <AdminScanner
              scannerUserId={currentUser?.id || 1}
              scannerOrganizerId={numericOrganizerId}
              events={eventsList as any}
              initialGateName="गेट २ (बाल्कनी)"
              onTicketVerified={(ticket) => {
                triggerToast(`तिकीट ${ticket?.code || ''} स्कॅन पूर्ण!`);
              }}
            />
          </div>
        </div>
      )}

      {/* Organization info (session — no fake multi-org switcher) */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#A33900]" />
                <h3 className="text-base font-black text-[#141B2B]">
                  {mr ? 'संस्था माहिती' : 'Organization'}
                </h3>
              </div>
              <button
                onClick={() => setShowOrgModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50 p-4 space-y-2">
              <p className="text-sm font-bold text-[#141B2B]">{orgDisplayName}</p>
              <p className="text-xs text-slate-600">
                {mr ? 'आयोजक ID' : 'Organizer ID'}:{' '}
                <span className="font-mono">{numericOrganizerId ?? '—'}</span>
              </p>
              <p className="text-xs text-slate-600">
                {orgVerified
                  ? mr
                    ? 'स्थिती: प्रमाणित'
                    : 'Status: Verified'
                  : mr
                    ? 'स्थिती: तपासणीत / अपुष्ट'
                    : 'Status: Pending / unverified'}
              </p>
              <p className="text-xs text-slate-600">
                {mr ? 'सक्रिय शोज' : 'Shows'}: {eventsList.length}
              </p>
              {currentUser?.email ? (
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              {mr
                ? 'एक लॉगिन = एक संस्था. शोज, बुकिंग व स्कॅनर या खात्याशी जोडलेले आहेत.'
                : 'One login maps to one organization. Shows, bookings and scanner use this account.'}
            </p>
          </div>
        </div>
      )}

      {/* Seat Designer — above Add Event (z-[90]) */}
      {showSeatDesigner && venueForDesigner && (
        <TheatreSeatDesigner
          venueToEdit={venueForDesigner}
          onClose={() => setShowSeatDesigner(false)}
          onSaved={(_v: any, meta?: { layoutLocked?: boolean; warning?: string }) => {
            setShowSeatDesigner(false);
            setVenuePriceRefreshKey((k) => k + 1);
            triggerToast(
              meta?.layoutLocked && meta.warning
                ? `✓ जतन · ${meta.warning}`
                : '✓ आसन रचना व दर जतन करण्यात आले!'
            );
          }}
        />
      )}
    </div>
  );
};
