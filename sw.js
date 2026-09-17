var CACHE = 'austria2026-v6';
var CORE = ['./', './index.html', './styles.css', './trip-data.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-192-maskable.png', './icon-512-maskable.png'];
var META = './offline-meta';

function saveTimestamp(cache) {
    return cache.put(META, new Response(JSON.stringify({ savedAt: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE)
            .then(async function (cache) { await cache.addAll(CORE); await saveTimestamp(cache); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'OFFLINE_STATUS' || !event.ports[0]) return;
    event.waitUntil((async function () {
        try {
            var cache = await caches.open(CACHE);
            var assets = await Promise.all(CORE.map(function (path) { return cache.match(path); }));
            var metadata = await cache.match(META);
            var savedAt = metadata ? (await metadata.json()).savedAt : null;
            event.ports[0].postMessage({ ready: assets.every(function (response) { return response && response.ok; }), savedAt: savedAt });
        } catch (error) {
            event.ports[0].postMessage({ ready: false, savedAt: null });
        }
    })());
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (key) { return key.startsWith('austria2026-') && key !== CACHE; }).map(function (key) { return caches.delete(key); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    var url = new URL(e.request.url);
    // Forecast API responses must stay live; only same-origin assets and fonts are cached
    if (url.origin !== self.location.origin && url.hostname !== 'fonts.googleapis.com' && url.hostname !== 'fonts.gstatic.com') return;
    if (e.request.mode === 'navigate') {
        if (url.pathname !== new URL(self.registration.scope).pathname && url.pathname !== new URL('index.html', self.registration.scope).pathname) return;
        var navigation = (async function () {
            var cache = await caches.open(CACHE);
            var controller = new AbortController();
            var timeout = setTimeout(function () { controller.abort(); }, 4000);
            try {
                var response = await fetch(e.request, { signal: controller.signal });
                if (response.ok) {
                    try { await cache.put('./index.html', response.clone()); await saveTimestamp(cache); } catch (error) { }
                    return response;
                }
                return await cache.match('./index.html') || response;
            } catch (error) {
                return await cache.match('./index.html') || await cache.match('./') || Response.error();
            } finally {
                clearTimeout(timeout);
            }
        })();
        e.respondWith(navigation);
        e.waitUntil(navigation.then(function () {}));
        return;
    }
    var cached = caches.open(CACHE).then(function (cache) { return cache.match(e.request); });
    var network = (async function () {
        try {
            var response = await fetch(e.request);
            if (response.ok || response.type === 'opaque') {
                try { await (await caches.open(CACHE)).put(e.request, response.clone()); } catch (error) { }
            }
            return response;
        } catch (error) {
            return await cached || Response.error();
        }
    })();
    e.respondWith(cached.then(function (hit) { return hit || network; }));
    e.waitUntil(network.then(function () {}));
});
