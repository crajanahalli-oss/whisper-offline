// Service Worker for Whisper Offline PWA
// Version-based cache invalidation

const VERSION = 'v1';
const APP_CACHE = `whisper-app-${VERSION}`;
const CDN_CACHE = `whisper-cdn-${VERSION}`;

// Core app shell files to precache
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/app.js',
  '/storage-manager.js',
  '/audio-processor.js',
  '/transcriber.js',
  '/transcriber-worker.js',
  '/manifest.json'
];

// CDN resources to cache with network-first strategy
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/idb@8/+esm',
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
];

// Patterns to exclude from service worker caching
// Let Transformers.js manage its own cache
const EXCLUDE_PATTERNS = [
  /huggingface\.co/,
  /\.onnx$/,
  /\.onnx_data$/,
  /transformers-cache/,
  /whisper-models-v1/ // Don't touch storage-manager.js cache
];

// Check if request should be excluded from caching
function shouldExclude(url) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(url));
}

// Check if request is for app shell
function isAppShellRequest(url) {
  const pathname = new URL(url).pathname;
  return APP_SHELL_FILES.some(file => {
    if (file === '/') return pathname === '/' || pathname === '/index.html';
    return pathname === file || pathname.endsWith(file);
  });
}

// Check if request is for CDN resource
function isCDNRequest(url) {
  return CDN_URLS.some(cdnUrl => url.startsWith(cdnUrl));
}

// Install event - precache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', VERSION);

  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        console.log('[Service Worker] App shell cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[Service Worker] Precache failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', VERSION);

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Keep these caches
        const cacheWhitelist = [
          APP_CACHE,
          CDN_CACHE,
          'whisper-models-v1' // Don't delete storage-manager.js cache
        ];

        // Delete old app/CDN caches, but preserve model cache
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName) &&
                !cacheName.startsWith('transformers-')) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - routing logic
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Exclude Transformers.js and model-related requests
  if (shouldExclude(url)) {
    // Let Transformers.js handle its own caching
    return;
  }

  // Strategy 1: Cache First for app shell
  if (isAppShellRequest(url)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version immediately
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(request)
            .then(networkResponse => {
              // Cache the response for future use
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(APP_CACHE)
                  .then(cache => cache.put(request, responseClone));
              }
              return networkResponse;
            })
            .catch(error => {
              console.error('[Service Worker] Fetch failed for app shell:', url, error);
              // Return offline fallback if available
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Strategy 2: Network First for CDN resources
  if (isCDNRequest(url)) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Cache successful response
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CDN_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(error => {
          console.warn('[Service Worker] CDN fetch failed, trying cache:', url);
          // Fallback to cache if network fails
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              throw error;
            });
        })
    );
    return;
  }

  // Default: Network only for everything else
  // This includes test pages, external resources, etc.
});

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});

console.log('[Service Worker] Loaded version:', VERSION);
