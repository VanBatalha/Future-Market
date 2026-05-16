/* ═══════════════════════════════════════════════════════════
   Service Worker — Future Market TV Ads

   O vídeo NÃO é interceptado aqui: a página gerencia o cache
   de mídia diretamente via Cache API e usa blob URLs, o que
   elimina qualquer interferência do SW no loop do vídeo.

   Este SW cuida apenas dos assets estáticos do app
   (HTML, config, manifest, poster, sw.js).
═══════════════════════════════════════════════════════════ */

const APP_CACHE = 'tv-ads-app-v1';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './poster.jpg',
  './sw.js',
];

/* ── Instalação: pré-cacheia os assets do app ── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .catch(() => {})   // não bloqueia instalação se algum asset falhar
  );
});

/* ── Ativação: limpa caches de versões antigas do app ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== 'tv-ads-media-v1')
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: apenas assets do app; vídeos passam direto ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Vídeos: deixa o browser + Cache API da página gerenciarem
  if (/\.(mp4|webm|mov)(\?.*)?$/.test(url.pathname)) return;

  // config.json: network-first com fallback para cache
  if (url.pathname.endsWith('/config.json')) {
    event.respondWith(networkFirstConfig(event.request));
    return;
  }

  // Demais assets: cache-first com fallback para network
  event.respondWith(cacheFirstAsset(event.request));
});

/* ════════════════════════════════════════════════
   Estratégias
════════════════════════════════════════════════ */

async function networkFirstConfig(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put('./config.json', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('./config.json');
    return cached || new Response('{}', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
