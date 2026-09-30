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
  Megaphone,
  Bell,
  Tag,
} from 'lucide-react';

interface AdminPanelProps {
  language: Language;
  onBack: () => void;
  onLogout?: () => void;
  initialRole?: 'super_admin' | 'organizer' | 'scanner' | 'operations' | 'finance';
  currentUser?: any;
}

type AdminTab =
  | 'dashboard'
  | 'settlements'
  | 'events'
  | 'cities_venues'
  | 'scanner'
  | 'verified_tickets'
  | 'screen_status'
  | 'leads'
  | 'orders'
  | 'users'
  | 'coupons'
  | 'announcements'
  | 'audit_logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  language,
  onBack,
  onLogout,
  initialRole = 'super_admin',
  currentUser,
}) => {
  const t = translations[language];

  // RBAC active role
  const [activeRole, setActiveRole] = useState<
    'super_admin' | 'organizer' | 'operations' | 'finance' | 'scanner'
  >(initialRole);

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (initialRole === 'organizer' || initialRole === 'scanner') {
      return 'scanner';
    }
    return 'dashboard';
  });

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

  // Verified Tickets State
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'used' | 'issued'>('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [verifyingTicketId, setVerifyingTicketId] = useState<number | null>(null);

  // Screen & Seat Layout State
  const [selectedEventIdForSeats, setSelectedEventIdForSeats] = useState<number | null>(null);
  const [selectedSessionIdForSeats, setSelectedSessionIdForSeats] = useState<number | null>(null);
  const [seatMapData, setSeatMapData] = useState<any | null>(null);
  const [loadingSeatMap, setLoadingSeatMap] = useState(false);

  // Partner Leads
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Orders Data
  const [orderList, setOrderList] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Users Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Coupons Data
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);

  // Announcements Data
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    title: '',
    message: '',
    category: 'popup_poster', // 'popup_poster' | 'hero_banner' | 'mid_banner' | 'general_notification'
    imageUrl: '',
    ctaLabel: 'आताच बुक करा',
    ctaUrl: '',
    city: '',
    startsAt: '',
    endsAt: '',
    active: 1,
  });
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  // Audit Logs Data
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

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
    posterUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=600&h=900&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1240&h=380&q=80',
    videoUrl: '',
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
      const res = await fetch('/api/admin/orders');
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

  // Fetch Verified & All Tickets
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const url =
        ticketStatusFilter !== 'all'
          ? `/api/admin/tickets?status=${ticketStatusFilter}`
          : '/api/admin/tickets';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTicketsList(data.tickets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Manual instant verification
  const handleManualVerifyTicket = async (ticket: any) => {
    try {
      setVerifyingTicketId(ticket.id);
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, gateName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTicketsList((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? {
                  ...t,
                  status: 'used',
                  scannedAt: new Date().toISOString(),
                  gateName,
                }
              : t
          )
        );
      } else {
        alert(data.message || 'पडताळणी अयशस्वी');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingTicketId(null);
    }
  };

  // Fetch Live Seat Layout for Session
  const fetchSeatMap = async (sessionId: number) => {
    try {
      setLoadingSeatMap(true);
      const res = await fetch(`/api/sessions/${sessionId}/seats`);
      if (res.ok) {
        const data = await res.json();
        setSeatMapData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSeatMap(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Coupons
  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const data = await res.json();
        setCouponsList(data.coupons || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const res = await fetch('/api/admin/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncementsList(data.announcements || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAuditLogs(true);
      const res = await fetch('/api/admin/audit-logs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAuditLogsList(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAuditLogs(false);
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
      if (activeTab === 'verified_tickets') fetchTickets();
      if (activeTab === 'screen_status') fetchEvents();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'announcements') fetchAnnouncements();
      if (activeTab === 'audit_logs') fetchAuditLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'verified_tickets') {
      fetchTickets();
    }
  }, [ticketStatusFilter]);

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

  // Action: Create Announcement / Banner
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementForm.title.trim() || !newAnnouncementForm.message.trim()) {
      alert('कृपया शीर्षक आणि संदेश प्रविष्ट करा');
      return;
    }

    try {
      setIsSubmittingAnnouncement(true);
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAnnouncementForm,
          actorId: 'admin_official',
        }),
      });

      if (res.ok) {
        setShowCreateAnnouncementModal(false);
        setNewAnnouncementForm({
          title: '',
          message: '',
          category: 'popup_poster',
          imageUrl: '',
          ctaLabel: 'आताच बुक करा',
          ctaUrl: '',
          city: '',
          startsAt: '',
          endsAt: '',
          active: 1,
        });
        fetchAnnouncements();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create announcement');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating announcement');
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  // Action: Toggle Announcement Active Status
  const handleToggleAnnouncementActive = async (id: number, currentActive: number) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId: id,
          active: currentActive === 1 ? 0 : 1,
          actorId: 'admin_official',
        }),
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error(err);
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
      const sessionStartTime =
        newEventForm.sessionDate && newEventForm.sessionTime
          ? `${newEventForm.sessionDate}T${newEventForm.sessionTime}:00`
          : new Date(Date.now() + 86400000 * 2).toISOString();

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEventForm,
          sessionStartTime,
          organizerId: newEventForm.organizerId || 1,
          venueId: newEventForm.venueId || 1,
          castCrew: newEventForm.videoUrl ? JSON.stringify({ videoUrl: newEventForm.videoUrl }) : null,
          ticketPrice: 35000,
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
            <ArrowLeft className="w-4 h-4 text-[#ea580c]" />
            <span>{language === 'mr' ? 'ग्राहक ॲपवर परत जा' : 'Back to App'}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg">
                MahaTicket Control Center (महाटिकिट नियंत्रण कक्ष)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/30">
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
          {/* Organizer / Scanner Dedicated Menu */}
          {activeRole === 'organizer' || activeRole === 'scanner' ? (
            <>
              <div className="px-3 py-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider hidden md:block">
                आयोजक नियंत्रण (Organizer Tools)
              </div>

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
                onClick={() => setActiveTab('verified_tickets')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'verified_tickets'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>सत्यापित तिकिटे (Verified)</span>
              </button>

              <button
                onClick={() => setActiveTab('screen_status')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'screen_status'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>स्क्रीन व आसन स्थिती (Seats)</span>
              </button>
            </>
          ) : (
            /* Super Admin / Full Staff Menu */
            <>
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
                onClick={() => setActiveTab('verified_tickets')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'verified_tickets'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>सत्यापित तिकिटे (Verified)</span>
              </button>

              <button
                onClick={() => setActiveTab('screen_status')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'screen_status'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>स्क्रीन व आसन स्थिती (Seats)</span>
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
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span>वापरकर्ते व्यवस्थापन (Users)</span>
              </button>

              <button
                onClick={() => setActiveTab('coupons')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'coupons'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>कूपन्स व ऑफर्स (Coupons)</span>
              </button>

              <button
                onClick={() => setActiveTab('announcements')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'announcements'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>जाहिराती (Announcements)</span>
              </button>

              <button
                onClick={() => setActiveTab('audit_logs')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'audit_logs'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4 text-rose-400" />
                <span>ऑडिट लॉग्स (Audit Trail)</span>
              </button>
            </>
          )}
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
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>जाहिरात व बॅनर मोहीम (Announcements & Ads)</span>
                  </h3>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>• <strong>मोबाईल / वेब ॲड पॉपअप:</strong> टाइमर-आधारित जाहिरात व ऑफर पोस्टर</p>
                    <p>• <strong>मुख्य बॅनर:</strong> होमपेज टॉप कॅरोसेल व मिडल स्ट्रिप बॅनर</p>
                    <p>• <strong>थेट रीडायरेक्ट:</strong> क्लिकवर इच्छित पेज किंवा बाह्य लिंकवर नेणे</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1 pt-1"
                  >
                    <span>बॅनर व जाहिरात मोहीम व्यवस्थापित करा →</span>
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
                    {adminEvents.map((evt) => {
                      const categoryLabel = (evt.category || evt.event?.category || 'नाटक').toUpperCase();
                      const statusLabel = (evt.status || evt.event?.status || 'published').toUpperCase();
                      const titleMarathi = evt.titleMr || evt.event?.titleMr || evt.title || '';
                      const titleEnglish = evt.title || evt.event?.title || '';
                      const venueDisplayName = evt.venue?.nameMr || evt.venue?.name || 'नाट्यगृह';
                      const venueCity = evt.venue?.city || 'महाराष्ट्र';
                      const orgCompany = evt.organizer?.companyName || evt.organizer?.name || 'आयोजक';
                      const commissionText = evt.organizer?.commissionRate
                        ? `${(evt.organizer.commissionRate / 100).toFixed(1)}%`
                        : '5.0%';

                      return (
                        <tr key={evt.id} className="hover:bg-slate-850 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">{titleMarathi}</div>
                            <div className="text-[11px] text-slate-400">{titleEnglish}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300">
                            <div className="font-semibold">{venueDisplayName}</div>
                            <div className="text-[10px] text-slate-400">
                              {venueCity}, महाराष्ट्र
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-300">
                            <div className="font-semibold">{orgCompany}</div>
                            <div className="text-[10px] text-slate-400">
                              कमिशन: {commissionText}
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
                              {statusLabel}
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
                      );
                    })}
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
                            {(s.status || 'pending').toUpperCase()}
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
                            {(ord.paymentStatus || 'captured').toUpperCase()}
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

          {/* TAB: VERIFIED TICKETS LIST */}
          {activeTab === 'verified_tickets' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    सत्यापित व जारी तिकिटे (Tickets & QR Verification List)
                  </h2>
                  <p className="text-xs text-slate-400">
                    सर्व जारी तिकिटांची स्थिती, आसन क्रमांक, स्कॅनिंग वेळ व गेट तपशील
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchTickets}
                    disabled={loadingTickets}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
                    <span>रिफ्रेश</span>
                  </button>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="नाव, तिकीट कोड किंवा फोन शोधा..."
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                  <button
                    onClick={() => setTicketStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      ticketStatusFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    सर्व तिकिटे ({ticketsList.length})
                  </button>

                  <button
                    onClick={() => setTicketStatusFilter('used')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      ticketStatusFilter === 'used'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    सत्यापित / वापरलेली ({ticketsList.filter((t) => t.status === 'used').length})
                  </button>

                  <button
                    onClick={() => setTicketStatusFilter('issued')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      ticketStatusFilter === 'issued'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    प्रलंबित / जारी ({ticketsList.filter((t) => t.status === 'issued').length})
                  </button>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3.5">प्रेक्षक / ग्राहक</th>
                        <th className="p-3.5">तिकीट कोड व आसन</th>
                        <th className="p-3.5">कार्यक्रम व शहर</th>
                        <th className="p-3.5">किंमत</th>
                        <th className="p-3.5">स्थिती</th>
                        <th className="p-3.5">स्कॅन वेळ व गेट</th>
                        <th className="p-3.5 text-right">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ticketsList
                        .filter((tk) => {
                          if (!ticketSearchQuery.trim()) return true;
                          const q = ticketSearchQuery.toLowerCase();
                          return (
                            (tk.attendeeName || '').toLowerCase().includes(q) ||
                            (tk.ticketCode || '').toLowerCase().includes(q) ||
                            (tk.seatCode || '').toLowerCase().includes(q) ||
                            (tk.userPhone || '').toLowerCase().includes(q) ||
                            (tk.eventTitleMr || '').toLowerCase().includes(q) ||
                            (tk.orderNumber || '').toLowerCase().includes(q)
                          );
                        })
                        .map((tk) => (
                          <tr key={tk.id} className="hover:bg-slate-850/80 transition">
                            <td className="p-3.5">
                              <div className="font-bold text-white text-sm">
                                {tk.attendeeName || 'ग्राहक'}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {tk.userPhone || tk.userEmail || 'संपर्क उपलब्ध नाही'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Order: {tk.orderNumber}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="font-mono font-bold text-amber-400">
                                {tk.ticketCode}
                              </div>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-emerald-300 font-mono font-semibold">
                                आसन: {tk.seatCode || 'सामान्य (General)'}
                              </span>
                            </td>

                            <td className="p-3.5 text-slate-300">
                              <div className="font-semibold text-white">
                                {tk.eventTitleMr || tk.eventTitle}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {tk.venueName}, {tk.city}
                              </div>
                            </td>

                            <td className="p-3.5 font-mono font-bold text-white">
                              ₹{((tk.price || 0) / 100).toFixed(0)}
                            </td>

                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                  tk.status === 'used'
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                                    : tk.status === 'cancelled'
                                    ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                                    : 'bg-sky-950/60 text-sky-400 border-sky-500/40'
                                }`}
                              >
                                {tk.status === 'used'
                                  ? 'सत्यापित (USED)'
                                  : tk.status === 'cancelled'
                                  ? 'रद्द (CANCELLED)'
                                  : 'जारी (ISSUED)'}
                              </span>
                            </td>

                            <td className="p-3.5 text-slate-400">
                              {tk.scannedAt ? (
                                <div className="space-y-0.5">
                                  <div className="font-mono text-emerald-400 text-[11px]">
                                    {new Date(tk.scannedAt).toLocaleTimeString()}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {tk.gateName || 'Main Gate'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  स्कॅन प्रलंबित
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-right">
                              {tk.status === 'used' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>प्रवेशित</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualVerifyTicket(tk)}
                                  disabled={verifyingTicketId === tk.id}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
                                >
                                  {verifyingTicketId === tk.id ? '...' : 'पडताळा (Verify)'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                      {ticketsList.length === 0 && !loadingTickets && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            कोणतेही तिकीट सापडले नाही.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SCREEN & SEAT STATUS */}
          {activeTab === 'screen_status' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    स्क्रीन व आसन बुकिंग स्थिती (Live Screen & Seat Layout)
                  </h2>
                  <p className="text-xs text-slate-400">
                    नाट्यगृह किंवा सभागृहामधील बुक झालेली, उपलब्ध आणि राखीव आसने थेट तपासा
                  </p>
                </div>

                {selectedSessionIdForSeats && (
                  <button
                    onClick={() => fetchSeatMap(selectedSessionIdForSeats)}
                    disabled={loadingSeatMap}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSeatMap ? 'animate-spin' : ''}`} />
                    <span>रिफ्रेश लेआउट</span>
                  </button>
                )}
              </div>

              {/* Event & Session Selectors */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      कार्यक्रम निवडा (Select Event):
                    </label>
                    <select
                      value={selectedEventIdForSeats || ''}
                      onChange={(e) => {
                        const evId = Number(e.target.value);
                        setSelectedEventIdForSeats(evId);
                        setSelectedSessionIdForSeats(null);
                        setSeatMapData(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">-- कार्यक्रम निवडा --</option>
                      {adminEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.titleMr || ev.title} ({ev.venue?.nameMr || ev.venue?.name || 'नाट्यगृह'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      शो / सत्र वेळ निवडा (Select Session / Showtime):
                    </label>
                    {selectedEventIdForSeats ? (
                      <button
                        onClick={() => {
                          const sessId = selectedEventIdForSeats;
                          setSelectedSessionIdForSeats(sessId);
                          fetchSeatMap(sessId);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>थेट आसन मांडणी पहा (Load Seat Map)</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic text-center">
                        आधी कार्यक्रम निवडा
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seat Map Display */}
              {loadingSeatMap && (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-400">आसन व्यवस्थापन लोड होत आहे...</p>
                </div>
              )}

              {seatMapData && !loadingSeatMap && (
                <div className="space-y-6">
                  {/* Real-time KPIs Bar */}
                  {(() => {
                    const allSeats = seatMapData.seats || [];
                    const totalSeats = allSeats.length;
                    const bookedSeats = allSeats.filter((s: any) => s.status === 'booked').length;
                    const heldSeats = allSeats.filter((s: any) => s.status === 'held').length;
                    const availableSeats = allSeats.filter((s: any) => s.status === 'available').length;
                    const occupancy =
                      totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(0) : '0';

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold">एकूण क्षमता</span>
                          <div className="text-xl font-extrabold text-white mt-0.5">{totalSeats}</div>
                        </div>

                        <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-2xl text-center">
                          <span className="text-[10px] text-rose-300 font-bold">🔴 बुक झालेली</span>
                          <div className="text-xl font-extrabold text-rose-400 mt-0.5">{bookedSeats}</div>
                        </div>

                        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center">
                          <span className="text-[10px] text-emerald-300 font-bold">🟢 उपलब्ध</span>
                          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                            {availableSeats}
                          </div>
                        </div>

                        <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl text-center">
                          <span className="text-[10px] text-amber-300 font-bold">🟡 राखीव / होल्ड</span>
                          <div className="text-xl font-extrabold text-amber-400 mt-0.5">{heldSeats}</div>
                        </div>

                        <div className="p-3.5 bg-sky-950/30 border border-sky-500/40 rounded-2xl text-center col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-sky-300 font-bold">भरती टक्केवारी</span>
                          <div className="text-xl font-extrabold text-sky-400 mt-0.5">{occupancy}%</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stage / Screen Indicator */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="max-w-md mx-auto">
                      <div className="h-3 w-full bg-gradient-to-r from-amber-500/20 via-amber-500 to-amber-500/20 rounded-t-full shadow-lg shadow-amber-500/20"></div>
                      <p className="text-center text-[10px] tracking-widest text-slate-400 uppercase font-bold mt-1">
                        रंगमंच / पडदा (STAGE / SCREEN)
                      </p>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm"></span>
                        <span className="text-slate-300">उपलब्ध (Available)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded bg-rose-500 shadow-sm"></span>
                        <span className="text-slate-300">बुक केलेले (Booked)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded bg-amber-500 shadow-sm"></span>
                        <span className="text-slate-300">राखीव (Held)</span>
                      </div>
                    </div>

                    {/* Seat Grid */}
                    <div className="space-y-6 pt-4">
                      {['balcony', 'stall'].map((tierName) => {
                        const tierSeats = (seatMapData.seats || []).filter(
                          (s: any) => (s.tier || '').toLowerCase() === tierName
                        );

                        if (tierSeats.length === 0) return null;

                        return (
                          <div key={tierName} className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1">
                              {tierName === 'balcony'
                                ? 'बालकनी (Balcony)'
                                : 'स्टॉल / प्रथम श्रेणी (Stall)'}
                            </h4>

                            <div className="flex flex-wrap gap-2 justify-center max-h-96 overflow-y-auto p-2">
                              {tierSeats.map((s: any) => {
                                const isBooked = s.status === 'booked';
                                const isHeld = s.status === 'held';

                                return (
                                  <div
                                    key={s.seatId || s.seatCode}
                                    title={`${s.seatCode} • ${(s.status || '').toUpperCase()} • ₹${
                                      (s.price || 0) / 100
                                    }`}
                                    className={`w-9 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition shadow-sm cursor-default ${
                                      isBooked
                                        ? 'bg-rose-600/90 text-white'
                                        : isHeld
                                        ? 'bg-amber-500/90 text-slate-950 font-black'
                                        : 'bg-emerald-600/90 text-white'
                                    }`}
                                  >
                                    {s.seatCode ? s.seatCode.split('-').pop() : s.seatNumber}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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
                          {(l.category || 'other').toUpperCase()}
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
                          {(l.status || 'new').toUpperCase()}
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

          {/* TAB 8: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    वापरकर्ते व्यवस्थापन (Users & Roles)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Staff members, role management, and access control
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Email & Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">City</th>
                      <th className="p-3.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{u.fullName}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{u.city}</td>
                        <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: COUPONS / OFFERS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    कूपन्स व ऑफर्स (Discount Coupons)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Promotional codes, discount management, and usage tracking
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Create Coupon - Coming Soon')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-emerald-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>नवीन कूपन</span>
                  </button>
                  <button
                    onClick={fetchCoupons}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Discount</th>
                      <th className="p-3.5">Usage</th>
                      <th className="p-3.5">Validity</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {couponsList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">{c.code}</td>
                        <td className="p-3.5 text-slate-300">
                          {c.discountType === 'percentage' 
                            ? `${c.discountValue / 100}%` 
                            : `₹${c.discountValue / 100}`}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {c.usedCount || 0} / {c.usageLimit || '∞'}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                          {c.startsAt && new Date(c.startsAt).toLocaleDateString()} - {c.endsAt && new Date(c.endsAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.active === 1 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {c.active === 1 ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: ANNOUNCEMENTS & BANNERS */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    बॅनर्स व जाहिरात व्यवस्थापन (Banners & Popups)
                  </h2>
                  <p className="text-xs text-slate-400">
                    हिरो बॅनर, मध्यम स्ट्रिप बॅनर आणि ॲप/वेबसाइटवर दिसणारे टाइमरयुक्त पॉपअप पोस्टर्स
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateAnnouncementModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-lg transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>नवीन बॅनर / पॉपअप जोडा</span>
                  </button>
                  <button
                    onClick={fetchAnnouncements}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Banners & Popups List */}
              <div className="space-y-4">
                {announcementsList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
                    कोणतेही बॅनर किंवा पॉपअप उपलब्ध नाहीत. &quot;नवीन बॅनर / पॉपअप जोडा&quot; बटणावर क्लिक करा.
                  </div>
                ) : (
                  announcementsList.map((a) => {
                    const isPopup = a.category === 'popup_poster';
                    const isHero = a.category === 'hero_banner';
                    const isMid = a.category === 'mid_banner';

                    const categoryBadge = isPopup
                      ? { label: '📱 ॲप व वेब टाइमर पॉपअप (Popup Ad)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                      : isHero
                      ? { label: '🌟 मुख्य हिरो बॅनर (Hero Carousel)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                      : isMid
                      ? { label: '🎗️ मिडल स्ट्रिप बॅनर (Middle Banner)', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
                      : { label: '📢 सूचना पट्टी (Notice)', color: 'bg-slate-700 text-slate-200 border-slate-600' };

                    return (
                      <div
                        key={a.id}
                        className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 hover:border-slate-700 transition"
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {a.imageUrl && (
                              <img
                                src={a.imageUrl}
                                alt={a.title}
                                className="w-20 h-20 sm:w-28 sm:h-20 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-950"
                              />
                            )}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${categoryBadge.color}`}>
                                  {categoryBadge.label}
                                </span>
                                {a.city && (
                                  <span className="text-[10px] text-slate-400">
                                    📍 {a.city}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-white mt-1">{a.title}</h3>
                              <p className="text-xs text-slate-300 line-clamp-2">{a.message}</p>
                              {a.ctaUrl && (
                                <p className="text-[11px] text-[#ea580c] font-medium flex items-center gap-1 mt-1">
                                  <span>लिंक: {a.ctaUrl}</span>
                                  {a.ctaLabel && <span className="text-slate-400">({a.ctaLabel})</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                a.active === 1
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {a.active === 1 ? '● LIVE / सक्रिय' : '○ PAUSED / बंद'}
                            </span>

                            <button
                              onClick={() => handleToggleAnnouncementActive(a.id, a.active)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                a.active === 1
                                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                              }`}
                            >
                              {a.active === 1 ? 'पॉझ करा (Pause)' : 'सुरू करा (Activate)'}
                            </button>
                          </div>
                        </div>

                        {/* Validity Timer Bar */}
                        {(a.startsAt || a.endsAt) && (
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>टाइमर शेड्युल (Schedule):</span>
                            </span>
                            <span>
                              {a.startsAt ? new Date(a.startsAt).toLocaleString() : 'तातडीने सुरू'} —{' '}
                              {a.endsAt ? new Date(a.endsAt).toLocaleString() : 'अनिश्चित काळासाठी'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 11: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    ऑडिट लॉग्स (Compliance & Audit Trail)
                  </h2>
                  <p className="text-xs text-slate-400">
                    All admin actions, role changes, and system modifications
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Entity</th>
                      <th className="p-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5 font-mono text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-300 font-semibold">{log.actorId}</div>
                          <div className="text-[10px] text-slate-500">{log.actorRole}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div>{log.entityType}</div>
                          <div className="text-[10px] text-slate-500">ID: {log.entityId}</div>
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 block text-xs">पोस्टर इमेज URL (Poster):</label>
                    <span className="text-[10px] text-amber-400 font-bold">📐 600 × 900 px (2:3)</span>
                  </div>
                  <input
                    type="url"
                    value={newEventForm.posterUrl}
                    onChange={(e) => setNewEventForm({ ...newEventForm, posterUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 block text-xs">हिरो बॅनर इमेज URL (Banner):</label>
                    <span className="text-[10px] text-amber-400 font-bold">📐 1240 × 380 px (3.25:1)</span>
                  </div>
                  <input
                    type="url"
                    value={newEventForm.bannerUrl}
                    onChange={(e) => setNewEventForm({ ...newEventForm, bannerUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-xs">
                  यूट्यूब ट्रेलर / व्हिडिओ URL (YouTube Trailer Link - ऐच्छिक):
                </label>
                <input
                  type="url"
                  value={newEventForm.videoUrl}
                  onChange={(e) => setNewEventForm({ ...newEventForm, videoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                  placeholder="https://www.youtube.com/watch?v=... किंवा https://youtu.be/..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 बुकमायशोप्रमाणे कार्यक्रमाच्या पानावर 'ट्रेलर पहा' बटणाद्वारे हा व्हिडिओ थेट दिसेल.
                </p>
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

      {/* MODAL 4: Create Announcement / Banner / Timed Popup */}
      {showCreateAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-serif">
                नवीन बॅनर / पॉपअप पोस्टर जोडा (Create Banner & Timed Popup)
              </h3>
              <button
                onClick={() => setShowCreateAnnouncementModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  प्रकार (Type):
                </label>
                <select
                  value={newAnnouncementForm.category}
                  onChange={(e) =>
                    setNewAnnouncementForm({ ...newAnnouncementForm, category: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold"
                >
                  <option value="popup_poster">
                    📱 ॲप व वेबसाइट पॉपअप पोस्टर (Timed Popup Ad with Timer)
                  </option>
                  <option value="hero_banner">
                    🌟 मुख्य हिरो कॅरोसेल बॅनर (Hero Carousel Banner)
                  </option>
                  <option value="mid_banner">
                    🎗️ मिडल स्ट्रिप बॅनर (Middle Section Banner)
                  </option>
                  <option value="general_notification">
                    📢 सामान्य सूचना पट्टी (Top Notification Notice)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    शीर्षक (Title) *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. दिवाळी महानाटक महोत्सव २०२६"
                    value={newAnnouncementForm.title}
                    onChange={(e) =>
                      setNewAnnouncementForm({ ...newAnnouncementForm, title: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    लक्ष्यित शहर (Target City):
                  </label>
                  <select
                    value={newAnnouncementForm.city}
                    onChange={(e) =>
                      setNewAnnouncementForm({ ...newAnnouncementForm, city: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">सर्व महाराष्ट्र (All Maharashtra)</option>
                    <option value="Pune">पुणे (Pune)</option>
                    <option value="Mumbai">मुंबई (Mumbai)</option>
                    <option value="Thane">ठाणे (Thane)</option>
                    <option value="Nashik">नाशिक (Nashik)</option>
                    <option value="Nagpur">नागपूर (Nagpur)</option>
                    <option value="Kolhapur">कोल्हापूर (Kolhapur)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  संदेश / माहिती (Description / Message) *:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="उदा. सर्व आघाडीच्या नाटकांवर मर्यादित कालावधीसाठी विशेष ऑफर..."
                  value={newAnnouncementForm.message}
                  onChange={(e) =>
                    setNewAnnouncementForm({ ...newAnnouncementForm, message: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold block text-xs">
                    इमेज URL (Poster / Banner Image Link):
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold">
                    {newAnnouncementForm.category === 'hero_banner'
                      ? '📐 शिफारस आकार: 1240 × 380 px (3.25:1)'
                      : newAnnouncementForm.category === 'mid_banner'
                      ? '📐 शिफारस आकार: 1200 × 200 px (6:1)'
                      : '📐 शिफारस आकार: 600 × 900 px (2:3)'}
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="https://images.example.com/banner.jpg"
                  value={newAnnouncementForm.imageUrl}
                  onChange={(e) =>
                    setNewAnnouncementForm({ ...newAnnouncementForm, imageUrl: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 वरील निश्चित आकाराची इमेज दिल्यास फ्रंटएंड हिरो सेक्शनवर इमेज परिपूर्ण (Full Visible) दिसेल, कोणतेही क्रॉपिंग होणार नाही.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    रीडायरेक्ट लिंक (Click Destination URL):
                  </label>
                  <input
                    type="text"
                    placeholder="/events/1 किंवा https://..."
                    value={newAnnouncementForm.ctaUrl}
                    onChange={(e) =>
                      setNewAnnouncementForm({ ...newAnnouncementForm, ctaUrl: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    बटन लेबल (CTA Button Text):
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. आताच बुक करा / Book Now"
                    value={newAnnouncementForm.ctaLabel}
                    onChange={(e) =>
                      setNewAnnouncementForm({ ...newAnnouncementForm, ctaLabel: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Timer Schedule */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 block">
                  ⏰ डिस्प्ले टाइमर शेड्युल (Display Timer Window - Optional):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">सुरू होण्याची तारीख व वेळ:</label>
                    <input
                      type="datetime-local"
                      value={newAnnouncementForm.startsAt}
                      onChange={(e) =>
                        setNewAnnouncementForm({ ...newAnnouncementForm, startsAt: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">समाप्ती तारीख व वेळ:</label>
                    <input
                      type="datetime-local"
                      value={newAnnouncementForm.endsAt}
                      onChange={(e) =>
                        setNewAnnouncementForm({ ...newAnnouncementForm, endsAt: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAnnouncement}
                  className="px-5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold text-xs shadow-lg transition active:scale-95"
                >
                  {isSubmittingAnnouncement ? 'जतन करत आहे...' : 'बॅनर प्रकाशित करा (Publish Banner)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
