import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'TicketGhar (तिकीटघर) - Maharashtra-First Event & Ticket Marketplace',
  description: 'Maharashtra-first digital ticket marketplace for plays, movies, concerts, and cultural events with database-authoritative seat reservation, instant QR passes, and organizer settlement engine.',
  openGraph: {
    title: 'TicketGhar (तिकीटघर) - Maharashtra-First Event & Ticket Marketplace',
    description: 'Maharashtra-first digital ticket marketplace for plays, movies, concerts, and cultural events with database-authoritative seat reservation, instant QR passes, and organizer settlement engine.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TicketGhar (तिकीटघर) - Maharashtra-First Event & Ticket Marketplace',
    description: 'Maharashtra-first digital ticket marketplace for plays, movies, concerts, and cultural events with database-authoritative seat reservation, instant QR passes, and organizer settlement engine.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
