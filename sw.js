const CACHE_NAME = 'sbd-survey-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './cascading_data.csv',
  './manifest.json',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        const urls = PRECACHE_URLS.map(url => new URL(url, self.location.href).href);
        return cache.addAll(urls);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Cache failed:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('script.google.com')) return;

  const requestURL = new URL(event.request.url);
  const allowedExternal = ['cdn.jsdelivr.net'];
  const isAllowed = allowedExternal.some(o => requestURL.hostname.includes(o));
  if (requestURL.origin !== self.location.origin && !isAllowed) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(new URL('./offline.html', self.location.href).href);
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') caches.delete(CACHE_NAME);
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-submissions') event.waitUntil(syncPendingSubmissions());
});

async function syncPendingSubmissions() {
  console.log('[SW] Syncing pending submissions...');
}
