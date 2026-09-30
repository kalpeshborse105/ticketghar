import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, HelpCircle } from 'lucide-react';
import { Header } from '@/src/components/Header';

export const metadata = {
  title: 'Contact Us - MahaTicket (महाटिकिट)',
  description: 'Get in touch with MahaTicket support team for help with bookings, refunds, and technical issues',
};

export default function ContactPage() {
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
              <MessageCircle className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-[#111827]">Contact Us</h1>
          </div>
          <p className="text-sm text-[#6b7280]">आमच्याशी संपर्क साधा • We're here to help</p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Email Support */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Email Support</h3>
            </div>
            <div className="space-y-2 text-sm text-[#374151]">
              <p><strong>General Inquiries:</strong> <a href="mailto:support@mahaticket.in" className="text-orange-600 hover:underline">support@mahaticket.in</a></p>
              <p><strong>Booking Issues:</strong> <a href="mailto:bookings@mahaticket.in" className="text-orange-600 hover:underline">bookings@mahaticket.in</a></p>
              <p><strong>Partner/Organizer:</strong> <a href="mailto:partners@mahaticket.in" className="text-orange-600 hover:underline">partners@mahaticket.in</a></p>
            </div>
            <p className="text-xs text-[#6b7280]">Response time: Within 24-48 hours</p>
          </div>

          {/* Phone Support */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Phone Support</h3>
            </div>
            <div className="space-y-2 text-sm text-[#374151]">
              <p><strong>Customer Care:</strong> <a href="tel:+91XXXXXXXXXX" className="text-orange-600 hover:underline">+91-XXXXX-XXXXX</a></p>
              <p><strong>Hours:</strong> Monday to Saturday</p>
              <p><strong>Timing:</strong> 10:00 AM - 7:00 PM IST</p>
            </div>
            <p className="text-xs text-[#6b7280]">Sunday & Public Holidays: Closed</p>
          </div>

          {/* WhatsApp Support */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">WhatsApp Support</h3>
            </div>
            <div className="space-y-2 text-sm text-[#374151]">
              <p><strong>Quick Help:</strong> <a href="https://wa.me/91XXXXXXXXXX" className="text-orange-600 hover:underline">+91-XXXXX-XXXXX</a></p>
              <p>Send us your booking ID and query directly on WhatsApp for faster resolution.</p>
            </div>
            <p className="text-xs text-[#6b7280]">Available during business hours</p>
          </div>

          {/* Office Address */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Office Address</h3>
            </div>
            <div className="space-y-1 text-sm text-[#374151]">
              <p><strong>Kalpkrut Infotech</strong></p>
              <p>Pune, Maharashtra</p>
              <p>India - 411001</p>
            </div>
            <p className="text-xs text-[#6b7280]">Walk-in support: By appointment only</p>
          </div>

        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-[#111827]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            
            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                How do I download my ticket after booking?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                Your ticket will be automatically sent to your email and WhatsApp immediately after successful payment. You can also view and download tickets from the "My Tickets" section on MahaTicket.
              </p>
            </details>

            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                Can I cancel or reschedule my booking?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                Cancellation policies vary by event organizer. Please check the specific event's policy during booking or visit our <Link href="/refund" className="text-orange-600 hover:underline">Refund Policy</Link> page for detailed information.
              </p>
            </details>

            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                I didn't receive my ticket. What should I do?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                First, check your spam/junk folder. If you still can't find it, go to "My Tickets" and download it again. If the issue persists, contact us at support@mahaticket.in with your booking ID.
              </p>
            </details>

            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                How does the QR code scanning work at the venue?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                Show your digital ticket (QR code) at the venue entrance. The staff will scan it using our verification app. Each QR code can only be scanned once for entry. Keep your ticket safe and do not share screenshots publicly.
              </p>
            </details>

            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                Is my payment information secure?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                Yes! We use industry-standard encryption and trusted payment gateways (Razorpay/Stripe). We never store your card details or sensitive payment information. Read our <Link href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link> for more details.
              </p>
            </details>

            <details className="bg-[#f5f5f5] rounded-lg p-4 cursor-pointer">
              <summary className="font-semibold text-sm text-[#111827]">
                How can I list my event on MahaTicket?
              </summary>
              <p className="text-sm text-[#374151] mt-2 leading-relaxed">
                We welcome event organizers, theatre producers, and venue managers! Email us at partners@mahaticket.in with your event details, and our team will guide you through the onboarding process.
              </p>
            </details>

          </div>
        </div>

        {/* Contact Form Note */}
        <div className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-6 text-center space-y-3">
          <h3 className="text-lg font-bold text-[#111827]">Need Immediate Assistance?</h3>
          <p className="text-sm text-[#374151] leading-relaxed">
            For urgent booking issues, payment failures, or event-day support, please call or WhatsApp us directly. We're committed to resolving your queries quickly.
          </p>
          <p className="text-xs text-[#6b7280]">
            साठी तात्काळ मदतीसाठी, कृपया फोन किंवा व्हॉट्सॲप वर संपर्क साधा.
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280]">
          <Link href="/terms" className="hover:text-orange-600 transition">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-orange-600 transition">Privacy Policy</Link>
          <span>•</span>
          <Link href="/refund" className="hover:text-orange-600 transition">Refund Policy</Link>
          <span>•</span>
          <Link href="/about" className="hover:text-orange-600 transition">About MahaTicket</Link>
        </div>
      </main>
    </div>
  );
}
