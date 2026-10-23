'use client';

/**
 * Mobile OAuth bridge — Chrome blocks automatic redirects to custom schemes
 * after Google OAuth. This page auto-opens mahaticket:// and shows a button.
 */
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MobileAuthDoneInner() {
  const params = useSearchParams();
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deepLink = useMemo(() => {
    const token = params.get('token') || '';
    const user = params.get('user') || '';
    const err = params.get('error') || '';
    if (err) return null;
    if (!token) return null;
    const q = new URLSearchParams();
    q.set('token', token);
    if (user) q.set('user', user);
    return `mahaticket://auth/callback?${q.toString()}`;
  }, [params]);

  /** Android Chrome often blocks custom-scheme auto-redirect; Intent URL forces return to app. */
  const androidIntent = useMemo(() => {
    if (!deepLink) return null;
    const q = deepLink.split('?')[1] || '';
    return `intent://auth/callback?${q}#Intent;scheme=mahaticket;package=com.kalpkrutinfotech.mahaticket;end`;
  }, [deepLink]);

  const openApp = () => {
    if (!deepLink) {
      setError('Missing login token. Please return to the app and try again.');
      return;
    }
    setOpened(true);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    window.location.href = isAndroid && androidIntent ? androidIntent : deepLink;
  };

  useEffect(() => {
    const err = params.get('error');
    if (err) {
      setError(decodeURIComponent(err));
      return;
    }
    if (deepLink) {
      const t = setTimeout(() => {
        openApp();
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink, androidIntent, params]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(180deg,#FFF7ED 0%,#FFFFFF 60%)',
        fontFamily: 'system-ui,Segoe UI,sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #FED7AA',
          padding: 28,
          boxShadow: '0 10px 40px rgba(234,88,12,0.12)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎟️</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
          MahaTicket
        </h1>
        {error ? (
          <>
            <p style={{ color: '#DC2626', fontWeight: 700 }}>{error}</p>
            <p style={{ color: '#64748B', fontSize: 14 }}>
              कृपया अॅपमध्ये परत जा आणि पुन्हा Google लॉगिन करा.
            </p>
          </>
        ) : (
          <>
            <p style={{ color: '#334155', fontWeight: 700, marginBottom: 6 }}>
              साइन इन यशस्वी! / Signed in successfully
            </p>
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
              {opened
                ? 'जर अॅप उघडले नाही, खालील बटण दाबा.'
                : 'Opening the MahaTicket app…'}
            </p>
            <button
              type="button"
              onClick={openApp}
              style={{
                width: '100%',
                background: '#EA580C',
                color: '#fff',
                border: 0,
                borderRadius: 12,
                padding: '14px 18px',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Open MahaTicket App
            </button>
            <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 14 }}>
              अॅप उघडल्यानंतर हे Chrome टॅब बंद करू शकता.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function MobileAuthDonePage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          Loading…
        </main>
      }
    >
      <MobileAuthDoneInner />
    </Suspense>
  );
}
