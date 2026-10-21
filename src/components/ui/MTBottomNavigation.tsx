'use client';

import React from 'react';
import { Home, Compass, Ticket, Tag, User } from 'lucide-react';
import { Language, translations } from '@/src/lib/i18n';

export type NavTab = 'home' | 'explore' | 'tickets' | 'profile';

interface MTBottomNavigationProps {
  activeTab?: NavTab | null;
  onTabChange: (tab: NavTab) => void;
  ticketBadgeCount?: number;
  language: Language;
}

export const MTBottomNavigation: React.FC<MTBottomNavigationProps> = ({
  activeTab,
  onTabChange,
  ticketBadgeCount = 0,
  language,
}) => {
  const t = translations[language];

  const items = [
    { id: 'home' as NavTab, label: language === 'mr' ? 'होम' : 'Home', icon: Home },
    { id: 'explore' as NavTab, label: language === 'mr' ? 'शोधा' : 'Explore', icon: Compass },
    { id: 'tickets' as NavTab, label: t.myTickets, icon: Ticket, badge: ticketBadgeCount },
    { id: 'profile' as NavTab, label: language === 'mr' ? 'प्रोफाइल' : 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#fed7aa]/80 bg-white/90 shadow-[0_-8px_30px_rgba(234,88,12,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-around px-1 py-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition-all duration-200 focus:outline-none active:scale-95 ${
                  isActive
                    ? 'bg-[#fff7ed] text-[#ea580c]'
                    : 'text-[#9ca3af] hover:text-[#6b7280]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-0.5 truncate text-[10.5px] font-medium transition-colors ${
                    isActive ? 'font-bold text-[#ea580c]' : ''
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full bg-[#ea580c] transition-all duration-200 ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
