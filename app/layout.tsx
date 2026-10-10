import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { TikitMitraFloatingBot } from '@/src/components/TikitMitraFloatingBot';
import { GlobalMobileNav } from '@/src/components/ui/GlobalMobileNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
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
  title: 'MahaTicket | महाटिकिट - महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ',
  description: 'महाराष्ट्रातील नाट्य, संगीत, लोककला आणि मनोरंजनाचे हक्काचे व्यासपीठ. पारदर्शक आरक्षण, झटपट एम-तिकीट आणि अस्सल मराठी अनुभव.',
  openGraph: {
    title: 'MahaTicket | महाटिकिट',
    description: 'महाराष्ट्रातील नाट्य, संगीत, लोककला आणि मनोरंजनाचे हक्काचे व्यासपीठ.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MahaTicket | महाटिकिट',
    description: 'महाराष्ट्रातील नाट्य, संगीत, लोककला आणि मनोरंजनाचे हक्काचे व्यासपीठ.',
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
      className={`${inter.variable} ${notoSans.variable} ${notoSansDevanagari.variable}`}
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

