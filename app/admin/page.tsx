'use client';

import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/src/components/AdminPanel';
import { Language } from '@/src/lib/types';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck, Mail, Building2, Key } from 'lucide-react';

export default function AdminPage() {
  const [language] = useState<Language>('mr');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<'super_admin' | 'organizer' | 'scanner' | 'operations' | 'finance'>('super_admin');
  const [user, setUser] = useState<any>(null);

  // Login form state
  const [loginMode, setLoginMode] = useState<'admin_key' | 'organizer_login'>('admin_key');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        if (data.role) setRole(data.role);
        if (data.user) setUser(data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const payload = loginMode === 'organizer_login' ? { email, password } : { password };

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setIsAuthenticated(true);
        if (data.role) setRole(data.role);
        if (data.user) setUser(data.user);
        setPassword('');
        setEmail('');
      } else {
        setLoginError(data.error || 'प्रमाणीकरण अयशस्वी (Authentication failed)');
      }
    } catch (err: any) {
      setLoginError('लॉगिन त्रुटी: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setRole('super_admin');
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">सुरक्षा प्रमाणीकरण तपासत आहे...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
        <div className="border-b border-[#243044] px-4 py-2 bg-[#111827] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>महाटिकिट मुख्य पृष्ठ (Back to MahaTicket)</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            MahaTicket Secure Portal
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-white font-serif">
                MahaTicket नियंत्रण कक्ष
              </h1>
              <p className="text-sm text-slate-400">
                आयोजक व प्रशासक अधिकृत पोर्टल • Secure Portal
              </p>
            </div>

            {/* Login Mode Switch */}
            <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('admin_key');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  loginMode === 'admin_key'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>मास्टर पासवर्ड</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('organizer_login');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  loginMode === 'organizer_login'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>आयोजक लॉगिन (Email)</span>
              </button>
            </div>

            <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              {loginMode === 'organizer_login' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-400" />
                      नोंदणीकृत ईमेल (Organizer Email)
                    </label>
                    <input
                      type="email"
                      placeholder="उदा. contact@swara.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loginLoading}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      पासवर्ड (Password)
                    </label>
                    <input
                      type="password"
                      placeholder="आपला पासवर्ड प्रविष्ट करा"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loginLoading}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    प्रशासक मास्टर पासवर्ड (Admin Password)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter admin password (ADMIN_PASSWORD)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loginLoading}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>
              )}

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
                  ❌ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || !password || (loginMode === 'organizer_login' && !email)}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {loginLoading
                    ? 'प्रमाणीकरण करत आहे...'
                    : loginMode === 'organizer_login'
                    ? 'आयोजक डॅशबोर्ड उघडा'
                    : 'प्रशासक लॉगिन करा'}
                </span>
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 space-y-1">
              <p>🔐 Role-Based Access Control (RBAC): Organizers verify tickets & view seats</p>
              <p>आयोजक लॉगिनसाठी नोंदणीकृत खात्याचा ईमेल व पासवर्ड वापरा</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: Show admin panel
  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      <div className="border-b border-[#243044] px-4 py-2 bg-[#111827] flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>महाटिकिट मुख्य पृष्ठ (Back to MahaTicket)</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {role === 'organizer'
                ? `आयोजक: ${user?.fullName || 'Organizer'}`
                : role === 'scanner'
                ? 'गेट स्कॅनर (Gate Staff)'
                : 'मुख्य प्रशासक (Super Admin)'}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            लॉगआउट (Logout)
          </button>
        </div>
      </div>

      <div className="flex-1">
        <AdminPanel
          language={language}
          initialRole={role}
          currentUser={user}
          onBack={() => {
            window.location.href = '/';
          }}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
