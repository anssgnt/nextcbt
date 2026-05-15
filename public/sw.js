// Service Worker - Always Fresh Strategy
// Increment version to force update on deploy
const CACHE_VERSION = 'v2'
const CACHE_NAMES = {
  STATIC: `nextcbt-static-${CACHE_VERSION}`,
  DYNAMIC: `nextcbt-dynamic-${CACHE_VERSION}`,
  API: `nextcbt-api-${CACHE_VERSION}`,
}

// Only cache the shell, not JS/CSS (those use network-first)
const PRECACHE = [
  '/manifest.json',
]

// Install: precache minimal assets, immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: delete ALL old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!Object.values(CACHE_NAMES).includes(key)) {
            return caches.delete(key)
          }
        })
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET
  if (request.method !== 'GET') return
  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') return
  // Skip supabase/external API calls - let them pass through
  if (url.hostname !== self.location.hostname) return

  // Navigation requests (HTML pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE_NAMES.DYNAMIC))
    return
  }

  // JS & CSS: network-first (always get latest build)
  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.STATIC))
    return
  }

  // Images & fonts: cache-first (rarely change)
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.STATIC))
    return
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, CACHE_NAMES.DYNAMIC))
})

// Network-first: try network, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

// Cache-first: try cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return new Response('Offline', { status: 503 })
  }
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  }
})

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC', tag: event.tag })
        })
      })
    )
  }
})
