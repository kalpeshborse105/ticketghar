'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Users, X } from 'lucide-react';
import { Language } from '@/src/lib/i18n';
import {
  AddonSelection,
  CONCESSION_MENU,
  addonTotalPaise,
} from '@/src/lib/concessions';

type Props = {
  language: Language;
  seatCount: number;
  seatSubtotalPaise: number;
  onSkip: () => void;
  onContinue: (addons: AddonSelection[]) => void;
  onClose: () => void;
};

/** BookMyShow-style: party count pulse → snack suggestions */
export function BookingAddonsStep({
  language,
  seatCount,
  seatSubtotalPaise,
  onSkip,
  onContinue,
  onClose,
}: Props) {
  const [party, setParty] = useState(Math.max(1, Math.min(seatCount, 5)));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    setParty(Math.max(1, Math.min(seatCount, 5)));
    setPulseKey((k) => k + 1);
  }, [seatCount]);

  const bumpParty = (n: number) => {
    setParty(n);
    setPulseKey((k) => k + 1);
  };

  const selected: AddonSelection[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ id, qty: q })),
    [qty]
  );

  const snacksTotal = addonTotalPaise(selected);
  const grand = seatSubtotalPaise + snacksTotal;

  const hint =
    party === 1
      ? language === 'mr'
        ? '१ व्यक्ती · हलके स्नॅक?'
        : '1 person · light snack?'
      : party === 2
        ? language === 'mr'
          ? '२ जण · समोसा + चहा ट्रेंडिंग!'
          : '2 people · samosa + chai is popular!'
        : language === 'mr'
          ? `${party} जण · कॉम्बो वाचवतो`
          : `${party} people · combo saves more`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">
              {language === 'mr' ? 'अतिरिक्त' : 'Add-ons'}
            </p>
            <h3 className="text-base font-extrabold text-[#141b2b]">
              {language === 'mr' ? 'स्नॅक्स व पेये' : 'Snacks & drinks'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto space-y-4">
          {/* Party size — animated */}
          <div className="rounded-xl bg-[#FFF7ED] border border-orange-100 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-bold text-[#141b2b]">
                {language === 'mr' ? 'किती जण?' : 'How many people?'}
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n > seatCount}
                  onClick={() => bumpParty(n)}
                  className={`relative flex-1 h-11 rounded-xl text-sm font-extrabold transition active:scale-95 disabled:opacity-30 ${
                    party === n
                      ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={pulseKey}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 text-xs font-semibold text-[#c2410c] flex items-center gap-1.5"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.45 }}
                  className="inline-block"
                >
                  {party === 1 ? '🧍' : party === 2 ? '🧍🧍 · 🥟' : '👥'}
                </motion.span>
                {hint}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Menu */}
          <div className="space-y-2">
            {CONCESSION_MENU.map((item) => {
              const q = qty[item.id] || 0;
              const suggested = item.suggestFrom != null && party >= item.suggestFrom;
              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    suggested ? 'border-orange-300 bg-[#FFF7ED]' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center text-xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#141b2b] truncate">
                      {language === 'mr' ? item.nameMr : item.nameEn}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {language === 'mr' ? item.descMr : item.descEn}
                    </p>
                    <p className="text-xs font-extrabold text-[#ea580c] mt-0.5">
                      ₹{Math.round(item.pricePaise / 100)}
                    </p>
                  </div>
                  {q === 0 ? (
                    <button
                      type="button"
                      onClick={() => setQty((p) => ({ ...p, [item.id]: 1 }))}
                      className="h-8 px-3 rounded-lg bg-[#ea580c] text-white text-xs font-bold active:scale-95"
                    >
                      {language === 'mr' ? 'जोडा' : 'Add'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setQty((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))
                        }
                        className="w-8 h-8 rounded-lg border border-slate-200 font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-extrabold">{q}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQty((p) => ({ ...p, [item.id]: Math.min(9, (p[item.id] || 0) + 1) }))
                        }
                        className="w-8 h-8 rounded-lg border border-slate-200 font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 space-y-2 bg-white">
          <div className="flex justify-between text-xs text-slate-600">
            <span>{language === 'mr' ? 'तिकिटे' : 'Tickets'}</span>
            <span className="font-bold">₹{Math.round(seatSubtotalPaise / 100)}</span>
          </div>
          {snacksTotal > 0 ? (
            <div className="flex justify-between text-xs text-slate-600">
              <span>{language === 'mr' ? 'स्नॅक्स (काउंटर)' : 'Snacks (counter)'}</span>
              <span className="font-bold">₹{Math.round(snacksTotal / 100)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[10px] text-slate-500">{language === 'mr' ? 'एकूण' : 'Total'}</p>
              <p className="text-xl font-extrabold text-[#ea580c] tabular-nums">
                ₹{Math.round(grand / 100)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                {language === 'mr' ? 'वगळा' : 'Skip'}
              </button>
              <button
                type="button"
                onClick={() => onContinue(selected)}
                className="h-11 px-5 rounded-xl bg-[#ea580c] text-white text-sm font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95"
              >
                {language === 'mr' ? 'पुढे' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
