'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MTBottomNavigation, NavTab } from './MTBottomNavigation';
import { Language } from '@/src/lib/types';

function GlobalMobileNavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [language, setLanguage] = useState<Language>('mr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mahaticket_lang');
      if (saved === 'en' || saved === 'mr') setLanguage(saved);

      const handleLangChange = () => {
        const updated = localStorage.getItem('mahaticket_lang');
        if (updated === 'en' || updated === 'mr') setLanguage(updated);
      };
      window.addEventListener('storage', handleLangChange);
      window.addEventListener('mahaticket_lang_changed', handleLangChange);
      return () => {
        window.removeEventListener('storage', handleLangChange);
        window.removeEventListener('mahaticket_lang_changed', handleLangChange);
      };
    }
  }, []);

  // Hide on admin portal screens
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Determine active tab based on route and custom events
  const [activeTabOverride, setActiveTabOverride] = useState<NavTab | null>(null);

  useEffect(() => {
    const handleTabEvt = (e: any) => {
      if (e?.detail) setActiveTabOverride(e.detail);
    };
    window.addEventListener('mahaticket_switch_nav_tab', handleTabEvt);
    return () => window.removeEventListener('mahaticket_switch_nav_tab', handleTabEvt);
  }, []);

  let activeTab: NavTab | null = activeTabOverride;
  if (!activeTab) {
    if (pathname === '/profile') {
      activeTab = 'profile';
    } else if (pathname === '/my-tickets' || pathname?.startsWith('/tickets')) {
      activeTab = 'tickets';
    } else if (pathname === '/') {
      const tabParam = searchParams?.get('tab');
      if (tabParam === 'explore') activeTab = 'explore';
      else activeTab = 'home';
    }
  }

  const handleTabChange = (tab: NavTab) => {
    setActiveTabOverride(tab);
    window.dispatchEvent(new CustomEvent('mahaticket_switch_nav_tab', { detail: tab }));

    if (pathname === '/') {
      if (tab === 'home') {
        window.history.replaceState(null, '', '/');
      } else if (tab === 'explore') {
        window.history.replaceState(null, '', '/?tab=explore');
      } else if (tab === 'tickets') {
        window.history.replaceState(null, '', '/?tab=tickets');
      } else if (tab === 'profile') {
        router.push('/profile');
      }
    } else {
      if (tab === 'home') {
        router.push('/');
      } else if (tab === 'explore') {
        router.push('/?tab=explore');
      } else if (tab === 'tickets') {
        router.push('/my-tickets');
      } else if (tab === 'profile') {
        router.push('/profile');
      }
    }
  };

  return (
    <MTBottomNavigation
      activeTab={activeTab}
      onTabChange={handleTabChange}
      language={language}
    />
  );
}

export function GlobalMobileNav() {
  return (
    <Suspense fallback={null}>
      <GlobalMobileNavContent />
    </Suspense>
  );
}
