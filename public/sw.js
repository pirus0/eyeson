const CACHE_NAME = "eyeson-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Morning reminder sent by .github/workflows/notify.yml.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const scope = self.registration.scope;
  const jobs = [
    self.registration.showNotification(payload.title || "Eyes On", {
      body: payload.body || "",
      icon: scope + "icons/icon-192.png",
      badge: scope + "icons/icon-192.png",
      tag: "eyeson-gunluk",
      data: { url: scope },
    }),
  ];
  if (typeof payload.count === "number" && self.navigator.setAppBadge) {
    jobs.push(self.navigator.setAppBadge(payload.count).catch(() => {}));
  }
  event.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(url);
    })
  );
});

// Network-first, falling back to cache when offline. Every successful
// same-origin GET response is cached so the app keeps working offline
// after the first visit, without needing to know Next.js's hashed
// build filenames ahead of time.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Promise.reject("offline")))
  );
});
