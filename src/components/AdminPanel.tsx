'use client';

import React, { useState } from 'react';
import { SuperAdminPanel } from './admin/SuperAdminPanel';
import { OrganizerConsole } from './admin/OrganizerConsole';
import { Language } from '../lib/i18n.ts';
import { ShieldCheck, Building2, ArrowLeft } from 'lucide-react';

interface AdminPanelProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  initialRole?: 'SUPER_ADMIN' | 'ORGANIZER' | 'ADMIN' | 'super_admin' | 'organizer' | string;
  currentUser?: any;
  onBack?: () => void;
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  language,
  onLanguageChange,
  initialRole = 'SUPER_ADMIN',
  currentUser,
  onBack,
  onLogout
}) => {
  const isInitialOrg =
    initialRole === 'ORGANIZER' ||
    initialRole === 'organizer';

  const [currentRole, setCurrentRole] = useState<'SUPER_ADMIN' | 'ORGANIZER'>(
    isInitialOrg ? 'ORGANIZER' : 'SUPER_ADMIN'
  );

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2B] flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
            {onBack && (
          <button
            onClick={onBack}
                className="p-2 rounded-xl hover:bg-slate-100 text-[#64748B] hover:text-[#141B2B] transition"
                title="मागे जा"
          >
                <ArrowLeft className="w-5 h-5" />
          </button>
            )}
        <div className="flex items-center gap-2">
              <span className="text-2xl">🎭</span>
                <div>
                <h1 className="text-base font-black text-[#141B2B] leading-none">
                  {language === 'mr' ? (
                    <>
                      महाटिकिट <span className="text-[#A33900]">कंट्रोल हब</span>
                    </>
                  ) : (
                    <>
                      MahaTicket <span className="text-[#A33900]">Control Hub</span>
                    </>
                  )}
                </h1>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {currentRole === 'SUPER_ADMIN'
                    ? language === 'mr'
                      ? 'सुपर अ‍ॅडमिनिस्ट्रेशन व ऑपरेशन्स केंद्र'
                      : 'Super admin & operations center'
                    : language === 'mr'
                      ? 'नाट्य निर्माते व अधिकृत आयोजक कन्सोल'
                      : 'Organizer console'}
                  </p>
                </div>
              </div>
                  </div>

          {/* Role Header Info / Badge */}
          <div className="flex items-center gap-3">
            {onLanguageChange && (
              <div className="bg-white border border-[#E2E8F0] p-1 rounded-xl flex items-center gap-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => onLanguageChange('mr')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    language === 'mr'
                      ? 'bg-[#A33900] text-white'
                      : 'text-[#64748B] hover:text-[#141B2B]'
                  }`}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    language === 'en'
                      ? 'bg-[#A33900] text-white'
                      : 'text-[#64748B] hover:text-[#141B2B]'
                  }`}
                >
                  English
                </button>
              </div>
            )}
            {!isInitialOrg ? (
              <div className="bg-[#FFF7ED] border border-[#FFEDD5] p-1 rounded-xl flex items-center gap-1 shadow-inner">
                  <button
                  onClick={() => setCurrentRole('SUPER_ADMIN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentRole === 'SUPER_ADMIN'
                      ? 'bg-[#A33900] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#141B2B]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'सुपर अ‍ॅडमिन' : 'Super Admin'}</span>
                            </button>
                  <button
                  onClick={() => setCurrentRole('ORGANIZER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentRole === 'ORGANIZER'
                      ? 'bg-[#A33900] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#141B2B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'आयोजक व्ह्यू' : 'Organizer'}</span>
                              </button>
                </div>
            ) : (
              <div className="bg-orange-100 border border-orange-200 text-[#A33900] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#A33900]" />
                <span>{language === 'mr' ? 'आयोजक कन्सोल' : 'Organizer Access'}</span>
            </div>
          )}

            {onLogout && (
                <button
                onClick={onLogout}
                className="text-xs font-semibold text-[#64748B] hover:text-[#A33900] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition cursor-pointer"
                >
                {language === 'mr' ? 'लॉगआउट' : 'Logout'}
                </button>
            )}
                </div>
                </div>
      </header>

      {/* Render the Separate Dedicated Workflow */}
      <main className="flex-1">
        {currentRole === 'SUPER_ADMIN' ? (
          <SuperAdminPanel
            language={language}
            currentUser={currentUser}
            onBack={onBack}
            onLogout={onLogout}
          />
        ) : (
          <OrganizerConsole
            language={language}
            currentUser={currentUser}
            onBack={onBack}
            onLogout={onLogout}
          />
          )}
        </main>
    </div>
  );
};
