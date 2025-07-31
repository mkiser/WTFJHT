const CACHE_NAME = "wtfjht-cache-v1.1"; 
const urlsToCache = [
  "/",
  "/manifest.json",
  "/uploads/web-app-manifest-192x192.png",
  "/uploads/web-app-manifest-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request);
      })
      .catch((error) => {
        console.warn("Fetch failed for:", event.request.url, error);
        return new Response("Offline", {
          status: 503,
          statusText: "Offline or fetch failed",
        });
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
