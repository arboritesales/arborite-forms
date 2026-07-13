const CACHE_NAME = 'arborite-field-forms-v67';
const APP_MODULES = [
  'core-shared', 'signatures', 'jobs-storage', 'jobs-save-load',
  'forms-collect-restore', 'navigation', 'documents', 'office-permdocs',
  'autosave', 'vehicle-checks', 'defects-shared', 'equipment-checks',
  'survey-reports', 'defects-dashboard', 'todays-checks-schedule',
  'toolbox-talks', 'audits'
];
const APP_SHELL = [
  './',
  './index.html',
  './css/app.css?v=95'
].concat(APP_MODULES.map(m => './js/modules/' + m + '.js?v=95')).concat([
  './manifest.json',
  './arborite-logo-192.png',
  './arborite-logo-512.png',
  './arborite-leaf.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
]);

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

  const url = event.request.url;

  // Always network-first for the main HTML and core app files so updates arrive immediately
  const isAppShell = event.request.mode === 'navigate'
    || url.includes('/js/modules/')
    || url.includes('/app.css')
    || url.includes('index.html');

  if (isAppShell) {
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

  // Cache-first for images, fonts and third-party libs
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
