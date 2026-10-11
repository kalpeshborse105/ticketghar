'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/src/components/Header';
import { MyTicketsView } from '@/src/components/MyTicketsView';
import { TicketPassModal } from '@/src/components/TicketPassModal';
import { Language } from '@/src/lib/i18n';

export default function MyTicketsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('mr');
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mahaticket_lang');
      if (saved === 'en' || saved === 'mr') {
        setLanguage(saved);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2B]">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onHomeClick={() => router.push('/')}
        onOpenMyTickets={() => {}}
      />

      <main className="py-6 sm:py-8">
        <MyTicketsView
          language={language}
          onBack={() => router.push('/')}
          onViewTicket={(ticketData) => setSelectedPass(ticketData)}
        />
      </main>

      {selectedPass && (
        <TicketPassModal
          bookingResult={selectedPass}
          language={language}
          onClose={() => setSelectedPass(null)}
        />
      )}
    </div>
  );
}
