import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Cancellation & Refund Policy - MahaTicket (महाटिकिट)',
  description: 'Learn about cancellation, refund, and exchange policies for MahaTicket bookings',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to MahaTicket</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-[#111827]">Cancellation & Refund Policy</h1>
          </div>
          <p className="text-sm text-[#6b7280]">रद्दीकरण व परतावा धोरण</p>
          <p className="text-xs text-[#9ca3af]">Last updated: September 2026</p>
        </div>

        {/* Important Notice */}
        <div className="bg-[#fef3c7] border border-[#fbbf24] rounded-xl p-4 text-sm text-[#92400e]">
          <p className="font-semibold mb-2">⚠️ महत्त्वाची माहिती (Important Notice)</p>
          <p>
            Cancellation and refund policies are determined by individual event organizers. Please review the specific policy displayed during booking before confirming your purchase.
          </p>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">1. General Cancellation Policy</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket acts as an intermediary platform connecting event organizers and attendees. All cancellation and refund policies are set by the event organizers and may vary based on:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Type of event (theatre, concert, workshop, etc.)</li>
              <li>Time remaining until the event date</li>
              <li>Ticket category and pricing tier</li>
              <li>Organizer-specific terms and conditions</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              सर्व तिकिटांसाठी रद्दीकरण धोरण वेगवेगळे असू शकते. बुकिंग करताना कृपया धोरण वाचा.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">2. Standard Refund Timeline</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Most events on MahaTicket follow this standard cancellation timeline, though organizers may modify these terms:
            </p>
            
            <div className="space-y-3 mt-4">
              <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#22c55e]">
                <p className="font-semibold text-sm text-[#111827]">More than 7 days before event</p>
                <p className="text-xs text-[#374151] mt-1">80-100% refund (minus platform fee and payment gateway charges)</p>
              </div>

              <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#f59e0b]">
                <p className="font-semibold text-sm text-[#111827]">3-7 days before event</p>
                <p className="text-xs text-[#374151] mt-1">50-70% refund (subject to organizer approval)</p>
              </div>

              <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#ef4444]">
                <p className="font-semibold text-sm text-[#111827]">Less than 3 days before event</p>
                <p className="text-xs text-[#374151] mt-1">No refund (tickets are non-cancellable)</p>
              </div>
            </div>

            <p className="text-xs text-[#6b7280] mt-4 italic">
              * Actual refund amounts may vary. Always check the specific event's cancellation policy before booking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">3. Event Cancellation by Organizer</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              If an event is cancelled, postponed, or significantly modified by the organizer:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li><strong>Full Refund:</strong> You will receive a complete refund including all fees within 5-7 business days</li>
              <li><strong>Rescheduled Events:</strong> Tickets remain valid for the new date, or you may request a refund</li>
              <li><strong>Notification:</strong> You will be informed via email, WhatsApp, and SMS about any changes</li>
              <li><strong>Alternative Options:</strong> Organizers may offer vouchers, upgrades, or alternative event access</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">4. Non-Refundable Situations</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Refunds will NOT be provided in the following cases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>You missed the event or arrived late (tickets are time-sensitive)</li>
              <li>You lost or deleted your ticket QR code (we can resend it for free)</li>
              <li>Personal reasons, change of plans, or travel issues</li>
              <li>Dissatisfaction with event quality, content, or performance (contact organizer directly)</li>
              <li>Failure to read or understand the event description or venue details</li>
              <li>Weather conditions, traffic, or external factors beyond control</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">5. How to Request a Cancellation</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              To cancel your booking and request a refund (if eligible):
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Go to your "My Tickets" section on MahaTicket</li>
              <li>Select the ticket you wish to cancel</li>
              <li>Click "Request Cancellation" and provide a reason</li>
              <li>Our support team will review your request within 24-48 hours</li>
              <li>If approved, refunds will be processed to your original payment method</li>
            </ol>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              Alternatively, contact us at <Link href="/contact" className="text-orange-600 hover:underline">support@mahaticket.in</Link> with your booking ID.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">6. Refund Processing Time</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Once your cancellation is approved:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li><strong>UPI:</strong> 3-5 business days</li>
              <li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
              <li><strong>Net Banking:</strong> 5-7 business days</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              Refund timelines depend on your bank or payment provider. Please check with them if there are delays beyond the stated period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">7. Platform and Payment Gateway Charges</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              MahaTicket charges a small convenience fee (typically 2-5% of ticket price) to cover:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>Platform maintenance and technology infrastructure</li>
              <li>QR code generation and digital ticket delivery</li>
              <li>Customer support and dispute resolution</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              <strong>Note:</strong> Platform fees and payment gateway charges (1.5-2%) are generally non-refundable, even if the organizer approves your cancellation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">8. Ticket Transfers and Exchanges</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              Currently, MahaTicket does not support direct ticket transfers between users. However:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>You can share the ticket QR code with someone else (at your own risk)</li>
              <li>Only one person can use the QR code for entry (first scan is valid)</li>
              <li>For formal name changes or transfers, contact the event organizer and our support team</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">9. Disputes and Complaints</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              If you have a dispute regarding cancellation or refund:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] leading-relaxed">
              <li>First, contact MahaTicket support at <Link href="/contact" className="text-orange-600 hover:underline">support@mahaticket.in</Link></li>
              <li>Provide your booking ID, payment receipt, and detailed explanation</li>
              <li>We will mediate between you and the event organizer</li>
              <li>Resolution typically takes 5-7 business days</li>
            </ul>
            <p className="text-sm text-[#374151] leading-relaxed mt-3">
              For unresolved disputes, you may seek consumer grievance redressal as per Indian consumer protection laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111827]">10. Contact Support</h2>
            <p className="text-sm text-[#374151] leading-relaxed">
              For questions about cancellations, refunds, or specific event policies:
            </p>
            <div className="bg-[#f5f5f5] rounded-lg p-4 text-sm text-[#374151] space-y-1 mt-3">
              <p><strong>Email:</strong> support@mahaticket.in</p>
              <p><strong>Phone:</strong> +91-XXXXX-XXXXX (Mon-Sat, 10 AM - 7 PM)</p>
              <p><strong>Support:</strong> <Link href="/contact" className="text-orange-600 hover:underline">Contact Page</Link></p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280]">
          <Link href="/terms" className="hover:text-orange-600 transition">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-orange-600 transition">Privacy Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-orange-600 transition">Contact Support</Link>
          <span>•</span>
          <Link href="/about" className="hover:text-orange-600 transition">About MahaTicket</Link>
        </div>
      </main>
    </div>
  );
}
