const CACHE_NAME = "wtfjht-lite-cache-v3";

const urlsToCache = [
  "/web-app-manifest-192x192.png?v=3",
  "/web-app-manifest-512x512.png?v=3"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  clients.claim();
});

self.addEventListener("fetch", event => {
  const requestPath = new URL(event.request.url).pathname;

  if (urlsToCache.includes(requestPath)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
