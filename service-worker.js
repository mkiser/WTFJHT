const CACHE_NAME = "wtfjht-cache-v1";
 const urlsToCache = [
  "/",
  "/manifest.json",
  "/uploads/wtfjht-logo192.png",
  "/uploads/wtfjht-logo512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
