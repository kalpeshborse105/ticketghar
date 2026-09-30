'use client';

import React, { useState } from 'react';
import { X, Mail, Phone, Loader2 } from 'lucide-react';
import { createClient } from '@/src/lib/supabase/client.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthStep = 'choose' | 'email-input' | 'email-verify' | 'phone-disabled';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('choose');
    setEmail('');
    setOtp('');
    setError('');
    setSuccessMessage('');
    setLoading(false);
    onClose();
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      setSuccessMessage('OTP sent to your email! Check your inbox.');
      setStep('email-verify');
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid or expired OTP');
        setLoading(false);
        return;
      }

      // Upsert user profile
      await fetch('/api/auth/profile/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: data.user.id,
          email: data.user.email,
          fullName: data.user.email?.split('@')[0] || 'Guest User',
        }),
      });

      setSuccessMessage('Login successful!');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
        window.location.reload(); // Refresh to update auth state
      }, 1000);
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to initiate Google sign-in');
        setLoading(false);
        return;
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err: any) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 'choose' && 'Sign In / Sign Up'}
            {step === 'email-input' && 'Sign In with Email'}
            {step === 'email-verify' && 'Verify OTP'}
            {step === 'phone-disabled' && 'Phone Sign In'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {/* Choose Method */}
          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('email-input')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <Mail className="w-5 h-5" />
                Continue with Email OTP
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                onClick={() => setStep('phone-disabled')}
                disabled
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-lg font-medium cursor-not-allowed"
              >
                <Phone className="w-5 h-5" />
                Continue with Phone
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By continuing, you agree to MahaTicket's Terms of Service and Privacy Policy
              </p>
            </div>
          )}

          {/* Email Input */}
          {step === 'email-input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>

              <button
                onClick={() => setStep('choose')}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Back to options
              </button>
            </div>
          )}

          {/* Email Verify */}
          {step === 'email-verify' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We've sent a 6-digit OTP to <strong>{email}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 transition disabled:opacity-50"
              >
                Resend OTP
              </button>

              <button
                onClick={() => {
                  setStep('email-input');
                  setOtp('');
                  setError('');
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Change email
              </button>
            </div>
          )}

          {/* Phone Disabled */}
          {step === 'phone-disabled' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Phone OTP requires SMS provider configuration</strong>
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  This feature will be available once the SMS service is set up. Please use Email or Google sign-in for now.
                </p>
              </div>

              <button
                onClick={() => setStep('choose')}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Back to options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
