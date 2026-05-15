// Service Worker - Always Fresh Strategy
// Auto-generated version on build: v1778810919916
const CACHE_VERSION = 'v1778810919916'
const CACHE_NAMES = {
  STATIC: `nextcbt-static-${CACHE_VERSION}`,
  DYNAMIC: `nextcbt-dynamic-${CACHE_VERSION}`,
  API: `nextcbt-api-${CACHE_VERSION}`,
}

const PRECACHE = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAMES.STATIC).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (!Object.values(CACHE_NAMES).includes(key)) return caches.delete(key)
      }))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return
  if (url.hostname !== self.location.hostname) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE_NAMES.DYNAMIC))
    return
  }
  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.STATIC))
    return
  }
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.STATIC))
    return
  }
  event.respondWith(networkFirst(request, CACHE_NAMES.DYNAMIC))
})

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHE') caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'BACKGROUND_SYNC', tag: event.tag }))
    }))
  }
})
