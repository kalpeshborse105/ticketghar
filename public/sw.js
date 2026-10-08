/* MahaTicket — no-op service worker placeholder (prevents 404/500 on /sw.js) */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
