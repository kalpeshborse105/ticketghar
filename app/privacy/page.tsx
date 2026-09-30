import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Header } from '@/src/components/Header';

export const metadata = {
  title: 'Privacy Policy - MahaTicket (महाटिकिट)',
  description: 'Learn how MahaTicket protects and manages your personal data',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Persistent Website Header */}
      <Header />

      {/* Sub-bar Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>मुख्य पृष्ठ (Back to Home)</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-[#111827]">Privacy Policy</h1>
          </div>
          <p className="text-sm text-[#6b7280]">गोपनीयता धोरण</p>
          <p className="text-xs text-[#9ca3af]">Last updated: September 2026</p>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">1. Introduction</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              At MahaTicket (महाटिकिट), we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use our platform to book tickets for cultural events across Maharashtra.
            </p>
            <p className="text-sm text-[#374151] leading-relaxed">
              आपली वैयक्तिक माहिती सुरक्षित ठेवणे हे आमचे प्राथमिक उद्दिष्ट आहे. आम्ही आपल्या डेटाचा वापर केवळ सेवा सुधारण्यासाठी करतो.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">2. Information We Collect</h2>
            
            <h3 className="text-base font-semibold text-[#111827] mt-4">2.1 Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Name, email address, and phone number provided during booking</li>
              <li>Payment information processed through secure third-party gateways</li>
              <li>Booking history, ticket preferences, and event attendance records</li>
            </ul>

            <h3 className="text-base font-semibold text-[#111827] mt-4">2.2 Technical Information</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Device type, operating system, browser type, and IP address</li>
              <li>Location data (city/region) to show relevant nearby events</li>
              <li>Usage patterns, search queries, and interaction with our platform</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li><strong>Booking Processing:</strong> To confirm and deliver your tickets via email and WhatsApp</li>
              <li><strong>Communication:</strong> To send booking confirmations, event updates, and customer support responses</li>
              <li><strong>Personalization:</strong> To recommend events based on your preferences and browsing history</li>
              <li><strong>Payment Processing:</strong> To securely process transactions through our payment partners</li>
              <li><strong>Analytics:</strong> To understand user behavior and improve platform performance</li>
              <li><strong>Legal Compliance:</strong> To comply with Indian laws and prevent fraudulent activities</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">4. Data Sharing and Disclosure</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              We do not sell your personal information. We may share your data only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li><strong>Event Organizers:</strong> Your name and ticket details are shared with organizers for entry verification</li>
              <li><strong>Payment Processors:</strong> Razorpay, Stripe, or other secure gateways process your payment information</li>
              <li><strong>Service Providers:</strong> Email/SMS providers (e.g., SendGrid, Twilio) deliver your tickets and notifications</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government authorities</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">5. Data Security</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>All data transmission is encrypted using SSL/TLS protocols</li>
              <li>Payment information is never stored on our servers</li>
              <li>Access to personal data is restricted to authorized personnel only</li>
              <li>Regular security audits and monitoring to detect potential threats</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              However, no system is completely secure. We encourage you to keep your tickets and QR codes confidential.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">6. Cookies and Tracking</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket uses cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Remember your language preferences (Marathi or English)</li>
              <li>Maintain your seat selection during the booking process</li>
              <li>Analyze traffic and improve user experience</li>
              <li>Provide personalized event recommendations</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              You can disable cookies in your browser settings, but this may affect functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">7. Your Rights</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Under Indian data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li><strong>Access:</strong> Request a copy of your personal data stored by MahaTicket</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
              <li><strong>Opt-out:</strong> Unsubscribe from promotional emails and marketing communications</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              To exercise these rights, contact us at <Link href="/contact" className="text-orange-600 hover:underline">privacy@mahaticket.in</Link>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">8. Data Retention</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Maintain your booking history and provide customer support</li>
              <li>Comply with legal, tax, and accounting requirements (typically 7 years)</li>
              <li>Resolve disputes and enforce our terms and conditions</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">9. Children's Privacy</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket does not knowingly collect personal information from children under 13 years of age. If you believe we have inadvertently collected such data, please contact us immediately for deletion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">10. Changes to This Policy</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The updated policy will be posted on this page with a revised "Last updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">11. Contact Us</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <div className="bg-[#f5f5f5] rounded-lg p-4 text-sm text-[#374151] space-y-1 mt-3">
              <p><strong>Email:</strong> privacy@mahaticket.in</p>
              <p><strong>Support:</strong> <Link href="/contact" className="text-orange-600 hover:underline">Contact Page</Link></p>
              <p><strong>Address:</strong> Kalpkrut Infotech, Pune, Maharashtra, India</p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280]">
          <Link href="/terms" className="hover:text-orange-600 transition">Terms of Use</Link>
          <span>•</span>
          <Link href="/refund" className="hover:text-orange-600 transition">Refund Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-orange-600 transition">Contact Support</Link>
          <span>•</span>
          <Link href="/about" className="hover:text-orange-600 transition">About MahaTicket</Link>
        </div>
      </main>
    </div>
  );
}
