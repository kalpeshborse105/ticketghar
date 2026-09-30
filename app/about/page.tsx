import Link from 'next/link';
import { ArrowLeft, Heart, Target, Users, Sparkles, Theater, Shield } from 'lucide-react';

export const metadata = {
  title: 'About MahaTicket - Maharashtra\'s Premier Event Ticketing Platform',
  description: 'Learn about MahaTicket\'s mission to digitize and celebrate Maharashtra\'s rich cultural events',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm text-[#6366f1] hover:text-[#4f46e5] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to MahaTicket</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#111827]">About MahaTicket</h1>
          </div>
          <p className="text-lg text-[#374151] leading-relaxed">
            महाराष्ट्राच्या सांस्कृतिक कार्यक्रमांसाठी एक आधुनिक डिजिटल तिकीट प्लॅटफॉर्म
          </p>
          <p className="text-sm text-[#6b7280]">
            Maharashtra's modern digital ticketing platform for cultural events
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="text-sm leading-relaxed opacity-95">
                To digitize and celebrate Maharashtra's vibrant cultural landscape by making event ticketing seamless, transparent, and accessible to everyone. We empower theatre groups, artists, and organizers with technology while preserving the essence of our rich Marathi heritage.
              </p>
              <p className="text-sm leading-relaxed opacity-95">
                आमचं ध्येय महाराष्ट्रातील सांस्कृतिक कार्यक्रमांना डिजिटल माध्यमाने सहज व पारदर्शक बनवणे आहे. आम्ही नाट्यसंस्था, कलाकार व आयोजकांना तंत्रज्ञानाचा सहभाग देऊन मराठी वारसा टिकवून ठेवण्याचा प्रयत्न करतो.
              </p>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#111827]">Our Story</h2>
          <div className="space-y-3 text-sm text-[#374151] leading-relaxed">
            <p>
              MahaTicket was born from a simple observation: Maharashtra has one of India's most vibrant theatre and cultural scenes, yet the ticketing experience remained fragmented, manual, and often frustrating for both organizers and audiences.
            </p>
            <p>
              Founded in 2026 by <strong>Kalpkrut Infotech</strong>, we set out to build a Maharashtra-first platform that understands the unique needs of Marathi theatre, music concerts, comedy shows, workshops, and cultural festivals across Pune, Mumbai, Nashik, Nagpur, Kolhapur, and beyond.
            </p>
            <p>
              Unlike generic ticketing platforms, MahaTicket is designed with deep respect for regional languages, local payment preferences, and the community-driven nature of Maharashtra's cultural ecosystem. We speak Marathi, we celebrate Marathi art, and we're proud to support every organizer—from small theatre groups to large-scale festivals.
            </p>
            <p>
              महाटिकिट ही केवळ एक तिकीट बुकिंग वेबसाईट नाही, तर महाराष्ट्रातील कला, संस्कृती आणि रंगभूमीसाठी एक तंत्रज्ञान-आधारित साथीदार आहे.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#111827]">What We Offer</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">Instant Digital Tickets</h3>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed">
                Get your tickets instantly via email and WhatsApp with secure QR codes. No printing required—just show and go!
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
                  <Theater className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">Maharashtra-Centric Events</h3>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed">
                Discover theatre plays, music concerts, comedy shows, cultural festivals, and workshops happening across Maharashtra.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">Bilingual Experience</h3>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed">
                Switch seamlessly between Marathi and English. We understand that language is identity, not just translation.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">Secure & Transparent</h3>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed">
                Bank-grade encryption, trusted payment gateways, and transparent pricing. No hidden charges, ever.
              </p>
            </div>

          </div>
        </div>

        {/* For Organizers */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#111827]">For Event Organizers & Theatre Groups</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            MahaTicket isn't just for audiences—it's built to empower organizers too:
          </p>
          <ul className="space-y-2 text-sm text-[#374151]">
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1] font-bold">✓</span>
              <span><strong>Real-time Seat Management:</strong> Manage sold, available, and blocked seats across multiple sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1] font-bold">✓</span>
              <span><strong>Direct Bank Settlements:</strong> Receive payments directly to your account with transparent ledgers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1] font-bold">✓</span>
              <span><strong>QR-based Gate Scanning:</strong> Easy verification app for venue staff—no manual checking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1] font-bold">✓</span>
              <span><strong>Analytics & Reports:</strong> Track sales, attendance, revenue, and audience insights in real-time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#6366f1] font-bold">✓</span>
              <span><strong>Multilingual Listings:</strong> List events in both Marathi and English to reach wider audiences</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
            <p className="text-sm text-[#6b7280]">
              Interested in listing your event? <Link href="/contact" className="text-[#6366f1] hover:underline font-semibold">Contact us</Link> or email <a href="mailto:partners@mahaticket.in" className="text-[#6366f1] hover:underline">partners@mahaticket.in</a>
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#111827]">Our Core Values</h2>
          
          <div className="space-y-3">
            <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#6366f1]">
              <h3 className="font-bold text-sm text-[#111827] mb-1">🎭 Culture-First Approach</h3>
              <p className="text-xs text-[#374151] leading-relaxed">
                We celebrate Maharashtra's rich cultural diversity and prioritize local events over generic entertainment.
              </p>
            </div>

            <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#22c55e]">
              <h3 className="font-bold text-sm text-[#111827] mb-1">🤝 Community-Driven</h3>
              <p className="text-xs text-[#374151] leading-relaxed">
                We exist to serve artists, organizers, and audiences—not investors or advertisers. Your trust is our success.
              </p>
            </div>

            <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#f59e0b]">
              <h3 className="font-bold text-sm text-[#111827] mb-1">💡 Transparency & Fairness</h3>
              <p className="text-xs text-[#374151] leading-relaxed">
                No hidden fees. Clear pricing. Honest communication. We believe fairness builds lasting relationships.
              </p>
            </div>

            <div className="bg-[#f5f5f5] rounded-lg p-4 border-l-4 border-[#8b5cf6]">
              <h3 className="font-bold text-sm text-[#111827] mb-1">🚀 Innovation with Respect</h3>
              <p className="text-xs text-[#374151] leading-relaxed">
                We use modern technology to enhance—not replace—the human connection that makes live events special.
              </p>
            </div>
          </div>
        </div>

        {/* Cities We Serve */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#111827]">Cities We Serve</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            Currently, MahaTicket connects audiences and organizers across Maharashtra:
          </p>
          <div className="flex flex-wrap gap-2">
            {['Pune', 'Mumbai', 'Thane', 'Nashik', 'Nagpur', 'Aurangabad', 'Kolhapur', 'Solapur', 'Satara', 'Sangli', 'Ahmednagar', 'Amravati'].map(city => (
              <span key={city} className="bg-[#6366f1]/10 text-[#6366f1] px-3 py-1 rounded-full text-xs font-medium border border-[#6366f1]/20">
                {city}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#6b7280] italic mt-3">
            और अधिक शहरांमध्ये लवकरच येत आहे • Expanding to more cities soon
          </p>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-2xl p-8 text-white text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Join the MahaTicket Community</h2>
          <p className="text-sm leading-relaxed opacity-95 max-w-2xl mx-auto">
            Whether you're an event organizer looking to digitize ticketing or an audience member discovering Maharashtra's best cultural experiences, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link 
              href="/contact"
              className="px-6 py-3 bg-white text-[#6366f1] rounded-lg font-semibold text-sm hover:bg-[#f5f5f5] transition shadow-lg"
            >
              Contact Us
            </Link>
            <Link 
              href="/"
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold text-sm hover:bg-white/30 transition"
            >
              Explore Events
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-[#6b7280]">
          <Link href="/terms" className="hover:text-[#6366f1] transition">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-[#6366f1] transition">Privacy Policy</Link>
          <span>•</span>
          <Link href="/refund" className="hover:text-[#6366f1] transition">Refund Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-[#6366f1] transition">Contact Support</Link>
        </div>

        <p className="text-center text-xs text-[#9ca3af] py-4">
          © 2026 MahaTicket • Kalpkrut Infotech • महाराष्ट्रासाठी, महाराष्ट्राकडून
        </p>

      </main>
    </div>
  );
}
