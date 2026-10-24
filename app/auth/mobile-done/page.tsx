'use client';

/**
 * Mobile OAuth bridge — Chrome often blocks auto custom-scheme redirects.
 * Deep link carries only the session token (short URL); the app decodes user from it.
 */
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const ANDROID_PACKAGE = 'com.kalpkrutinfotech.mahaticket';

function MobileAuthDoneInner() {
  const params = useSearchParams();
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deepLink = useMemo(() => {
    const token = params.get('token') || '';
    const err = params.get('error') || '';
    if (err) return null;
    if (!token) return null;
    // Token-only keeps Intent URL under Android length limits (user JSON was truncating).
    const q = new URLSearchParams();
    q.set('token', token);
    return `mahaticket://auth/callback?${q.toString()}`;
  }, [params]);

  const androidIntent = useMemo(() => {
    if (!deepLink) return null;
    const q = deepLink.split('?')[1] || '';
    return (
      `intent://auth/callback?${q}#Intent;scheme=mahaticket;package=${ANDROID_PACKAGE};end`
    );
  }, [deepLink]);

  const target = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    return isAndroid && androidIntent ? androidIntent : deepLink || '';
  }, [androidIntent, deepLink]);

  const openApp = useCallback(() => {
    if (!target) {
      setError('Missing login token. Please return to the app and try again.');
      return;
    }
    setOpened(true);
    try {
      window.location.href = target;
    } catch {
      if (deepLink) window.location.href = deepLink;
    }
  }, [target, deepLink]);

  useEffect(() => {
    const err = params.get('error');
    if (err) {
      setError(decodeURIComponent(err));
      return;
    }
    if (!target) return;
    // Immediate attempt + retry
    openApp();
    const t = setTimeout(() => openApp(), 600);
    return () => clearTimeout(t);
  }, [target, openApp, params]);

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
                ? 'जर अॅप उघडले नाही, खालील बटण दाबा (If the app did not open, tap below).'
                : 'Opening the MahaTicket app…'}
            </p>
            <a
              href={target}
              onClick={() => setOpened(true)}
              style={{
                display: 'block',
                width: '100%',
                background: '#EA580C',
                color: '#fff',
                border: 0,
                borderRadius: 12,
                padding: '16px 18px',
                fontWeight: 800,
                fontSize: 17,
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              Open MahaTicket App (अॅप उघडा)
            </a>
            {deepLink && (
              <div style={{ marginTop: 12 }}>
                <a
                  href={deepLink}
                  onClick={() => setOpened(true)}
                  style={{
                    fontSize: 13,
                    color: '#EA580C',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Direct Scheme Link (पर्यायी लिंक)
                </a>
              </div>
            )}
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
