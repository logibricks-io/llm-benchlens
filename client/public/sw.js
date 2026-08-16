/**
 * BenchLens service worker.
 *
 * Deliberately conservative: the whole value of this product is that a number
 * comes with a known provenance and a known age. Serving a silently cached
 * score would undermine that. So:
 *   - App shell / static assets: cache-first (safe, versioned by URL).
 *   - API calls (/api/*): network-first, and a cached copy is only ever used
 *     when the network genuinely fails, so offline degrades to "last known"
 *     rather than to a blank screen.
 */
const VERSION = "benchlens-v2";
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const SHELL_ASSETS = ["/m", "/manifest.json", "/icon.svg"];

/**
 * Cache-first is only safe for URLs that change when their contents change.
 * Vite's build emits `/assets/index-<hash>.js`; its dev server emits
 * `/src/App.tsx?t=…`, which is the *same* path across edits. Caching the latter
 * pins the app to a stale bundle — and in production the same mistake would
 * leave returning users on an old release indefinitely.
 */
function isImmutableAsset(url) {
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|webp|jpg)$/.test(url.pathname)) {
    return true;
  }
  return SHELL_ASSETS.includes(url.pathname);
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data: always try the network first so scores and freshness stay honest.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(DATA).then(c => c.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(request).then(hit => hit ?? Response.error())),
    );
    return;
  }

  // Navigations: network-first with the mobile shell as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/m").then(hit => hit ?? Response.error())));
    return;
  }

  // Static assets: cache-first.
  // Anything not content-addressed goes straight to the network, uncached.
  if (!isImmutableAsset(url)) return;

  event.respondWith(
    caches.match(request).then(
      hit =>
        hit ??
        fetch(request).then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(request, copy)).catch(() => undefined);
          return res;
        }),
    ),
  );
});
