const APP_CACHE = 'tv-ads-app-v1';
const MEDIA_CACHE = 'tv-ads-media-v1';
const APP_FILES = [
  './',
  './index.html',
  './config.json',
  './manifest.webmanifest',
  './poster.jpg',
  './sw.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.pathname.endsWith('/config.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(APP_CACHE).then(cache => cache.put('./config.json', clone));
          return response;
        })
        .catch(() => caches.match('./config.json'))
    );
    return;
  }

  if (url.pathname.endsWith('.mp4')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) caches.open(MEDIA_CACHE).then(cache => cache.put(event.request, response.clone()));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
