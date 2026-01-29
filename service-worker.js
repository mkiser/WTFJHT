const CACHE_NAME = "wtfjht-lite-cache-v3";

const urlsToCache = [
  "https://whatthefuckjusthappenedtoday.com/web-app-manifest-192x192.png?v=3",
  "https://whatthefuckjusthappenedtoday.com/web-app-manifest-512x512.png?v=3"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache each URL individually, ignoring failures (e.g., in local dev)
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(() => {})
        )
      );
    })
  );
});

self.addEventListener("activate", event => {
  clients.claim();
});

self.addEventListener("fetch", event => {
  const requestUrl = event.request.url;

  if (urlsToCache.some(url => requestUrl.includes(new URL(url).pathname))) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
