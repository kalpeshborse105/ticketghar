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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">
                {t.partnerWithUs}
              </h2>
              <p className="text-xs text-slate-400">
                मराठी रंगभूमी, संगीत, आणि सांस्कृतिक आयोजकांसाठी विशेष भागीदारी
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {successMessage ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">अर्ज यशस्वीरीत्या सादर केला!</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  बंद करा
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Informational Callout */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>कंपनीकडून थेट पडताळणी:</strong> बनावट तिकिटे रोखण्यासाठी व दर्जेदार अनुभव राखण्यासाठी तिकीटघरवर प्रत्येक आयोजकाची प्रत्यक्ष पडताळणी करूनच कार्यक्रम प्रकाशित केला जातो.
                </p>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    आयोजक / प्रतिनिधीचे नाव *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. अनंत पानशिकर"
                    value={formData.organizerName}
                    onChange={(e) =>
                      setFormData({ ...formData, organizerName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    नाट्यसंस्था / कंपनीचे नाव *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. नाट्यसंपदा कमर्शियल थिएटर्स"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    मोबाईल / व्हॉट्सॲप क्रमांक *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    अधिकृत ईमेल *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="events@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    कार्यक्रमाचे नाव (Event Title) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. पुन्हा सही रे सही"
                    value={formData.eventName}
                    onChange={(e) =>
                      setFormData({ ...formData, eventName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    प्रकार (Category) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="plays">नाटक (Plays & Theatre)</option>
                    <option value="music">संगीत व मैफिली (Music & Concerts)</option>
                    <option value="comedy">स्टँडअप कॉमेडी (Standup Comedy)</option>
                    <option value="cultural">सांस्कृतिक महोत्सव (Cultural)</option>
                    <option value="workshops">कार्यशाळा (Workshops)</option>
                    <option value="sports">क्रीडा (Sports)</option>
                    <option value="movies">चित्रपट (Movies)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    शहर (City) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="पुणे, मुंबई, नागपूर, इत्यादी"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    सभागृह पसंती (Venue Preference)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. बालगंधर्व रंगमंदिर"
                    value={formData.venuePreference}
                    onChange={(e) =>
                      setFormData({ ...formData, venuePreference: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    अपेक्षित तिकीट दर (Price Range)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. ₹250 - ₹500"
                    value={formData.ticketPriceRange}
                    onChange={(e) =>
                      setFormData({ ...formData, ticketPriceRange: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    अपेक्षित उपस्थिती (Expected Capacity)
                  </label>
                  <input
                    type="number"
                    placeholder="उदा. 600"
                    value={formData.expectedCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedCapacity: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1 text-xs">
                  अधिक माहिती किंवा संदेश (Message / Details)
                </label>
                <textarea
                  rows={2}
                  placeholder="कार्यक्रमाविषयी थोडी माहिती किंवा आपल्या गरजा..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg transition"
                >
                  {submitting ? (
                    <span>नोंदणी होत आहे...</span>
                  ) : (
                    <>
                      <span>नोंदणी सादर करा (Submit Lead)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
