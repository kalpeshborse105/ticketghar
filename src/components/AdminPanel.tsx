'use client';

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Banknote,
  QrCode,
  Users,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Eye,
  Check,
  X,
  Building2,
  FileSpreadsheet,
  MapPin,
  Database,
  Terminal,
  HelpCircle,
  KeyRound,
  Server,
  FileCode,
} from 'lucide-react';

interface AdminPanelProps {
  language: Language;
  onBack: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'settlements'
  | 'events'
  | 'cities_venues'
  | 'scanner'
  | 'leads'
  | 'orders'
  | 'system_db';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  language,
  onBack,
}) => {
  const t = translations[language];

  // RBAC active role
  const [activeRole, setActiveRole] = useState<
    'super_admin' | 'operations' | 'finance' | 'scanner'
  >('super_admin');

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Dashboard Data
  const [kpiData, setKpiData] = useState<any>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);

  // Settlement Data
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
  const [payoutUtrInput, setPayoutUtrInput] = useState('');

  // Event Data
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Venues and Cities Data
  const [venuesList, setVenuesList] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false);
  const [newVenueForm, setNewVenueForm] = useState({
    name: '',
    nameMr: '',
    city: 'Pune',
    address: '',
    totalCapacity: 600,
    hasSeatLayout: 1,
    balconyRows: 4,
    balconyCols: 8,
    balconyPrice: 400,
    stallRows: 6,
    stallCols: 8,
    stallPrice: 300,
  });

  // Scanner State
  const [scanInput, setScanInput] = useState('');
  const [gateName, setGateName] = useState('Main Entry Gate 1');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Partner Leads
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Orders Data
  const [orderList, setOrderList] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Create Event Form
  const [newEventForm, setNewEventForm] = useState({
    organizerId: 1,
    venueId: 1,
    title: '',
    titleMr: '',
    category: 'plays',
    categoryMr: 'नाटक',
    language: 'Marathi',
    durationMinutes: 150,
    description: '',
    descriptionMr: '',
    posterUrl: 'https://picsum.photos/seed/natak1/600/800',
    convenienceFeeValue: 3000,
    sessionDate: '2026-10-05',
    sessionTime: '19:30',
  });

  // Fetch Dashboard KPIs
  const fetchDashboard = async () => {
    try {
      setLoadingKpis(true);
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setKpiData(data.kpis);
      }
    } catch (e) {
      console.error('Failed to load KPIs:', e);
    } finally {
      setLoadingKpis(false);
    }
  };

  // Fetch Settlements
  const fetchSettlements = async () => {
    try {
      setLoadingSettlements(true);
      const res = await fetch('/api/admin/settlements');
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSettlements(false);
    }
  };

  // Fetch Events
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/admin/events');
      if (res.ok) {
        const data = await res.json();
        setAdminEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch Venues
  const fetchVenues = async () => {
    try {
      setLoadingVenues(true);
      const res = await fetch('/api/admin/venues');
      if (res.ok) {
        const data = await res.json();
        setVenuesList(data.venues || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVenues(false);
    }
  };

  // Fetch Leads
  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const res = await fetch('/api/admin/partner-leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrderList(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'dashboard') fetchDashboard();
      if (activeTab === 'settlements') fetchSettlements();
      if (activeTab === 'events') fetchEvents();
      if (activeTab === 'cities_venues') fetchVenues();
      if (activeTab === 'leads') fetchLeads();
      if (activeTab === 'orders') fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Action: Toggle Event Status (Publish/Unpublish)
  const handleToggleEventStatus = async (eventId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          status: newStatus,
          actorId: 'admin_user',
          actorRole: activeRole,
        }),
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Process Settlement with Bank UTR
  const handleMarkSettlementPaid = async () => {
    if (!selectedSettlement || !payoutUtrInput.trim()) return;

    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: selectedSettlement.id,
          payoutUtr: payoutUtrInput.trim(),
          actorId: 'finance_admin',
          actorRole: activeRole,
        }),
      });

      if (res.ok) {
        setSelectedSettlement(null);
        setPayoutUtrInput('');
        fetchSettlements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Scan Ticket Verification
  const handleScanTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    try {
      setScanLoading(true);
      setScanResult(null);

      const res = await fetch('/api/scanner/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCodeOrPayload: scanInput.trim(),
          gateName,
          scannedByUserId: 1,
          scannerDevice: 'Gate Terminal 01',
        }),
      });

      const data = await res.json();
      setScanResult(data);
    } catch (err: any) {
      setScanResult({
        valid: false,
        status: 'error',
        message: err.message || 'Scan verification error',
      });
    } finally {
      setScanLoading(false);
    }
  };

  // Action: Update Partner Lead Status
  const handleUpdateLeadStatus = async (leadId: number, status: string) => {
    try {
      const res = await fetch('/api/admin/partner-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status }),
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Create New Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVenueForm),
      });
      if (res.ok) {
        setShowCreateVenueModal(false);
        fetchVenues();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create venue');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating venue');
    }
  };

  // Action: Create New Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEventForm,
          actorId: 'admin_user',
          actorRole: activeRole,
        }),
      });
      if (res.ok) {
        setShowCreateEventModal(false);
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create event');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating event');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-semibold"
            title="Return to Customer App"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>{language === 'mr' ? 'ग्राहक ॲपवर परत जा' : 'Back to App'}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg font-serif">
                TicketGhar Control Center
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PROD BACKEND
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              कंपनी प्रशासक कक्ष • महाराष्ट्र-प्रथम तिकीट नियंत्रण प्रणाली
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">सक्रिय भूमिका (RBAC):</span>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
          >
            <option value="super_admin">Super Admin (सर्व अधिकार)</option>
            <option value="finance">Finance (सेटलमेंट व लेजर)</option>
            <option value="operations">Operations (आयोजक व कार्यक्रम)</option>
            <option value="scanner">Gate Scanner (प्रवेश पडताळणी)</option>
          </select>
        </div>
      </header>

      {/* Admin Quick Guide Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>ॲडमिन मार्गदर्शक:</strong> आपण नवीन शहरे, नाट्यगृहे, कार्यक्रम आणि थेट गेट स्कॅनर तपासू शकता. सर्व व्यवहार क्लाउड एसक्यूएलमध्ये थेट नोंदवले जातात.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            PostgreSQL: Connected
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
            Cloud SQL: Developer Edition
          </span>
        </div>
      </div>

      {/* Main Admin Workspace with Sidebar Navigation */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800 p-3 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>डॅशबोर्ड (KPIs)</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>कार्यक्रम व्यवस्थापन</span>
          </button>

          <button
            onClick={() => setActiveTab('cities_venues')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'cities_venues'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>शहरे व नाट्यगृहे (Cities)</span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'settlements'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>सेटलमेंट लेजर</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ऑर्डर्स व तिकिटे</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>गेट स्कॅनर (QR Pass)</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>आयोजक अर्ज (Leads)</span>
          </button>

          <button
            onClick={() => setActiveTab('system_db')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'system_db'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-sky-400" />
            <span>डेटाबेस व सिस्टीम मॅन्युअल</span>
          </button>
        </nav>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    कार्यकारी डॅशबोर्ड (Executive Overview)
                  </h2>
                  <p className="text-xs text-slate-400">
                    रिअल-टाइम तिकीट विक्री, प्लॅटफॉर्म महसूल आणि ऑपरेशन्स
                  </p>
                </div>
                <button
                  onClick={fetchDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              {loadingKpis ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-28 bg-slate-900 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      एकूण विक्री (GMV)
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                      ₹{((kpiData?.totalGmvPaise || 0) / 100).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {kpiData?.totalConfirmedOrders || 0} यशस्वी ऑर्डर्स
                    </span>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      तिकीट विक्री संख्या
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-white font-mono">
                      {kpiData?.totalTicketsSold || 0}
                    </p>
                    <span className="text-[10px] text-emerald-400">पुष्टी झालेले पासेस</span>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      प्लॅटफॉर्म महसूल (Platform Fee)
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                      ₹{((kpiData?.platformRevenuePaise || 0) / 100).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500">कन्वीनियन्स फी जमा</span>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      आयोजक देणी (Pending Settlement)
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                      ₹{((kpiData?.pendingSettlementPaise || 0) / 100).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500">हस्तांतरणासाठी प्रलंबित</span>
                  </div>
                </div>
              )}

              {/* Quick links & summary cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>महाराष्ट्र शहरे व कव्हरेज (Cities Covered)</span>
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['पुणे', 'मुंबई', 'ठाणे', 'नागपूर', 'नाशिक', 'संभाजीनगर', 'कोल्हापूर', 'सांगली', 'सोलापूर'].map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('cities_venues')}
                    className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1 pt-1"
                  >
                    <span>नाट्यगृहे आणि नवीन शहरे व्यवस्थापित करा →</span>
                  </button>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>डेटाबेस व सुरक्षा तपशील (Database State)</span>
                  </h3>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>• <strong>इंजिन:</strong> PostgreSQL 16 (Google Cloud SQL Developer)</p>
                    <p>• <strong>रीजन:</strong> asia-southeast1 (Near-zero latency)</p>
                    <p>• <strong>इन्व्हेंटरी मॉडेल:</strong> Database-Authoritative 8-min Atomic Holds</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('system_db')}
                    className="text-xs text-sky-400 hover:underline font-semibold flex items-center gap-1 pt-1"
                  >
                    <span>सिस्टीम मॅन्युअल आणि .env वाचा →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVENTS MANAGEMENT */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    कार्यक्रम व्यवस्थापन (Events Catalog)
                  </h2>
                  <p className="text-xs text-slate-400">
                    प्रस्तावित व मंजूर कार्यक्रम प्रकाशित करा, संपादना करा किंवा मागे घ्या
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-amber-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>नवीन कार्यक्रम जोडा</span>
                  </button>
                  <button
                    onClick={fetchEvents}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">शीर्षक व वर्ग</th>
                      <th className="p-3.5">नाट्यगृह व शहर</th>
                      <th className="p-3.5">आयोजक</th>
                      <th className="p-3.5">स्थिती</th>
                      <th className="p-3.5 text-right">कृती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {adminEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white text-sm">{evt.titleMr}</div>
                          <div className="text-[11px] text-slate-400">{evt.title}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            {evt.category.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="font-semibold">{evt.venue?.nameMr || evt.venue?.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {evt.venue?.city}, महाराष्ट्र
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="font-semibold">{evt.organizer?.companyName}</div>
                          <div className="text-[10px] text-slate-400">
                            कमिशन: {(evt.organizer?.commissionRate / 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {evt.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleToggleEventStatus(evt.id, evt.status)}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 transition"
                          >
                            {evt.status === 'published' ? 'मागे घ्या (Unpublish)' : 'प्रकाशित करा (Publish)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CITIES & VENUES (NEW FEATURE) */}
          {activeTab === 'cities_venues' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    शहरे व नाट्यगृहे व्यवस्थापन (Cities & Auditoriums)
                  </h2>
                  <p className="text-xs text-slate-400">
                    महाराष्ट्रातील नवीन शहरे आणि आसन व्यवस्थेसह नाट्यगृहे जोडा
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateVenueModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-amber-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नवीन नाट्यगृह / शहर जोडा</span>
                  </button>
                  <button
                    onClick={fetchVenues}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loadingVenues ? (
                <div className="p-8 text-center text-slate-400">नाट्यगृहांची माहिती लोड होत आहे...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {venuesList.map((v) => (
                    <div
                      key={v.id}
                      className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {v.city}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">
                            {v.nameMr || v.name}
                          </h3>
                          <p className="text-xs text-slate-400">{v.name}</p>
                        </div>
                        <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        📍 {v.address}
                      </p>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span>क्षमता: <strong>{v.totalCapacity}</strong> आसने</span>
                        <span>
                          {v.hasSeatLayout === 1 ? '🪑 आसन नकाशा सक्रिय' : 'जनरल ॲडमिशन'}
                        </span>
                      </div>

                      {v.sections && v.sections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {v.sections.map((s: any) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-amber-300 font-semibold"
                            >
                              {s.nameMr} (₹{s.basePrice / 100})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTLEMENTS */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    आयोजक सेटलमेंट लेजर (Financial Ledger)
                  </h2>
                  <p className="text-xs text-slate-400">
                    तिकीट विक्री, प्लॅटफॉर्म कमिशन, कर व आयोजकांचे देयक तपशील
                  </p>
                </div>
                <button
                  onClick={fetchSettlements}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              {/* Settlement Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">संदर्भ क्र.</th>
                      <th className="p-3.5">आयोजक / कार्यक्रम</th>
                      <th className="p-3.5">एकूण विक्री</th>
                      <th className="p-3.5">प्लॅटफॉर्म कमिशन</th>
                      <th className="p-3.5">आयोजक निव्वळ देय</th>
                      <th className="p-3.5">स्थिती</th>
                      <th className="p-3.5 text-right">कृती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">
                          {s.settlementReference}
                        </td>
                        <td className="p-3.5 text-slate-200">
                          <span className="font-semibold block">{s.companyName}</span>
                          <span className="text-slate-400 text-[10px]">{s.eventTitle}</span>
                        </td>
                        <td className="p-3.5 font-mono">
                          ₹{(s.totalGrossTicketSales / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 font-mono text-emerald-400">
                          ₹{(s.platformCommissionEarned / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white text-sm">
                          ₹{(s.netPayableToOrganizer / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'settled'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {s.status === 'settled' ? (
                            <span className="text-[10px] text-slate-400 font-mono">
                              UTR: {s.payoutUtr}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedSettlement(s);
                                setPayoutUtrInput('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold border border-emerald-500/40"
                            >
                              पेमेंट जमा करा (Disburse)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    सर्व ऑर्डर्स व व्यवहारांची नोंद (Orders & Tickets)
                  </h2>
                  <p className="text-xs text-slate-400">
                    प्लॅटफॉर्मवरील सर्व बुकिंग्स आणि पेमेंट स्थिती
                  </p>
                </div>
                <button
                  onClick={fetchOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              {/* Order Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">ऑर्डर क्र.</th>
                      <th className="p-3.5">ग्राहक</th>
                      <th className="p-3.5">कार्यक्रम</th>
                      <th className="p-3.5">तिकिटे / आसने</th>
                      <th className="p-3.5">एकूण रक्कम</th>
                      <th className="p-3.5">पेमेंट</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orderList.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">
                          {ord.orderNumber}
                        </td>
                        <td className="p-3.5 text-slate-200">
                          <span className="font-semibold block">{ord.userName}</span>
                          <span className="text-slate-400 text-[10px]">
                            {ord.userPhone} • {ord.userEmail}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <span className="font-medium block">{ord.event?.titleMr}</span>
                          <span className="text-slate-500 text-[10px]">
                            {ord.venue?.name}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {ord.ticketCount} Seats
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {ord.tickets?.map((t: any) => (
                              <span
                                key={t.id}
                                className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-amber-300 font-mono"
                              >
                                {t.seatCode}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white text-sm">
                          ₹{(ord.grandTotal / 100).toFixed(0)}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {ord.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: GATE SCANNER */}
          {activeTab === 'scanner' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-serif">
                  प्रवेशद्वार स्कॅनर (Gate Ticket Verification)
                </h2>
                <p className="text-xs text-slate-400">
                  QR टोकन किंवा तिकीट कोड प्रविष्ट करून सर्व्हर-सत्यापित प्रवेश द्या
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">प्रवेशद्वार (Gate Name):</span>
                  <input
                    type="text"
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>

                <form onSubmit={handleScanTicket} className="space-y-3">
                  <input
                    type="text"
                    placeholder="उदा. TG-TKT-101 किंवा संपूर्ण QR पेलोड पेस्ट करा..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  <button
                    type="submit"
                    disabled={scanLoading || !scanInput.trim()}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{scanLoading ? 'तपासत आहे...' : 'तिकीट पडताळा (Verify Ticket)'}</span>
                  </button>
                </form>

                {/* Scan Result */}
                {scanResult && (
                  <div
                    className={`p-5 rounded-2xl border text-center space-y-2 ${
                      scanResult.valid
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    <div className="text-lg font-black font-serif">
                      {scanResult.valid ? '✅ प्रवेश मान्य (ENTRY ALLOWED)' : '❌ प्रवेश नाकारला (ENTRY REJECTED)'}
                    </div>
                    <p className="text-xs font-semibold">{scanResult.message}</p>

                    {scanResult.ticket && (
                      <div className="pt-2 text-xs text-left bg-slate-950/60 p-3 rounded-xl space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">आसन क्र. (Seat):</span>
                          <span className="font-bold text-amber-400">{scanResult.ticket.seat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">प्रेक्षक (Name):</span>
                          <span className="text-white">{scanResult.ticket.attendee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">कार्यक्रम (Event):</span>
                          <span className="text-white truncate max-w-[200px]">
                            {scanResult.ticket.eventMr || scanResult.ticket.event}
                          </span>
                        </div>
                      </div>
                    )}

                    {scanResult.alreadyScannedAt && (
                      <p className="text-xs text-amber-300 font-medium">
                        याआधी स्कॅन: {new Date(scanResult.alreadyScannedAt).toLocaleTimeString()} (Gate: {scanResult.previousGate})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: PARTNER LEADS */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    आयोजक नोंदणी अर्ज (Partner Leads Inbox)
                  </h2>
                  <p className="text-xs text-slate-400">
                    कार्यक्रमांचे प्रस्ताव तपासा, संपर्क करा आणि प्रत्यक्ष पडताळणी करा
                  </p>
                </div>
                <button
                  onClick={fetchLeads}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              <div className="space-y-4">
                {leads.map((l) => (
                  <div
                    key={l.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {l.category.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-white">{l.eventName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            l.status === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : l.status === 'contacted'
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {l.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        आयोजक: <strong>{l.organizerName}</strong> ({l.companyName}) • शहर: {l.city}
                      </p>
                      <p className="text-xs text-slate-400">
                        संपर्क: {l.mobile} • {l.email}
                      </p>
                      {l.message && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2 rounded-lg">
                          &ldquo;{l.message}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {l.status !== 'contacted' && l.status !== 'verified' && (
                        <button
                          onClick={() => handleUpdateLeadStatus(l.id, 'contacted')}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-bold border border-sky-500/30"
                        >
                          संपर्क केला (Contacted)
                        </button>
                      )}
                      {l.status !== 'verified' && (
                        <button
                          onClick={() => handleUpdateLeadStatus(l.id, 'verified')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold border border-emerald-500/30"
                        >
                          पडताळणी पूर्ण (Verify)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: DATABASE & SYSTEM MANUAL (NEW FEATURE) */}
          {activeTab === 'system_db' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    डेटाबेस व सिस्टीम मॅन्युअल (Database & System Setup)
                  </h2>
                  <p className="text-xs text-slate-400">
                    क्लाउड एसक्यूएल, पर्यावरण व्हेरिएबल्स (.env) आणि स्थानिक सेटअप मार्गदर्शक
                  </p>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                    <Database className="w-4 h-4" />
                    <span>Database Engine</span>
                  </div>
                  <p className="text-base font-bold text-white">PostgreSQL 16</p>
                  <p className="text-[11px] text-slate-400">Google Cloud SQL Developer Edition</p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                    <Server className="w-4 h-4" />
                    <span>Deployment Region</span>
                  </div>
                  <p className="text-base font-bold text-white">asia-southeast1</p>
                  <p className="text-[11px] text-slate-400">Cloud SQL Instance: ai-studio-05ee5a93</p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Connection Pool</span>
                  </div>
                  <p className="text-base font-bold text-white">pg.Pool (Lazy Load)</p>
                  <p className="text-[11px] text-slate-400">Object Method • Max 10 Connections</p>
                </div>
              </div>

              {/* Environment Variables Reference */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>पर्यावरण व्हेरिएबल्स (.env.example & Production Variables)</span>
                </h3>
                <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto border border-slate-800">
                  <p className="text-slate-500"># Cloud SQL / PostgreSQL Runtime Connection (Auto-injected in AI Studio):</p>
                  <p>SQL_HOST=&quot;/cloudsql/...&quot; <span className="text-slate-500"># Unix socket or host</span></p>
                  <p>SQL_DB_NAME=&quot;ai-studio-db&quot; <span className="text-slate-500"># PostgreSQL database name</span></p>
                  <p>SQL_USER=&quot;...&quot; <span className="text-slate-500"># App runtime user with read/write</span></p>
                  <p>SQL_PASSWORD=&quot;...&quot; <span className="text-slate-500"># App runtime password</span></p>
                  <p>SQL_ADMIN_USER=&quot;...&quot; <span className="text-slate-500"># Schema Drizzle Kit migration user</span></p>
                  <p>SQL_ADMIN_PASSWORD=&quot;...&quot; <span className="text-slate-500"># Schema migration password</span></p>
                  <p className="text-slate-500 pt-2"># Payment Gateway (Razorpay Indian Provider):</p>
                  <p>RAZORPAY_KEY_ID=&quot;rzp_test_...&quot; <span className="text-slate-500"># Public API Key</span></p>
                  <p>RAZORPAY_KEY_SECRET=&quot;...&quot; <span className="text-slate-500"># Webhook HMAC verification secret</span></p>
                  <p className="text-slate-500 pt-2"># Gemini AI & App Hosting:</p>
                  <p>GEMINI_API_KEY=&quot;...&quot; <span className="text-slate-500"># Server-side injected</span></p>
                  <p>APP_URL=&quot;https://...&quot; <span className="text-slate-500"># Current hosting URL</span></p>
                </div>
              </div>

              {/* Step-by-Step Production Manual */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>आपल्या संगणकावर / सर्व्हरवर कसे चालवावे? (Quick Start Commands)</span>
                </h3>
                <div className="space-y-3 text-xs text-slate-300">
                  <div>
                    <strong className="text-white block font-mono">1. Dependencies इन्स्टॉल करा:</strong>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-amber-300 mt-1">
                      npm install # किंवा bun install
                    </div>
                  </div>
                  <div>
                    <strong className="text-white block font-mono">2. Database Schema अपडेट / मायग्रेट करा:</strong>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-amber-300 mt-1">
                      npx drizzle-kit push --config=./src/db/drizzle.config.ts
                    </div>
                  </div>
                  <div>
                    <strong className="text-white block font-mono">3. प्रारंभिक डेटा (Events, Venues, Seats) सीड करा:</strong>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-amber-300 mt-1">
                      bun run src/db/seed.ts
                    </div>
                  </div>
                  <div>
                    <strong className="text-white block font-mono">4. डेव्हलपमेंट सर्व्हर सुरू करा:</strong>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-amber-300 mt-1">
                      npm run dev
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Create New Venue & City */}
      {showCreateVenueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-serif">
                नवीन नाट्यगृह व आसन व्यवस्था जोडा (Add Auditorium)
              </h3>
              <button
                onClick={() => setShowCreateVenueModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">नाट्यगृहाचे नाव (English):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kalidas Natyamandir"
                    value={newVenueForm.name}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">मराठी नाव (Marathi):</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. कालिदास नाट्यमंदिर"
                    value={newVenueForm.nameMr}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, nameMr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">शहर (City in Maharashtra):</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. Nashik, Kolhapur, Pune"
                    value={newVenueForm.city}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">एकूण आसन क्षमता (Capacity):</label>
                  <input
                    type="number"
                    value={newVenueForm.totalCapacity}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, totalCapacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">पत्ता (Address):</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. एम.जी. रोड, रविवार पेठ..."
                  value={newVenueForm.address}
                  onChange={(e) => setNewVenueForm({ ...newVenueForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-amber-400 block">आसन व्यवस्था दर (Section Pricing):</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">बाल्कनी दर (₹):</label>
                    <input
                      type="number"
                      value={newVenueForm.balconyPrice}
                      onChange={(e) => setNewVenueForm({ ...newVenueForm, balconyPrice: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">स्टॉल / आसन दर (₹):</label>
                    <input
                      type="number"
                      value={newVenueForm.stallPrice}
                      onChange={(e) => setNewVenueForm({ ...newVenueForm, stallPrice: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateVenueModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-amber-400 transition"
                >
                  नाट्यगृह तयार करा (Save Venue)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Event */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-serif">
                नवीन कार्यक्रम जोडा (Create Verified Event)
              </h3>
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">मराठी शीर्षक:</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. संगीत मानापमान"
                    value={newEventForm.titleMr}
                    onChange={(e) => setNewEventForm({ ...newEventForm, titleMr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">English Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sangeet Manapman"
                    value={newEventForm.title}
                    onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">वर्ग (Category):</label>
                  <select
                    value={newEventForm.category}
                    onChange={(e) => setNewEventForm({ ...newEventForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="plays">नाटक (Plays & Theatre)</option>
                    <option value="music">संगीत (Music & Concerts)</option>
                    <option value="comedy">स्टँडअप कॉमेडी (Comedy)</option>
                    <option value="cultural">सांस्कृतिक (Cultural)</option>
                    <option value="workshops">कार्यशाळा (Workshops)</option>
                    <option value="movies">चित्रपट (Movies)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">नाट्यगृह निवडा (Venue):</label>
                  <select
                    value={newEventForm.venueId}
                    onChange={(e) => setNewEventForm({ ...newEventForm, venueId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value={1}>Bal Gandharva Ranga Mandir, Pune</option>
                    <option value={2}>Shivaji Mandir, Dadar, Mumbai</option>
                    <option value={3}>Yashwantrao Chavan Natyagruha, Kothrud, Pune</option>
                    <option value={4}>Dr. Vasantrao Deshpande Hall, Nagpur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">शो तारीख (Show Date):</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.sessionDate}
                    onChange={(e) => setNewEventForm({ ...newEventForm, sessionDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">वेळ (Show Time):</label>
                  <input
                    type="time"
                    required
                    value={newEventForm.sessionTime}
                    onChange={(e) => setNewEventForm({ ...newEventForm, sessionTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">मराठी वर्णन (Description):</label>
                <textarea
                  required
                  rows={3}
                  value={newEventForm.descriptionMr}
                  onChange={(e) => setNewEventForm({ ...newEventForm, descriptionMr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="कार्यक्रमाची थोडक्यात माहिती..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-amber-400 transition"
                >
                  कार्यक्रम जतन करा (Save & Publish)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Settlement UTR Disbursal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white font-serif">
              आयोजक बँक खात्यात पैसे जमा करा (Disburse Payout)
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">आयोजक:</span>
                <span className="font-bold text-white">{selectedSettlement.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">निव्वळ देय रक्कम:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{(selectedSettlement.netPayableToOrganizer / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                बँक ट्रान्सफर UTR / IMPS क्रमांक:
              </label>
              <input
                type="text"
                placeholder="उदा. HDFC0001928374..."
                value={payoutUtrInput}
                onChange={(e) => setPayoutUtrInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSettlement(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleMarkSettlementPaid}
                disabled={!payoutUtrInput.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
              >
                सेटलमेंट पूर्ण झाली (Confirm Payout)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
