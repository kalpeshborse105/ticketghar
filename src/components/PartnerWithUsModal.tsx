'use client';

import React, { useState } from 'react';
import { Language, translations } from '../lib/i18n.ts';
import { X, Building2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface PartnerWithUsModalProps {
  language: Language;
  onClose: () => void;
}

export const PartnerWithUsModal: React.FC<PartnerWithUsModalProps> = ({
  language,
  onClose,
}) => {
  const t = translations[language];

  const [formData, setFormData] = useState({
    organizerName: '',
    companyName: '',
    mobile: '',
    email: '',
    eventName: '',
    category: 'plays',
    city: 'Pune',
    venuePreference: '',
    proposedDate: '',
    expectedCapacity: '',
    ticketPriceRange: '₹300 - ₹600',
    websiteOrSocial: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setSubmitting(true);
      const res = await fetch('/api/partner-with-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccessMessage(data.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl bg-[#111827] border border-[#243044] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#243044] bg-[#0a0e17] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ea580c]/10 border border-[#ea580c]/30 flex items-center justify-center text-[#ea580c]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {t.partnerWithUs}
              </h2>
              <p className="text-xs text-slate-400">
                मराठी रंगभूमी, संगीत, आणि सांस्कृतिक आयोजकांसाठी महाटिकिट भागीदारी
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1a2333] text-slate-400 hover:text-white border border-[#243044]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successMessage ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">अर्ज यशस्वीरीत्या सादर केला!</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold"
                >
                  बंद करा (Close)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Producer Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  १. आयोजक / संस्था तपशील (Organizer Details)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      आयोजकाचे नाव (Contact Person) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organizerName}
                      onChange={(e) =>
                        setFormData({ ...formData, organizerName: e.target.value })
                      }
                      placeholder="e.g. अनिकेत जोशी"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      नाट्यसंस्था / कंपनी नाव (Production House) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      placeholder="e.g. रंगभूमी प्रॉडक्शन्स"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      मोबाईल क्रमांक (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="+91 98200 00000"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ईमेल पत्ता (Email) *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="events@company.in"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-2 pt-2 border-t border-[#243044]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  २. कार्यक्रमाचे स्वरूप (Event Details)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      नाटकाचे / कार्यक्रमाचे नाव *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.eventName}
                      onChange={(e) =>
                        setFormData({ ...formData, eventName: e.target.value })
                      }
                      placeholder="e.g. सही रे सही"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      प्रकार (Category) *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    >
                      <option value="plays">मराठी व्यावसायिक व प्रायोगिक नाटक (Plays)</option>
                      <option value="music">शास्त्रीय संगीत व भावगीत मैफल (Concerts)</option>
                      <option value="comedy">मराठी स्टँडअप कॉमेडी (Standup Comedy)</option>
                      <option value="cultural">सांस्कृतिक महोत्सव (Cultural Fest)</option>
                      <option value="workshops">नाट्य व कला कार्यशाळा (Workshops)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      शहर (City) *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    >
                      <option value="Pune">पुणे (Pune)</option>
                      <option value="Mumbai">मुंबई (Mumbai)</option>
                      <option value="Thane">ठाणे (Thane)</option>
                      <option value="Nashik">नाशिक (Nashik)</option>
                      <option value="Nagpur">नागपूर (Nagpur)</option>
                      <option value="Kolhapur">कोल्हापूर (Kolhapur)</option>
                      <option value="Chhatrapati Sambhaji Nagar">छत्रपती संभाजीनगर</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      पसंतीचे सभागृह (Preferred Venue)
                    </label>
                    <input
                      type="text"
                      value={formData.venuePreference}
                      onChange={(e) =>
                        setFormData({ ...formData, venuePreference: e.target.value })
                      }
                      placeholder="e.g. बालगंधर्व / शिवाजी मंदिर"
                      className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    अतिरिक्त माहिती किंवा विशेष विनंती (Notes)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="आपल्या शोजची संख्या, अपेक्षित तारखा किंवा इतर माहिती लिहा..."
                    className="w-full bg-[#0a0e17] border border-[#243044] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  />
                </div>
              </div>

              {/* Commission & Benefits Box */}
              <div className="p-3 bg-[#0a0e17] rounded-lg border border-[#243044] space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>महाटिकिट आयोजक हमी</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  पारदर्शक कमिशन, थेट बँक खात्यात त्वरित सेटलमेंट, मोफत व्हॉट्सॲप डिजिटल पास, आणि सभागृह गेट स्कॅनर सपोर्ट.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-98"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>नोंदणी सादर करत आहे...</span>
                  </>
                ) : (
                  <>
                    <span>अर्ज सादर करा (Submit Application)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
