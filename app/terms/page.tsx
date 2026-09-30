import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/src/components/Header';

export const metadata = {
  title: 'Terms of Use - MahaTicket (महाटिकिट)',
  description: 'Terms and conditions for using MahaTicket event ticketing platform',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-[#111827]">Terms of Use</h1>
          <p className="text-sm text-[#6b7280]">नियम व अटी</p>
          <p className="text-xs text-[#9ca3af]">Last updated: September 2026</p>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">1. Introduction</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Welcome to MahaTicket (महाटिकिट), Maharashtra's premier digital ticketing platform for cultural events, theatre plays, music concerts, and live performances. By accessing or using MahaTicket services, you agree to comply with these Terms of Use.
            </p>
            <p className="text-sm text-[#374151] leading-relaxed">
              महाटिकिटच्या सेवा वापरून आपण या नियम व अटींशी सहमत आहात. आपल्या अधिकार व जबाबदाऱ्या समजून घ्या.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">2. Booking and Payments</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>All ticket prices are displayed in Indian Rupees (₹) and include applicable taxes unless otherwise stated.</li>
              <li>Payment must be completed within 8 minutes of seat selection to confirm your booking.</li>
              <li>We accept UPI, debit cards, credit cards, and net banking through secure payment gateways.</li>
              <li>Once payment is confirmed, you will receive a digital ticket via email and WhatsApp with a unique QR code.</li>
              <li>Ticket prices, availability, and event details are subject to change without prior notice by the event organizer.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">3. Ticket Usage</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Each ticket is valid only for the specific event, venue, date, and time mentioned on the booking.</li>
              <li>You must present the QR code at the venue entrance for scanning and verification.</li>
              <li>Tickets are non-transferable and cannot be resold without prior written consent from MahaTicket and the event organizer.</li>
              <li>Entry may be denied if the QR code has been tampered with, duplicated, or previously scanned.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">4. Cancellation and Refunds</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Cancellation and refund policies vary by event and are determined by the event organizer. Please refer to our detailed <Link href="/refund" className="text-orange-600 hover:underline">Cancellation & Refund Policy</Link> for more information.
            </p>
            <p className="text-sm text-[#374151] leading-relaxed">
              Generally, tickets are non-refundable unless the event is cancelled by the organizer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">5. User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>You must provide accurate and complete information during the booking process.</li>
              <li>You are responsible for maintaining the confidentiality of your tickets and QR codes.</li>
              <li>Any misuse, fraud, or violation of these terms may result in cancellation of your booking without refund.</li>
              <li>Respectful behavior is expected at all events. Organizers reserve the right to refuse entry or remove attendees for misconduct.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">6. Limitation of Liability</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket acts as an intermediary platform connecting event organizers and attendees. We are not responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Event quality, content, schedule changes, or cancellations made by organizers.</li>
              <li>Venue safety, facilities, or services provided by third parties.</li>
              <li>Personal injury, loss, or damage incurred during events.</li>
              <li>Technical issues arising from user devices or internet connectivity.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">7. Intellectual Property</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              All content on MahaTicket, including logos, graphics, text, and software, is the property of MahaTicket or its content providers and is protected by Indian and international intellectual property laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">8. Privacy</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Your use of MahaTicket is also governed by our <Link href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>. We are committed to protecting your personal information and using it responsibly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">9. Changes to Terms</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket reserves the right to update or modify these Terms of Use at any time without prior notice. Continued use of our services constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">10. Governing Law</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              These Terms of Use are governed by the laws of India. Any disputes arising from the use of MahaTicket shall be subject to the exclusive jurisdiction of courts in Pune, Maharashtra.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">11. Contact Us</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              If you have any questions about these Terms of Use, please visit our <Link href="/contact" className="text-orange-600 hover:underline">Contact page</Link> or email us at support@mahaticket.in.
            </p>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280]">
          <Link href="/privacy" className="hover:text-orange-600 transition">Privacy Policy</Link>
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
