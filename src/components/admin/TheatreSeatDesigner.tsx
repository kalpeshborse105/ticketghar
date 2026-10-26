'use client';

import React, { useState, useEffect } from 'react';
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

export interface MiddleGapConfig {
  enabled: boolean;
  afterSeat: number; // gap is rendered after this seat number
}

export interface RowConfig {
  rowLabel: string;
  /** Extra aisle gaps (after seat N), in addition to the middle gap. */
  aisleAfter: number[];
  /** Per-row middle (center aisle) gap. Persisted in venue layoutConfig. */
  middleGap: MiddleGapConfig;
  seats: SeatItemConfig[];
}

const centerAfter = (seatCount: number) => Math.max(1, Math.ceil(seatCount / 2));

/** All gap positions for a row (extra aisles + middle gap), sorted & clamped. */
export function getRowGaps(row: RowConfig): number[] {
  const n = row.seats.length;
  const set = new Set<number>();
  for (const a of row.aisleAfter) if (a >= 1 && a < n) set.add(a);
  if (row.middleGap?.enabled && row.middleGap.afterSeat >= 1 && row.middleGap.afterSeat < n) {
    set.add(row.middleGap.afterSeat);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Build a RowConfig-compatible middleGap/aisleAfter pair from persisted data (supports legacy aisleAfter-only rows). */
function parseGapConfig(raw: any, seatCount: number): { aisleAfter: number[]; middleGap: MiddleGapConfig } {
  const saved = Array.isArray(raw?.aisleAfter) ? raw.aisleAfter.map(Number).filter((n: number) => Number.isFinite(n)) : [];
  const mg = raw?.middleGap;
  if (mg && typeof mg === 'object') {
    const afterSeat = Number(mg.afterSeat) >= 1 ? Number(mg.afterSeat) : centerAfter(seatCount);
    return {
      middleGap: { enabled: !!mg.enabled, afterSeat },
      aisleAfter: saved.filter((n: number) => !(mg.enabled && n === afterSeat)),
    };
  }
  // Legacy: infer the aisle closest to center as the middle gap
  if (saved.length === 0) {
    return { aisleAfter: [], middleGap: { enabled: false, afterSeat: centerAfter(seatCount) } };
  }
  const center = seatCount / 2;
  const middle = saved.reduce((best: number, n: number) => (Math.abs(n - center) < Math.abs(best - center) ? n : best), saved[0]);
  return {
    middleGap: { enabled: true, afterSeat: middle },
    aisleAfter: saved.filter((n: number) => n !== middle),
  };
}

export interface SectionConfig {
  id?: number;
  name: string;
  nameMr: string;
  basePrice: number; // in rupees
  tier: 'platinum' | 'gold' | 'silver' | 'standard';
  walkwayAfterRow?: string;
  rows: RowConfig[];
}

interface TheatreSeatDesignerProps {
  venueToEdit?: any | null;
  onClose: () => void;
  onSaved: (venue: any) => void;
}

interface DistrictItem {
  id: number;
  name: string;
  nameMr: string;
}

interface CityItem {
  id: number;
  name: string;
  nameMr: string;
  districtId?: number | null;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  {
    name: 'Stall / Orchestra',
    nameMr: 'मुख्य स्टॉल',
    basePrice: 350,
    tier: 'gold',
    walkwayAfterRow: '',
    rows: ['A', 'B', 'C', 'D', 'E', 'F'].map((label, rIdx) => ({
      rowLabel: label,
      aisleAfter: [],
      middleGap: { enabled: true, afterSeat: 4 },
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
    walkwayAfterRow: '',
    rows: ['A', 'B', 'C'].map((label) => ({
      rowLabel: label,
      aisleAfter: [],
      middleGap: { enabled: true, afterSeat: 4 },
      seats: Array.from({ length: 8 }).map((_, cIdx) => ({
        seatNumber: cIdx + 1,
        tier: 'platinum',
        isAccessible: 0,
        isBlocked: 0,
      })),
    })),
  },
];

function parseInitialSections(venue: any): SectionConfig[] {
  if (!venue) return DEFAULT_SECTIONS;

  let layoutConfig = venue.layoutConfig;
  if (typeof layoutConfig === 'string') {
    try {
      layoutConfig = JSON.parse(layoutConfig);
    } catch {
      layoutConfig = null;
    }
  }

  // Saved layoutConfig is only usable if it carries seats (older saves stored rows without seats).
  const configHasSeats =
    Array.isArray(layoutConfig?.sections) &&
    layoutConfig.sections.some((sec: any) => (sec.rows || []).some((r: any) => Array.isArray(r.seats) && r.seats.length > 0));

  // Gap metadata from layoutConfig, keyed by section name + row label (used when rebuilding from DB seats).
  const savedGapByRow = new Map<string, any>();
  if (Array.isArray(layoutConfig?.sections)) {
    for (const sec of layoutConfig.sections) {
      savedGapByRow.set(`${sec.name}|__walkway`, sec.walkwayAfterRow || '');
      for (const r of sec.rows || []) savedGapByRow.set(`${sec.name}|${r.rowLabel}`, r);
    }
  }

  if (configHasSeats) {
    return layoutConfig.sections.map((sec: any) => ({
      name: sec.name || 'Section',
      nameMr: sec.nameMr || 'विभाग',
      basePrice: Number(sec.basePrice || 350),
      tier: sec.tier || 'gold',
      walkwayAfterRow: sec.walkwayAfterRow || '',
      rows: (sec.rows || []).map((r: any) => {
        const seatsParsed = (r.seats || []).map((s: any, sIdx: number) => ({
          seatNumber: s.seatNumber !== undefined ? Number(s.seatNumber) : sIdx + 1,
          seatCode: s.seatCode,
          tier: s.tier || sec.tier || 'gold',
          isAccessible: Number(s.isAccessible || 0),
          isBlocked: Number(s.isBlocked || 0),
        }));
        return {
          rowLabel: r.rowLabel || 'A',
          ...parseGapConfig(r, seatsParsed.length),
          seats: seatsParsed,
        };
      }),
    }));
  }

  if (venue.sections && Array.isArray(venue.sections) && venue.sections.length > 0) {
    return venue.sections.map((sec: any) => {
      const secSeats = Array.isArray(sec.seats) ? sec.seats : [];
      if (secSeats.length === 0) {
        const rowsCount = sec.rowsCount || 4;
        const colsCount = sec.colsCount || 8;
        return {
          id: sec.id,
          name: sec.name,
          nameMr: sec.nameMr,
          basePrice: Math.round((sec.basePrice || 35000) / 100),
          tier: 'gold' as const,
          walkwayAfterRow: '',
          rows: Array.from({ length: rowsCount }).map((_, rIdx) => ({
            rowLabel: String.fromCharCode(65 + rIdx),
            aisleAfter: [],
            middleGap: { enabled: true, afterSeat: centerAfter(colsCount) },
            seats: Array.from({ length: colsCount }).map((_, cIdx) => ({
              seatNumber: cIdx + 1,
              tier: 'gold' as const,
              isAccessible: rIdx === 0 && cIdx === 0 ? 1 : 0,
              isBlocked: 0,
            })),
          })),
        };
      }

      const rowMap = new Map<string, any[]>();
      for (const st of secSeats) {
        const rLabel = st.rowLabel || 'A';
        if (!rowMap.has(rLabel)) rowMap.set(rLabel, []);
        rowMap.get(rLabel)!.push(st);
      }

      const rows: RowConfig[] = Array.from(rowMap.entries()).map(([rLabel, seatArr]) => {
        const sortedSeats = seatArr.sort((a, b) => a.seatNumber - b.seatNumber);
        const savedRow = savedGapByRow.get(`${sec.name}|${rLabel}`);
        const gapCfg = savedRow
          ? parseGapConfig(savedRow, sortedSeats.length)
          : {
              aisleAfter: [] as number[],
              middleGap: { enabled: true, afterSeat: centerAfter(sortedSeats.length) },
            };
        return {
          rowLabel: rLabel,
          ...gapCfg,
          seats: sortedSeats.map((s) => ({
            seatNumber: s.seatNumber,
            seatCode: s.seatCode,
            tier: s.tier || 'gold',
            isAccessible: Number(s.isAccessible || 0),
            isBlocked: Number(s.isBlocked || 0),
          })),
        };
      });

      return {
        id: sec.id,
        name: sec.name,
        nameMr: sec.nameMr,
        basePrice: Math.round((sec.basePrice || 35000) / 100),
        tier: (sec.name.toLowerCase().includes('balcony') || sec.name.toLowerCase().includes('vip') ? 'platinum' : 'gold') as any,
        walkwayAfterRow: savedGapByRow.get(`${sec.name}|__walkway`) || '',
        rows,
      };
    });
  }

  return DEFAULT_SECTIONS;
}

export const TheatreSeatDesigner: React.FC<TheatreSeatDesignerProps> = ({
  venueToEdit,
  onClose,
  onSaved,
}) => {
  // Venue details
  const [venueName, setVenueName] = useState(venueToEdit?.name || '');
  const [venueNameMr, setVenueNameMr] = useState(venueToEdit?.nameMr || '');
  const [city, setCity] = useState(venueToEdit?.city || 'Pune');
  const [districtId, setDistrictId] = useState<number | undefined>(venueToEdit?.districtId || undefined);
  const [address, setAddress] = useState(venueToEdit?.address || '');

  // Dynamic location list from backend
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);
  const [citiesList, setCitiesList] = useState<CityItem[]>([]);

  useEffect(() => {
    fetch('/api/locations/districts')
      .then((r) => r.json())
      .then((d) => {
        if (d.districts) setDistrictsList(d.districts);
      })
      .catch(() => {});

    fetch('/api/locations/cities')
      .then((r) => r.json())
      .then((d) => {
        if (d.cities) setCitiesList(d.cities);
      })
      .catch(() => {});
  }, []);

  // Active section index
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  // Sections configuration loaded from layout_config or sections table
  const [sections, setSections] = useState<SectionConfig[]>(() => parseInitialSections(venueToEdit));

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
  const activeSectionSeatCount = (sections[activeSectionIdx] || sections[0])?.rows.reduce(
    (a, r) => a + r.seats.length,
    0
  ) || 0;
  const dbCapacity = Number(venueToEdit?.totalCapacity || 0);
  const capacityMismatch = dbCapacity > 0 && dbCapacity !== totalSeats;

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
        aisleAfter: [],
        middleGap: { enabled: true, afterSeat: 4 },
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

  const [designerNotice, setDesignerNotice] = useState<string | null>(null);

  const handleDeleteSection = (idx: number) => {
    if (sections.length <= 1) {
      setDesignerNotice('कमीत कमी एक विभाग आवश्यक आहे (At least one section is required).');
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
      aisleAfter: [],
      middleGap: { enabled: true, afterSeat: 4 },
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
      setDesignerNotice('विभागात किमान एक रांग असावी (A section must have at least one row).');
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

    const updatedRows = currentSection.rows.map((row, i) => {
      if (i !== rowIdx) return row;
      // Keep a centered middle gap centered; otherwise just clamp it inside the row.
      const wasCentered = row.middleGap.afterSeat === centerAfter(row.seats.length);
      const nextAfter = wasCentered
        ? centerAfter(newCount)
        : Math.min(row.middleGap.afterSeat, Math.max(1, newCount - 1));
      return {
        ...row,
        seats: newSeats,
        aisleAfter: row.aisleAfter.filter((a) => a < newCount),
        middleGap: { ...row.middleGap, afterSeat: nextAfter },
      };
    });
    updateCurrentSection({ rows: updatedRows });
  };

  // MIDDLE GAP (center aisle) controls — persisted per row in layoutConfig
  const handleSetMiddleGap = (rowIdx: number, patch: Partial<MiddleGapConfig>) => {
    if (!currentSection) return;
    const updatedRows = currentSection.rows.map((row, i) => {
      if (i !== rowIdx) return row;
      const merged = { ...row.middleGap, ...patch };
      const maxAfter = Math.max(1, row.seats.length - 1);
      merged.afterSeat = Math.min(Math.max(1, Math.round(Number(merged.afterSeat) || 1)), maxAfter);
      return { ...row, middleGap: merged };
    });
    updateCurrentSection({ rows: updatedRows });
  };

  const handleApplyMiddleGapToAllRows = (enabled: boolean) => {
    if (!currentSection) return;
    updateCurrentSection({
      rows: currentSection.rows.map((row) => ({
        ...row,
        middleGap: {
          enabled,
          afterSeat: Math.min(
            Math.max(1, row.middleGap.afterSeat || centerAfter(row.seats.length)),
            Math.max(1, row.seats.length - 1)
          ),
        },
      })),
    });
  };

  const handleCenterMiddleGapAllRows = () => {
    if (!currentSection) return;
    updateCurrentSection({
      rows: currentSection.rows.map((row) => ({
        ...row,
        middleGap: { enabled: true, afterSeat: Math.min(centerAfter(row.seats.length), Math.max(1, row.seats.length - 1)) },
      })),
    });
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
    // Clicking the middle-gap marker switches the middle gap off
    if (targetRow.middleGap.enabled && targetRow.middleGap.afterSeat === afterSeatNum) {
      handleSetMiddleGap(rowIdx, { enabled: false });
      return;
    }
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

      const layoutConfigObj = {
        sections: sections.map((sec) => ({
          name: sec.name,
          nameMr: sec.nameMr,
          basePrice: sec.basePrice,
          tier: sec.tier,
          walkwayAfterRow: sec.walkwayAfterRow || '',
          rows: sec.rows.map((r) => ({
            rowLabel: r.rowLabel,
            // effective gaps (extra aisles + middle gap) for consumers that only read aisleAfter
            aisleAfter: getRowGaps(r),
            middleGap: { enabled: r.middleGap.enabled, afterSeat: r.middleGap.afterSeat },
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

      const payload = {
        venueId: venueToEdit?.id || undefined,
        name: venueName.trim(),
        nameMr: venueNameMr.trim(),
        city: city.trim(),
        districtId: districtId || undefined,
        address: address.trim(),
        totalCapacity: totalSeats,
        hasSeatLayout: 1,
        customLayout: true,
        layoutConfig: layoutConfigObj,
        sections: layoutConfigObj.sections,
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

        {/* Live Overview Stats Bar — totals always = sum of designed seats */}
        <div className="px-6 py-2.5 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <span className="text-slate-400">
              एकूण क्षमता (सर्व विभाग):{' '}
              <strong className="text-white font-mono">{totalSeats}</strong> जागा
            </span>
            <span className="text-sky-300">
              सध्याचा विभाग: <strong className="font-mono">{activeSectionSeatCount}</strong>
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
            {capacityMismatch && (
              <span className="text-amber-300 font-semibold">
                DB जुनी क्षमता {dbCapacity} ≠ रचना {totalSeats} — जतन केल्यास {totalSeats} लागू
              </span>
            )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
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
                <label className="text-slate-400 block mb-1">जिल्हा (District)</label>
                <select
                  value={districtId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setDistrictId(val);
                    if (val) {
                      const matchCity = citiesList.find((c) => c.districtId === val);
                      if (matchCity) setCity(matchCity.name);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">जिल्हा निवडा (Select District)</option>
                  {districtsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameMr} ({d.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">शहर (City) *</label>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    const matchCity = citiesList.find((c) => c.name.toLowerCase() === e.target.value.toLowerCase());
                    if (matchCity && matchCity.districtId) setDistrictId(matchCity.districtId);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {citiesList.length > 0 ? (
                    citiesList
                      .filter((c) => !districtId || c.districtId === districtId)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.nameMr} ({c.name})
                        </option>
                      ))
                  ) : (
                    <option value={city}>{city}</option>
                  )}
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
                  {sections.map((sec, idx) => {
                    const secSeats = sec.rows.reduce((a, r) => a + r.seats.length, 0);
                    return (
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
                        <span className="text-[10px] font-mono opacity-80">
                          {secSeats} जागा · ₹{sec.basePrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Section Config Panel */}
              {currentSection && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <div className="rounded-xl border border-sky-800/60 bg-sky-950/40 px-3 py-2 text-[11px] text-sky-200 leading-relaxed">
                    या विभागात <strong className="text-white font-mono">{activeSectionSeatCount}</strong> आसने
                    (खालील रांग रचना). एकूण क्षमता{' '}
                    <strong className="text-white font-mono">{totalSeats}</strong> = सर्व विभागांची बेरीज.
                    रांग/आसन वाढ-घट केल्यास एकूण आपोआप जुळते; जतन करताना DB क्षमताही {totalSeats} होते.
                  </div>
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
                      <div>
                        <label className="text-slate-400 block mb-1">मधला रस्ता (Walkway Gap)</label>
                        <select
                          value={currentSection.walkwayAfterRow || ''}
                          onChange={(e) => updateCurrentSection({ walkwayAfterRow: e.target.value || undefined })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                          title="Select row after which cross-aisle walkway is placed"
                        >
                          <option value="">नाही (No Walkway)</option>
                          {currentSection.rows.map((r) => (
                            <option key={r.rowLabel} value={r.rowLabel}>
                              Row {r.rowLabel} नंतर पॅसेज
                            </option>
                          ))}
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

                      {/* Middle gap — apply to every row of this section */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[11px]">मधला गॅप (सर्व रांगा):</span>
                        <button
                          type="button"
                          onClick={() => handleApplyMiddleGapToAllRows(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition"
                        >
                          सर्व चालू
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyMiddleGapToAllRows(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                        >
                          सर्व बंद
                        </button>
                        <button
                          type="button"
                          onClick={handleCenterMiddleGapAllRows}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                        >
                          मध्यभागी ठेवा
                        </button>
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
                        <React.Fragment key={rIdx}>
                          <div
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

                              {/* MIDDLE GAP (center aisle) control — per row */}
                              <div
                                className={`ml-3 flex items-center gap-2 rounded-lg border px-2 py-1 ${
                                  row.middleGap.enabled
                                    ? 'border-amber-500/50 bg-amber-500/10'
                                    : 'border-slate-700 bg-slate-900'
                                }`}
                              >
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={row.middleGap.enabled}
                                  onClick={() => handleSetMiddleGap(rIdx, { enabled: !row.middleGap.enabled })}
                                  title="Toggle middle gap (center aisle) for this row"
                                  className={`relative w-8 h-4 rounded-full transition ${
                                    row.middleGap.enabled ? 'bg-amber-500' : 'bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                      row.middleGap.enabled ? 'left-4' : 'left-0.5'
                                    }`}
                                  />
                                </button>
                                <span className="text-[11px] text-slate-300 font-semibold">मधला गॅप</span>
                                {row.middleGap.enabled && (
                                  <>
                                    <span className="text-[11px] text-slate-400">आसन</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={Math.max(1, row.seats.length - 1)}
                                      value={row.middleGap.afterSeat}
                                      onChange={(e) => handleSetMiddleGap(rIdx, { afterSeat: Number(e.target.value) })}
                                      className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-center font-mono text-amber-300"
                                      title="Gap is placed after this seat number"
                                    />
                                    <span className="text-[11px] text-slate-400">नंतर</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetMiddleGap(rIdx, { afterSeat: centerAfter(row.seats.length) })
                                      }
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      title="Center the gap in this row"
                                    >
                                      मध्य
                                    </button>
                                  </>
                                )}
                              </div>
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
                              const isAisleGap = getRowGaps(row).includes(seat.seatNumber);
                              const isMiddleGap =
                                row.middleGap.enabled && row.middleGap.afterSeat === seat.seatNumber;

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
                                      title={
                                        isMiddleGap
                                          ? 'Middle gap (center aisle). Click to turn off.'
                                          : 'Aisle gap active. Click to remove gap.'
                                      }
                                      className={`h-7 border-x border-dashed flex items-center justify-center cursor-pointer hover:border-red-400 ${
                                        isMiddleGap ? 'w-6 border-amber-400/70 bg-amber-500/10' : 'w-4 border-amber-500/30'
                                      }`}
                                    >
                                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}

                          </div>
                        </div>

                        {currentSection.walkwayAfterRow === row.rowLabel && (
                          <div className="py-2 px-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 text-[11px] text-amber-300 font-mono flex items-center justify-center gap-2">
                            <span>🚶 मधला रस्ता / CROSS-AISLE WALKWAY GAP (Row {row.rowLabel} नंतर पॅसेज)</span>
                          </div>
                        )}
                      </React.Fragment>
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
                        {sec.rows.map((row, rIdx) => {
                          const hasWalkway = sec.walkwayAfterRow === row.rowLabel;
                          return (
                            <React.Fragment key={rIdx}>
                              <div className="flex items-center gap-2">
                                <span className="w-8 text-right font-mono font-bold text-xs text-slate-400 select-none">
                                  {row.rowLabel}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {row.seats.map((seat, sIdx) => {
                                    const isAisleGap = getRowGaps(row).includes(seat.seatNumber);

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

                              {hasWalkway && (
                                <div className="w-full flex items-center justify-center my-3 py-1.5 border-y border-dashed border-amber-500/30 bg-amber-500/5 text-[10px] font-mono tracking-widest text-amber-300">
                                  <span>🚶 मधला रस्ता / CROSS-AISLE WALKWAY GAP</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
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

      {designerNotice && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">माहिती / सूचना</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{designerNotice}</p>
            <button
              onClick={() => setDesignerNotice(null)}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              ठीक आहे (OK)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
