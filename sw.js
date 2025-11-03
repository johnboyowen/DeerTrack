const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const APP_SHELL_FILES = ['/', '/index.html', '/manifest.json'];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isNav =
    req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

  // 1) Navigations -> return cached index.html (SPA fallback)
  if (isNav) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match('/index.html');
        if (cached) return cached;
        try {
          const resp = await fetch('/index.html', { cache: 'no-store' });
          cache.put('/index.html', resp.clone());
          return resp;
        } catch {
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  const url = new URL(req.url);
  const isSameOrigin = self.location.origin === url.origin;
  const isStatic =
    isSameOrigin &&
    (url.pathname.startsWith('/assets/') ||
      /\.js$|\.css$|\.svg$|\.png$|\.jpg$|\.jpeg$|\.webp$|\.woff2?$/.test(
        url.pathname
      ));

  // 2) Static assets -> stale-while-revalidate-ish
  if (isStatic) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((resp) => {
            cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => null);
        return cached || network || new Response('', { status: 504 });
      })
    );
    return;
  }

  // 3) API calls -> network-first with cache fallback (optional)
  const isApi = url.pathname.startsWith('/api/') || url.hostname.includes('base44');
  if (isApi) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(req);
          return resp;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          return (
            cached ||
            new Response(JSON.stringify({ offline: true, message: 'API unavailable offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
      })()
    );
    return;
  }

  // 4) Default: try network, then cache
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        return cached || new Response('', { status: 504 });
      }
    })()
  );
});
