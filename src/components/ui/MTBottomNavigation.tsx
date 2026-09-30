'use client';

import React from 'react';
import { Home, Compass, Ticket, Tag, User } from 'lucide-react';
import { Language, translations } from '@/src/lib/i18n';

export type NavTab = 'home' | 'explore' | 'tickets' | 'offers' | 'profile';

interface MTBottomNavigationProps {
  activeTab: NavTab;
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
    { id: 'offers' as NavTab, label: language === 'mr' ? 'ऑफर्स' : 'Offers', icon: Tag },
    { id: 'profile' as NavTab, label: language === 'mr' ? 'प्रोफाइल' : 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e7eb] px-2 safe-bottom shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] transition-colors focus:outline-none ${
                isActive ? 'text-[#6366f1]' : 'text-[#9ca3af] hover:text-[#6b7280]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#ef4444] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 font-medium truncate ${isActive ? 'text-[#6366f1] font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-[#6366f1] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
