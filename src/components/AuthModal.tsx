'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Lock,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Ticket,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMessage?: string;
}

type AuthStep = 'email' | 'password' | 'otp' | 'set-password';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMessage,
}) => {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<AuthStep>('email');

  useEffect(() => {
    setMounted(true);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setError('');
    setSuccessMessage('');
    setLoading(false);
    onClose();
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setError('');
    window.location.href = '/api/auth/google?direct=true';
  };

  // Step 1: Submit Email to check if password exists or OTP needed
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('कृपया वैध ईमेल पत्ता प्रविष्ट करा (Valid email required).');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/flow/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ईमेल तपासताना त्रुटी आली.');
        setLoading(false);
        return;
      }

      if (data.hasPassword) {
        // User already has a password set!
        setStep('password');
      } else {
        // User has blank password or first time -> send OTP immediately
        await triggerSendOtp();
      }
    } catch {
      setError('नेटवर्क त्रुटी आली. कृपया इंटरनेट तपासा.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/flow/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'OTP पाठवण्यात त्रुटी आली.');
        return;
      }
      if (process.env.NODE_ENV !== 'production' && data.devOtp) {
        setOtp(data.devOtp);
        setSuccessMessage('चाचणी कोड आपोआप भरला आहे (dev only)');
      } else {
        setSuccessMessage('६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे!');
      }
      setStep('otp');
    } catch {
      setError('OTP पाठवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Login with Password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('कृपया आपला पासवर्ड प्रविष्ट करा.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/flow/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsOtp) {
          setError(data.error);
          setTimeout(() => triggerSendOtp(), 1500);
          return;
        }
        setError(data.error || 'चुकीचा पासवर्ड.');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const userObj = data.user || { email, fullName: email.split('@')[0] };
        localStorage.setItem('mahaticket_user', JSON.stringify(userObj));
        if (data.token) {
          localStorage.setItem('mahaticket_token', data.token);
        }
        window.dispatchEvent(new CustomEvent('mahaticket_profile_updated', { detail: userObj }));
        window.dispatchEvent(new Event('auth_changed'));
      }

      setSuccessMessage('लॉगिन यशस्वी झाले! Redirecting...');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 700);
    } catch {
      setError('लॉगिन करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('कृपया ६-अंकी OTP कोड अचूक प्रविष्ट करा.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/flow/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'अवैध किंवा कालबाह्य OTP कोड.');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const userObj = data.user || { email, fullName: email.split('@')[0] };
        localStorage.setItem('mahaticket_user', JSON.stringify(userObj));
        if (data.token) {
          localStorage.setItem('mahaticket_token', data.token);
        }
        window.dispatchEvent(new CustomEvent('mahaticket_profile_updated', { detail: userObj }));
        window.dispatchEvent(new Event('auth_changed'));
      }

      if (data.needsPasswordSetup) {
        // User has blank password in DB -> prompt to set password now!
        setSuccessMessage('पडताळणी यशस्वी! आता आपला कायमस्वरूपी पासवर्ड तयार करा.');
        setStep('set-password');
      } else {
        setSuccessMessage('लॉगिन यशस्वी झाले! Redirecting...');
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 700);
      }
    } catch {
      setError('OTP पडताळणीमध्ये त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password & Save to DB
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('पासवर्ड किमान ६ अक्षरांचा असावा.');
      return;
    }

    if (password !== confirmPassword) {
      setError('दोन्ही पासवर्ड जुळत नाहीत (Passwords do not match).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/flow/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'पासवर्ड सेट करताना त्रुटी आली.');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const userObj = data.user || { email, fullName: email.split('@')[0] };
        localStorage.setItem('mahaticket_user', JSON.stringify(userObj));
        if (data.token) {
          localStorage.setItem('mahaticket_token', data.token);
        }
        window.dispatchEvent(new CustomEvent('mahaticket_profile_updated', { detail: userObj }));
        window.dispatchEvent(new Event('auth_changed'));
      }

      setSuccessMessage('पासवर्ड यशस्वीरीत्या सेट झाला! पुढील वेळी आपण थेट या पासवर्डने लॉगिन करू शकता.');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1000);
    } catch {
      setError('पासवर्ड सेट करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea580c] to-[#f97316] p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-orange-100">
              महाटिकिट लॉगिन
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-serif">
            {step === 'email' && 'आपल्या खात्यात प्रवेश करा'}
            {step === 'password' && 'पासवर्ड प्रविष्ट करा'}
            {step === 'otp' && 'ईमेल OTP पडताळणी'}
            {step === 'set-password' && 'नवीन पासवर्ड तयार करा'}
          </h2>

          <p className="text-xs text-orange-100 mt-1">
            {step === 'email' && 'तिकिटे पाहण्यासाठी व बुकिंग इतिहास तपासण्यासाठी'}
            {step === 'password' && `${email} या ईमेलसाठी आपला पासवर्ड टाका`}
            {step === 'otp' && `${email} वर पाठवलेला ६-अंकी कोड टाका`}
            {step === 'set-password' && 'पुढील वेळी थेट लॉगिन करण्यासाठी सुरक्षित पासवर्ड ठेवा'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-140px)] flex-1">
          {initialMessage && step === 'email' && !error && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-[#ea580c] font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{initialMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Email or Google Sign In */}
          {step === 'email' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google ने लॉगिन करा (Sign In with Google)</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">किंवा ईमेलने सुरू करा</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  आपला ईमेल पत्ता (Email Address):
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="उदा. yourname@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  आधी बुक केलेल्या तिकिटांचा ईमेल टाका, ज्यामुळे सर्व तिकिटे लगेच दिसतील.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>तपासत आहे...</span>
                  </>
                ) : (
                  <>
                    <span>पुढे जा (Continue)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

          {/* STEP 2A: Enter Existing Password */}
          {step === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    आपला पासवर्ड (Password):
                  </label>
                  <button
                    type="button"
                    onClick={triggerSendOtp}
                    className="text-[11px] font-bold text-[#ea580c] hover:underline"
                  >
                    पासवर्ड विसरलात? OTP मागवा
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="पासवर्ड प्रविष्ट करा"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>लॉगिन होत आहे...</span>
                  </>
                ) : (
                  <>
                    <span>लॉगिन करा (Sign In)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-slate-600 hover:text-slate-700"
                >
                  ← दुसरा ईमेल वापरा
                </button>
                <button
                  type="button"
                  onClick={triggerSendOtp}
                  className="text-[#ea580c] font-bold hover:underline"
                >
                  किंवा OTP द्वारे लॉगिन करा →
                </button>
              </div>
            </form>
          )}

          {/* STEP 2B: Enter 6-digit OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ईमेलवर आलेला ६-अंकी कोड (Enter 6-digit Code):
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="उदा. 482910"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-center tracking-[6px] font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600">
                  <span>कोड मिळाला नाही?</span>
                  <button
                    type="button"
                    onClick={triggerSendOtp}
                    disabled={loading}
                    className="text-[#ea580c] font-bold hover:underline"
                  >
                    पुन्हा कोड पाठवा (Resend)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>पडताळणी करत आहे...</span>
                  </>
                ) : (
                  <>
                    <span>कोड पडताळा (Verify Code)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-xs text-slate-600 hover:text-slate-700"
                >
                  ← ईमेल पत्ता बदला
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set Password if blank in DB */}
          {step === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नवीन पासवर्ड (New Password):
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoFocus
                    placeholder="किमान ६ अक्षरांचा पासवर्ड"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पासवर्डची पुष्टी करा (Confirm Password):
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="पुन्हा पासवर्ड प्रविष्ट करा"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>पासवर्ड जतन करत आहे...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>पासवर्ड जतन करा (Save Password)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
