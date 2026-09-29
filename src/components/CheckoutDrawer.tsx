'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, EventSessionItem, PricingBreakdown } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Clock,
  ShieldCheck,
  Tag,
  CheckCircle,
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CheckoutDrawerProps {
  event: EventItem;
  session: EventSessionItem;
  holdData: {
    sessionId: number;
    seatIds: number[];
    heldSeats: any[];
    faceValueTotal: number;
    holdExpiresAt: string;
  };
  language: Language;
  onClose: () => void;
  onSuccess: (bookingResult: any) => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  event,
  session,
  holdData,
  language,
  onClose,
  onSuccess,
}) => {
  const t = translations[language];

  // Contact State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hold Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(480); // 8 mins in seconds

  useEffect(() => {
    const expireTime = new Date(holdData.holdExpiresAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdData.holdExpiresAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pricing calculations
  const ticketCount = holdData.seatIds.length;
  const faceValueTotal = holdData.faceValueTotal;
  const platformFeeTotal = (event.convenienceFeeValue || 3000) * ticketCount;
  const gstTotal = Math.round((platformFeeTotal * (event.gstPercent || 18)) / 100);
  const gatewayCostEst = Math.round((faceValueTotal + platformFeeTotal + gstTotal) * 0.02);
  const grossSubtotal = faceValueTotal + platformFeeTotal + gstTotal;
  const grandTotal = Math.max(0, grossSubtotal - couponDiscount);

  // Apply Coupon
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code.trim()) return;

    try {
      setCouponError(null);
      setCouponMessage(null);
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), amount: grossSubtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'अवैध कूपन कोड');
      }

      setCouponApplied(data.code);
      setCouponDiscount(data.discount);
      setCouponMessage(data.message);
    } catch (err: any) {
      setCouponError(err.message || 'कूपन लागू करता आले नाही');
    }
  };

  // Submit payment & confirm booking
  const handleConfirmPayment = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPhone.trim()) {
      setErrorMessage(
        language === 'mr'
          ? 'कृपया पूर्ण नाव, ईमेल आणि व्हॉट्सॲप नंबर भरा.'
          : 'Please provide full name, email and phone number.'
      );
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage(
        language === 'mr'
          ? 'जागेचे आरक्षण संपले आहे. कृपया पुन्हा जागा निवडा.'
          : 'Hold reservation has expired. Please select seats again.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          eventId: event.id,
          seatIds: holdData.seatIds,
          userName: userName.trim(),
          userEmail: userEmail.trim().toLowerCase(),
          userPhone: userPhone.trim(),
          couponCode: couponApplied,
          holdSummary: {
            faceValueTotal,
          },
          paymentDetails: {
            gateway: `Razorpay - ${paymentMethod.toUpperCase()}`,
            razorpayOrderId: `rzp_ord_${Date.now()}`,
            razorpayPaymentId: `rzp_pay_${Date.now()}`,
            idempotencyKey: `idem_checkout_${Date.now()}_${holdData.seatIds.join('_')}`,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment confirmation failed');
      }

      // Notify parent of success
      onSuccess(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-end animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full min-h-screen shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Top Header with countdown */}
        <div>
          <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white font-serif">
                {language === 'mr' ? 'सुरक्षित चेकआउट' : 'Secure Checkout'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'mr' ? event.titleMr : event.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Seat Hold Expiration Countdown Banner */}
          <div
            className={`px-5 py-2.5 flex items-center justify-between text-xs font-semibold ${
              timeLeft <= 120
                ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border-b border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>{t.holdNotice}</span>
            </div>
            <span className="font-mono text-sm font-extrabold bg-slate-950/60 px-2 py-0.5 rounded border border-current">
              {formatCountdown(timeLeft)}
            </span>
          </div>

          {/* Contact Details Form */}
          <div className="p-5 space-y-4 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              १. {t.contactDetails}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. सचिन जयंत पाटील"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Price Breakdown */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              २. {t.ticketSummary} ({ticketCount} {language === 'mr' ? 'तिकीट' : 'tickets'})
            </h3>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>
                  {t.faceValue} ({holdData.heldSeats.map((s) => s.seatCode).join(', ')})
                </span>
                <span className="font-semibold text-white">
                  ₹{(faceValueTotal / 100).toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>
                  {t.convenienceFee} (₹{((event.convenienceFeeValue || 3000) / 100).toFixed(0)} × {ticketCount})
                </span>
                <span>₹{(platformFeeTotal / 100).toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{t.tax}</span>
                <span>₹{(gstTotal / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>{t.gatewayCost} (अंतर्भूत / Absorbed in platform)</span>
                <span>₹{(gatewayCostEst / 100).toFixed(0)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-2">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.couponDiscount} ({couponApplied})
                  </span>
                  <span>-₹{(couponDiscount / 100).toFixed(0)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm sm:text-base font-extrabold text-amber-400 border-t border-slate-800 pt-2">
                <span>{t.grandTotal}</span>
                <span>₹{(grandTotal / 100).toFixed(0)}</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="कूपन कोड प्रविष्ट करा (e.g. MAHA50)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white uppercase placeholder-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition"
                >
                  {t.applyCoupon}
                </button>
              </div>

              {/* Quick Coupon Suggestions */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>उपलब्ध ऑफर्स:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('MAHA50');
                    handleApplyCoupon('MAHA50');
                  }}
                  className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono font-bold border border-amber-500/30"
                >
                  MAHA50 (₹५० सूट)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('NATAK10');
                    handleApplyCoupon('NATAK10');
                  }}
                  className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono font-bold border border-amber-500/30"
                >
                  NATAK10 (१०% सूट)
                </button>
              </div>

              {couponMessage && (
                <p className="text-xs text-emerald-400 font-medium">{couponMessage}</p>
              )}
              {couponError && (
                <p className="text-xs text-rose-400 font-medium">{couponError}</p>
              )}
            </div>
          </div>

          {/* Payment Method Selector (Indian Gateway Simulator) */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              ३. पेमेंट पद्धत (Razorpay / Indian Gateway)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  paymentMethod === 'upi'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  paymentMethod === 'card'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  paymentMethod === 'netbanking'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building className="w-5 h-5 mb-1" />
                <span>NetBanking</span>
              </button>
            </div>

            {paymentMethod === 'upi' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="text-slate-400 block">
                  Google Pay, PhonePe, Paytm, BHIM UPI द्वारे त्वरित पेमेंट:
                </span>
                <input
                  type="text"
                  placeholder="आपला UPI ID प्रविष्ट करा (e.g. mobile@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>२५६-बिट सुरक्षित पेमेंट आणि पडताळणी</span>
            </span>
            <span className="font-extrabold text-base text-amber-400">
              ₹{(grandTotal / 100).toFixed(0)}
            </span>
          </div>

          <button
            disabled={isProcessing || timeLeft <= 0}
            onClick={handleConfirmPayment}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-xl transition cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>पेमेंट पडताळत आहे आणि QR तिकीट बनवत आहे...</span>
              </>
            ) : (
              <>
                <span>{t.payVia} • ₹{(grandTotal / 100).toFixed(0)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
