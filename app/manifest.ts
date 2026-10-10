import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MahaTicket (महाटिकिट) - Maharashtra Ticket Marketplace',
    short_name: 'MahaTicket',
    description: 'Maharashtra-first digital ticket marketplace for plays, concerts, movies, comedy, and cultural experiences.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0E17',
    theme_color: '#EA580C',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
