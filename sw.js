const CACHE_NAME = 'supermarian-app-v1';
const APP_FILES = [
    './', './index.html', './menu.html', './facturacion/facturacion.html',
    './Creditos/creditos.html', './Almacen/Almacen.html', './Almacen/almacen.js',
    './Almacen/validaciones.js', './facturacion/pos-core.js', './facturacion/pos-ui.js',
    './facturacion/pos-events.js', './facturacion/pos-pagos.js', './facturacion/ticket-system.js',
    './offline-status.js'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && !url.hostname.endsWith('gstatic.com') && !url.hostname.endsWith('jsdelivr.net') && !url.hostname.endsWith('unpkg.com')) return;
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            return response;
        }).catch(() => caches.match('./index.html')))
    );
});
