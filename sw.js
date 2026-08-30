// Service Worker — מטמון אופליין לתיק הטיול
var CACHE = 'austria2026-v3';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-192-maskable.png', './icon-512-maskable.png'];

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

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;

    // network-first לדף עצמו — כך שעדכון לתיק מופיע מיד, ורק בלי רשת נופלים למטמון
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).then(function (res) {
                var copy = res.clone();
                caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
                return res;
            }).catch(function () {
                return caches.match('./index.html').then(function (hit) { return hit || caches.match('./'); });
            })
        );
        return;
    }

    // cache-first עם עדכון ברקע לשאר הנכסים — תופס גם את גופני Google לשימוש אופליין
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
