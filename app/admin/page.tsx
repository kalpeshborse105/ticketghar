'use client';

import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/src/components/AdminPanel';
import { Language } from '@/src/lib/types';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const [language] = useState<Language>('mr');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    void checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError('Login error: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
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
          <p className="text-slate-400">Checking authentication...</p>
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
            Admin Authentication Required
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-white font-serif">
                MahaTicket Admin Portal
              </h1>
              <p className="text-sm text-slate-400">
                महाटिकिट नियंत्रण कक्ष • Secure Operations Console
              </p>
            </div>

            <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Admin Password
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

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
                  ❌ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || !password}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loginLoading ? 'Authenticating...' : 'Login to Admin Panel'}</span>
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 space-y-1">
              <p>🔐 Server-side session authentication with httpOnly cookies</p>
              <p>Configure ADMIN_PASSWORD in your .env file</p>
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
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authenticated
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1">
        <AdminPanel
          language={language}
          onBack={() => {
            window.location.href = '/';
          }}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
