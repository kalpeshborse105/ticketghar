import Link from 'next/link';
import { ArrowLeft, Heart, Target, Users, Sparkles, Theater, Shield } from 'lucide-react';
import { Header } from '@/src/components/Header';

export const metadata = {
  title: 'About MahaTicket - Maharashtra\'s Premier Event Ticketing Platform',
  description: 'Learn about MahaTicket\'s mission to digitize and celebrate Maharashtra\'s rich cultural events',
};

export default function AboutPage() {
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
        
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">About MahaTicket</h1>
          </div>
          <p className="text-lg text-slate-800 font-medium leading-relaxed">
            महाराष्ट्राच्या सांस्कृतिक कार्यक्रमांसाठी एक आधुनिक डिजिटल तिकीट प्लॅटफॉर्म
          </p>
          <p className="text-sm text-slate-600">
            Maharashtra's modern digital ticketing platform for cultural events
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-8 text-white shadow-xl">
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-2xl font-bold text-slate-900">Our Story</h2>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              MahaTicket was born from a simple observation: Maharashtra has one of India's most vibrant theatre and cultural scenes, yet the ticketing experience remained fragmented, manual, and often frustrating for both organizers and audiences.
            </p>
            <p>
              Founded in 2026 by <strong>Kalpkrut Infotech</strong>, we set out to build a Maharashtra-first platform that understands the unique needs of Marathi theatre, music concerts, comedy shows, workshops, and cultural festivals across Pune, Mumbai, Nashik, Nagpur, Kolhapur, and beyond.
            </p>
            <p>
              Unlike generic ticketing platforms, MahaTicket is designed with deep respect for regional languages, local payment preferences, and the community-driven nature of Maharashtra's cultural ecosystem. We speak Marathi, we celebrate Marathi art, and we're proud to support every organizer—from small theatre groups to large-scale festivals.
            </p>
            <p className="font-medium text-slate-800">
              महाटिकिट ही केवळ एक तिकीट बुकिंग वेबसाईट नाही, तर महाराष्ट्रातील कला, संस्कृती आणि रंगभूमीसाठी एक तंत्रज्ञान-आधारित साथीदार आहे.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">What We Offer</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Instant Digital Tickets</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Get your tickets instantly via email and WhatsApp with secure QR codes. No printing required—just show and go!
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Theater className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Maharashtra-Centric Events</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Discover theatre plays, music concerts, comedy shows, cultural festivals, and workshops happening across Maharashtra.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Bilingual Experience</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Switch seamlessly between Marathi and English. We understand that language is identity, not just translation.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Secure & Transparent</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bank-grade encryption, trusted payment gateways, and transparent pricing. No hidden charges, ever.
              </p>
            </div>

          </div>
        </div>

        {/* For Organizers */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-2xl font-bold text-slate-900">For Event Organizers & Theatre Groups</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            MahaTicket isn't just for audiences—it's built to empower organizers too:
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span><strong>Real-time Seat Management:</strong> Manage sold, available, and blocked seats across multiple sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span><strong>Direct Bank Settlements:</strong> Receive payments directly to your account with transparent ledgers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span><strong>QR-based Gate Scanning:</strong> Easy verification app for venue staff—no manual checking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span><strong>Analytics & Reports:</strong> Track sales, attendance, revenue, and audience insights in real-time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span><strong>Multilingual Listings:</strong> List events in both Marathi and English to reach wider audiences</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Interested in listing your event? <Link href="/contact" className="text-orange-600 hover:underline font-semibold">Contact us</Link> or email <a href="mailto:partners@mahaticket.in" className="text-orange-600 hover:underline">partners@mahaticket.in</a>
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Our Core Values</h2>
          
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-600 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">🎭 Culture-First Approach</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We celebrate Maharashtra's rich cultural diversity and prioritize local events over generic entertainment.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">🤝 Community-Driven</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We exist to serve artists, organizers, and audiences—not investors or advertisers. Your trust is our success.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">💡 Transparency & Fairness</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No hidden fees. Clear pricing. Honest communication. We believe fairness builds lasting relationships.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-slate-700 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">🚀 Innovation with Respect</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We use modern technology to enhance—not replace—the human connection that makes live events special.
              </p>
            </div>
          </div>
        </div>

        {/* Cities We Serve */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-2xl font-bold text-slate-900">Cities We Serve</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Currently, MahaTicket connects audiences and organizers across Maharashtra:
          </p>
          <div className="flex flex-wrap gap-2">
            {['Pune', 'Mumbai', 'Thane', 'Nashik', 'Nagpur', 'Aurangabad', 'Kolhapur', 'Solapur', 'Satara', 'Sangli', 'Ahmednagar', 'Amravati'].map(city => (
              <span key={city} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold border border-orange-200">
                {city}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 italic mt-3">
            आणखी शहरांमध्ये लवकरच येत आहे • Expanding to more cities soon
          </p>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-8 text-white text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Join the MahaTicket Community</h2>
          <p className="text-sm leading-relaxed opacity-95 max-w-2xl mx-auto">
            Whether you're an event organizer looking to digitize ticketing or an audience member discovering Maharashtra's best cultural experiences, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link 
              href="/contact"
              className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition shadow-md"
            >
              Contact Us
            </Link>
            <Link 
              href="/"
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold text-sm hover:bg-white/30 transition border border-white/30"
            >
              Explore Events
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
          <Link href="/terms" className="hover:text-orange-600 transition">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-orange-600 transition">Privacy Policy</Link>
          <span>•</span>
          <Link href="/refund" className="hover:text-orange-600 transition">Refund Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-orange-600 transition">Contact Support</Link>
        </div>

        <p className="text-center text-xs text-slate-600 py-4">
          © 2026 MahaTicket • Kalpkrut Infotech • महाराष्ट्रासाठी, महाराष्ट्राकडून
        </p>

      </main>
    </div>
  );
}
