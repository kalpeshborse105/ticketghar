import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TicketGhar (तिकीटघर) - Maharashtra Ticket Marketplace',
    short_name: 'TicketGhar',
    description: 'Maharashtra-first digital ticket marketplace for plays, concerts, movies, comedy, and cultural experiences.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#D97706',
    icons: [
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
