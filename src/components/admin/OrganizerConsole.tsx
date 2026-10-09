'use client';

import React, { useState } from 'react';
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
  Repeat
} from 'lucide-react';
import { Language } from '../../lib/i18n.ts';
import { STITCH_EVENTS, STITCH_VENUES } from '../../lib/stitch-data.ts';
import { EventItem, VenueItem } from '../../lib/types.ts';
import { AdminScanner } from '../AdminScanner';
import { TheatreSeatDesigner } from './TheatreSeatDesigner';

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
  const [venueForDesigner, setVenueForDesigner] = useState<VenueItem>(STITCH_VENUES[0]);

  // Form states for new event
  const [eventTitleMr, setEventTitleMr] = useState('');
  const [eventTitleEn, setEventTitleEn] = useState('');
  const [eventCategory, setEventCategory] = useState('plays');
  const [eventBasePrice, setEventBasePrice] = useState<number>(300);
  const [eventVenueId, setEventVenueId] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Live booking transactions
  const [liveBookings, setLiveBookings] = useState([
    {
      initial: 'सु',
      name: 'सुहास कुलकर्णी',
      seats: '२ जागा',
      details: 'नियम व अटी लागू • स्टॉल A-१२, A-१३',
      amount: '+₹८००',
      time: '२ मि. पूर्वी'
    },
    {
      initial: 'प्र',
      name: 'प्रिया देसाई',
      seats: '४ जागा',
      details: 'अलबत्या गलबत्या • बाल्कनी B-०४-०७',
      amount: '+₹१,२००',
      time: '५ मि. पूर्वी'
    },
    {
      initial: 'आ',
      name: 'आनंद जोशी',
      seats: '१ जागा',
      details: 'नियम व अटी लागू • बॉक्स सीट ०३',
      amount: '+₹६००',
      time: '८ मि. पूर्वी'
    }
  ]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitleMr.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowAddEventModal(false);
      triggerToast(`✓ "${eventTitleMr}" कार्यक्रम यशस्वीरित्या तयार झाला!`);
      setEventTitleMr('');
      setEventTitleEn('');
    }, 400);
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

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Producer Welcome & Status Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#FFDBCE] text-[#A33900] flex items-center justify-center font-bold text-xl shrink-0">
                🎭
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-[#141B2B] truncate leading-tight">
                  नमस्कार, महालक्ष्मी थिएटर्स
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse inline-block"></span>
                  <span className="text-xs text-[#16A34A] font-bold">थेट बुकिंग सुरू आहे • Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => triggerToast('नाट्य संस्था स्विच केली')}
              className="w-9 h-9 rounded-xl bg-[#E1E8FD] text-[#141B2B] flex items-center justify-center hover:bg-[#DCE2F7] active:scale-95 transition shrink-0"
              title="संस्था बदला"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Festival Window Banner */}
          <div className="bg-[#FFF7ED] rounded-xl p-3 mt-3 flex items-center justify-between border border-[#FFEDD5]">
            <div className="flex items-center gap-2">
              <span className="text-base text-[#AC3400]">📢</span>
              <span className="text-xs font-bold text-[#AC3400]">
                पुणे नाट्य महोत्सव विशेष विंडो सुरू आहे
              </span>
            </div>
            <span className="text-xs font-extrabold text-[#A33900]">थेट आकडेवारी</span>
          </div>
        </div>

        {/* Key Business KPI Metrics (2x2 Grid) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-base font-bold text-[#141B2B]">आजचे मुख्य निर्देशक</h3>
            <span className="text-[11px] text-[#64748B]">ताजे अपडेट: आत्ताच</span>
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
                <div className="text-2xl font-black text-[#141B2B] leading-tight">₹२,८४,५००</div>
                <div className="flex items-center gap-1 mt-1 text-[#16A34A] text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+१४% या आठवड्यात</span>
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
                <div className="text-2xl font-black text-[#141B2B] leading-tight">१,४२०</div>
                <div className="text-xs text-[#64748B] mt-1 font-semibold flex items-center gap-1">
                  <span className="text-[#16A34A]">●</span> ९२% सरासरी ऑक्युपन्सी
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
                <div className="text-2xl font-black text-[#141B2B] leading-tight">०४ शोज</div>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">बालगंधर्व व यशवंतराव</p>
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
                <div className="text-2xl font-black text-[#141B2B] leading-tight">₹४,५०,०००</div>
                <p className="text-[11px] text-[#A33900] font-bold mt-1">पुढील पेआउट: मंगळवार</p>
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
              onClick={() => triggerToast('शोज यादी फिल्टर केली')}
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
                setVenueForDesigner(STITCH_VENUES[0]);
                setShowSeatDesigner(true);
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
                  onClick={() => triggerToast('"नियम व अटी लागू" चा लाइव्ह तपशील उघडला')}
                  className="bg-[#FFF7ED] text-[#A33900] px-3.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1"
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
                    setVenueForDesigner(STITCH_VENUES[1]);
                    setShowSeatDesigner(true);
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
              <p className="text-xs text-[#64748B]">रात्रीचा शो: 'नियम व अटी लागू'</p>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
          </div>

          <div className="flex items-center gap-5 py-2">
            {/* Circular Progress Wheel Inline SVG */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-[#A33900]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="78, 100"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#141B2B] leading-none">७८%</span>
                <span className="text-[10px] text-[#64748B] mt-0.5">दाखल</span>
              </div>
            </div>

            {/* Progress Text Details */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-[#141B2B] block">४८४ / ६२० प्रेक्षक</span>
              <span className="text-xs text-[#64748B] block mt-0.5">सभागृहात दाखल झाले आहेत</span>
              <div className="mt-2">
                <span className="text-xs bg-[#FFF7ED] text-[#A33900] font-bold px-2 py-0.5 rounded-lg">
                  १३६ अजून येणे बाकी
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown by Gates */}
          <div className="grid grid-cols-3 gap-2 mt-4 bg-[#F1F3FF] rounded-xl p-3 text-center">
            <div>
              <span className="text-[11px] text-[#64748B] block">गेट १ (ऑडिटोरियम)</span>
              <span className="text-sm font-bold text-[#141B2B] mt-0.5 block">३१२</span>
              <span className="text-[10px] text-[#16A34A] font-semibold">६४% वाटा</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">गेट २ (बाल्कनी)</span>
              <span className="text-sm font-bold text-[#141B2B] mt-0.5 block">१७२</span>
              <span className="text-[10px] text-[#16A34A] font-semibold">३६% वाटा</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">बाकी प्रेक्षक</span>
              <span className="text-sm font-bold text-[#AC3400] mt-0.5 block">१३६</span>
              <span className="text-[10px] text-[#A33900] font-semibold">प्रतिक्षित</span>
            </div>
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
              onClick={() => triggerToast('सर्व व्यवहारांचा इतिहास लोड केला')}
              className="text-xs font-bold text-[#A33900]"
            >
              सर्व व्यवहार
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
                    <option value="comedy">हास्य (Comedy)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#141B2B] block mb-1">तिकीट दर पासून (₹)</label>
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
                  {STITCH_VENUES.map(v => (
                    <option key={v.id} value={v.id}>{v.nameMr} ({v.city})</option>
                  ))}
                </select>
              </div>

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

      {/* Seat Designer Modal */}
      {showSeatDesigner && (
        <TheatreSeatDesigner
          venueToEdit={venueForDesigner}
          onClose={() => setShowSeatDesigner(false)}
          onSaved={() => {
            setShowSeatDesigner(false);
            triggerToast('✓ आसन रचना व दर जतन करण्यात आले!');
          }}
        />
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
              initialGateName="गेट २ (बाल्कनी)"
              onTicketVerified={(ticket) => {
                triggerToast(`तिकीट ${ticket?.code || ''} स्कॅन पूर्ण!`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
