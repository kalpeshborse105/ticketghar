import type { Metadata, Viewport } from 'next';
import { Manrope, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { TikitMitraFloatingBot } from '@/src/components/TikitMitraFloatingBot';
import { GlobalMobileNav } from '@/src/components/ui/GlobalMobileNav';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-sans-devanagari',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ea580c',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://beats.kalpkrutinfotech.com'),
  title: {
    default: 'MahaTicket (महाटिकिट) — महाराष्ट्राचे अधिकृत नाटक व इव्हेंट तिकीट बुकिंग व्यासपीठ',
    template: '%s | MahaTicket (महाटिकिट)',
  },
  description:
    'महाराष्ट्रातील लोकप्रिय मराठी नाटके, संगीत मैफिली, स्टँड-अप कॉमेडी आणि सांस्कृतिक कार्यक्रमांचे अधिकृत तिकीट बुकिंग. बालगंधर्व, यशवंतराव चव्हाण, दीनानाथ नाट्यगृहाचे थेट सीट आरक्षण करा.',
  keywords: [
    'MahaTicket',
    'महाटिकिट',
    'Marathi Natak Booking',
    'मराठी नाटक',
    'Pune Theater Tickets',
    'Mumbai Drama Tickets',
    'बालगंधर्व रंगमंदिर',
    'यशवंतराव चव्हाण नाट्यगृह',
    'Bal Gandharva Rang Mandir',
    'Marathi Drama Online Tickets',
    'पुणे नाटक तिकीट',
    'मुंबई नाटक आरक्षण',
    'M-Ticket Maharashtra',
    'Book Marathi Shows',
    'Ticketghar',
  ],
  authors: [{ name: 'MahaTicket Kalpkrut' }],
  creator: 'Kalpkrut Infotech',
  publisher: 'MahaTicket',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'MahaTicket (महाटिकिट) — बुक करा मराठी नाटके व इव्हेंट तिकिटे',
    description:
      'महाराष्ट्रातील लोकप्रिय मराठी नाटके, संगीत, लोककला आणि मनोरंजनाचे हक्काचे व्यासपीठ. पारदर्शक आरक्षण आणि झटपट डिजिटल एम-पास.',
    url: 'https://beats.kalpkrutinfotech.com',
    siteName: 'MahaTicket',
    locale: 'mr_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MahaTicket (महाटिकिट) — Marathi Drama & Event Tickets',
    description:
      'Book confirmed seats for top Marathi Natak and events across Maharashtra with instant digital pass.',
  },
  alternates: {
    canonical: 'https://beats.kalpkrutinfotech.com',
    languages: {
      'mr-IN': 'https://beats.kalpkrutinfotech.com',
      'en-IN': 'https://beats.kalpkrutinfotech.com?lang=en',
    },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="mr"
      className={`${manrope.variable} ${notoSansDevanagari.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <TikitMitraFloatingBot />
        <GlobalMobileNav />
      </body>
    </html>
  );
}

