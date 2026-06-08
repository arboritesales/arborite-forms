const CACHE_NAME = 'arborite-field-forms-v37';
const APP_SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './manifest.json',
  './arborite-logo-192.png',
  './arborite-logo-512.png',
  './arborite-leaf.svg'
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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Network-first for HTML page navigations — always pulls the latest index.html
  // so iOS devices pick up new versions without manual cache clearing
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for all other assets (CSS, JS, images)
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
