'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, EventSessionItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Clock,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Tag,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const [userAge, setUserAge] = useState('');

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRazorpayLoaded] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.warn('Razorpay script could not load — UPI QR & Counter fallback active');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Hold Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(480);

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

  // Submit payment & confirm booking via real Razorpay
  const handleConfirmPayment = async () => {
    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);

    if (!userName.trim() || !userEmail.trim() || !cleanPhone) {
      setErrorMessage(
        language === 'mr'
          ? 'कृपया आपले पूर्ण नाव, ईमेल आणि मोबाईल नंबर भरा.'
          : 'Please enter your full name, email and phone number.'
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage(
        language === 'mr'
          ? 'कृपया वैध १०-अंकी भारतीय मोबाईल नंबर प्रविष्ट करा (६ ते ९ ने सुरू होणारा).'
          : 'Please enter a valid 10-digit Indian mobile number starting with 6-9.'
      );
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage(
        language === 'mr'
          ? 'जागेचे आरक्षण संपले आहे. कृपया पुन्हा जागा निवडा.'
          : 'Hold reservation has expired. Please reselect seats.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // Step 1: Create real Razorpay order on server
      const createOrderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          seatIds: holdData.seatIds,
          couponCode: couponInput || null,
        }),
      });

      const orderData = await createOrderRes.json();

      if (!createOrderRes.ok) {
        throw new Error(orderData.error || 'पेमेंट ऑर्डर तयार करता आली नाही.');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay गेटवे लोड होत आहे. कृपया २ सेकंद थांबा आणि पुन्हा प्रयत्न करा.');
      }

      // Step 2: Open official Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MahaTicket (महाटिकिट)',
        description: `${language === 'mr' ? event.titleMr || event.title : event.title}`,
        order_id: orderData.orderId,
        prefill: {
          name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          contact: `+91${cleanPhone}`,
        },
        theme: {
          color: '#ea580c',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setErrorMessage(
              language === 'mr'
                ? 'पेमेंट रद्द केले. आपण पुन्हा प्रयत्न करू शकता.'
                : 'Payment was cancelled. You can retry anytime before hold expires.'
            );
          },
        },
        handler: async (response: any) => {
          try {
            // Step 3: Server-side cryptographic signature verification
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                sessionId: session.id,
                eventId: event.id,
                seatIds: holdData.seatIds,
                userName: userName.trim(),
                userEmail: userEmail.trim().toLowerCase(),
                userPhone: cleanPhone,
                couponCode: couponInput || null,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            onSuccess(verifyData);
          } catch (err: any) {
            console.error('Payment verification error:', err);
            setErrorMessage(err.message || 'पेमेंट पडताळणी अयशस्वी.');
            setIsProcessing(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error('Booking processing error:', err);
      setErrorMessage(err.message || 'पेमेंट सुरू करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden">
        
        {/* Drawer Header (BookMyShow / Cinemax Style Orange & White) */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#ea580c] text-white">
                MahaTicket
              </span>
              <h2 className="text-base font-black truncate max-w-[240px] sm:max-w-xs">
                {language === 'mr' ? event.titleMr || event.title : event.title}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {holdData.seatIds.length} {language === 'mr' ? 'जागा आरक्षित' : 'Seats Selected'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hold Countdown Banner */}
        <div className="px-5 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#ea580c] font-bold">
            <Clock className="w-4 h-4" />
            <span>{t.holdNotice}</span>
          </div>
          <span className="font-mono font-black text-white bg-[#ea580c] px-2.5 py-0.5 rounded-full text-xs shadow-sm">
            {formatCountdown(timeLeft)}
          </span>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
          
          {/* 1. Attendee Contact Details */}
          <div className="p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#ea580c] flex items-center gap-1.5">
                <span>१. ग्राहक व तिकीट संपर्क तपशील</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">Instant M-Ticket</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="सचिन पाटील / Sachin Patil"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.phone} * (WhatsApp)
                  </label>
                  <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-[#ea580c]/50 focus-within:border-[#ea580c] transition">
                    <span className="px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs flex items-center border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98233 44556"
                      value={userPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setUserPhone(digits);
                      }}
                      className="w-full bg-transparent px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">१०-अंकी भारतीय मोबाईल नंबर</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    वय / Age (पर्यायी)
                  </label>
                  <input
                    type="number"
                    placeholder="उदा. 32"
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.email} * (M-Ticket व PDF पाठवण्यासाठी)
                </label>
                <input
                  type="email"
                  required
                  placeholder="sachin.patil@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                />
              </div>
            </div>
          </div>

          {/* 2. Order Breakdown & Pricing */}
          <div className="p-5 space-y-3 bg-white">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#ea580c]">
              २. {t.ticketSummary} ({ticketCount} {language === 'mr' ? 'जागा' : 'seats'})
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>{t.faceValue} ({ticketCount} Tickets)</span>
                <span className="font-bold text-slate-900 font-mono">
                  ₹{(faceValueTotal / 100).toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>{t.convenienceFee}</span>
                <span className="font-mono">₹{(platformFeeTotal / 100).toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>{t.tax} (GST 18%)</span>
                <span className="font-mono">₹{(gstTotal / 100).toFixed(0)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t.couponDiscount}</span>
                  <span className="font-mono">-₹{(couponDiscount / 100).toFixed(0)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-black text-slate-950">
                <span>{t.grandTotal}</span>
                <span className="text-base text-[#ea580c] font-mono">
                  ₹{(grandTotal / 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Coupon Code Box */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="कूपन कोड (उदा. MAHA50)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 uppercase font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="px-4 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#ea580c] font-black text-xs transition active:scale-95"
                >
                  {t.applyCoupon}
                </button>
              </div>

              {/* Quick coupons */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>ऑफर:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('MAHA50');
                    handleApplyCoupon('MAHA50');
                  }}
                  className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono"
                >
                  MAHA50 (₹५० सूट)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('NATAK10');
                    handleApplyCoupon('NATAK10');
                  }}
                  className="px-2 py-0.5 rounded-full bg-orange-50 text-[#ea580c] border border-orange-200 font-bold font-mono"
                >
                  NATAK10 (१०% सूट)
                </button>
              </div>

              {couponMessage && (
                <p className="text-xs text-emerald-600 font-bold">{couponMessage}</p>
              )}
              {couponError && (
                <p className="text-xs text-red-600 font-medium">{couponError}</p>
              )}
            </div>
          </div>

          {/* 3. Official Razorpay Payment Trust Section */}
          <div className="p-5 space-y-3 bg-white">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#ea580c]">
              ३. सुरक्षित पेमेंट (Official Razorpay Gateway)
            </h3>

            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Razorpay सुरक्षित पेमेंट गेटवे</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  100% Verified
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                'पेमेंट करा' बटणावर क्लिक केल्यावर अधिकृत Razorpay पेमेंट विंडो उघडेल. आपण UPI (Google Pay, PhonePe, Paytm), क्रेडिट/डेबिट कार्ड, किंवा नेट बँकिंगद्वारे सुरक्षित पेमेंट करू शकता.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 font-medium">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">⚡ UPI / QR</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">💳 Cards</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">🏛️ NetBanking</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">📱 Wallets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3 safe-bottom">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>सुरक्षित बुकिंग व त्वरित QR पास</span>
            </span>
            <span className="font-black text-base text-[#ea580c] font-mono">
              ₹{(grandTotal / 100).toFixed(0)}
            </span>
          </div>

          <button
            disabled={isProcessing || timeLeft <= 0}
            onClick={handleConfirmPayment}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-500/25 transition active:scale-98"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>पेमेंट विंडो उघडत आहे...</span>
              </>
            ) : (
              <>
                <span>
                  {language === 'mr'
                    ? `पेमेंट करा (Razorpay) 🔒 · ₹${(grandTotal / 100).toFixed(0)}`
                    : `Pay Securely · ₹${(grandTotal / 100).toFixed(0)}`}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
