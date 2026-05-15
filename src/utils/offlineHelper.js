/**
 * Offline Helper Utilities
 */

/**
 * Register Service Worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Check if app is online
 */
export const isOnline = () => {
  return navigator.onLine
}

/**
 * Listen to online/offline events
 */
export const onOnlineStatusChange = (callback) => {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))

  return () => {
    window.removeEventListener('online', () => callback(true))
    window.removeEventListener('offline', () => callback(false))
  }
}

/**
 * Get storage quota
 */
export const getStorageQuota = async () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: (estimate.usage / estimate.quota) * 100,
    }
  } catch (error) {
    console.error('Failed to get storage quota:', error)
    return null
  }
}

/**
 * Request persistent storage
 */
export const requestPersistentStorage = async () => {
  if (!navigator.storage || !navigator.storage.persist) {
    return false
  }

  try {
    const persistent = await navigator.storage.persist()
    console.log('Persistent storage granted:', persistent)
    return persistent
  } catch (error) {
    console.error('Failed to request persistent storage:', error)
    return false
  }
}

/**
 * Clear all offline data
 */
export const clearAllOfflineData = async () => {
  try {
    // Clear IndexedDB
    const dbs = await indexedDB.databases()
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name)
    }

    // Clear Service Worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    // Clear localStorage
    localStorage.clear()

    // Clear sessionStorage
    sessionStorage.clear()

    console.log('All offline data cleared')
    return true
  } catch (error) {
    console.error('Failed to clear offline data:', error)
    return false
  }
}

/**
 * Get offline data size
 */
export const getOfflineDataSize = async () => {
  try {
    const quota = await getStorageQuota()
    if (!quota) return null

    return {
      used: quota.usage,
      available: quota.quota - quota.usage,
      total: quota.quota,
      percentage: quota.percentage,
    }
  } catch (error) {
    console.error('Failed to get offline data size:', error)
    return null
  }
}

/**
 * Sync when online
 */
export const syncWhenOnline = (syncFn) => {
  if (isOnline()) {
    syncFn()
  } else {
    const handleOnline = () => {
      syncFn()
      window.removeEventListener('online', handleOnline)
    }
    window.addEventListener('online', handleOnline)
  }
}

/**
 * Retry with exponential backoff
 */
export const retryWithBackoff = async (fn, maxRetries = 5, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`Retry attempt ${attempt}/${maxRetries} in ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export default {
  registerServiceWorker,
  isOnline,
  onOnlineStatusChange,
  getStorageQuota,
  requestPersistentStorage,
  clearAllOfflineData,
  getOfflineDataSize,
  syncWhenOnline,
  retryWithBackoff,
}
