// Service Worker — מטמון אופליין לתיק הטיול
var CACHE = 'austria2026-v1';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE)
            .then(function (c) { return c.addAll(CORE); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

// cache-first עם עדכון ברקע — תופס גם את גופני Google לשימוש אופליין
self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(function (hit) {
            var net = fetch(e.request).then(function (res) {
                if (res && (res.ok || res.type === 'opaque')) {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
                }
                return res;
            }).catch(function () { return hit; });
            return hit || net;
        })
    );
});
