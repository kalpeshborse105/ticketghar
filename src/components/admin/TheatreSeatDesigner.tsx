'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Armchair,
  Eye,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Accessibility,
  ArrowDown,
  Building2,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface SeatItemConfig {
  seatNumber: number;
  seatCode?: string;
  tier: 'platinum' | 'gold' | 'silver' | 'standard';
  isAccessible: number;
  isBlocked: number;
}

export interface RowConfig {
  rowLabel: string;
  aisleAfter: number[]; // e.g. [4, 12] for gaps after seat 4 and seat 12
  seats: SeatItemConfig[];
}

export interface SectionConfig {
  id?: number;
  name: string;
  nameMr: string;
  basePrice: number; // in rupees
  tier: 'platinum' | 'gold' | 'silver' | 'standard';
  rows: RowConfig[];
}

interface TheatreSeatDesignerProps {
  venueToEdit?: any | null;
  onClose: () => void;
  onSaved: (venue: any) => void;
}

const MAHARASHTRA_CITIES = [
  'Pune',
  'Mumbai',
  'Thane',
  'Nashik',
  'Kolhapur',
  'Nagpur',
  'Chhatrapati Sambhajinagar',
  'Solapur',
  'Satara',
  'Sangli',
  'Ratnagiri',
  'Navi Mumbai',
];

