import type { Metadata } from 'next';
import { Outfit, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-sans-devanagari',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MahaTicket (महाटिकिट) - Maharashtra-First Event & Ticket Marketplace',
  description: 'Maharashtra-first digital ticket marketplace for theatre plays, music, movies, and cultural events with real-time seat reservation, verified QR passes, and instant booking.',
  openGraph: {
    title: 'MahaTicket (महाटिकिट) - Maharashtra-First Event & Ticket Marketplace',
    description: 'Book tickets for Marathi plays, concerts, comedy, and cultural events across Pune, Mumbai, Nashik, and Maharashtra with instant digital QR passes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MahaTicket (महाटिकिट) - Maharashtra-First Event & Ticket Marketplace',
    description: 'Book tickets for Marathi plays, concerts, comedy, and cultural events across Pune, Mumbai, Nashik, and Maharashtra with instant digital QR passes.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${notoSansDevanagari.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
