const CACHE = 'meditrack-static-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/index.html', '/Appiconandlogo.jpg'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // Optionally cache same-origin requests
          try {
            const clone = resp.clone();
            if (event.request.url.startsWith(self.location.origin)) {
              caches.open(CACHE).then((cache) => cache.put(event.request, clone));
            }
          } catch (e) {
            // ignore
          }
          return resp;
        })
        .catch(() => caches.match('/'));
    })
  );
});
