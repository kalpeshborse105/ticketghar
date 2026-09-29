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
} from 'lucide-react';

interface AdminPanelProps {
  language: Language;
  onBack: () => void;
}

type AdminTab = 'dashboard' | 'settlements' | 'events' | 'scanner' | 'leads' | 'orders';

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
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Settlement Data
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
  const [payoutUtrInput, setPayoutUtrInput] = useState('');

  // Event Data
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

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
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

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
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'settlements') fetchSettlements();
    if (activeTab === 'events') fetchEvents();
    if (activeTab === 'leads') fetchLeads();
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  // Handle Scan Verification
  const handleVerifyTicket = async () => {
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
          scannerDevice: 'Gate Terminal 01',
          scannerUserId: 3,
        }),
      });

      const data = await res.json();
      setScanResult(data);

      // Play audio beep
      if (typeof window !== 'undefined') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = data.valid ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(data.valid ? 880 : 220, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (data.valid ? 0.2 : 0.4));
      }
    } catch (err: any) {
      setScanResult({
        valid: false,
        message: 'प्रणालीशी संपर्क अयशस्वी (Connection Error)',
      });
    } finally {
      setScanLoading(false);
    }
  };

  // Handle Settlement Payout
  const handleDisburseSettlement = async (settlementId: number) => {
    if (!payoutUtrInput.trim()) {
      alert('कृपया बँक UTR संदर्भ क्रमांक प्रविष्ट करा (Enter Bank UTR).');
      return;
    }
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId,
          status: 'settled',
          payoutUtr: payoutUtrInput.trim(),
          adminActor: 'Kalpesh Borse (Super Admin)',
        }),
      });
      if (res.ok) {
        setSelectedSettlement(null);
        setPayoutUtrInput('');
        fetchSettlements();
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Event Publish/Unpublish
  const handleToggleEventStatus = async (eventId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'unpublish' : 'published';
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status: newStatus }),
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Lead Status
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Return to Customer App"
          >
            <ArrowLeft className="w-4 h-4" />
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
              कंपनी प्रशासक कक्ष • महाराष्ट्र-प्रथम तिकीट प्रणाली
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

      {/* Main Admin Workspace with Sidebar Navigation */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800 p-3 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto">
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
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>गेट स्कॅनर (Gate Scanner)</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>आयोजक अर्ज (Leads)</span>
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
        </nav>

        {/* Tab Content Canvas */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    प्लॅटफॉर्म आर्थिक व परिचालन सारांश (Operational KPIs)
                  </h2>
                  <p className="text-xs text-slate-400">
                    प्रत्यक्ष डेटाबेसवर आधारित अचूक हिशोब (PostgreSQL Authoritative Stats)
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

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    एकूण विक्री (Total GMV)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                    ₹{((kpiData?.totalGmv || 0) / 100).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {kpiData?.totalOrders || 0} ऑर्डर्स • {kpiData?.ticketsSold || 0} तिकिटे
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    प्लॅटफॉर्म महसूल (Platform Fees)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    ₹{((kpiData?.platformFees || 0) / 100).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    + ₹{((kpiData?.platformCommissionEarned || 0) / 100).toFixed(0)} कमिशन
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    आयोजकांना प्रलंबित देय (Pending Payable)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                    ₹{((kpiData?.netOrganizerPayable || 0) / 100).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {kpiData?.pendingSettlementsCount || 0} प्रलंबित सेटलमेंट्स
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    गेट स्कॅन पडताळणी (Gate Scans)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {kpiData?.scans?.total || 0}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {kpiData?.scans?.successful || 0} मान्य •{' '}
                    <span className="text-rose-400">
                      {kpiData?.scans?.duplicatesRejected || 0} दुबार नकार
                    </span>
                  </span>
                </div>
              </div>

              {/* Recent Scan Audit Logs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  थेट गेट स्कॅन नोंदी (Realtime Gate Entry Logs)
                </h3>
                <div className="divide-y divide-slate-800 text-xs">
                  {kpiData?.recentScans && kpiData.recentScans.length > 0 ? (
                    kpiData.recentScans.map((scan: any) => (
                      <div key={scan.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              scan.scanResult === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {scan.scanResult}
                          </span>
                          <span className="font-mono text-white">{scan.ticketCode}</span>
                          <span className="text-slate-400 hidden sm:inline">
                            • {scan.gateName}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">
                          {new Date(scan.scannedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-slate-500">
                      अद्याप कोणत्याही स्कॅन नोंदी नाहीत (No gate scans recorded yet)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETTLEMENT LEDGER */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    {t.ledgerTitle}
                  </h2>
                  <p className="text-xs text-slate-400">
                    तिकीट मूल्य, सेवा शुल्क, गेटवे खर्च, कर आणि आयोजकांचे स्वतंत्र वाटप
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
                      <th className="p-3.5">संदर्भ क्र. / आयोजक</th>
                      <th className="p-3.5">कार्यक्रम</th>
                      <th className="p-3.5">मूळ तिकीट मूल्य</th>
                      <th className="p-3.5">तिकीटघर कमिशन</th>
                      <th className="p-3.5">आयोजक देय रक्कम</th>
                      <th className="p-3.5">स्थिती</th>
                      <th className="p-3.5">क्रिया</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-850 transition">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-amber-400 block">
                            {s.settlementReference}
                          </span>
                          <span className="text-slate-300 font-medium">{s.companyName}</span>
                          <span className="text-slate-500 block text-[10px]">
                            {s.bankName} • A/C: {s.bankAccountNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-200">
                          <span className="font-semibold block">{s.eventTitleMr}</span>
                          <span className="text-slate-400 text-[11px]">{s.eventTitle}</span>
                        </td>
                        <td className="p-3.5 font-mono text-white">
                          ₹{(s.totalGrossTicketSales / 100).toFixed(0)}
                        </td>
                        <td className="p-3.5 font-mono text-emerald-400">
                          ₹{(s.platformCommissionEarned / 100).toFixed(0)}
                        </td>
                        <td className="p-3.5 font-mono font-extrabold text-amber-400 text-sm">
                          ₹{(s.netPayableToOrganizer / 100).toFixed(0)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'settled'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {s.status === 'settled' ? 'SETTLED' : 'PENDING'}
                          </span>
                          {s.payoutUtr && (
                            <span className="block text-[10px] font-mono text-slate-400 mt-1">
                              UTR: {s.payoutUtr}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {s.status !== 'settled' ? (
                            <button
                              onClick={() => {
                                setSelectedSettlement(s);
                                setPayoutUtrInput(`HDFC${Date.now().toString().slice(-8)}`);
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] transition shadow"
                            >
                              पैसे पाठवा (Settle)
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-semibold text-[11px]">
                              ✓ पूर्ण झाले
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settlement Payout Modal */}
              {selectedSettlement && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                    <h3 className="text-base font-bold text-white">
                      आयोजक सेटलमेंट पूर्ण करा (Record Bank Payout)
                    </h3>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>आयोजक:</span>
                        <span className="font-semibold text-white">
                          {selectedSettlement.companyName}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>बँक खाते:</span>
                        <span className="font-mono text-white">
                          {selectedSettlement.bankAccountNumber} ({selectedSettlement.bankIfsc})
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                        <span>निव्वळ देय रक्कम:</span>
                        <span className="font-bold text-amber-400 text-sm">
                          ₹{(selectedSettlement.netPayableToOrganizer / 100).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        बँक ट्रान्सफर UTR क्रमांक (Bank Transaction UTR) *
                      </label>
                      <input
                        type="text"
                        required
                        value={payoutUtrInput}
                        onChange={(e) => setPayoutUtrInput(e.target.value)}
                        placeholder="उदा. HDFC00019284729"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setSelectedSettlement(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        रद्द करा
                      </button>
                      <button
                        onClick={() => handleDisburseSettlement(selectedSettlement.id)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md"
                      >
                        सेटलमेंट नोंदवा (Confirm Payout)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVENTS MANAGEMENT */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                    कार्यक्रम व्यवस्थापन (Event Management)
                  </h2>
                  <p className="text-xs text-slate-400">
                    कंपनी पडताळणी केलेले कार्यक्रम प्रकाशित व व्यवस्थापित करा
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>नवीन कार्यक्रम जोडा</span>
                  </button>
                </div>
              </div>

              {/* Event Cards in Admin */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminEvents.map((item) => (
                  <div
                    key={item.event.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {item.event.categoryMr || item.event.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.event.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {item.event.status.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="font-bold text-white font-serif text-base line-clamp-1">
                        {item.event.titleMr}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {item.event.title}
                      </p>

                      <div className="text-xs text-slate-300">
                        <span>सभागृह: {item.venue?.nameMr || item.venue?.name}</span>
                        <span className="text-slate-500 block">
                          आयोजक: {item.organizer?.companyName}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() =>
                          handleToggleEventStatus(item.event.id, item.event.status)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          item.event.status === 'published'
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                        }`}
                      >
                        {item.event.status === 'published' ? 'अप्रकाशित करा (Unpublish)' : 'प्रकाशित करा (Publish)'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GATE SCANNER MODE */}
          {activeTab === 'scanner' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-md">
                  <QrCode className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white font-serif">
                  {t.scannerTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  सभागृह प्रवेशद्वार पडताळणी • थेट डेटाबेस तपासणी व दुबार प्रवेश प्रतिबंध
                </p>
              </div>

              {/* Gate Selector */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  प्रवेशद्वार निवडा (Gate Identity):
                </label>
                <select
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-semibold focus:outline-none"
                >
                  <option value="Main Entry Gate 1">Main Entry Gate 1 (मुख्य प्रवेशद्वार १)</option>
                  <option value="Balcony Gate 2">Balcony Gate 2 (बाल्कनी प्रवेशद्वार २)</option>
                  <option value="VIP Lounge Gate">VIP Lounge Gate (व्हीआयपी द्वार)</option>
                </select>
              </div>

              {/* Scan Barcode / Input Box */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  {t.scanInputPlaceholder}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="उदा. TG-TK-88192-A1 किंवा QR JSON पेस्ट करा"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    disabled={scanLoading || !scanInput.trim()}
                    onClick={handleVerifyTicket}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    {scanLoading ? 'तपासत आहे...' : t.verifyTicket}
                  </button>
                </div>

                {/* Quick Test Demo Codes */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                  <span>चाचणी तिकीट कोड:</span>
                  <button
                    onClick={() => {
                      setScanInput('TG-TK-88192-A1');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono hover:bg-slate-700"
                  >
                    TG-TK-88192-A1
                  </button>
                  <button
                    onClick={() => {
                      setScanInput('TG-TK-88192-A2');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono hover:bg-slate-700"
                  >
                    TG-TK-88192-A2
                  </button>
                </div>
              </div>

              {/* Scan Result Visual Display */}
              {scanResult && (
                <div
                  className={`p-6 rounded-3xl border-2 text-center space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 ${
                    scanResult.valid
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                      : scanResult.scanResult === 'ALREADY_USED'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                      : 'bg-rose-950/60 border-rose-500 text-rose-200'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-black/30 border border-current">
                    {scanResult.valid ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-rose-400" />
                    )}
                  </div>

                  <h3 className="text-xl font-black">{scanResult.message}</h3>

                  {scanResult.ticket && (
                    <div className="p-3 bg-black/40 rounded-xl text-xs space-y-1 max-w-sm mx-auto text-left font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">आसन क्रमांक (Seat):</span>
                        <span className="font-extrabold text-amber-400">
                          {scanResult.ticket.seat}
                        </span>
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
          )}

          {/* TAB 5: PARTNER LEADS */}
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

          {/* TAB 6: ORDERS */}
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
        </main>
      </div>
    </div>
  );
};
