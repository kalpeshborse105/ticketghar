'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/src/components/Header';
import { MTTicketLoader } from '@/src/components/ui/MTSkeleton';
import { AuthModal } from '@/src/components/AuthModal';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import {
  User,
  Mail,
  Phone,
  LogOut,
  Loader2,
  ArrowLeft,
  Ticket,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  ShoppingBag,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  // Editable Profile fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/flow/session', { cache: 'no-store' });
        const data = await res.json();

        if (isCancelled) return;

        if (data && data.user) {
          setUser(data.user);
          setFullName(data.user.fullName || '');
          setPhoneNumber(data.user.phoneNumber || '');

          // Load local avatar if stored
          if (typeof window !== 'undefined') {
            const savedAvatar = localStorage.getItem(`mahaticket_avatar_${data.user.email}`);
            if (savedAvatar) setAvatarUrl(savedAvatar);
          }

          // Fetch user's orders
          try {
            const ordersRes = await fetch('/api/orders', { cache: 'no-store' });
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              if (!isCancelled) {
                setOrders(ordersData.orders || []);
              }
            }
          } catch {
            // Keep default empty orders
          }
        }
      } catch (error) {
        console.warn('Error loading profile:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, []);

  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileNotice('कृपया २ MB पेक्षा लहान फोटो निवडा (Please choose an image under 2MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        if (typeof window !== 'undefined') {
          if (user?.email) {
            localStorage.setItem(`mahaticket_avatar_${user.email}`, dataUrl);
          }
          localStorage.setItem('mahaticket_user_avatar', dataUrl);
          window.dispatchEvent(
            new CustomEvent('mahaticket_profile_updated', {
              detail: { ...(user || {}), avatarUrl: dataUrl },
            })
          );
        }
        try {
          const res = await fetch('/api/auth/flow/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: dataUrl }),
          });
          const d = await res.json();
          if (res.ok && d.user) {
            setUser(d.user);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('mahaticket_profile_updated', {
                  detail: d.user,
                })
              );
            }
          }
          setProfileSuccessMsg('प्रोफाइल फोटो यशस्वीरीत्या बदलला व जतन झाला!');
        } catch {
          setProfileSuccessMsg('प्रोफाइल फोटो बदलला!');
        }
        setTimeout(() => setProfileSuccessMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/flow/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          if (data.user.avatarUrl) {
            localStorage.setItem('mahaticket_user_avatar', data.user.avatarUrl);
          }
          window.dispatchEvent(
            new CustomEvent('mahaticket_profile_updated', {
              detail: data.user,
            })
          );
        }
        setProfileSuccessMsg('प्रोफाइल माहिती यशस्वीरीत्या जतन केली!');
      } else {
        setProfileSuccessMsg(data.error || 'माहिती जतन करता आली नाही.');
      }
    } catch {
      setProfileSuccessMsg('माहिती जतन करताना त्रुटी आली.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/flow/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'पासवर्ड किमान ६ अक्षरांचा असावा.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'दोन्ही पासवर्ड जुळत नाहीत.' });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus(null);

    try {
      const res = await fetch('/api/auth/flow/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({ type: 'error', message: data.error || 'पासवर्ड सेट करता आला नाही.' });
      } else {
        setPasswordStatus({ type: 'success', message: 'आपला नवीन पासवर्ड यशस्वीरीत्या जतन केला आहे!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordStatus({ type: 'error', message: 'पासवर्ड बदलताना त्रुटी आली.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <MTTicketLoader
            message="आपले खाते लोड होत आहे..."
            submessage="महाटिकिट डिजिटल खाते"
          />
        </div>
      </div>
    );
  }

  // If user is not logged in, show helpful guest state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#141B2B]">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-[#EA580C] mx-auto flex items-center justify-center shadow-xs">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            आपले खाते पाहण्यासाठी लॉगिन करा
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            तिकिटे व्यवस्थापित करण्यासाठी आणि प्रोफाइल अद्ययावत करण्यासाठी कृपया आपल्या खात्यात प्रवेश करा.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              लॉगिन किंवा नवीन खाते
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              मुख्य पृष्ठावर जा
            </Link>
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2B] pb-20">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#ea580c] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>मुख्य पृष्ठावर परत जा (Back to Home)</span>
        </button>

        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#C2410C] px-6 py-8 text-white">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Avatar with Upload overlay */}
                <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center backdrop-blur-sm border-2 border-white/40 shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  {/* Permanent visible edit icon badge */}
                  <div
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-[#c2410c] transition active:scale-95"
                    title="फोटो बदला (Edit Photo)"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-black font-serif">
                    {fullName || user.fullName || user.email?.split('@')[0]}
                  </h1>
                  <p className="text-orange-100 text-xs mt-0.5">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                      महाटिकिट डिजिटल खाते
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-white/90 underline hover:text-white"
                    >
                      फोटो बदला
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'बाहेर पडत आहे...' : 'लॉगआउट'}</span>
              </button>
            </div>
          </div>

          {/* Form: Editable Name & Phone Number */}
          <div className="p-6 space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#EA580C]" />
                  <span>वैयक्तिक तपशील (Personal Details)</span>
                </h2>
                {profileSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {profileSuccessMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पूर्ण नाव (Full Name):
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="उदा. सचिन पाटील"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40 focus:border-[#EA580C] transition"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    मोबाईल नंबर (Phone Number):
                  </label>
                  <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#EA580C]/40 focus-within:border-[#EA580C] transition">
                    <span className="px-3 py-2 bg-slate-50 text-slate-600 font-bold text-xs border-r border-slate-200">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98233 44556"
                      className="w-full px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Read-only Email */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      ईमेल पत्ता (Email - Read-only):
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      पडताळणीकृत खाते
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 cursor-not-allowed font-mono"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>बदल जतन करा (Save Changes)</span>
                </button>
              </div>
            </form>

            {/* Change Password Section */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-orange-50/40 space-y-4">
              <div className="flex items-center gap-2 border-b border-orange-200/60 pb-3">
                <Lock className="w-4 h-4 text-[#EA580C]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    पासवर्ड सेट किंवा बदला (Change Password)
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    थेट लॉगिन करण्यासाठी कायमस्वरूपी पासवर्ड तयार करा
                  </p>
                </div>
              </div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      नवीन पासवर्ड (New Password):
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="किमान ६ अक्षरे"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      पुन्हा पासवर्ड टाका (Confirm):
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="पुष्टीसाठी पुन्हा टाका"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingPassword ? 'जतन होत आहे...' : 'पासवर्ड अपडेट करा'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Booking History Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#EA580C]" />
              <h2 className="text-sm font-bold text-slate-900">
                माझा बुकिंग इतिहास (Booking History)
              </h2>
            </div>
            <Link
              href="/my-tickets"
              className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
            >
              <span>सर्व तिकिटे पहा</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-500">आपण अद्याप कोणतेही तिकीट बुक केलेले नाही.</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 rounded-xl bg-[#EA580C] text-white text-xs font-bold shadow-xs transition hover:bg-[#C2410C]"
              >
                कार्यक्रम पहा व बुक करा
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((ord) => {
                const seats = (ord.tickets || []).map((t: any) => t.seatCode).join(', ');
                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">
                        {ord.event?.titleMr || ord.event?.title || 'कार्यक्रम'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ऑर्डर #{ord.orderNumber} • आसने: {seats || 'आरक्षित'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-xs font-bold text-[#EA580C] font-mono">
                        ₹{((ord.grandTotal || 0) / 100).toFixed(0)}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedPass({
                            order: ord,
                            tickets: ord.tickets || [],
                            event: ord.event,
                            pricing: {},
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        पास उघडा
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedPass && (
        <TicketPassModal
          bookingResult={selectedPass}
          language="mr"
          onClose={() => setSelectedPass(null)}
        />
      )}

      {profileNotice && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 transform transition-all scale-100">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">माहिती / सूचना</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{profileNotice}</p>
            <button
              onClick={() => setProfileNotice(null)}
              className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#A33900] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              ठीक आहे (OK)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
