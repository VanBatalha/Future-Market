/* ═══════════════════════════════════════════════════════════
   Service Worker — Future Market TV Ads
   • Cache de app + config  →  tv-ads-app-v1
   • Cache de vídeo         →  tv-ads-media-v1
   • Range requests para MP4 tratados manualmente para
     compatibilidade com Smart TVs e navegadores móveis
═══════════════════════════════════════════════════════════ */

const APP_CACHE   = 'tv-ads-app-v1';
const MEDIA_CACHE = 'tv-ads-media-v1';

const APP_FILES = [
  './',
  './index.html',
  './config.json',
  './manifest.webmanifest',
  './poster.jpg',
  './sw.js',
];

/* ── Instalação ── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).catch(() => {})
  );
});

/* ── Ativação ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== MEDIA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  /* 1. config.json → network-first, fallback para cache */
  if (url.pathname.endsWith('/config.json')) {
    event.respondWith(networkFirstConfig(event.request));
    return;
  }

  /* 2. Vídeos (.mp4, .webm, .mov) → cache-first com suporte a range */
  if (/\.(mp4|webm|mov)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(videoHandler(event.request));
    return;
  }

  /* 3. Demais assets → cache-first, fallback para network */
  event.respondWith(cacheFirstAsset(event.request));
});

/* ═══════════════════════════════════════════════════════════
   Estratégias
═══════════════════════════════════════════════════════════ */

async function networkFirstConfig(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put('./config.json', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('./config.json');
    return cached || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
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

/* ── Vídeo: cache + suporte a Range requests ── */
async function videoHandler(request) {
  const cacheKey = new Request(stripQuery(request.url)); // chave sem ?v=...
  const cache    = await caches.open(MEDIA_CACHE);
  const rangeHeader = request.headers.get('range');

  /* Já tem no cache? Serve com suporte a range */
  const cached = await cache.match(cacheKey);
  if (cached) {
    if (rangeHeader) {
      return sliceResponse(cached, rangeHeader);
    }
    return cached;
  }

  /* Não está em cache: baixa da rede */
  try {
    // Primeiro tenta sem range para obter o arquivo completo e cachear
    const fullRequest = new Request(request.url, {
      headers: {},         // sem Range → resposta 200 completa
      mode: request.mode,
      credentials: request.credentials,
    });

    const response = await fetch(fullRequest);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    /* Cacheia a resposta completa */
    await cache.put(cacheKey, response.clone());

    /* Devolve slice se o browser pediu um range */
    if (rangeHeader) {
      return sliceResponse(response.clone(), rangeHeader);
    }
    return response;
  } catch {
    /* Fallback: repassa o request original (com range) para a rede */
    return fetch(request).catch(
      () => new Response('Vídeo indisponível', { status: 503 })
    );
  }
}

/* ── Fatia uma Response completa para atender um Range request ── */
async function sliceResponse(response, rangeHeader) {
  const blob  = await response.blob();
  const total = blob.size;
  const type  = response.headers.get('content-type') || 'video/mp4';

  /* Parseia "bytes=start-end" */
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return new Response(blob, { status: 200 });

  const start = match[1] !== '' ? parseInt(match[1]) : total - parseInt(match[2]);
  const end   = match[2] !== '' ? Math.min(parseInt(match[2]), total - 1) : total - 1;

  if (start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const sliced = blob.slice(start, end + 1, type);

  return new Response(sliced, {
    status: 206,
    headers: {
      'Content-Type':   type,
      'Content-Length': String(sliced.size),
      'Content-Range':  `bytes ${start}-${end}/${total}`,
      'Accept-Ranges':  'bytes',
    },
  });
}

/* Remove query string da URL para usar como chave de cache */
function stripQuery(url) {
  const u = new URL(url);
  u.search = '';
  return u.href;
}
