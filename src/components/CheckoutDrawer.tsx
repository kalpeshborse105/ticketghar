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
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { CONCESSION_MENU, addonTotalPaise } from '@/src/lib/concessions';

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
    holdToken?: string;
    addons?: Array<{ id: string; qty: number }>;
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

  // Booking Authentication State (Section 19 Parity)
  const [authUser, setAuthUser] = useState<any>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'otp' | 'password' | 'set_password'>('idle');
  const [authOtp, setAuthOtp] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check active session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/flow/session');
        const data = await res.json();
        if (data?.user) {
          setAuthUser(data.user);
          setUserName((prev) => prev || data.user.fullName || '');
          setUserEmail((prev) => prev || data.user.email || '');
          if (data.user.phoneNumber) setUserPhone((prev) => prev || data.user.phoneNumber);
          setIsEmailVerified(true);
        }
      } catch { }
    })();
  }, []);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRazorpayLoaded] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const handleRequestClose = () => {
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = async () => {
    try {
      setIsReleasing(true);
      await fetch('/api/bookings/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          holdToken: holdData.holdToken,
          seatIds: holdData.seatIds,
        }),
      });
    } catch (e) {
      console.warn('Failed to release hold:', e);
    } finally {
      setIsReleasing(false);
      setShowDiscardConfirm(false);
      onClose();
    }
  };

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.warn('Razorpay script could not load');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Hold Countdown Timer (Synchronized with authoritative backend expiry)
  const [activeHoldExpiresAt, setActiveHoldExpiresAt] = useState<string>(holdData.holdExpiresAt);

  useEffect(() => {
    if (holdData.holdExpiresAt) {
      setActiveHoldExpiresAt(holdData.holdExpiresAt);
    }
  }, [holdData.holdExpiresAt]);

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const expireTime = new Date(holdData.holdExpiresAt).getTime();
    return isNaN(expireTime) ? 300 : Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!activeHoldExpiresAt) return;
    const expireTime = new Date(activeHoldExpiresAt).getTime();
    if (isNaN(expireTime)) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHoldExpiresAt]);

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

  // Apply Coupon (Section 14)
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

  // Remove Coupon (Section 15: Immediately clears state and restores original total)
  const handleRemoveCoupon = () => {
    setCouponInput('');
    setCouponApplied(null);
    setCouponDiscount(0);
    setCouponMessage(null);
    setCouponError(null);
  };

  // Initiate Email Auth flow for unverified users
  const handleInitiateEmailAuth = async () => {
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setErrorMessage(language === 'mr' ? 'कृपया वैध ईमेल प्रविष्ट करा.' : 'Please enter a valid email.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const checkRes = await fetch('/api/auth/flow/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const checkData = await checkRes.json();
      if (checkData.hasPassword) {
        setAuthStep('password');
        setAuthMessage(
          language === 'mr'
            ? 'हा ईमेल आधीच नोंदणीकृत आहे. कृपया आपला पासवर्ड टाका किंवा OTP मागवा.'
            : 'Email already registered. Enter password or request OTP.'
        );
      } else {
        const otpRes = await fetch('/api/auth/flow/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const otpData = await otpRes.json();
        if (!otpRes.ok) throw new Error(otpData.error || 'OTP पाठवता आला नाही.');
        if (process.env.NODE_ENV !== 'production' && otpData.devOtp) {
          setAuthOtp(otpData.devOtp);
        }
        setAuthStep('otp');
        setAuthMessage(
          process.env.NODE_ENV !== 'production' && otpData.devOtp
            ? `चाचणी कोड भरला (dev)`
            : language === 'mr'
              ? '६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे!'
              : 'Verification code sent to your email!'
        );
      }
    } catch (err: any) {
      setAuthError(err.message || 'त्रुटी आली.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!authOtp || authOtp.length < 6) {
      setAuthError(language === 'mr' ? 'कृपया ६-अंकी OTP टाका.' : 'Please enter 6-digit OTP.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const res = await fetch('/api/auth/flow/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: authOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'अवैध OTP कोड.');
      if (data.needsPasswordSetup) {
        setAuthStep('set_password');
        setAuthMessage(
          language === 'mr'
            ? 'OTP पडताळणी यशस्वी! भविष्यातील बुकिंगसाठी सुरक्षित पासवर्ड तयार करा.'
            : 'OTP verified! Create a secure password for future logins.'
        );
      } else {
        setIsEmailVerified(true);
        setAuthStep('idle');
        setAuthMessage(language === 'mr' ? 'ईमेल यशस्वीरीत्या पडताळला!' : 'Email verified!');
      }
    } catch (err: any) {
      setAuthError(err.message || 'पडताळणी अयशस्वी.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!authPassword || authPassword.length < 6) {
      setAuthError(language === 'mr' ? 'पासवर्ड किमान ६ अक्षरांचा असावा.' : 'Password must be at least 6 characters.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError(language === 'mr' ? 'दोन्ही पासवर्ड जुळत नाहीत.' : 'Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const res = await fetch('/api/auth/flow/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पासवर्ड जतन करता आला नाही.');
      setIsEmailVerified(true);
      setAuthStep('idle');
      setAuthMessage(language === 'mr' ? 'खाते व पासवर्ड तयार झाले! आता पेमेंट करा.' : 'Account created! Proceed to payment.');
    } catch (err: any) {
      setAuthError(err.message || 'त्रुटी आली.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!authPassword) {
      setAuthError(language === 'mr' ? 'कृपया पासवर्ड प्रविष्ट करा.' : 'Please enter password.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const res = await fetch('/api/auth/flow/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'अवैध पासवर्ड.');
      setIsEmailVerified(true);
      setAuthStep('idle');
      setAuthMessage(language === 'mr' ? 'लॉगिन यशस्वी!' : 'Login successful!');
    } catch (err: any) {
      setAuthError(err.message || 'लॉगिन अयशस्वी.');
    } finally {
      setAuthLoading(false);
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
          holdToken: holdData.holdToken,
        }),
      });

      const orderData = await createOrderRes.json();

      if (!createOrderRes.ok) {
        throw new Error(orderData.error || 'पेमेंट ऑर्डर तयार करता आली नाही.');
      }

      // Synchronize client countdown with server-authoritative 10-minute extended hold
      if (orderData.holdExpiresAt) {
        const parsed = new Date(orderData.holdExpiresAt).getTime();
        if (!isNaN(parsed) && parsed > Date.now()) {
          setActiveHoldExpiresAt(orderData.holdExpiresAt);
          setTimeLeft(Math.max(0, Math.floor((parsed - Date.now()) / 1000)));
        }
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
            setShowDiscardConfirm(false);
            setErrorMessage(
              language === 'mr'
                ? 'पेमेंट प्रक्रिया रद्द केली. आपण पुन्हा प्रयत्न करू शकता.'
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

            setShowDiscardConfirm(false);
            // Keep locked while seamlessly transitioning to Ticket Pass
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
            <p className="text-xs text-orange-300 font-semibold mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0 text-[#ea580c]" />
              <span>
                {session?.sessionStartTime
                  ? `${new Date(session.sessionStartTime).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })} • ${new Date(session.sessionStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : (language === 'mr' ? 'तारीख व वेळ निश्चित' : 'Date & time confirmed')}
              </span>
              <span className="text-slate-400 font-normal">• {holdData.seatIds.length} {language === 'mr' ? 'जागा' : 'seats'}</span>
            </p>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
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
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">
                थेट बुकिंग (Guest Checkout)
              </span>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-pulse">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{language === 'mr' ? '🔒 पेमेंट सुरू आहे... आपली माहिती लॉक केली आहे.' : '🔒 Payment processing... Details locked.'}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  placeholder="सचिन पाटील / Sachin Patil"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.phone} * (WhatsApp)
                  </label>
                  <div className={`flex rounded-xl border border-slate-300 overflow-hidden transition ${isProcessing ? 'bg-slate-100 opacity-80' : 'bg-slate-50 focus-within:ring-2 focus-within:ring-[#ea580c]/50 focus-within:border-[#ea580c]'}`}>
                    <span className="px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs flex items-center border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      disabled={isProcessing}
                      maxLength={10}
                      placeholder="98233 44556"
                      value={userPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setUserPhone(digits);
                      }}
                      className="w-full bg-transparent px-3 py-2 text-xs text-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed placeholder-slate-400 focus:outline-none font-mono"
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
                    disabled={isProcessing}
                    placeholder="उदा. 32"
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value)}
                    className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.email} * (M-Ticket व खात्यासाठी)
                </label>
                <input
                  type="email"
                  required
                  disabled={isProcessing}
                  placeholder="sachin.patil@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:border-[#ea580c] transition"
                />
              </div>

              {/* Inline Auth Messages */}
              {authMessage && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
                  {authMessage}
                </p>
              )}
              {authError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl font-medium">
                  {authError}
                </p>
              )}

              {/* STEP A: OTP Verification */}
              {authStep === 'otp' && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span>ईमेलवर आलेला ६-अंकी OTP टाका</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleInitiateEmailAuth}
                      disabled={authLoading}
                      className="text-[10px] text-[#ea580c] font-bold hover:underline"
                    >
                      पुन्हा पाठवा
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={authOtp}
                      onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={authLoading || authOtp.length < 6}
                      className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {authLoading ? '...' : 'पडताळा'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP B: Password Creation (for new users) */}
              {authStep === 'set_password' && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>नवीन पासवर्ड तयार करा (Create Password)</span>
                  </span>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="पासवर्ड (किमान ६ अक्षरे)"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 pr-9 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="पासवर्ड पुष्टी करा (Confirm Password)"
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 pr-9 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={authLoading || !authPassword || !authConfirmPassword}
                      className="w-full py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {authLoading ? 'जतन होत आहे...' : 'पासवर्ड जतन करा व पुढे जा'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP C: Password Login (for existing users) */}
              {authStep === 'password' && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>आपला पासवर्ड टाका (Enter Password)</span>
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="पासवर्ड"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 pr-9 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handlePasswordLogin}
                      disabled={authLoading || !authPassword}
                      className="px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {authLoading ? '...' : 'लॉगिन करा'}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        const otpRes = await fetch('/api/auth/flow/send-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: userEmail.trim().toLowerCase() }),
                        });
                        const otpData = await otpRes.json();
                        if (process.env.NODE_ENV !== 'production' && otpData.devOtp) {
                          setAuthOtp(otpData.devOtp);
                        }
                        setAuthStep('otp');
                        setAuthMessage('OTP पाठवला आहे.');
                      }}
                      className="text-[10px] text-[#ea580c] font-bold hover:underline"
                    >
                      पासवर्ड विसरलात? OTP द्वारे लॉगिन करा
                    </button>
                  </div>
                </div>
              )}
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

              {(holdData.addons || []).map((a) => {
                const item = CONCESSION_MENU.find((c) => c.id === a.id);
                if (!item || a.qty < 1) return null;
                return (
                  <div key={a.id} className="flex justify-between text-slate-600">
                    <span>
                      {item.emoji} {language === 'mr' ? item.nameMr : item.nameEn} ×{a.qty}
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({language === 'mr' ? 'काउंटर' : 'counter'})
                      </span>
                    </span>
                    <span className="font-mono">
                      ₹{((item.pricePaise * a.qty) / 100).toFixed(0)}
                    </span>
                  </div>
                );
              })}
              {addonTotalPaise(holdData.addons || []) > 0 ? (
                <p className="text-[10px] text-amber-700 bg-amber-50 rounded-md px-2 py-1">
                  {language === 'mr'
                    ? 'स्नॅक्स काउंटरवर द्या · तिकीट पेमेंटमध्ये समाविष्ट नाही'
                    : 'Snacks paid at counter · not in ticket payment'}
                </p>
              ) : null}

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

            {/* Coupon Code Box with Real-time Remove Action (Section 14 & 15) */}
            <div className="space-y-2">
              {couponApplied ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 font-mono">{couponApplied} लागू झाले</span>
                      <span className="text-emerald-700 ml-1">(-₹{(couponDiscount / 100).toFixed(0)})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-red-600 hover:bg-red-50 font-bold text-xs transition cursor-pointer"
                  >
                    काढा (Remove)
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="कूपन कोड"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 uppercase font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#ea580c] font-black text-xs transition active:scale-95 cursor-pointer"
                  >
                    {t.applyCoupon}
                  </button>
                </div>
              )}

              {couponMessage && !couponApplied && (
                <p className="text-xs text-emerald-600 font-bold">{couponMessage}</p>
              )}
              {couponError && (
                <p className="text-xs text-red-600 font-medium">{couponError}</p>
              )}

              {/* Available Checkout Offers / Promo Discounts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>{language === 'mr' ? 'उपलब्ध ऑफर्स व सवलती' : 'Available Offers'}</span>
                </span>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {[
                    {
                      code: 'NATAK10',
                      descMr: '१०% सवलत (कमाल ₹१०० पर्यंत)',
                      descEn: '10% off (up to ₹100)',
                    },
                    {
                      code: 'MAHA20',
                      descMr: '२०% सवलत (मर्यादित ऑफर)',
                      descEn: '20% festive discount',
                    },
                    {
                      code: 'MAHA50',
                      descMr: '₹५० थेट सवलत (किमान ₹३००)',
                      descEn: 'Flat ₹50 off on ₹300+',
                    },
                  ].map((offer) => {
                    const isCurrent = couponApplied === offer.code;
                    return (
                      <div
                        key={offer.code}
                        onClick={() => {
                          if (!isCurrent) {
                            setCouponInput(offer.code);
                            handleApplyCoupon(offer.code);
                          }
                        }}
                        className={`p-2 rounded-xl border transition cursor-pointer text-left flex items-center justify-between ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                            : 'bg-orange-50/50 border-orange-200/70 hover:bg-orange-100/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono font-bold text-xs text-[#ea580c] block">
                            {offer.code}
                          </span>
                          <span className="text-[10px] text-slate-600 block truncate">
                            {language === 'mr' ? offer.descMr : offer.descEn}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ml-1.5 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-[#ea580c] border border-orange-300'
                          }`}
                        >
                          {isCurrent
                            ? language === 'mr'
                              ? 'लागू'
                              : 'Applied'
                            : language === 'mr'
                              ? 'लागू करा'
                              : 'Apply'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Official Razorpay Payment Trust Section (Clean & Minimal - Section 12 Parity) */}
          <div className="p-5 bg-white">
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>सुरक्षित पेमेंट (Secure Payment powered by Razorpay)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">256-Bit SSL</span>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3">
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

      {/* Discard Booking Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141B2B]">
                {language === 'mr' ? 'बुकिंग रद्द करायची आहे का?' : 'Cancel Booking Session?'}
              </h3>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                {language === 'mr'
                  ? 'आपण मागे गेल्यास आपल्या निवडलेल्या जागा तात्काळ मोकळ्या केल्या जातील आणि इतर प्रेक्षकांसाठी उपलब्ध होतील.'
                  : 'If you leave now, your held seats will be released immediately and made available for others.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => setShowDiscardConfirm(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {language === 'mr' ? 'बुकिंग सुरू ठेवा' : 'Keep Booking'}
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={handleConfirmDiscard}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>सोडत आहे...</span>
                  </>
                ) : (
                  <span>{language === 'mr' ? 'होय' : 'Yes'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
