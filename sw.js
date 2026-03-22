// ============================================================
// Arus Kas — Service Worker v1.0
// ============================================================
const CACHE_NAME = 'arus-kas-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install — cache semua assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first untuk assets, network first untuk API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Jangan cache request ke Google Apps Script / Sheets
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('sheets.googleapis.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return; // biarkan browser handle sendiri
  }

  // Cache first untuk assets lokal
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache response baru kalau valid
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
