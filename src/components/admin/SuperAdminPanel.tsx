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
  DollarSign,
  UploadCloud,
  Check,
  Filter,
  Trash2,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { Language } from '../../lib/i18n.ts';
import { EventItem, VenueItem } from '../../lib/types.ts';
import { AdminScanner } from '../AdminScanner';
import { TheatreSeatDesigner } from './TheatreSeatDesigner';
import { RichDescriptionEditor } from './RichDescriptionEditor';
import { AdminEventDetailModal } from './AdminEventDetailModal';

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
  const [activeTab, setActiveTab] = useState<'governance' | 'events' | 'theatre_designer' | 'venues' | 'scanner' | 'ads' | 'sections'>('governance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLiveAlert, setShowLiveAlert] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCity, setBroadcastCity] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);
  const mr = language === 'mr';

  // Data states
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [venuesList, setVenuesList] = useState<VenueItem[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [isSavingSections, setIsSavingSections] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState<string | null>(null);
  const loadedTabsRef = React.useRef<Set<string>>(new Set());
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
  const [eventVenueId, setEventVenueId] = useState<number>(0);
  const [eventBasePrice, setEventBasePrice] = useState<number>(300);
  const [eventBadge, setEventBadge] = useState<string>('हाऊसफुल्ल');
  const [eventDescriptionMr, setEventDescriptionMr] = useState('');
  const [eventPosterUrl, setEventPosterUrl] = useState('');
  const [eventGalleryUrls, setEventGalleryUrls] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [venueSearchInForm, setVenueSearchInForm] = useState('');

  // Venue Master Directory Filters & Import State
  const [venueSearch, setVenueSearch] = useState('');
  const [venueDistrictFilter, setVenueDistrictFilter] = useState('');
  const [venueCityFilter, setVenueCityFilter] = useState('');
  const [venueStatusFilter, setVenueStatusFilter] = useState('all');
  const [venueLayoutFilter, setVenueLayoutFilter] = useState('all');
  const [venueMappedFilter, setVenueMappedFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [districtsCatalog, setDistrictsCatalog] = useState<any[]>([]);
  const [citiesCatalog, setCitiesCatalog] = useState<any[]>([]);

  // Bulk Venue Import State
  const [showImportVenueModal, setShowImportVenueModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreviewData, setImportPreviewData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Ad Banners — loaded from dashboard/API when available; empty = no fake showcase
  const [adsList, setAdsList] = useState<
    { id: string; title: string; type: string; sponsor: string; status: string }[]
  >([]);

  // Live scanner feed — real scans only (no hardcoded demo tickets)
  const [streamItems, setStreamItems] = useState<
    { id: string; status: string; text: string; venue: string; time: string; seat: string }[]
  >([]);

  const [isSalesFrozen, setIsSalesFrozen] = useState(false);

  const exportOperationsReport = () => {
    if (!eventsList.length) {
      triggerToast('कोणतेही कार्यक्रम उपलब्ध नाहीत');
      return;
    }
    const headers = ['EventID', 'TitleMr', 'TitleEn', 'Category', 'Status', 'Venue', 'SessionsCount'];
    const rows = eventsList.map((e) => [
      `"${e.id}"`,
      `"${(e.titleMr || '').replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      `"${e.status || ''}"`,
      `"${(e.venue?.nameMr || e.venue?.name || '').replace(/"/g, '""')}"`,
      `"${e.sessions?.length || 0}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mahaticket_operations_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ दैनिक ऑपरेशन्स अहवाल (CSV) यशस्वीरीत्या डाऊनलोड झाला!');
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const sendBroadcast = async () => {
    const title = broadcastTitle.trim();
    const message = broadcastMessage.trim();
    if (!title || !message) {
      triggerToast(mr ? 'शीर्षक व संदेश आवश्यक' : 'Title and message required');
      return;
    }
    setBroadcastSending(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          message,
          city: broadcastCity.trim() || null,
          active: 1,
          actorId: currentUser?.id ? String(currentUser.id) : 'admin',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        triggerToast(data.error || (mr ? 'ब्रॉडकास्ट अयशस्वी' : 'Broadcast failed'));
        return;
      }

      // Best-effort push — may no-op if Firebase not configured
      let pushNote = '';
      try {
        const pushRes = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'OFFER',
            title,
            body: message,
            dedupeKey: `broadcast:${data.announcement?.id || Date.now()}`,
            deepLink: 'mahaticket://home',
          }),
        });
        const pushData = await pushRes.json().catch(() => ({}));
        if (pushRes.ok && pushData.dispatchedCount > 0) {
          pushNote = mr
            ? ` • पुश: ${pushData.dispatchedCount}`
            : ` • push: ${pushData.dispatchedCount}`;
        } else if (pushRes.ok) {
          pushNote = mr ? ' • पुश: कॉन्फिगर नाही / ० डिव्हाइस' : ' • push: not configured / 0 devices';
        }
      } catch {
        pushNote = mr ? ' • पुश स्किप' : ' • push skipped';
      }

      setShowBroadcastModal(false);
      setShowLiveAlert(true);
      triggerToast(
        (mr ? 'जाहिरात सेव्ह झाली' : 'Announcement saved') + pushNote
      );
    } catch (e: any) {
      triggerToast(e?.message || (mr ? 'नेटवर्क त्रुटी' : 'Network error'));
    } finally {
      setBroadcastSending(false);
    }
  };

  const openEventEditor = (ev: EventItem) => {
    setEditingEvent(ev);
    setEventTitleMr(ev.titleMr);
    setEventTitleEn(ev.title);
    setEventCategory(ev.category);
    setEventVenueId(ev.venueId);
    setEventBasePrice((ev.minPrice || 30000) / 100);
    setEventBadge(ev.tag || 'हाऊसफुल्ल');
    setEventDescriptionMr(ev.descriptionMr || '');
    setEventPosterUrl(ev.posterUrl || '');
    try {
      const g =
        typeof (ev as any).galleryUrls === 'string'
          ? JSON.parse((ev as any).galleryUrls || '[]')
          : (ev as any).galleryUrls || [];
      setEventGalleryUrls(Array.isArray(g) ? g.filter(Boolean) : []);
    } catch {
      setEventGalleryUrls([]);
    }
    setVenueSearchInForm('');
    setImageUploadError(null);
    void fetchAllData();
    setShowAddEventModal(true);
  };

  const applyDashboardPayload = (dbData: any) => {
    setDashboardData(dbData);
    if (Array.isArray(dbData?.recentScans) && dbData.recentScans.length > 0) {
      setStreamItems(
        dbData.recentScans.map((s: any) => ({
          id: s.ticketCode || `#TK-${s.id}`,
          status: s.scanResult === 'SUCCESS' ? 'valid' : 'alert',
          text: s.scanResult === 'SUCCESS' ? 'प्रवेश वैध' : 'पुनरावृत्ती अलर्ट!',
          venue: s.gateName || 'गेट १',
          time: new Date(s.scannedAt).toLocaleTimeString('mr-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          seat: s.ticketCode || '',
        }))
      );
    }
  };

  /** Progressive load: KPIs first, then heavy lists in background / on tab open */
  const fetchDashboardFast = async () => {
    try {
      const dashRes = await fetch('/api/admin/dashboard', { credentials: 'include' });
      if (dashRes.ok) applyDashboardPayload(await dashRes.json());
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    }
  };

  const fetchEventsList = async (force = false) => {
    if (!force && loadedTabsRef.current.has('events') && eventsList.length > 0) return;
    setTabLoading('events');
    try {
      const eventsRes = await fetch('/api/admin/events', { credentials: 'include' });
      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        if (Array.isArray(evData.events)) setEventsList(evData.events);
        loadedTabsRef.current.add('events');
      }
    } catch (err) {
      console.warn('Events fetch error:', err);
    } finally {
      setTabLoading(null);
    }
  };

  const fetchVenuesBundle = async (force = false) => {
    if (!force && loadedTabsRef.current.has('venues') && venuesList.length > 0) return;
    setTabLoading('venues');
    try {
      const [venuesRes, distRes, cityRes] = await Promise.all([
        fetch('/api/admin/venues', { credentials: 'include' }),
        fetch('/api/locations/districts', { credentials: 'include' }),
        fetch('/api/locations/cities', { credentials: 'include' }),
      ]);
      if (venuesRes.ok) {
        const vnData = await venuesRes.json();
        if (Array.isArray(vnData.venues)) {
          setVenuesList(vnData.venues);
          setVenueForDesigner((prev) => prev || vnData.venues[0] || null);
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
      loadedTabsRef.current.add('venues');
    } catch (err) {
      console.warn('Venues fetch error:', err);
    } finally {
      setTabLoading(null);
    }
  };

  const fetchSectionsList = async (force = false) => {
    if (!force && loadedTabsRef.current.has('sections') && sectionsList.length > 0) return;
    setTabLoading('sections');
    try {
      const secRes = await fetch('/api/admin/sections', { credentials: 'include' });
      if (secRes.ok) {
        const secData = await secRes.json();
        if (Array.isArray(secData.sections)) setSectionsList(secData.sections);
        loadedTabsRef.current.add('sections');
      }
    } catch (err) {
      console.warn('Sections fetch error:', err);
    } finally {
      setTabLoading(null);
    }
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    loadedTabsRef.current.clear();
    try {
      await fetchDashboardFast();
      // Warm events in background (scanner + event tab need them)
      void Promise.all([fetchEventsList(true), fetchVenuesBundle(true), fetchSectionsList(true)]);
    } finally {
      setDataLoading(false);
    }
  };

  const openAdminTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'events' || tab === 'governance') void fetchEventsList();
    if (tab === 'venues') void fetchVenuesBundle();
    if (tab === 'sections') void fetchSectionsList();
  };

  const openVenueDesigner = async (venueLite: VenueItem | any) => {
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

  const handleToggleVenueVerification = async (venueId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const res = await fetch('/api/admin/venues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: venueId, verificationStatus: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✓ स्थिती बदलून "${nextStatus === 'verified' ? 'प्रमाणित (Verified)' : 'अपुष्ट (Unverified)'}" केली!`);
        fetchAllData();
      } else {
        triggerToast(data.error || 'स्थिती बदलताना त्रुटी आली.');
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    }
  };

  const handleDeleteVenue = async (venueId: number, venueName: string) => {
    if (!window.confirm(`तुम्हाला नक्की "${venueName}" हे नाट्यगृह हटवायचे आहे का?`)) return;
    try {
      const res = await fetch(`/api/admin/venues?id=${venueId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✓ "${venueName}" यशस्वीरीत्या हटवले.`);
        fetchAllData();
      } else {
        triggerToast(data.error || 'नाट्यगृह हटवता आले नाही.');
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    }
  };

  const handlePreviewImport = async () => {
    try {
      setImportError(null);
      setIsImporting(true);
      const parsed = JSON.parse(importJsonText);
      const venuesArr = Array.isArray(parsed) ? parsed : parsed.venues;
      if (!Array.isArray(venuesArr) || venuesArr.length === 0) {
        throw new Error('कृपया नाट्यगृहांची वैध JSON सूची (Array) प्रविष्ट करा.');
      }
      const res = await fetch('/api/admin/venues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', venues: venuesArr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पडताळणी अयशस्वी.');
      setImportPreviewData(data);
    } catch (err: any) {
      setImportError(err.message || 'JSON स्वरूप अवैध आहे.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImportError(null);
      setIsImporting(true);
      const parsed = JSON.parse(importJsonText);
      const venuesArr = Array.isArray(parsed) ? parsed : parsed.venues;
      const res = await fetch('/api/admin/venues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', venues: venuesArr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'आयात अयशस्वी.');
      triggerToast(`✓ ${data.importedCount} नाट्यगृहे यशस्वीरीत्या आयात झाली (पुनरावलोकनासाठी अपुष्ट)!`);
      setShowImportVenueModal(false);
      setImportJsonText('');
      setImportPreviewData(null);
      fetchAllData();
    } catch (err: any) {
      setImportError(err.message || 'आयात करताना त्रुटी आली.');
    } finally {
      setIsImporting(false);
    }
  };

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const updateSectionField = (index: number, field: string, value: any) => {
    setSectionsList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveSections = async () => {
    setIsSavingSections(true);
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionsList }),
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('✓ सर्व सेक्शन्स यशस्वीरित्या सेव्ह केले (Android व Web वर तात्काळ लागू)!');
        if (Array.isArray(data.sections)) setSectionsList(data.sections);
      } else {
        triggerToast(data.error || 'सेक्शन्स सेव्ह करताना त्रुटी आली');
      }
    } catch {
      triggerToast('नेटवर्क त्रुटी');
    } finally {
      setIsSavingSections(false);
    }
  };

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
    const reason =
      (typeof window !== 'undefined'
        ? window.prompt(
            'नाकारण्याचे कारण लिहा (Rejection reason):',
            'Incomplete event details / policy mismatch'
          )
        : null) || 'Rejected by admin';
    if (!String(reason).trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pendingEvent.id,
          status: 'rejected',
          rejectionReason: String(reason).trim().slice(0, 2000),
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

  const uploadEventImage = async (file: File, kind: 'cover' | 'gallery') => {
    setImageUploading(true);
    setImageUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      if (editingEvent?.id) fd.append('eventId', String(editingEvent.id));
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }
      if (kind === 'cover') {
        setEventPosterUrl(data.url);
      } else {
        setEventGalleryUrls((prev) => [...prev, data.url].slice(0, 12));
      }
      triggerToast(kind === 'cover' ? '✓ फीचर्ड पोस्टर अपलोड झाले' : '✓ गॅलरी इमेज अपलोड झाली');
    } catch (err: any) {
      setImageUploadError(err?.message || 'अपलोड अयशस्वी');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitleMr.trim()) return;
    if (!eventVenueId) {
      triggerToast('कृपया नाट्यगृह निवडा');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedVenue = venuesList.find(v => v.id === Number(eventVenueId));
      if (!selectedVenue) {
        triggerToast('वैध नाट्यगृह निवडा — ड्रॉपडाउन रिफ्रेश करा');
        setIsProcessing(false);
        return;
      }
      const payload: any = {
        title: eventTitleEn.trim() || eventTitleMr.trim(),
        titleMr: eventTitleMr.trim(),
        category: eventCategory,
        venueId: selectedVenue.id,
        organizerId: 1,
        description: eventDescriptionMr,
        descriptionMr: eventDescriptionMr,
        posterUrl: eventPosterUrl.trim() || '',
        galleryUrls: eventGalleryUrls,
        status: 'published',
        ticketPrice: eventBasePrice * 100,
        tag: eventBadge || null,
        actorId: currentUser?.email || 'admin',
      };
      if (!payload.posterUrl) {
        triggerToast('फीचर्ड पोस्टर अपलोड करा किंवा URL भरा');
        setIsProcessing(false);
        return;
      }

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

  const handleDeleteEvent = async (eventId: number, titleMr: string) => {
    if (!window.confirm(`खरोखर '${titleMr}' कार्यक्रम प्रणालीतून हटवायचा आहे का?`)) return;
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/events?id=${eventId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        triggerToast('कार्यक्रम यशस्वीरित्या हटवला गेला!');
        fetchAllData();
      } else {
        triggerToast('कार्यक्रम हटवताना त्रुटी आली.');
      }
    } catch {
      triggerToast('कार्यक्रम हटवताना त्रुटी आली.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEventStatus = async (ev: any) => {
    const nextStatus = ev.status === 'published' ? 'unpublished' : 'published';
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: ev.id,
          status: nextStatus,
          actorId: currentUser?.email || 'admin',
        }),
      });
      if (res.ok) {
        triggerToast(nextStatus === 'published' ? 'कार्यक्रम प्रकाशित केला!' : 'कार्यक्रम अप्रकाशित केला!');
        fetchAllData();
      }
    } catch {
      triggerToast('स्थिती बदलताना त्रुटी आली.');
    } finally {
      setIsProcessing(false);
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

      {viewingEvent && (
        <AdminEventDetailModal
          event={viewingEvent as any}
          language={language}
          onClose={() => setViewingEvent(null)}
          onEdit={() => {
            const ev = viewingEvent;
            setViewingEvent(null);
            openEventEditor(ev);
          }}
        />
      )}

      {showBroadcastModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-3">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(false)}
              className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-black text-[#141B2B] pr-8">
              {mr ? 'ब्रॉडकास्ट जाहिरात' : 'Broadcast announcement'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {mr
                ? 'डेमो नाही — जाहिरात announcements टेबलमध्ये सेव्ह होते. पुश फक्त Firebase कॉन्फिगर असेल तर.'
                : 'Not a demo toast — saves to announcements table. Push only if Firebase is configured.'}
            </p>
            <label className="block text-xs font-bold text-slate-700">
              {mr ? 'शीर्षक' : 'Title'}
              <input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              {mr ? 'संदेश' : 'Message'}
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              {mr ? 'शहर (पर्यायी — रिकामे = सर्व)' : 'City (optional — empty = all)'}
              <input
                value={broadcastCity}
                onChange={(e) => setBroadcastCity(e.target.value)}
                placeholder="Pune"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={broadcastSending}
              onClick={() => void sendBroadcast()}
              className="w-full py-2.5 rounded-xl bg-[#A33900] text-white text-xs font-bold disabled:opacity-50"
            >
              {broadcastSending
                ? mr
                  ? 'पाठवत आहे…'
                  : 'Sending…'
                : mr
                  ? 'जाहिरात सेव्ह / पाठवा'
                  : 'Save / send announcement'}
            </button>
          </div>
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
                type="button"
                onClick={() => {
                  setBroadcastTitle(mr ? 'महाटिकिट अपडेट' : 'MahaTicket update');
                  setBroadcastMessage('');
                  setBroadcastCity('');
                  setShowBroadcastModal(true);
                }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#FFF7ED] text-[#A33900] active:scale-95 transition-transform shadow-sm hover:bg-[#FFEDD5]"
                title={mr ? 'ब्रॉडकास्ट / जाहिरात' : 'Broadcast announcement'}
              >
                <Megaphone className="w-5 h-5" />
              </button>

              <button
                onClick={exportOperationsReport}
                className="h-10 px-4 flex items-center gap-1.5 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs active:scale-95 transition-all shadow-sm"
                title="दैनिक अहवाल CSV डाऊनलोड"
              >
                <Download className="w-4 h-4" />
                <span>{mr ? 'अहवाल' : 'Report'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real broadcast confirmation (only after API success) */}
        {showLiveAlert && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <Megaphone className="w-4 h-4 text-emerald-700" />
              <span>
                {mr
                  ? 'जाहिरात DB मध्ये सेव्ह झाली (अॅप होम अॅनाउन्समेंट).'
                  : 'Announcement saved to DB (app home announcements).'}
              </span>
            </div>
            <button
              type="button"
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
            onClick={() => openAdminTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'governance'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            {mr ? 'गव्हर्नन्स डॅशबोर्ड' : 'Governance'}
          </button>
          <button
            onClick={() => openAdminTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'events'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            {mr ? 'कार्यक्रम व्यवस्थापन' : 'Events'} ({eventsList.length})
          </button>
          <button
            onClick={() => openAdminTab('venues')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'venues'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            {mr ? 'नाट्यगृहे' : 'Theatres'} ({venuesList.length})
          </button>
          <button
            onClick={() => openAdminTab('ads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'ads'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            {mr ? 'जाहिरात व्यवस्थापन' : 'Ads'}
          </button>
          <button
            onClick={() => openAdminTab('sections')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'sections'
                ? 'bg-[#A33900] text-white shadow-sm'
                : 'bg-white text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            <span>{mr ? 'सेक्शन्स कस्टमायझेशन' : 'Home sections'}</span>
            <span className="text-[10px] bg-orange-100 text-[#A33900] px-1.5 py-0.2 rounded-full font-extrabold">
              {sectionsList.length || 9}
            </span>
          </button>
        </div>

        {(dataLoading || tabLoading) && (
          <div className="rounded-xl border border-orange-100 bg-orange-50/80 px-3 py-2 text-[11px] font-semibold text-[#A33900] flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-[#A33900] border-t-transparent rounded-full animate-spin" />
            {dataLoading
              ? mr
                ? 'डॅशबोर्ड DB मधून लोड होत आहे…'
                : 'Loading dashboard from DB…'
              : mr
                ? `${tabLoading} लोड होत आहे…`
                : `Loading ${tabLoading}…`}
          </div>
        )}

        {/* TAB 1: GOVERNANCE DASHBOARD */}
        {activeTab === 'governance' && (
          <div className="space-y-4">
            {/* Platform Metrics 2x2 Grid */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[#141B2B]">
                  {mr ? 'थेट प्लॅटफॉर्म मॅट्रिक्स' : 'Live platform metrics'}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  {mr ? 'प्रत्येक ३० सेकंदांनी ताजे' : 'Refreshes every 30s'}
                </span>
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
                    लाइव्ह DB स्कॅन
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
                {streamItems.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center py-6 px-3">
                    अद्याप कोणतेही स्कॅन नाहीत — &quot;कॅमेरा उघडा&quot; वापरून खरे तिकीट पडताळा.
                  </p>
                )}
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
                        void openVenueDesigner(v);
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
                  onClick={() => {
                    const next = !isSalesFrozen;
                    setIsSalesFrozen(next);
                    triggerToast(next ? '⚠️ तिकीट विक्री तात्पुरती स्थगित (Frozen) करण्यात आली!' : '✓ तिकीट विक्री पूर्ववत सुरू करण्यात आली!');
                  }}
                  className={`py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition active:scale-95 ${
                    isSalesFrozen ? 'bg-[#16A34A] hover:bg-emerald-700' : 'bg-[#DC2626] hover:bg-red-700'
                  }`}
                >
                  {isSalesFrozen ? 'विक्री पूर्ववत सुरू करा' : 'तिकीट विक्री थांबवा'}
                </button>
                <button
                  onClick={() => triggerToast(`✓ नवीन गेट स्कॅनर टोकन तयार झाले: GATE-SEC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`)}
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
                  setEventGalleryUrls([]);
                  setEventVenueId(0);
                  setVenueSearchInForm('');
                  setImageUploadError(null);
                  void fetchAllData();
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingEvent(ev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingEvent(ev);
                    }
                  }}
                  className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex gap-3 hover:border-[#A33900]/40 transition cursor-pointer text-left"
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
                          {ev.category === 'plays'
                            ? mr
                              ? 'नाटक'
                              : 'Play'
                            : ev.category === 'movies'
                              ? mr
                                ? 'चित्रपट'
                                : 'Movie'
                              : ev.category === 'music'
                                ? mr
                                  ? 'संगीत'
                                  : 'Music'
                                : ev.category}
                        </span>
                        <div className="flex items-center gap-1">
                          {ev.tag && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C] font-bold border border-orange-200">
                              {ev.tag}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              ev.status === 'published'
                                ? 'bg-emerald-50 text-[#16A34A]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ev.status === 'published' ? '✓ Live' : 'अप्रकाशित'}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-[#141B2B] mt-1 truncate">
                        {mr ? ev.titleMr || ev.title : ev.title || ev.titleMr}
                      </h4>
                      <p className="text-[11px] text-[#64748B] truncate">
                        🏛️{' '}
                        {mr
                          ? ev.venue?.nameMr || ev.venue?.name || 'नाट्यगृह'
                          : ev.venue?.name || ev.venue?.nameMr || 'Theatre'}
                      </p>
                      <p className="text-[11px] font-bold text-[#A33900] mt-0.5">
                        {mr ? 'किमान' : 'From'}: ₹{(ev.minPrice || 30000) / 100} •{' '}
                        {mr ? 'बॅज' : 'Tag'}: {ev.tag || (mr ? 'सामान्य' : 'General')}
                      </p>
                    </div>

                    <div
                      className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleEventStatus(ev)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition ${
                          ev.status === 'published'
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {ev.status === 'published'
                          ? mr
                            ? 'अप्रकाशित करा'
                            : 'Unpublish'
                          : mr
                            ? 'प्रकाशित करा'
                            : 'Publish'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEventEditor(ev)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#A33900] hover:bg-orange-100 border border-orange-200 transition"
                      >
                        {mr ? 'संपादित करा' : 'Edit'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.titleMr)}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition"
                      >
                        {mr ? 'हटवा' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VENUES MASTER & SEATING TEMPLATES */}
        {activeTab === 'venues' && (
          <div className="space-y-4">
            {/* Top Overview & Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141B2B] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#A33900]" />
                  <span>महाराष्ट्र नाट्यगृह सूची व आसन व्यवस्था (Venues & Seating Layout Master)</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  सर्व ३६ जिल्हे, शहरे, तालुका नाट्यगृहे, आसन नकाशे व सत्यापन व्यवस्थापन
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowImportVenueModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-[#141B2B] font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#A33900]" />
                  <span>📥 बल्क आयात (Import)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVenueForDesigner({
                      id: undefined as any,
                      name: '',
                      nameMr: '',
                      city: 'Pune',
                      address: '',
                      totalCapacity: 500,
                      hasSeatLayout: 1,
                      isTemplate: 1,
                      verificationStatus: 'verified',
                      sections: [],
                    } as any);
                    setShowSeatDesigner(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ नवीन नाट्यगृह जोडा</span>
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
                <span className="text-[11px] text-[#64748B] font-medium block">एकूण नाट्यगृहे</span>
                <span className="text-lg font-black text-[#141B2B] font-mono mt-0.5 block">{venuesList.length}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
                <span className="text-[11px] text-[#16A34A] font-medium block">✓ अधिकृत प्रमाणित</span>
                <span className="text-lg font-black text-[#16A34A] font-mono mt-0.5 block">
                  {venuesList.filter((v: any) => (v.verificationStatus || 'verified') === 'verified').length}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
                <span className="text-[11px] text-amber-600 font-medium block">⏳ पुनरावलोकन प्रलंबित</span>
                <span className="text-lg font-black text-amber-600 font-mono mt-0.5 block">
                  {venuesList.filter((v: any) => v.verificationStatus === 'unverified').length}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
                <span className="text-[11px] text-blue-600 font-medium block">🎭 आसन नकाशे उपलब्ध</span>
                <span className="text-lg font-black text-blue-600 font-mono mt-0.5 block">
                  {venuesList.filter((v: any) => v.hasSeatLayout === 1).length}
                </span>
              </div>
            </div>

            {/* Advanced Filters Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-wrap items-center gap-2 text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="नाट्यगृह, शहर किंवा पत्ता शोधा..."
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#A33900]"
                />
              </div>

              {/* District Filter */}
              <select
                value={venueDistrictFilter}
                onChange={(e) => {
                  setVenueDistrictFilter(e.target.value);
                  setVenueCityFilter('');
                }}
                aria-label="जिल्हा निवडा"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none hover:border-[#A33900]"
              >
                <option value="">सर्व जिल्हे (All Districts)</option>
                <option value="unmapped">⚠ जिल्हा न जोडलेले (No district)</option>
                {districtsCatalog.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.nameMr} ({d.name})
                  </option>
                ))}
              </select>

              {/* City Filter */}
              <select
                value={venueCityFilter}
                onChange={(e) => setVenueCityFilter(e.target.value)}
                aria-label="शहर निवडा"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none hover:border-[#A33900]"
              >
                <option value="">सर्व शहरे (All Cities)</option>
                {citiesCatalog
                  .filter(
                    (c: any) =>
                      !venueDistrictFilter ||
                      venueDistrictFilter === 'unmapped' ||
                      String(c.districtId) === String(venueDistrictFilter)
                  )
                  .map((c: any) => (
                    <option key={c.id} value={c.name}>
                      {c.nameMr} ({c.name})
                    </option>
                  ))}
              </select>

              <select
                value={venueMappedFilter}
                onChange={(e) => setVenueMappedFilter(e.target.value as 'all' | 'mapped' | 'unmapped')}
                aria-label="Location mapping"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none hover:border-[#A33900]"
              >
                <option value="all">सर्व मॅपिंग</option>
                <option value="mapped">✓ District+City linked</option>
                <option value="unmapped">⚠ Missing city/district ID</option>
              </select>

              {/* Status Filter */}
              <select
                value={venueStatusFilter}
                onChange={(e) => setVenueStatusFilter(e.target.value)}
                aria-label="सत्यापन स्थिती"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none hover:border-[#A33900]"
              >
                <option value="all">सर्व स्थिती (All Status)</option>
                <option value="verified">✓ प्रमाणित (Verified)</option>
                <option value="unverified">⏳ अपुष्ट (Unverified)</option>
                <option value="draft">📝 ड्राफ्ट (Draft)</option>
              </select>

              {/* Layout Capability Filter */}
              <select
                value={venueLayoutFilter}
                onChange={(e) => setVenueLayoutFilter(e.target.value)}
                aria-label="आसन रचना"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none hover:border-[#A33900]"
              >
                <option value="all">सर्व आसन प्रकार</option>
                <option value="seated">💺 बैठक व्यवस्था (Seated Layout)</option>
                <option value="general">🎟️ सामान्य प्रवेश (General Admission)</option>
              </select>

              {(venueSearch ||
                venueDistrictFilter ||
                venueCityFilter ||
                venueStatusFilter !== 'all' ||
                venueLayoutFilter !== 'all' ||
                venueMappedFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setVenueSearch('');
                    setVenueDistrictFilter('');
                    setVenueCityFilter('');
                    setVenueStatusFilter('all');
                    setVenueLayoutFilter('all');
                    setVenueMappedFilter('all');
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="फिल्टर साफ करा"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#A33900]" />
                  <span className="text-[11px]">रीसेट</span>
                </button>
              )}
            </div>

            {/* Venues Grid */}
            {(() => {
              const displayList = venuesList.filter((v: any) => {
                const matchSearch =
                  !venueSearch ||
                  v.name?.toLowerCase().includes(venueSearch.toLowerCase()) ||
                  v.nameMr?.toLowerCase().includes(venueSearch.toLowerCase()) ||
                  v.city?.toLowerCase().includes(venueSearch.toLowerCase()) ||
                  v.address?.toLowerCase().includes(venueSearch.toLowerCase());

                const matchDistrict =
                  !venueDistrictFilter ||
                  String(v.districtId) === String(venueDistrictFilter);

                const matchCity =
                  !venueCityFilter ||
                  v.city?.toLowerCase() === venueCityFilter.toLowerCase();

                const matchStatus =
                  venueStatusFilter === 'all' ||
                  (v.verificationStatus || 'verified') === venueStatusFilter;

                const matchLayout =
                  venueLayoutFilter === 'all' ||
                  (venueLayoutFilter === 'seated' && v.hasSeatLayout === 1) ||
                  (venueLayoutFilter === 'general' && v.hasSeatLayout === 0);

                const isMapped = !!(v.districtId && v.cityId);
                const matchMapped =
                  venueMappedFilter === 'all' ||
                  (venueMappedFilter === 'mapped' && isMapped) ||
                  (venueMappedFilter === 'unmapped' && !isMapped);

                return (
                  matchSearch &&
                  (venueDistrictFilter === 'unmapped' ? !v.districtId : matchDistrict) &&
                  matchCity &&
                  matchStatus &&
                  matchLayout &&
                  matchMapped
                );
              });

              if (displayList.length === 0) {
                return (
                  <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] text-center space-y-2">
                    <span className="text-3xl">🏛️</span>
                    <h4 className="text-sm font-bold text-[#141B2B]">कोणतेही नाट्यगृह सापडले नाही</h4>
                    <p className="text-xs text-[#64748B]">
                      निवडलेल्या निकषांनुसार कोणतेही नाट्यगृह उपलब्ध नाही. कृपया फिल्टर बदला किंवा नवीन नाट्यगृह जोडा.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {displayList.map((v: any) => {
                    const isVerified = (v.verificationStatus || 'verified') === 'verified';
                    const hasLayout = v.hasSeatLayout === 1;
                    const sectionsCount =
                      Number(v.sectionsCount || 0) ||
                      (Array.isArray(v.sections) ? v.sections.length : 0);
                    const isMapped = !!(v.districtId && v.cityId);

                    return (
                      <div
                        key={v.id}
                        className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm hover:border-[#A33900]/40 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Header: Badges and ID */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-mono text-slate-400">#VN-{v.id}</span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {!isMapped ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  ⚠ Unmapped
                                </span>
                              ) : null}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                  isVerified
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isVerified ? '✓ प्रमाणित' : '⏳ अपुष्ट (Pending)'}
                              </span>
                              {hasLayout ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {sectionsCount > 0 ? `${sectionsCount} विभाग` : 'आसन नकाशा'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                                  जनरल
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Venue Name & Location */}
                          <div className="flex items-start gap-2.5">
                            <span className="text-2xl shrink-0 mt-0.5">🏛️</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#141B2B] leading-snug font-serif truncate">
                                {v.nameMr || v.name}
                              </h4>
                              {v.name && v.name !== v.nameMr && (
                                <p className="text-[11px] text-slate-500 truncate">{v.name}</p>
                              )}
                              <p className="text-[11px] font-medium text-[#A33900] mt-0.5">
                                📍 {v.city} {v.districtNameMr ? `(${v.districtNameMr} जिल्हा)` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Address & Capacity */}
                          <p className="text-xs text-[#64748B] mt-2.5 line-clamp-2">{v.address}</p>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>एकूण आसन क्षमता:</span>
                            <span className="font-mono text-[#141B2B]">{v.totalCapacity || 500} आसने</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                          <button
                            type="button"
                            onClick={() => void openVenueDesigner(v)}
                            className="w-full py-2 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <Armchair className="w-3.5 h-3.5" />
                            <span>सीट डिझायनर व नकाशा (Seat Builder)</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVenueVerification(v.id, v.verificationStatus || 'verified')}
                              className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                                isVerified
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isVerified ? 'अपुष्ट करा' : 'प्रमाणित करा'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVenue(v.id, v.nameMr || v.name)}
                              className="py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>हटवा</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                onClick={() =>
                  triggerToast('जाहिरात API लवकरच — सध्या showcase नाही; फक्त DB डेटा')
                }
                className="bg-[#A33900] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
              >
                + जाहिरात जोडा
              </button>
            </div>

            <div className="space-y-2">
              {adsList.length === 0 && (
                <div className="bg-white p-6 rounded-2xl border border-dashed border-[#E2E8F0] text-center">
                  <p className="text-xs text-[#64748B]">
                    कोणत्याही जाहिराती DB मध्ये नाहीत (डेमो बॅनर्स काढले). Admin CRUD जोडल्यावर येथे दिसतील.
                  </p>
                </div>
              )}
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

        {/* TAB: HOME SECTIONS CUSTOMIZATION */}
        {activeTab === 'sections' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Top Bar with Description and Save Button */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <h3 className="text-base font-extrabold text-[#141B2B]">
                    होम स्क्रीन सेक्शन्स कस्टमायझेशन (Web & Android)
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  येथून मुख्य पृष्ठावरील सर्व सेक्शन्सची शीर्षके, उपशीर्षके व बॅज थेट बदला. केलेले बदल तात्काळ वेबसाइट व अँड्रॉइड ॲपवर लागू होतील.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#64748B] hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रीफ्रेश</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSections}
                  disabled={isSavingSections}
                  className="px-5 py-2 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingSections ? 'जतन करत आहे...' : '✓ बदल सेव्ह करा (Save All)'}</span>
                </button>
              </div>
            </div>

            {/* Sections Cards Grid */}
            <div className="space-y-3">
              {sectionsList.map((sec, idx) => (
                <div
                  key={sec.sectionKey || idx}
                  className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
                    sec.isVisible === 1 || sec.isVisible === true
                      ? 'border-[#E2E8F0] shadow-xs'
                      : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-[#A33900] font-mono text-xs font-bold uppercase tracking-wider">
                        #{idx + 1} • {sec.sectionKey}
                      </span>
                      <span className="text-xs font-bold text-[#141B2B]">
                        {sec.titleMr || sec.titleEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sort Order */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-[#64748B]">क्रम (Order):</label>
                        <input
                          type="number"
                          value={sec.sortOrder ?? idx + 1}
                          onChange={(e) => updateSectionField(idx, 'sortOrder', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-xs font-bold border border-[#E2E8F0] rounded-lg text-center bg-white"
                        />
                      </div>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => updateSectionField(idx, 'isVisible', sec.isVisible ? 0 : 1)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          sec.isVisible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {sec.isVisible ? '✓ सुरू (Visible)' : '✕ लपवा (Hidden)'}
                      </button>
                    </div>
                  </div>

                  {/* Form fields: 2 columns (Marathi & English) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Marathi Column */}
                    <div className="space-y-2 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#A33900]">
                        <span>🚩 मराठी मजकूर (Marathi Text)</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          शीर्षक (Title):
                        </label>
                        <input
                          type="text"
                          value={sec.titleMr || ''}
                          onChange={(e) => updateSectionField(idx, 'titleMr', e.target.value)}
                          placeholder="उदा. या आठवड्यातील लोकप्रिय प्रयोग"
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-orange-200 bg-white text-[#141B2B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          उपशीर्षक (Subtitle):
                        </label>
                        <input
                          type="text"
                          value={sec.subtitleMr || ''}
                          onChange={(e) => updateSectionField(idx, 'subtitleMr', e.target.value)}
                          placeholder="उदा. रसिक प्रेक्षकांच्या पसंतीस उतरलेली नाटके"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-orange-200 bg-white text-[#141B2B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          बॅज / टॅग (Badge):
                        </label>
                        <input
                          type="text"
                          value={sec.badgeMr || ''}
                          onChange={(e) => updateSectionField(idx, 'badgeMr', e.target.value)}
                          placeholder="उदा. 🔥 लोकप्रिय ट्रेंडिंग"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-orange-200 bg-white text-[#141B2B]"
                        />
                      </div>
                    </div>

                    {/* English Column */}
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <span>🇬🇧 English Text</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          Title:
                        </label>
                        <input
                          type="text"
                          value={sec.titleEn || ''}
                          onChange={(e) => updateSectionField(idx, 'titleEn', e.target.value)}
                          placeholder="e.g. Trending Shows This Week"
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-[#141B2B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          Subtitle:
                        </label>
                        <input
                          type="text"
                          value={sec.subtitleEn || ''}
                          onChange={(e) => updateSectionField(idx, 'subtitleEn', e.target.value)}
                          placeholder="e.g. Top rated shows based on audience reviews"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-[#141B2B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5">
                          Badge:
                        </label>
                        <input
                          type="text"
                          value={sec.badgeEn || ''}
                          onChange={(e) => updateSectionField(idx, 'badgeEn', e.target.value)}
                          placeholder="e.g. POPULAR TRENDING"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-[#141B2B]"
                        />
                      </div>
                    </div>
                  </div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[96vh] overflow-hidden relative shadow-2xl flex flex-col">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute right-3 top-3 z-50 p-1.5 rounded-full bg-white/90 hover:bg-slate-100 text-[#64748B] shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminScanner
              scannerUserId={currentUser?.id || 1}
              events={eventsList as any}
              initialGateName="मुख्य प्रवेशद्वार (Gate 1)"
              onTicketVerified={(ticket) => {
                triggerToast(`तिकीट ${ticket?.code || ''} वैध ठरले!`);
                setStreamItems((prev) => [
                  {
                    id: ticket?.code || `TK-${Date.now()}`,
                    status: 'valid',
                    text: 'प्रवेश वैध',
                    venue: ticket?.venue || ticket?.event || '—',
                    time: 'आत्ताच',
                    seat: ticket?.seat || ticket?.seats || '—',
                  },
                  ...prev,
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
                <label className="font-bold text-[#141B2B] block mb-1">नाट्यगृह (DB)</label>
                <input
                  type="search"
                  value={venueSearchInForm}
                  onChange={(e) => setVenueSearchInForm(e.target.value)}
                  placeholder="नाट्यगृह / शहर शोधा…"
                  className="w-full px-3 py-2 mb-1.5 rounded-xl border border-[#E2E8F0]"
                />
                <select
                  value={eventVenueId || ''}
                  onChange={(e) => setEventVenueId(Number(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                >
                  <option value="">— नाट्यगृह निवडा —</option>
                  {venuesList
                    .filter((v) => {
                      const q = venueSearchInForm.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (v.nameMr || '').toLowerCase().includes(q) ||
                        (v.name || '').toLowerCase().includes(q) ||
                        (v.city || '').toLowerCase().includes(q) ||
                        (v.address || '').toLowerCase().includes(q)
                      );
                    })
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nameMr || v.name} — {v.city}
                        {v.address ? ` · ${v.address}` : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => void fetchAllData()}
                  className="mt-1 text-[11px] font-bold text-[#A33900] hover:underline"
                >
                  नाट्यगृह यादी रिफ्रेश करा
                </button>
              </div>

              <div>
                <label className="font-bold text-[#141B2B] block mb-1">इव्हेंट बॅज (Event Status Badge / Tag)</label>
                <div className="flex gap-2">
                  <select
                    value={eventBadge}
                    onChange={e => setEventBadge(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white font-medium"
                  >
                    <option value="लवकर भरत आहे">⚡ लवकर भरत आहे (Fast Filling)</option>
                    <option value="तिकिटे उपलब्ध">🟢 तिकिटे उपलब्ध (Tickets Open)</option>
                    <option value="हाऊसफुल्ल">🔴 हाऊसफुल्ल (Housefull)</option>
                    <option value="सुपरहिट">⭐ सुपरहिट (Blockbuster)</option>
                    <option value="नवीन प्रयोग">✨ नवीन प्रयोग (New Show)</option>
                    <option value="विशेष ऑफर">🏷️ विशेष ऑफर (Special Offer)</option>
                    <option value="प्रीमियर">🎭 प्रीमियर (Premiere)</option>
                    <option value="मर्यादित जागा">⏳ मर्यादित जागा (Few Seats Left)</option>
                    <option value="८५% भरले">🔥 ८५% भरले (85% Booked)</option>
                  </select>
                  <input
                    type="text"
                    value={eventBadge}
                    onChange={e => setEventBadge(e.target.value)}
                    placeholder="किंवा सानुकूल बॅज..."
                    className="w-1/3 px-3 py-2 rounded-xl border border-[#E2E8F0] font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[#141B2B] block">फीचर्ड पोस्टर (कार्ड / होम)</label>
                {eventPosterUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-50">
                    <img src={eventPosterUrl} alt="Featured poster" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEventPosterUrl('')}
                      className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                    >
                      काढा
                    </button>
                  </div>
                ) : null}
                <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-[#A33900]/50 bg-[#FFF7ED] text-[#A33900] font-bold cursor-pointer hover:bg-orange-50">
                  <UploadCloud className="w-4 h-4" />
                  {imageUploading ? 'अपलोड होत आहे…' : 'पोस्टर अपलोड करा'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadEventImage(f, 'cover');
                      e.target.value = '';
                    }}
                  />
                </label>
                <input
                  type="url"
                  value={eventPosterUrl}
                  onChange={(e) => setEventPosterUrl(e.target.value)}
                  placeholder="किंवा पोस्टर URL (पर्यायी)"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />

                <label className="font-bold text-[#141B2B] block pt-1">इव्हेंट गॅलरी (तपशील स्लाइडर)</label>
                {eventGalleryUrls.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {eventGalleryUrls.map((url) => (
                      <div key={url} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEventGalleryUrls((prev) => prev.filter((u) => u !== url))}
                          className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[9px] font-bold py-0.5"
                        >
                          काढा
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <label className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 font-bold cursor-pointer hover:bg-slate-50">
                  <Plus className="w-4 h-4" />
                  गॅलरी इमेज जोडा
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadEventImage(f, 'gallery');
                      e.target.value = '';
                    }}
                  />
                </label>
                {imageUploadError ? (
                  <p className="text-[11px] text-red-600 font-semibold">{imageUploadError}</p>
                ) : null}
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
      {/* Bulk Venue Import Modal */}
      {showImportVenueModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => {
                setShowImportVenueModal(false);
                setImportPreviewData(null);
                setImportError(null);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-[#64748B] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#A33900]">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#141B2B]">नाट्यगृह डेटा आयात व पडताळणी (Venue Import Master)</h3>
                <p className="text-xs text-[#64748B]">
                  आयात केलेले सर्व नाट्यगृहे पुनरावलोकनासाठी 'अपुष्ट' (Unverified) म्हणून चिन्हांकित केली जातात
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{importError}</span>
              </div>
            )}

            {!importPreviewData ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#141B2B]">नाट्यगृह JSON डेटा (Paste Venue Array)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = [
                          {
                            name: 'Acharya Atre Rangmandir',
                            nameMr: 'आचार्य अत्रे रंगमंदिर',
                            address: 'Subhash Road, Kalyan West',
                            city: 'Kalyan-Dombivli',
                            totalCapacity: 650,
                            ownershipType: 'municipal'
                          },
                          {
                            name: 'Kashinath Ghanekar Natyagruha',
                            nameMr: 'डॉ. काशिनाथ घाणेकर नाट्यगृह',
                            address: 'Ghodbunder Road, Thane West',
                            city: 'Thane',
                            totalCapacity: 1200,
                            ownershipType: 'municipal'
                          }
                        ];
                        setImportJsonText(JSON.stringify(sample, null, 2));
                      }}
                      className="text-[11px] font-bold text-[#A33900] hover:underline cursor-pointer"
                    >
                      + नमुना फॉरमॅट भरा (Sample)
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='[&#10;  {&#10;    "name": "Acharya Atre Rangmandir",&#10;    "nameMr": "आचार्य अत्रे रंगमंदिर",&#10;    "address": "Kalyan West",&#10;    "city": "Thane"&#10;  }&#10;]'
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#A33900] bg-slate-50"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold">🛡️ डुप्लिकेट संरक्षण व पूर्वावलोकन नियम:</p>
                  <p>१. आयात करण्यापूर्वी सिस्टीम विद्यमान नावांची व शहरांची तपासणी करते.</p>
                  <p>२. सर्व आयात डेटा सुरुवातीला 'अपुष्ट' (Unverified) राहतो, जो ॲडमिनने प्रमाणित केल्यावरच लाइव्ह होतो.</p>
                </div>

                <button
                  type="button"
                  disabled={isImporting || !importJsonText.trim()}
                  onClick={handlePreviewImport}
                  className="w-full py-2.5 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold text-xs transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{isImporting ? 'तपासणी करत आहे...' : 'पूर्वावलोकन व डुप्लिकेट तपासणी करा (Preview & Validate)'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Summary Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-slate-500 font-medium block text-[10px]">एकूण नोंदी</span>
                    <span className="text-base font-bold text-slate-800 font-mono">{importPreviewData.summary?.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-emerald-600 font-medium block text-[10px]">✓ वैध (Valid)</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">{importPreviewData.summary?.valid}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-amber-600 font-medium block text-[10px]">⚠️ डुप्लिकेट (Duplicate)</span>
                    <span className="text-base font-bold text-amber-700 font-mono">{importPreviewData.summary?.duplicates}</span>
                  </div>
                </div>

                {/* Candidate Rows Breakdown */}
                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {importPreviewData.results?.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        res.status === 'valid'
                          ? 'bg-white border-emerald-200'
                          : 'bg-amber-50/70 border-amber-200'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-[#141B2B]">{res.candidate?.nameMr || res.candidate?.name}</span>
                        <span className="text-slate-500 text-[11px] ml-1">({res.candidate?.city})</span>
                        <p className="text-[10px] text-slate-400 truncate">{res.candidate?.address}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          res.status === 'valid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {res.status === 'valid' ? '✓ आयात योग्य' : res.reason}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setImportPreviewData(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                  >
                    मागे जा व संपादित करा
                  </button>

                  <button
                    type="button"
                    disabled={isImporting || importPreviewData.summary?.valid === 0}
                    onClick={handleConfirmImport}
                    className="flex-1 py-2 rounded-xl bg-[#A33900] hover:bg-[#832600] text-white font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isImporting ? 'आयात करत आहे...' : `आयात पुष्टी करा (${importPreviewData.summary?.valid} नाट्यगृहे)`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
