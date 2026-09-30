'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, EventSessionItem } from '../lib/types.ts';
import { Language, translations } from '../lib/i18n.ts';
import {
  X,
  Clock,
  ShieldCheck,
  Tag,
  CreditCard,
  Smartphone,
  Building,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

// Razorpay TypeScript declarations
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

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script');
      setErrorMessage('Failed to load payment gateway. Please refresh the page.');
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

    if (!razorpayLoaded) {
      setErrorMessage('Payment gateway is loading. Please wait a moment and try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // Step 1: Create Razorpay order
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
        // Handle payment gateway not configured
        if (orderData.configured === false) {
          setErrorMessage(
            language === 'mr'
              ? 'पेमेंट गेटवे कॉन्फिगर केलेला नाही. कृपया सपोर्टशी संपर्क साधा.'
              : 'Payment gateway not configured. Please contact support.'
          );
          
          // Check if direct confirm is allowed (only for admin/QA)
          const allowDirectConfirm = process.env.NEXT_PUBLIC_ALLOW_DIRECT_CONFIRM === 'true';
          if (allowDirectConfirm) {
            console.warn('Payment gateway not configured but NEXT_PUBLIC_ALLOW_DIRECT_CONFIRM is true');
            // Do not auto-confirm; user must explicitly handle this in admin mode
          }
          setIsProcessing(false);
          return;
        }
        
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MahaTicket',
        description: `${language === 'mr' ? event.titleMr : event.title}`,
        order_id: orderData.orderId,
        prefill: {
          name: userName.trim(),
          email: userEmail.trim(),
          contact: userPhone.trim(),
        },
        theme: {
          color: '#ea580c',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setErrorMessage(
              language === 'mr'
                ? 'पेमेंट रद्द केले. कृपया पुन्हा प्रयत्न करा.'
                : 'Payment cancelled. Please try again.'
            );
          },
        },
        handler: async (response: any) => {
          try {
            // Step 3: Verify payment and confirm booking
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
                userPhone: userPhone.trim(),
                couponCode: couponInput || null,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // Success! Call the onSuccess callback
            onSuccess(verifyData);
          } catch (err: any) {
            console.error('Payment verification error:', err);
            setErrorMessage(
              err.message || 
              (language === 'mr' 
                ? 'पेमेंट पडताळणी अयशस्वी. कृपया सपोर्टशी संपर्क साधा.'
                : 'Payment verification failed. Please contact support.')
            );
            setIsProcessing(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Payment processing failed. Please retry.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 flex justify-end">
      <div className="relative w-full max-w-lg bg-[#111827] border-l border-[#243044] shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#243044] flex items-center justify-between bg-[#0a0e17]">
          <div>
            <h2 className="text-base font-bold text-white">
              {t.proceedToCheckout}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'mr' ? event.titleMr : event.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1a2333] text-slate-400 hover:text-white border border-[#243044] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hold Countdown Strip */}
        <div className="px-4 py-2 bg-[#1a2333] border-b border-[#243044] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.holdNotice}</span>
          </div>
          <span className="font-mono font-bold text-[#ea580c] bg-[#0a0e17] px-2 py-0.5 rounded border border-[#243044]">
            {formatCountdown(timeLeft)}
          </span>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#243044]">
          {/* 1. Customer Information */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              १. {t.contactDetails}
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="सचिन पाटील / Sachin Patil"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.email} * (तिकीट ईमेलवर पाठवले जाईल)
                </label>
                <input
                  type="email"
                  required
                  placeholder="sachin.patil@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.phone} * (तिकीट व्हॉट्सॲपवर पाठवले जाईल)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98233 44556"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>
          </div>

          {/* 2. Order Breakdown & Pricing */}
          <div className="p-4 space-y-3 bg-[#0a0e17]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              २. {t.ticketSummary}
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>
                  {t.faceValue} ({ticketCount} {language === 'mr' ? 'जागा' : 'seats'})
                </span>
                <span className="font-semibold text-white">
                  ₹{(faceValueTotal / 100).toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{t.convenienceFee}</span>
                <span>₹{(platformFeeTotal / 100).toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{t.tax}</span>
                <span>₹{(gstTotal / 100).toFixed(0)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>{t.couponDiscount}</span>
                  <span>-₹{(couponDiscount / 100).toFixed(0)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#243044] flex justify-between text-sm font-bold text-white">
                <span>{t.grandTotal}</span>
                <span className="text-base text-[#ea580c]">
                  ₹{(grandTotal / 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="कूपन कोड (e.g. MAHA50)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full bg-[#111827] border border-[#243044] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white uppercase placeholder-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="px-3 py-1.5 rounded-lg bg-[#1a2333] hover:bg-[#243044] text-[#ea580c] font-medium text-xs border border-[#243044] transition"
                >
                  {t.applyCoupon}
                </button>
              </div>

              {/* Quick Coupon Suggestions */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>ऑफर्स:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('MAHA50');
                    handleApplyCoupon('MAHA50');
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#ea580c]/10 hover:bg-[#ea580c]/20 text-[#ea580c] font-mono font-medium border border-[#ea580c]/30"
                >
                  MAHA50 (₹५० सूट)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('NATAK10');
                    handleApplyCoupon('NATAK10');
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#ea580c]/10 hover:bg-[#ea580c]/20 text-[#ea580c] font-mono font-medium border border-[#ea580c]/30"
                >
                  NATAK10 (१०% सूट)
                </button>
              </div>

              {couponMessage && (
                <p className="text-xs text-emerald-400 font-medium">{couponMessage}</p>
              )}
              {couponError && (
                <p className="text-xs text-red-400 font-medium">{couponError}</p>
              )}
            </div>
          </div>

          {/* 3. Payment Method Selector */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              ३. पेमेंट पद्धत (Razorpay Gateway)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                  paymentMethod === 'upi'
                    ? 'bg-[#ea580c]/10 border-[#ea580c] text-[#ea580c]'
                    : 'bg-[#0a0e17] border-[#243044] text-slate-400 hover:border-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                  paymentMethod === 'card'
                    ? 'bg-[#ea580c]/10 border-[#ea580c] text-[#ea580c]'
                    : 'bg-[#0a0e17] border-[#243044] text-slate-400 hover:border-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                  paymentMethod === 'netbanking'
                    ? 'bg-[#ea580c]/10 border-[#ea580c] text-[#ea580c]'
                    : 'bg-[#0a0e17] border-[#243044] text-slate-400 hover:border-slate-600'
                }`}
              >
                <Building className="w-4 h-4 mb-1" />
                <span>NetBanking</span>
              </button>
            </div>

            {paymentMethod === 'upi' && (
              <div className="p-3 bg-[#0a0e17] rounded-lg border border-[#243044] text-xs space-y-1.5">
                <span className="text-slate-400 block">
                  Google Pay, PhonePe, Paytm, BHIM UPI द्वारे त्वरित पेमेंट:
                </span>
                <input
                  type="text"
                  placeholder="आपला UPI ID प्रविष्ट करा (e.g. mobile@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-[#111827] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 border-t border-[#243044] bg-[#0a0e17] space-y-2.5 safe-bottom">
          {errorMessage && (
            <div className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>सुरक्षित पेमेंट आणि त्वरित QR तिकीट</span>
            </span>
            <span className="font-bold text-sm text-[#ea580c]">
              ₹{(grandTotal / 100).toFixed(0)}
            </span>
          </div>

          <button
            disabled={isProcessing || timeLeft <= 0}
            onClick={handleConfirmPayment}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-98"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
