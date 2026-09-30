'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client.ts';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        const code = searchParams.get('code') || '';

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (!data.user) {
          setStatus('error');
          setMessage('No user data received');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        await fetch('/api/auth/profile/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: data.user.id,
            email: data.user.email || '',
            fullName:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split('@')[0] ||
              'Guest User',
          }),
        }).catch(() => undefined);

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        setTimeout(() => router.push('/'), 1000);
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        setTimeout(() => router.push('/'), 3000);
      }
    };

    void handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-8 text-center">
          <h2 className="text-xl font-bold text-[#111827] mb-2">
            {status === 'processing' && 'Please wait'}
            {status === 'success' && 'Success'}
            {status === 'error' && 'Authentication failed'}
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
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
