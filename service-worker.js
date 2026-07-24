const CACHE_NAME = 'arborite-field-forms-v70';
const APP_SHELL = [
  './',
  './index.html',
  './css/app.css?v=101',
  './js/app.js?v=101',
  './manifest.json',
  './arborite-logo-192.png',
  './arborite-logo-512.png',
  './arborite-leaf.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

const APP_SHELL_TIMEOUT_MS = 3000;

// Network-first, but don't let a slow/flaky connection (common out on site)
// block the app from opening — race the network against a short timeout and
// fall back to the cached copy if it hasn't answered yet. The network fetch
// keeps running in the background and still refreshes the cache when it lands.
function networkFirstWithTimeout(request) {
  return caches.open(CACHE_NAME).then(cache => {
    const networkFetch = fetch(request)
      .then(response => {
        cache.put(request, response.clone());
        return response;
      })
      .catch(() => null);

    const timeout = new Promise(resolve => setTimeout(() => resolve(null), APP_SHELL_TIMEOUT_MS));

    return Promise.race([networkFetch, timeout]).then(winner => {
      if (winner) return winner;
      return cache.match(request)
        .then(cached => cached || networkFetch)
        .then(result => result || Response.error());
    });
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Always network-first for the main HTML and core app files so updates arrive immediately
  const isAppShell = event.request.mode === 'navigate'
    || url.includes('/app.js')
    || url.includes('/app.css')
    || url.includes('index.html');

  if (isAppShell) {
    event.respondWith(networkFirstWithTimeout(event.request));
    return;
  }

  // Cache-first for images, fonts and third-party libs
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
