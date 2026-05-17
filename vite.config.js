import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin: Auto-update SW version on every build
function swVersionPlugin() {
  return {
    name: 'sw-version',
    buildStart() {
      const version = `v${Date.now()}`
      const swPath = resolve(__dirname, 'public/sw.js')
      const swContent = `// Service Worker - Always Fresh Strategy
// Auto-generated version on build: ${version}
const CACHE_VERSION = '${version}'
const CACHE_NAMES = {
  STATIC: \`nextcbt-static-\${CACHE_VERSION}\`,
  DYNAMIC: \`nextcbt-dynamic-\${CACHE_VERSION}\`,
  API: \`nextcbt-api-\${CACHE_VERSION}\`,
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
  if (/\\.(js|css)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.STATIC))
    return
  }
  if (/\\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
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
`
      writeFileSync(swPath, swContent)
    },
  }
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  build: {
    target: ['es2015', 'chrome63', 'safari11'],
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-ui': ['lucide-react', 'zustand', 'pako'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
