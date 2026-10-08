'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/src/components/Header';
import { MTTicketLoader } from '@/src/components/ui/MTSkeleton';
import {
  User,
  Mail,
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
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/flow/session');
        const data = await res.json();

        if (!data.user) {
          router.push('/');
          return;
        }

        setUser(data.user);

        // Fetch user's orders
        const ordersRes = await fetch('/api/orders');
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || []);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/flow/logout', { method: 'POST' });
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
      <div className="mt-shell flex min-h-screen items-center justify-center">
        <MTTicketLoader
          message="आपले खाते लोड होत आहे..."
          submessage="महाटिकिट अधिकृत पोर्टल"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mt-shell pb-20 text-[#111827]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#ea580c] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>मुख्य पृष्ठावर परत जा (Back to Home)</span>
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#ea580c] to-[#f97316] px-6 py-8 text-white">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black font-serif">
                    {user.fullName || user.email?.split('@')[0]}
                  </h1>
                  <p className="text-orange-100 text-xs mt-0.5">{user.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                    महाटिकिट अधिकृत खाते
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'बाहेर पडत आहे...' : 'लॉगआउट'}</span>
              </button>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="p-6 space-y-8">
            {/* Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Mail className="w-4 h-4 text-[#ea580c]" />
                  <span>ईमेल पत्ता (Email)</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{user.email}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>खाते स्थिती (Account Status)</span>
                </div>
                <p className="text-sm font-bold text-emerald-700">सक्रिय व पडताळणीकृत (Active)</p>
              </div>
            </div>

            {/* Set / Change Password Section */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-orange-50/50 space-y-4">
              <div className="flex items-center gap-2 border-b border-orange-200/60 pb-3">
                <Lock className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    पासवर्ड सेट किंवा बदला (Set or Change Password)
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    पुढील वेळी थेट लॉगिन करण्यासाठी कायमस्वरूपी पासवर्ड तयार करा
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 focus:border-[#ea580c]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition active:scale-95"
                >
                  {savingPassword ? 'जतन करत आहे...' : 'पासवर्ड जतन करा (Save Password)'}
                </button>
              </form>
            </div>

            {/* Booked Tickets List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#ea580c]" />
                  <h3 className="text-base font-extrabold text-slate-900 font-serif">
                    माझी बुक केलेली तिकिटे ({orders.length})
                  </h3>
                </div>
                <Link
                  href="/"
                  className="text-xs font-bold text-[#ea580c] hover:underline"
                >
                  + नवीन तिकीट बुक करा
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-600 space-y-2">
                  <p className="text-sm font-bold text-slate-700">अद्याप कोणतेही तिकीट बुक केलेले नाही</p>
                  <p className="text-xs text-slate-600">
                    आपण बुक केलेल्या नाटकांची तिकिटे इथे आपोआप दिसून येतील.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold"
                    >
                      <span>नाटके व कार्यक्रम पहा</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => {
                    const firstTicket = ord.tickets?.[0];
                    const seats = (ord.tickets || []).map((t: any) => t.seatCode).join(', ');
                    const sessionDate = ord.session?.sessionStartTime
                      ? new Date(ord.session.sessionStartTime).toLocaleString('mr-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <div
                        key={ord.id}
                        className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#ea580c] transition"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#ea580c] font-black text-xs font-mono border border-orange-200">
                              {ord.orderNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-serif">
                              {ord.event?.titleMr || ord.event?.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#ea580c]" />
                              <span>{sessionDate}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ord.venue?.nameMr || ord.venue?.name}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-700">
                            <strong>जागा:</strong> {seats || '—'}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                          <span className="text-sm font-black text-slate-900">
                            ₹{(ord.grandTotal / 100).toFixed(0)}
                          </span>
                          {firstTicket && (
                            <Link
                              href={`/tickets/${firstTicket.ticketCode}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition shadow"
                            >
                              <span>तिकीट पहा</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
