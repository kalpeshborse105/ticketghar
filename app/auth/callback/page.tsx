'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('प्रमाणीकरण पूर्ण करत आहे... (Processing authentication)');

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code') || '';
        const stateRaw = searchParams.get('state') || '';
        let source = 'web';
        try {
          if (stateRaw) {
            const parsed = JSON.parse(atob(stateRaw));
            if (parsed.source) source = parsed.source;
          }
        } catch {
          // keep source web
        }

        if (!code) {
          setStatus('error');
          setMessage('कोणताही ऑथ कोड आढळला नाही (No auth code received)');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        // Call server-side exchange route which handles both Supabase SSR & Google OAuth tokens
        const exchangeRes = await fetch('/api/auth/flow/oauth-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, source }),
        });

        const data = await exchangeRes.json().catch(() => null);

        if (!exchangeRes.ok || !data?.success || !data?.user) {
          throw new Error(data?.error || 'प्रमाणीकरण अयशस्वी झाले (Authentication failed)');
        }

        if (cancelled) return;

        // Save session locally
        if (typeof window !== 'undefined') {
          localStorage.setItem('mahaticket_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('mahaticket_token', data.token);
          }
          window.dispatchEvent(new CustomEvent('mahaticket_profile_updated', { detail: data.user }));
        }

        setStatus('success');
        setMessage('लॉगिन यशस्वी झाले! Redirecting...');

        // If from mobile app or mobile user agent, forward to deep link
        const isMobileDevice =
          source === 'mobile' ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

        if (isMobileDevice && data.token) {
          const deepLink = `mahaticket://auth/callback?token=${encodeURIComponent(
            data.token
          )}&user=${encodeURIComponent(JSON.stringify(data.user))}`;
          window.location.href = deepLink;
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
          return;
        }

        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Callback processing error:', err);
        setStatus('error');
        setMessage(err?.message || 'प्रमाणीकरण अयशस्वी झाले');
        setTimeout(() => router.push('/'), 3000);
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto text-xl font-bold">
            {status === 'success' ? '✓' : status === 'error' ? '!' : '⏳'}
          </div>
          <h2 className="text-xl font-bold text-[#111827]">
            {status === 'processing' && 'कृपया प्रतीक्षा करा (Please wait)'}
            {status === 'success' && 'लॉगिन यशस्वी (Success!)'}
            {status === 'error' && 'लॉगिन त्रुटी (Authentication failed)'}
          </h2>
          <p className="text-sm text-[#6b7280]">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-[#6b7280]">
          लोड होत आहे… (Loading)
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
