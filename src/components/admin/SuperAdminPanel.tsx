'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Megaphone,
  QrCode,
  Armchair,
  X,
  Plus,
  Play,
  RotateCcw,
  Search,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { Language } from '../../lib/i18n.ts';
import { EventItem, VenueItem } from '../../lib/types.ts';
import { AdminScanner } from '../AdminScanner';
import { TheatreSeatDesigner } from './TheatreSeatDesigner';
import { RichDescriptionEditor } from './RichDescriptionEditor';

interface SuperAdminPanelProps {
  language: Language;
  currentUser?: any;
  onBack?: () => void;
  onLogout?: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  language,
  currentUser,
  onBack,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'governance' | 'events' | 'theatre_designer' | 'venues' | 'scanner' | 'ads'>('governance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLiveAlert, setShowLiveAlert] = useState(false);

  // Data states
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [venuesList, setVenuesList] = useState<VenueItem[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [searchEventQuery, setSearchEventQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Approval queue
  const [pendingApproval, setPendingApproval] = useState<boolean>(true);
  const [approvalDecision, setApprovalDecision] = useState<'pending' | 'approved' | 'changes' | 'rejected'>('pending');

  // Scanner & Designer modals
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showSeatDesigner, setShowSeatDesigner] = useState<boolean>(false);
  const [venueForDesigner, setVenueForDesigner] = useState<VenueItem | null>(null);

  // Event modal
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventTitleMr, setEventTitleMr] = useState('');
  const [eventTitleEn, setEventTitleEn] = useState('');
  const [eventCategory, setEventCategory] = useState('plays');
  const [eventVenueId, setEventVenueId] = useState<number>(1);
  const [eventBasePrice, setEventBasePrice] = useState<number>(300);
  const [eventBadge, setEventBadge] = useState<string>('हाऊसफुल्ल');
  const [eventDescriptionMr, setEventDescriptionMr] = useState('');
  const [eventPosterUrl, setEventPosterUrl] = useState('');

  // Ad Banners
  const [adsList, setAdsList] = useState([
    {
      id: 'ad-1',
      title: 'महानाट्य महोत्सव २०२५ मुख्य बॅनर',
      type: 'hero',
      sponsor: 'महाराष्ट्र पर्यटन विकास महामंडळ',
      status: 'active'
    },
    {
      id: 'ad-2',
      title: 'संस्कृती प्रायोजक बॅनर (Footer Sponsor)',
      type: 'footer_sponsor',
      sponsor: 'कला व क्रीडा संचालनालय',
      status: 'active'
    }
  ]);

  // Live scanner feed
  const [streamItems, setStreamItems] = useState([
    { id: '#TK-7892', status: 'valid', text: 'प्रवेश वैध', venue: 'बालगंधर्व रंगमंदिर, पुणे • गेट क्रमांक २', time: 'आत्ताच', seat: 'सीट F-14' },
    { id: '#TK-7840', status: 'alert', text: 'पुनरावृत्ती अलर्ट!', venue: 'प्रबोधनकार ठाकरे, बोरीवली • गेट क्रमांक ३', time: '२ सेकंद आधी', seat: 'दुपारी वापरले' },
    { id: '#TK-7889', status: 'valid', text: 'प्रवेश वैध', venue: 'यशवंतराव चव्हाण नाट्यगृह, कोथरूड • गेट १', time: '४ सेकंद आधी', seat: 'सीट B-08' }
  ]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = async () => {
    try {
      const [eventsRes, venuesRes, dashRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/venues'),
        fetch('/api/admin/dashboard'),
      ]);

      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        if (Array.isArray(evData.events) && evData.events.length > 0) {
          setEventsList(evData.events);
        }
      }

      if (venuesRes.ok) {
        const vnData = await venuesRes.json();
        if (Array.isArray(vnData.venues) && vnData.venues.length > 0) {
          setVenuesList(vnData.venues);
          setVenueForDesigner(vnData.venues[0]);
        }
      }

      if (dashRes.ok) {
        const dbData = await dashRes.json();
        setDashboardData(dbData);
        if (Array.isArray(dbData.recentScans) && dbData.recentScans.length > 0) {
          setStreamItems(
            dbData.recentScans.map((s: any) => ({
              id: s.ticketCode || `#TK-${s.id}`,
              status: s.scanResult === 'SUCCESS' ? 'valid' : 'alert',
              text: s.scanResult === 'SUCCESS' ? 'प्रवेश वैध' : 'पुनरावृत्ती अलर्ट!',
              venue: s.gateName || 'गेट १',
              time: new Date(s.scannedAt).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' }),
              seat: s.ticketCode || '',
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Non-blocking admin data fetch error:', err);
    }
  };

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const pendingEvent = eventsList.find(e => e.status === 'submitted' || e.status === 'draft') || eventsList[0];

  const handleApprove = async () => {
    if (!pendingEvent) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pendingEvent.id,
          status: 'published',
          actorId: currentUser?.email || 'admin',
        }),
      });
      if (res.ok) {
        setApprovalDecision('approved');
        triggerToast(`✓ "${pendingEvent.titleMr || pendingEvent.title}" अधिकृतपणे मंजूर झाला व विक्री सुरू झाली!`);
        fetchAllData();
      } else {
        triggerToast('मंजूर करताना त्रुटी आली');
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!pendingEvent) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pendingEvent.id,
          status: 'changes_requested',
          actorId: currentUser?.email || 'admin',
        }),
      });
      if (res.ok) {
        setApprovalDecision('changes');
        triggerToast(`सुधारणा नोटीस आयोजकांना पाठवली आहे.`);
        fetchAllData();
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!pendingEvent) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pendingEvent.id,
          status: 'rejected',
          actorId: currentUser?.email || 'admin',
        }),
      });
      if (res.ok) {
        setApprovalDecision('rejected');
        triggerToast('हा प्रयोग नाकारण्यात आला आहे.');
        fetchAllData();
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitleMr.trim()) return;

    setIsProcessing(true);
    try {
      const selectedVenue = venuesList.find(v => v.id === Number(eventVenueId)) || venuesList[0];
      const payload: any = {
        title: eventTitleEn.trim() || eventTitleMr.trim(),
        titleMr: eventTitleMr.trim(),
        category: eventCategory,
        venueId: selectedVenue ? selectedVenue.id : 1,
        organizerId: 1,
        description: eventDescriptionMr,
        descriptionMr: eventDescriptionMr,
        posterUrl: eventPosterUrl.trim() || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600',
        status: 'published',
        ticketPrice: eventBasePrice * 100,
        actorId: currentUser?.email || 'admin',
      };

      if (editingEvent) {
        payload.eventId = editingEvent.id;
        const res = await fetch('/api/admin/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          triggerToast('कार्यक्रम यशस्वीरित्या अद्ययावत केला!');
          fetchAllData();
        }
      } else {
        const res = await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          triggerToast('नवीन कार्यक्रम थेट जोडला गेला!');
          fetchAllData();
        }
      }
    } catch {
      triggerToast('कार्यक्रम सेव्ह करताना त्रुटी आली');
    } finally {
      setIsProcessing(false);
      setShowAddEventModal(false);
      setEditingEvent(null);
    }
  };

  const filteredEvents = eventsList.filter(ev => {
    const matchesQuery = ev.titleMr.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
      ev.title.toLowerCase().includes(searchEventQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || ev.category === filterCategory;
    return matchesQuery && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2B] font-sans pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#16A34A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Top System Pulse Strip */}
        <div className="bg-[#E9EDFF] rounded-2xl p-4 sm:p-5 shadow-sm border border-[#DCE2F7]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#16A34A]"></span>
              </span>
              <span className="text-xs font-bold text-[#A33900]">थेट नेटवर्क सुरू • v4.8 Admin</span>
            </div>
            <span className="text-[11px] text-[#64748B]">कल्पकृत इन्फोटेक सिस्टीम्स</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#141B2B] tracking-tight">
                महाटिकिट नियंत्रण केंद्र
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                महाराष्ट्र राज्य ऑपरेशन्स डॅशबोर्ड
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowLiveAlert(!showLiveAlert);
                  triggerToast('सर्व प्रेक्षकांना तात्काळ ब्रॉडकास्ट अलर्ट पाठवला!');
                }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#FFF7ED] text-[#A33900] active:scale-95 transition-transform shadow-sm hover:bg-[#FFEDD5]"
                title="अलर्ट ब्रॉडकास्ट"
              >
                <Megaphone className="w-5 h-5" />
              </button>

              <button
                onClick={() => triggerToast('दैनिक ऑपरेशन्स अहवाल (PDF/Excel) तयार होत आहे...')}
                className="h-10 px-4 flex items-center gap-1.5 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs active:scale-95 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>अहवाल</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Broadcast Toast Notification */}
        {showLiveAlert && (
          <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#832600]">
              <Megaphone className="w-4 h-4 text-[#A33900]" />
              <span>पुणे व मुंबई विभागासाठी तात्काळ नोटीफिकेशन पाठवले!</span>
            </div>
            <button
              onClick={() => setShowLiveAlert(false)}
              className="text-[#64748B] hover:text-[#141B2B]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sub-nav Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'governance'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            गव्हर्नन्स डॅशबोर्ड
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'events'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            कार्यक्रम व्यवस्थापन ({eventsList.length})
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'venues'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            नाट्यगृहे ({venuesList.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'ads'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            जाहिरात व्यवस्थापन
          </button>
        </div>

        {/* TAB 1: GOVERNANCE DASHBOARD */}
        {activeTab === 'governance' && (
          <div className="space-y-4">
            {/* Platform Metrics 2x2 Grid */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[#141B2B]">थेट प्लॅटफॉर्म मॅट्रिक्स</span>
                <span className="text-[11px] text-[#64748B]">प्रत्येक ३० सेकंदांनी ताजे</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Metric 1 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 text-[#64748B]">
                    <span className="text-xs font-medium">एकूण विक्री (Tickets Sold)</span>
                    <span className="text-base text-[#A33900]">🎫</span>
                  </div>
                  <div className="text-2xl font-black text-[#141B2B] tracking-tight">
                    {dashboardData?.kpis?.ticketsSold?.toLocaleString('en-IN') ?? '०'}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[#16A34A] text-xs font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>थेट डेटाबेस नोंद</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 text-[#64748B]">
                    <span className="text-xs font-medium">सक्रिय नाट्यगृहे</span>
                    <span className="text-base text-[#A33900]">🎭</span>
                  </div>
                  <div className="text-2xl font-black text-[#141B2B] tracking-tight">{venuesList.length}</div>
                  <div className="text-xs text-[#64748B] mt-1 font-medium">
                    महाराष्ट्र शहरे व तालुके
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 text-[#64748B]">
                    <span className="text-xs font-medium">नोंदणीकृत आयोजक</span>
                    <span className="text-base text-[#A33900]">👥</span>
                  </div>
                  <div className="text-2xl font-black text-[#141B2B] tracking-tight">
                    {dashboardData?.kpis?.totalOrganizers ?? 1}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[#16A34A] text-xs font-semibold">
                    <span>सत्यापित नाट्य संस्था</span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 text-[#64748B]">
                    <span className="text-xs font-medium">एकूण कार्यक्रम</span>
                    <span className="text-base text-[#A33900]">📋</span>
                  </div>
                  <div className="text-2xl font-black text-[#141B2B] tracking-tight">
                    {eventsList.length}
                  </div>
                  <div className="text-xs text-[#16A34A] font-semibold mt-1">
                    सक्रिय व प्रकाशित
                  </div>
                </div>
              </div>

              {/* Financial Revenue Banner */}
              <div className="bg-[#E9EDFF] rounded-2xl p-4 sm:p-5 shadow-sm border border-[#DCE2F7] mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#141B2B]">
                    <DollarSign className="w-4 h-4 text-[#A33900]" />
                    <span>एकूण महसूल प्रवाह (Revenue Stream)</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#A33900] font-bold">
                    थेट जमा
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#141B2B] tracking-tight">
                      {dashboardData?.kpis?.totalGmv ? `₹${(dashboardData.kpis.totalGmv / 100).toLocaleString('en-IN')}` : '₹०'}
                    </div>
                    <p className="text-[11px] text-[#64748B]">सकल व्यवहार मूल्य (Gross GMV)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-[#16A34A]">
                      {dashboardData?.kpis?.platformCommissionEarned ? `₹${(dashboardData.kpis.platformCommissionEarned / 100).toLocaleString('en-IN')}` : '₹०'}
                    </div>
                    <p className="text-[11px] text-[#64748B]">प्लॅटफॉर्म कमिशन</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Approval Queue Section */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-[#A33900]" />
                  <h3 className="text-base font-bold text-[#141B2B]">तातडीची तपासणी व मंजुरी</h3>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] font-bold">
                  {approvalDecision === 'pending' ? '१ प्रलंबित' : 'पूर्ण झाले'}
                </span>
              </div>

              {approvalDecision === 'pending' ? (
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#E2E8F0] space-y-3">
                  <div className="flex gap-3.5">
                    <img
                      src="https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400"
                      alt="कट्यार काळजात घुसली"
                      className="w-20 h-28 object-cover rounded-xl shadow-sm shrink-0 border border-[#E2E8F0]"
                    />
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFF7ED] text-[#A33900] font-bold">
                            मराठी संगीत नाटक
                          </span>
                          <span className="text-[10px] text-[#64748B]">पुणे केंद्र</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#141B2B] truncate">कट्यार काळजात घुसली</h4>
                        <p className="text-xs text-[#64748B]">सुवर्णमहोत्सवी विशेष प्रयोग</p>
                        <p className="text-xs text-[#A33900] font-medium mt-1">आयोजक: स्वरश्री इव्हेंट्स, पुणे</p>
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                        <span>🏛️ बालगंधर्व रंगमंदिर • २० मे, सायं. ५:००</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Checklist */}
                  <div className="bg-[#F1F3FF] rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                      कायदेशीर परवाने व दाखले:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#16A34A] shadow-xs font-semibold">
                        ✓ पोलीस परवाना संलग्न
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#16A34A] shadow-xs font-semibold">
                        ✓ करमणूक कर पावती संलग्न
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#16A34A] shadow-xs font-semibold">
                        ✓ नाट्यगृह बुकिंग पावती संलग्न
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                    <span>नोंदणी वेळ: आज, दुपारी १२:४२</span>
                    <span className="font-bold text-[#F59E0B]">अंतिम पुनरावलोकन प्रलंबित</span>
                  </div>

                  {/* Action CTA Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={handleApprove}
                      className="h-10 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>मंजूर करा</span>
                    </button>
                    <button
                      onClick={handleRequestChanges}
                      className="h-10 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#A33900] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <span>सुधारणा</span>
                    </button>
                    <button
                      onClick={handleReject}
                      className="h-10 rounded-xl bg-red-100 hover:bg-red-200 text-[#DC2626] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <span>नाकारा</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 text-center border border-[#E2E8F0]">
                  <p className="text-xs font-bold text-[#16A34A]">
                    ✓ सर्व प्रलंबित कार्यक्रम तपासणी पूर्ण झाली आहे!
                  </p>
                  <button
                    onClick={() => setApprovalDecision('pending')}
                    className="text-xs text-[#A33900] underline mt-1 font-semibold"
                  >
                    पुन्हा तपासा
                  </button>
                </div>
              )}
            </div>

            {/* Live Gate Scanner Stream */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-5 h-5 text-[#A33900]" />
                  <h3 className="text-base font-bold text-[#141B2B]">थेट गेट स्कॅनर प्रवाह</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse"></span>
                    सक्रिय स्कॅनर्स: १८
                  </span>
                  <button
                    onClick={() => setShowScannerModal(true)}
                    className="text-xs font-bold text-[#A33900] hover:underline"
                  >
                    कॅमेरा उघडा ➜
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#E2E8F0] space-y-2">
                {streamItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      item.status === 'valid' ? 'bg-[#F1F3FF]' : 'bg-red-50 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          item.status === 'valid'
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-[#DC2626] text-white'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#141B2B]">{item.id}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.status === 'valid'
                                ? 'bg-[#FFF7ED] text-[#16A34A]'
                                : 'bg-red-200 text-[#DC2626]'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B] truncate block">{item.venue}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#141B2B] block">{item.time}</span>
                      <div className="text-[11px] text-[#64748B]">{item.seat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maharashtra Venues Overview */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-5 h-5 text-[#A33900]" />
                  <h3 className="text-base font-bold text-[#141B2B]">नाट्यगृह व दालन व्यवस्थापन</h3>
                </div>
                <button
                  onClick={() => setActiveTab('venues')}
                  className="text-xs font-bold text-[#A33900] hover:underline"
                >
                  सर्व पहा ➜
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {venuesList.slice(0, 3).map(v => (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#E2E8F0] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] text-[#A33900] flex items-center justify-center font-bold text-lg shrink-0">
                        🏛️
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#141B2B] truncate">{v.nameMr}</h4>
                        <p className="text-[11px] text-[#64748B] truncate">{v.address}, {v.city}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-[#141B2B] font-semibold">
                            क्षमता: {v.totalCapacity} जागा
                          </span>
                          <span className="text-[10px] text-[#16A34A] font-bold">✓ लेआउट तयार</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setVenueForDesigner(v);
                        setShowSeatDesigner(true);
                      }}
                      className="h-9 px-3 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#A33900] flex items-center gap-1 text-xs font-bold shrink-0 transition"
                    >
                      <Armchair className="w-3.5 h-3.5" />
                      <span>लेआउट</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Operations Shield */}
            <div className="bg-[#E9EDFF] rounded-2xl p-4 shadow-sm border border-[#DCE2F7] mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
                <div>
                  <h4 className="text-xs font-bold text-[#141B2B]">आणीबाणी प्लॅटफॉर्म नियंत्रणे</h4>
                  <p className="text-[11px] text-[#64748B]">केवळ मुख्य प्रशासक व ऑपरेशन्स टीमसाठी सुरक्षित अ‍ॅक्सेस</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerToast('⚠️ तिकीट विक्री तात्पुरती स्थगित (Freeze) करण्यात आली.')}
                  className="py-2.5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  तिकीट विक्री थांबवा
                </button>
                <button
                  onClick={() => triggerToast('✓ सर्व गेट स्कॅनर टोकन्स रीसेट करण्यात आली.')}
                  className="py-2.5 rounded-xl bg-white text-[#141B2B] border border-[#E2E8F0] hover:bg-slate-50 font-bold text-xs shadow-sm transition active:scale-95"
                >
                  गेट लिंक रीसेट
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS MANAGEMENT */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#141B2B]">सर्व कार्यक्रम व्यवस्थापन</h3>
                <p className="text-xs text-[#64748B]">नवीन नाटके प्रकाशित करा किंवा तपशील संपादित करा</p>
              </div>

              <button
                onClick={() => {
                  setEditingEvent(null);
                  setEventTitleMr('');
                  setEventTitleEn('');
                  setEventDescriptionMr('');
                  setEventPosterUrl('');
                  setShowAddEventModal(true);
                }}
                className="bg-[#A33900] hover:bg-[#832600] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>नवीन कार्यक्रम जोडा</span>
              </button>
            </div>

            {/* Filter Search */}
            <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] flex gap-2">
              <input
                type="text"
                value={searchEventQuery}
                onChange={e => setSearchEventQuery(e.target.value)}
                placeholder="नाटकाचे नाव शोधा..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#A33900]"
              />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
              >
                <option value="all">सर्व श्रेणी</option>
                <option value="plays">नाटक</option>
                <option value="music">संगीत</option>
              </select>
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEvents.map(ev => (
                <div
                  key={ev.id}
                  className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex gap-3 hover:border-[#A33900]/40 transition"
                >
                  <img
                    src={ev.posterUrl}
                    alt={ev.titleMr}
                    className="w-16 h-24 object-cover rounded-xl shrink-0 border border-[#E2E8F0]"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFF7ED] text-[#A33900] font-bold">
                          {ev.category === 'plays' ? 'नाटक' : ev.category}
                        </span>
                        <span className="text-[10px] text-[#16A34A] font-bold">✓ Live</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#141B2B] mt-1 truncate">{ev.titleMr}</h4>
                      <p className="text-[11px] text-[#64748B] truncate">🏛️ {ev.venue?.nameMr || 'नाट्यगृह'}</p>
                      <p className="text-[11px] font-bold text-[#A33900] mt-0.5">
                        किमान: ₹{(ev.minPrice || 30000) / 100} • {ev.tag || 'हाऊसफुल्ल'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                      <button
                        onClick={() => {
                          setEditingEvent(ev);
                          setEventTitleMr(ev.titleMr);
                          setEventTitleEn(ev.title);
                          setEventCategory(ev.category);
                          setEventVenueId(ev.venueId);
                          setEventBasePrice((ev.minPrice || 30000) / 100);
                          setEventBadge(ev.tag || 'हाऊसफुल्ल');
                          setEventDescriptionMr(ev.descriptionMr || '');
                          setEventPosterUrl(ev.posterUrl || '');
                          setShowAddEventModal(true);
                        }}
                        className="text-xs font-bold text-[#A33900] hover:underline"
                      >
                        संपादित करा
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VENUES */}
        {activeTab === 'venues' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <h3 className="text-base font-bold text-[#141B2B]">नाट्यगृहे व आसन व्यवस्था (Venues & Layouts)</h3>
              <p className="text-xs text-[#64748B]">बालगंधर्व, यशवंतराव, प्रबोधनकार ठाकरे इत्यादींची आसन रचना बदला</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {venuesList.map(v => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏛️</span>
                      <div>
                        <h4 className="text-xs font-bold text-[#141B2B]">{v.nameMr}</h4>
                        <p className="text-[11px] text-[#64748B]">{v.city}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">{v.address}</p>
                    <div className="mt-2 text-xs font-bold text-[#141B2B]">
                      एकूण क्षमता: {v.totalCapacity} आसने
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setVenueForDesigner(v);
                      setShowSeatDesigner(true);
                    }}
                    className="mt-3 w-full py-2 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Armchair className="w-3.5 h-3.5" />
                    <span>सीट डिझायनर उघडा (Seat Builder)</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ADS */}
        {activeTab === 'ads' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#141B2B]">जाहिरात व्यवस्थापन (All Banners)</h3>
                <p className="text-xs text-[#64748B]">होम टॉप हिरो, मधला स्ट्रिप व फुटर स्पॉन्सर बॅनर्स</p>
              </div>
              <button
                onClick={() => triggerToast('जाहिरात जोडणी विंडो उघडली')}
                className="bg-[#A33900] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
              >
                + जाहिरात जोडा
              </button>
            </div>

            <div className="space-y-2">
              {adsList.map(ad => (
                <div
                  key={ad.id}
                  className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFF7ED] text-[#A33900] font-bold">
                      {ad.type}
                    </span>
                    <h4 className="text-xs font-bold text-[#141B2B] mt-1">{ad.title}</h4>
                    <p className="text-[11px] text-[#64748B]">प्रायोजक: {ad.sponsor}</p>
                  </div>
                  <span className="text-xs text-[#16A34A] font-bold">सक्रिय (Active)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seat Designer Modal */}
      {showSeatDesigner && venueForDesigner && (
        <TheatreSeatDesigner
          venueToEdit={venueForDesigner}
          onClose={() => setShowSeatDesigner(false)}
          onSaved={(_savedVenue: any) => {
            setShowSeatDesigner(false);
            triggerToast(`✓ ${venueForDesigner.nameMr} चा नवीन आसन लेआउट जतन केला!`);
          }}
        />
      )}

      {/* Gate Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 relative shadow-2xl">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-[#64748B]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#141B2B] mb-3">थेट गेट स्कॅनर</h3>
            <AdminScanner
              scannerUserId={currentUser?.id || 1}
              initialGateName="मुख्य प्रवेशद्वार (Gate 1)"
              onTicketVerified={(ticket) => {
                triggerToast(`तिकीट ${ticket?.code || ''} वैध ठरले!`);
                setStreamItems(prev => [
                  {
                    id: ticket?.code || '#TK-9999',
                    status: 'valid',
                    text: 'प्रवेश वैध',
                    venue: 'बालगंधर्व रंगमंदिर',
                    time: 'आत्ताच',
                    seat: ticket?.seat || 'A1'
                  },
                  ...prev
                ]);
              }}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
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
              {editingEvent ? 'कार्यक्रम संपादित करा' : 'नवीन कार्यक्रम जोडा'}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#141B2B] block mb-1">नाटकाचे मराठी नाव</label>
                <input
                  type="text"
                  value={eventTitleMr}
                  onChange={e => setEventTitleMr(e.target.value)}
                  placeholder="उदा. नियम व अटी लागू"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#A33900]"
                />
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">इंग्रजी नाव (English Title)</label>
                <input
                  type="text"
                  value={eventTitleEn}
                  onChange={e => setEventTitleEn(e.target.value)}
                  placeholder="उदा. Niyam Va Ati Laagu"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#A33900]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#141B2B] block mb-1">श्रेणी</label>
                  <select
                    value={eventCategory}
                    onChange={e => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                  >
                    <option value="plays">नाटक (Plays)</option>
                    <option value="music">संगीत (Music)</option>
                    <option value="comedy">स्टँडअप (Comedy)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#141B2B] block mb-1">किमान तिकीट दर (₹)</label>
                  <input
                    type="number"
                    value={eventBasePrice}
                    onChange={e => setEventBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">नाट्यगृह</label>
                <select
                  value={eventVenueId}
                  onChange={e => setEventVenueId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                >
                  {venuesList.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nameMr} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">पोस्टर इमेज URL</label>
                <input
                  type="text"
                  value={eventPosterUrl}
                  onChange={e => setEventPosterUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">नाट्य कथानक (वर्णन)</label>
                <textarea
                  rows={3}
                  value={eventDescriptionMr}
                  onChange={e => setEventDescriptionMr(e.target.value)}
                  placeholder="नाटकाविषयी माहिती लिहा..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-[#A33900] hover:bg-[#832600] text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
              >
                {isProcessing ? 'जतन करत आहे...' : 'जतन करा व प्रकाशित करा'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
