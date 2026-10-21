'use client';

import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/src/components/AdminPanel';
import { Language } from '@/src/lib/types';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck, Mail, Building2, Key, Eye, EyeOff } from 'lucide-react';

export default function AdminPage() {
  const [language] = useState<Language>('mr');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<'super_admin' | 'organizer' | 'scanner' | 'operations' | 'finance'>('super_admin');
  const [user, setUser] = useState<any>(null);

  // Login form state
  const [loginMode, setLoginMode] = useState<'admin_key' | 'organizer_login'>('admin_key');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const payload =
        loginMode === 'organizer_login'
          ? { email: email.trim(), username: email.trim(), password }
          : { password };

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
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">सुरक्षा प्रमाणीकरण तपासत आहे...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
        <div className="border-b border-[#E2E8F0] px-4 py-3 bg-white flex items-center justify-between shadow-xs">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[#EA580C] hover:text-[#C2410C] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>महाटिकिट मुख्य पृष्ठ (Back to MahaTicket)</span>
          </Link>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            MahaTicket Secure Portal
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-8 h-8 text-[#EA580C]" />
              </div>
              <h1 className="text-2xl font-black text-[#0F172A]">
                MahaTicket नियंत्रण कक्ष
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                आयोजक व प्रशासक अधिकृत पोर्टल • Secure Portal
              </p>
            </div>

            {/* Login Mode Switch */}
            <div className="flex rounded-2xl bg-slate-100 border border-slate-200 p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('admin_key');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'admin_key'
                    ? 'bg-[#EA580C] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'organizer_login'
                    ? 'bg-[#EA580C] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>आयोजक लॉगिन (Email)</span>
              </button>
            </div>

            <form onSubmit={handleLogin} className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
              {loginMode === 'organizer_login' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#EA580C]" />
                      वापरकर्तानाव / ईमेल / फोन (Username / Email / Mobile)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. swara_organizer किंवा contact@swara.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loginLoading}
                      autoComplete="username"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#EA580C]" />
                      पासवर्ड (Password)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="आपला पासवर्ड प्रविष्ट करा"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loginLoading}
                        autoComplete="current-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#EA580C]" />
                    प्रशासक मास्टर पासवर्ड (Admin Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter admin password (ADMIN_PASSWORD)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loginLoading}
                      autoComplete="current-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {loginError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold flex items-center gap-2">
                  <span>⚠</span>
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || !password || (loginMode === 'organizer_login' && !email)}
                className="w-full py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {loginLoading
                    ? 'प्रमाणीकरण करत आहे...'
                    : loginMode === 'organizer_login'
                    ? 'आयोजक डॅशबोर्ड उघडा (Login)'
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

  // Authenticated: Show admin panel with consistent light theme
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <div className="border-b border-[#E2E8F0] px-4 py-2.5 bg-white flex items-center justify-between shadow-xs">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-[#EA580C] hover:text-[#C2410C] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>महाटिकिट मुख्य पृष्ठ (Back to MahaTicket)</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-800 font-mono font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
            className="text-xs font-bold text-slate-600 hover:text-red-600 transition px-3 py-1 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 cursor-pointer"
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
