'use client';

import React, { useState } from 'react';
import { AdminPanel } from '@/src/components/AdminPanel';
import { Language } from '@/src/lib/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const [language] = useState<Language>('mr');

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
          MahaTicket Operator Console
        </span>
      </div>

      <div className="flex-1">
        <AdminPanel
          language={language}
          onBack={() => {
            window.location.href = '/';
          }}
        />
      </div>
    </div>
  );
}