export const TheatreSeatDesigner: React.FC<TheatreSeatDesignerProps> = ({
  venueToEdit,
  onClose,
  onSaved,
}) => {
  // Venue details
  const [venueName, setVenueName] = useState(venueToEdit?.name || '');
  const [venueNameMr, setVenueNameMr] = useState(venueToEdit?.nameMr || '');
  const [city, setCity] = useState(venueToEdit?.city || 'Pune');
  const [address, setAddress] = useState(venueToEdit?.address || '');

  // Active section index
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  // Sections configuration
  const [sections, setSections] = useState<SectionConfig[]>(() => {
    if (venueToEdit?.sections && Array.isArray(venueToEdit.sections) && venueToEdit.sections.length > 0) {
      return venueToEdit.sections.map((s: any) => ({
        id: s.id,
        name: s.name,
        nameMr: s.nameMr,
        basePrice: Math.round((s.basePrice || 35000) / 100),
        tier: 'gold',
        rows: Array.from({ length: s.rowsCount || 4 }).map((_, rIdx) => {
          const letter = String.fromCharCode(65 + rIdx);
          const cols = s.colsCount || 8;
          return {
            rowLabel: letter,
            aisleAfter: [Math.floor(cols / 2)],
            seats: Array.from({ length: cols }).map((_, cIdx) => ({
              seatNumber: cIdx + 1,
              tier: 'gold',
              isAccessible: rIdx === 0 && cIdx === 0 ? 1 : 0,
              isBlocked: 0,
            })),
          };
        }),
      }));
    }

    // Default: Realistic multi-section theatre (Stall & Balcony)
    return [
      {
        name: 'Stall / Orchestra',
        nameMr: 'मुख्य स्टॉल',
        basePrice: 350,
        tier: 'gold',
        rows: ['A', 'B', 'C', 'D', 'E', 'F'].map((label, rIdx) => ({
          rowLabel: label,
          aisleAfter: [4],
          seats: Array.from({ length: 8 }).map((_, cIdx) => ({
            seatNumber: cIdx + 1,
            tier: 'gold',
            isAccessible: rIdx === 0 && cIdx === 0 ? 1 : 0,
            isBlocked: 0,
          })),
        })),
      },
      {
        name: 'Balcony',
        nameMr: 'बाल्कनी',
        basePrice: 500,
        tier: 'platinum',
        rows: ['A', 'B', 'C'].map((label) => ({
          rowLabel: label,
          aisleAfter: [4],
          seats: Array.from({ length: 8 }).map((_, cIdx) => ({
            seatNumber: cIdx + 1,
            tier: 'platinum',
            isAccessible: 0,
            isBlocked: 0,
          })),
        })),
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Stats calculation
  const totalSeats = sections.reduce(
    (acc, sec) => acc + sec.rows.reduce((rAcc, r) => rAcc + r.seats.length, 0),
    0
  );
  const blockedSeatsCount = sections.reduce(
    (acc, sec) =>
      acc +
      sec.rows.reduce(
        (rAcc, r) => rAcc + r.seats.filter((s) => s.isBlocked === 1).length,
        0
      ),
    0
  );
  const bookableSeatsCount = totalSeats - blockedSeatsCount;

  // Active section helper
  const currentSection = sections[activeSectionIdx] || sections[0];

  // SECTION ACTIONS
  const handleAddSection = () => {
    const newSec: SectionConfig = {
      name: `Section ${sections.length + 1}`,
      nameMr: `विभाग ${sections.length + 1}`,
      basePrice: 300,
      tier: 'standard',
      rows: ['A', 'B', 'C'].map((label) => ({
        rowLabel: label,
        aisleAfter: [4],
        seats: Array.from({ length: 8 }).map((_, cIdx) => ({
          seatNumber: cIdx + 1,
          tier: 'standard',
          isAccessible: 0,
          isBlocked: 0,
        })),
      })),
    };
    setSections([...sections, newSec]);
    setActiveSectionIdx(sections.length);
  };

  const handleDeleteSection = (idx: number) => {
    if (sections.length <= 1) {
      alert('कमीत कमी एक विभाग आवश्यक आहे (At least one section is required).');
      return;
    }
    const updated = sections.filter((_, i) => i !== idx);
    setSections(updated);
    setActiveSectionIdx(Math.max(0, idx - 1));
  };

  const updateCurrentSection = (patch: Partial<SectionConfig>) => {
    setSections((prev) =>
      prev.map((sec, i) => (i === activeSectionIdx ? { ...sec, ...patch } : sec))
    );
  };

  // ROW ACTIONS FOR CURRENT SECTION
  const handleAddRow = (namingType: 'alpha' | 'double_alpha' | 'numeric' | 'custom') => {
    if (!currentSection) return;

    let nextLabel = 'A';
    const rowCount = currentSection.rows.length;

    if (namingType === 'alpha') {
      nextLabel = String.fromCharCode(65 + (rowCount % 26));
    } else if (namingType === 'double_alpha') {
      const first = String.fromCharCode(65 + Math.floor(rowCount / 26));
      const second = String.fromCharCode(65 + (rowCount % 26));
      nextLabel = `${first}${second}`;
    } else if (namingType === 'numeric') {
      nextLabel = String(rowCount + 1);
    } else {
      nextLabel = `Row-${rowCount + 1}`;
    }

    const newRow: RowConfig = {
      rowLabel: nextLabel,
      aisleAfter: [4],
      seats: Array.from({ length: 8 }).map((_, cIdx) => ({
        seatNumber: cIdx + 1,
        tier: currentSection.tier,
        isAccessible: 0,
        isBlocked: 0,
      })),
    };

    updateCurrentSection({
      rows: [...currentSection.rows, newRow],
    });
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (!currentSection || currentSection.rows.length <= 1) {
      alert('विभागात किमान एक रांग असावी.');
      return;
    }
    const updatedRows = currentSection.rows.filter((_, i) => i !== rowIdx);
    updateCurrentSection({ rows: updatedRows });
  };

  const handleUpdateRowLabel = (rowIdx: number, newLabel: string) => {
    if (!currentSection) return;
    const updatedRows = currentSection.rows.map((row, i) =>
      i === rowIdx ? { ...row, rowLabel: newLabel.trim().toUpperCase() } : row
    );
    updateCurrentSection({ rows: updatedRows });
  };

  const handleUpdateSeatCount = (rowIdx: number, newCount: number) => {
    if (!currentSection || newCount < 1 || newCount > 40) return;
    const targetRow = currentSection.rows[rowIdx];
    let newSeats: SeatItemConfig[] = [];

    if (newCount > targetRow.seats.length) {
      // Add seats
      newSeats = [
        ...targetRow.seats,
        ...Array.from({ length: newCount - targetRow.seats.length }).map((_, i) => ({
          seatNumber: targetRow.seats.length + i + 1,
          tier: currentSection.tier,
          isAccessible: 0,
          isBlocked: 0,
        })),
      ];
    } else {
      // Trim seats
      newSeats = targetRow.seats.slice(0, newCount);
    }

    const updatedRows = currentSection.rows.map((row, i) =>
      i === rowIdx ? { ...row, seats: newSeats } : row
    );
    updateCurrentSection({ rows: updatedRows });
  };

  const handleToggleSeatProperty = (rowIdx: number, seatIdx: number) => {
    if (!currentSection) return;
    const targetRow = currentSection.rows[rowIdx];
    const targetSeat = targetRow.seats[seatIdx];

    // Cycle: normal -> blocked -> accessible -> normal
    let nextBlocked = 0;
    let nextAccessible = 0;

    if (targetSeat.isBlocked === 0 && targetSeat.isAccessible === 0) {
      nextBlocked = 1; // Mark blocked
    } else if (targetSeat.isBlocked === 1) {
      nextBlocked = 0;
      nextAccessible = 1; // Mark accessible
    } else {
      nextBlocked = 0;
      nextAccessible = 0; // Back to normal
    }

    const updatedSeats = targetRow.seats.map((s, i) =>
      i === seatIdx
        ? { ...s, isBlocked: nextBlocked, isAccessible: nextAccessible }
        : s
    );

    const updatedRows = currentSection.rows.map((row, i) =>
      i === rowIdx ? { ...row, seats: updatedSeats } : row
    );

    updateCurrentSection({ rows: updatedRows });
  };

  const handleToggleAisle = (rowIdx: number, afterSeatNum: number) => {
    if (!currentSection) return;
    const targetRow = currentSection.rows[rowIdx];
    const exists = targetRow.aisleAfter.includes(afterSeatNum);
    const updatedAisles = exists
      ? targetRow.aisleAfter.filter((n) => n !== afterSeatNum)
      : [...targetRow.aisleAfter, afterSeatNum].sort((a, b) => a - b);

    const updatedRows = currentSection.rows.map((row, i) =>
      i === rowIdx ? { ...row, aisleAfter: updatedAisles } : row
    );
    updateCurrentSection({ rows: updatedRows });
  };

  // Direct Seat Toggle from Live Preview (Section 7 & 8 Parity)
  const handleToggleSeatPropertyInSec = (secIdx: number, rowIdx: number, seatIdx: number) => {
    setSections((prev) =>
      prev.map((sec, sI) => {
        if (sI !== secIdx) return sec;
        const targetRow = sec.rows[rowIdx];
        const targetSeat = targetRow.seats[seatIdx];

        let nextBlocked = 0;
        let nextAccessible = 0;
        if (targetSeat.isBlocked === 0 && targetSeat.isAccessible === 0) {
          nextBlocked = 1; // Blocked
        } else if (targetSeat.isBlocked === 1) {
          nextBlocked = 0;
          nextAccessible = 1; // Accessible
        } else {
          nextBlocked = 0;
          nextAccessible = 0; // Normal
        }

        const updatedSeats = targetRow.seats.map((s, idx) =>
          idx === seatIdx ? { ...s, isBlocked: nextBlocked, isAccessible: nextAccessible } : s
        );

        return {
          ...sec,
          rows: sec.rows.map((r, rI) => (rI === rowIdx ? { ...r, seats: updatedSeats } : r)),
        };
      })
    );
  };

  // SAVE TO SUPABASE VIA ADMIN API (Double-Click Protected)
  const handleSaveVenueLayout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!venueName.trim() || !venueNameMr.trim() || !address.trim() || !city.trim()) {
      setSaveError('कृपया नाट्यगृहाचे नाव (इंग्रजी व मराठी), शहर आणि पत्ता प्रविष्ट करा.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload = {
        venueId: venueToEdit?.id || undefined,
        name: venueName.trim(),
        nameMr: venueNameMr.trim(),
        city: city.trim(),
        address: address.trim(),
        totalCapacity: totalSeats,
        hasSeatLayout: 1,
        customLayout: true,
        sections: sections.map((sec) => ({
          name: sec.name,
          nameMr: sec.nameMr,
          basePrice: sec.basePrice,
          tier: sec.tier,
          rows: sec.rows.map((r) => ({
            rowLabel: r.rowLabel,
            aisleAfter: r.aisleAfter,
            seats: r.seats.map((s) => ({
              seatNumber: s.seatNumber,
              seatCode: `${sec.name.slice(0, 3).toUpperCase()}-${r.rowLabel}-${s.seatNumber.toString().padStart(2, '0')}`,
              tier: s.tier || sec.tier,
              isAccessible: s.isAccessible,
              isBlocked: s.isBlocked,
            })),
          })),
        })),
      };

      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'नाट्यगृह आसन रचना जतन करण्यात अडचण आली.');
      }

      onSaved(data.venue || { ...payload, id: data.venueId || Date.now() });
      onClose();
    } catch (err: any) {
      console.error('Save venue error:', err);
      setSaveError(err.message || 'Error saving venue layout. Please retry.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-serif">
                  नाट्यगृह व आसन रचनाकार (Theatre Seat Designer)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {venueToEdit ? 'आसन नकाशा संपादन' : 'नवीन निर्मिती'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                लवचिक रांगा (A-Z, AA, 1-99), पॅसेज/गॅप्स, आरक्षित जागा आणि ग्राहक पूर्वावलोकन
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'editor'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>डिझायनर</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>थेट पूर्वावलोकन</span>
              </button>
            </div>

            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Overview Stats Bar */}
        <div className="px-6 py-2.5 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="text-slate-400">
              एकूण क्षमता: <strong className="text-white font-mono">{totalSeats}</strong> जागा
            </span>
            <span className="text-emerald-400">
              बुकिंग उपलब्ध: <strong className="font-mono">{bookableSeatsCount}</strong>
            </span>
            {blockedSeatsCount > 0 && (
              <span className="text-amber-400">
                आरक्षित/ब्लॉक: <strong className="font-mono">{blockedSeatsCount}</strong>
              </span>
            )}
            <span className="text-slate-400">
              विभाग: <strong className="text-white">{sections.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-400 inline-block" />
              <span>सामान्य</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-950 border border-red-500 inline-block" />
              <span>ब्लॉक (Lock)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-950 border border-blue-400 inline-block" />
              <span>दिव्यांग (Accessible)</span>
            </span>
          </div>
        </div>

        {/* Form Error Banner */}
        {saveError && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <form onSubmit={handleSaveVenueLayout} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: Auditorium Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>१. नाट्यगृह प्राथमिक तपशील (Auditorium Profile)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">नाट्यगृहाचे नाव (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bal Gandharva Ranga Mandir"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">मराठी नाव (Marathi) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. बालगंधर्व रंगमंदिर"
                  value={venueNameMr}
                  onChange={(e) => setVenueNameMr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">शहर (City) *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {MAHARASHTRA_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">पत्ता (Address) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. जंगली महाराज रोड, पुणे"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* TAB 1: DESIGNER MODE */}
          {activeTab === 'editor' ? (
            <div className="space-y-6">
              {/* Sections Selector & Add Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    २. आसन विभाग व्यवस्थापन (Auditorium Sections)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>नवीन विभाग जोडा (+ Add Section)</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sections.map((sec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSectionIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                        idx === activeSectionIdx
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>
                        {sec.nameMr} ({sec.name})
                      </span>
                      <span className="text-[10px] font-mono opacity-80">₹{sec.basePrice}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Section Config Panel */}
              {currentSection && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">विभाग नाव (English)</label>
                        <input
                          type="text"
                          value={currentSection.name}
                          onChange={(e) => updateCurrentSection({ name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">मराठी नाव (Marathi)</label>
                        <input
                          type="text"
                          value={currentSection.nameMr}
                          onChange={(e) => updateCurrentSection({ nameMr: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold font-serif"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">तिकीट दर (₹ Price)</label>
                        <input
                          type="number"
                          value={currentSection.basePrice}
                          onChange={(e) =>
                            updateCurrentSection({ basePrice: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">आसन श्रेणी (Tier)</label>
                        <select
                          value={currentSection.tier}
                          onChange={(e) => updateCurrentSection({ tier: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                        >
                          <option value="platinum">Platinum / VIP</option>
                          <option value="gold">Gold / मुख्य</option>
                          <option value="silver">Silver / मध्यम</option>
                          <option value="standard">Standard / सामान्य</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSection(activeSectionIdx)}
                      className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900 border border-red-800/50 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Delete section"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>विभाग काढा</span>
                    </button>
                  </div>

                  {/* Rows Configuration in Current Section */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          आसन रांगा (Rows in {currentSection.nameMr}): {currentSection.rows.length} रांगा
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          प्रत्येक रांगेचे लेबल, आसन संख्या आणि पॅसेज अंतर नियंत्रित करा. आसनावर क्लिक करून ब्लॉक/दिव्यांग दर्जा बदला.
                        </p>
                      </div>

                      {/* Add Row Button Options */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleAddRow('alpha')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                        >
                          + A, B, C...
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddRow('double_alpha')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                        >
                          + AA, AB...
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddRow('numeric')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                        >
                          + 1, 2, 3...
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddRow('custom')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition"
                        >
                          + कस्टॉमाइझ रांग
                        </button>
                      </div>
                    </div>

                    {/* Row List */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                      {currentSection.rows.map((row, rIdx) => (
                        <div
                          key={rIdx}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">रांग:</span>
                              <input
                                type="text"
                                value={row.rowLabel}
                                onChange={(e) => handleUpdateRowLabel(rIdx, e.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold font-mono text-amber-400 uppercase"
                                title="Edit row label"
                              />
                              <span className="text-slate-400 text-[11px] ml-2">आसने:</span>
                              <input
                                type="number"
                                min={1}
                                max={40}
                                value={row.seats.length}
                                onChange={(e) => handleUpdateSeatCount(rIdx, Number(e.target.value))}
                                className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-white"
                                title="Number of seats in this row"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteRow(rIdx)}
                              className="p-1 rounded-lg hover:bg-red-950 text-slate-500 hover:text-red-400 transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Visual Row Preview with Seats and Aisle indicators */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {row.seats.map((seat, sIdx) => {
                              const isAisleGap = row.aisleAfter.includes(seat.seatNumber);

                              let bgClass = 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400';
                              if (seat.isBlocked === 1) {
                                bgClass = 'bg-red-950/80 text-red-300 border-red-700';
                              } else if (seat.isAccessible === 1) {
                                bgClass = 'bg-blue-950/80 text-blue-300 border-blue-600';
                              }

                              return (
                                <React.Fragment key={sIdx}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSeatProperty(rIdx, sIdx)}
                                    title={`Seat ${row.rowLabel}${seat.seatNumber} (${
                                      seat.isBlocked
                                        ? 'Blocked'
                                        : seat.isAccessible
                                        ? 'Accessible'
                                        : 'Regular'
                                    }) — Click to change status`}
                                    className={`w-7 h-7 rounded-lg border text-[10px] font-bold font-mono flex items-center justify-center transition active:scale-90 ${bgClass}`}
                                  >
                                    {seat.isBlocked === 1 ? (
                                      <Lock className="w-3 h-3 text-red-400" />
                                    ) : seat.isAccessible === 1 ? (
                                      <Accessibility className="w-3 h-3 text-blue-400" />
                                    ) : (
                                      seat.seatNumber
                                    )}
                                  </button>

                                  {/* Aisle Break Indicator */}
                                  {isAisleGap && (
                                    <div
                                      onClick={() => handleToggleAisle(rIdx, seat.seatNumber)}
                                      title="Aisle gap active. Click to remove gap."
                                      className="w-4 h-7 border-x border-dashed border-amber-500/30 flex items-center justify-center cursor-pointer hover:border-red-400"
                                    >
                                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}

                            <div className="text-[10px] text-slate-500 pl-2">
                              (मध्यवर्ती पॅसेजसाठी आसनानंतर गॅप जोडा)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: LIVE PREVIEW (Direct interactive theatre editing - Section 7, 8, 9, 10 Parity) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="text-center sm:text-left space-y-0.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-amber-400 font-black">
                      थेट ग्राहक आसन नकाशा (Live Theatre Layout)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      थेट संपादन सक्रिय
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-serif">
                    {venueNameMr || venueName || 'नाट्यगृह आसन रचना'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {city} • {totalSeats} एकूण आसने • (आसनावर थेट क्लिक करून सामान्य / ब्लॉक / दिव्यांग स्थिती बदला)
                  </p>
                </div>

                {/* Zoom & View Controls (Section 10 Parity) */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-black text-sm flex items-center justify-center transition active:scale-90"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="font-mono text-amber-400 font-black text-xs w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-black text-sm flex items-center justify-center transition active:scale-90"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-[11px] font-semibold transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Theatrical Curved Stage / Screen (Section 9 Parity) */}
              <div className="max-w-xl mx-auto text-center space-y-1">
                <div className="relative h-10 flex items-center justify-center">
                  {/* Modern curved wide stage arch */}
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-3 rounded-t-full bg-gradient-to-r from-amber-500/10 via-amber-400/50 to-amber-500/10 border-t-2 border-amber-400 shadow-[0_-10px_25px_rgba(245,158,11,0.3)]" />
                  <span className="relative z-10 px-5 py-1 rounded-full bg-slate-950 border border-amber-400/60 text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-2 shadow-lg">
                    <span>🎭 रंगमंच / STAGE (SCREEN)</span>
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 tracking-wider">सर्व नजरा रंगमंचाकडे (All eyes this way)</p>
              </div>

              {/* Responsive Pan & Zoom Theatre Container */}
              <div className="overflow-auto max-h-[520px] p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div
                  className="transition-transform duration-150 origin-top flex flex-col items-center gap-8 py-2 min-w-fit"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {sections.map((sec, secIdx) => (
                    <div key={secIdx} className="w-full max-w-3xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            {sec.nameMr} ({sec.name})
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {sec.tier.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          ₹{sec.basePrice}
                        </span>
                      </div>

                      <div className="flex flex-col items-center gap-2 py-2">
                        {sec.rows.map((row, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <span className="w-8 text-right font-mono font-bold text-xs text-slate-400 select-none">
                              {row.rowLabel}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {row.seats.map((seat, sIdx) => {
                                const isAisleGap = row.aisleAfter.includes(seat.seatNumber);

                                let seatClass = 'bg-white text-slate-900 border-slate-300 hover:border-amber-400';
                                if (seat.isBlocked === 1) {
                                  seatClass = 'bg-red-950 text-red-300 border-red-700 hover:border-red-500';
                                } else if (seat.isAccessible === 1) {
                                  seatClass = 'bg-blue-600 text-white border-blue-500 hover:border-blue-300';
                                }

                                return (
                                  <React.Fragment key={sIdx}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSeatPropertyInSec(secIdx, rIdx, sIdx)}
                                      title={`Seat ${row.rowLabel}${seat.seatNumber} (${
                                        seat.isBlocked
                                          ? 'Blocked'
                                          : seat.isAccessible
                                          ? 'Accessible'
                                          : 'Normal'
                                      }) — थेट क्लिक करून स्थिती बदला`}
                                      className={`w-7 h-7 rounded-lg border text-[10px] font-bold font-mono flex items-center justify-center shadow-xs transition active:scale-90 cursor-pointer ${seatClass}`}
                                    >
                                      {seat.isBlocked === 1 ? (
                                        <Lock className="w-3 h-3 text-red-400" />
                                      ) : seat.isAccessible === 1 ? (
                                        <Accessibility className="w-3 h-3 text-white" />
                                      ) : (
                                        seat.seatNumber
                                      )}
                                    </button>

                                    {isAisleGap && <div className="w-5" />}
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            <span className="w-8 text-left font-mono font-bold text-xs text-slate-400 select-none">
                              {row.rowLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Bottom Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-white">एकूण जागा: {totalSeats}</span> •{' '}
              {sections.length} विभाग सुरक्षितपणे सेव्ह होतील.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
              >
                रद्द करा
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>जतन करत आहे... (Saving...)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>नाट्यगृह व आसन रचना जतन करा (Save Layout)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
