const DB_NAME = 'NextCBT'
const DB_VERSION = 1

const STORES = {
  EXAMS: 'exams',
  QUESTIONS: 'questions',
  OPTIONS: 'options',
  ANSWERS: 'answers',
  SYNC_QUEUE: 'syncQueue',
}

const MAX_STORE_SIZE = {
  exams: 100,
  questions: 5000,
  options: 20000,
  answers: 10000,
  syncQueue: 1000,
}

class IndexedDBManager {
  constructor() {
    this.db = null
    this.isInitialized = false
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create stores if they don't exist
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            store.createIndex('timestamp', 'timestamp', { unique: false })
            store.createIndex('examId', 'examId', { unique: false })
          }
        })
      }
    })
  }

  /**
   * Get store
   */
  getStore(storeName, mode = 'readonly') {
    if (!this.db) throw new Error('IndexedDB not initialized')
    const transaction = this.db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  /**
   * Add item to store with LRU eviction
   */
  async add(storeName, item) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check store size before adding
        const count = await this.getCount(storeName)
        if (count >= MAX_STORE_SIZE[storeName]) {
          await this.evictLRU(storeName)
        }

        const store = this.getStore(storeName, 'readwrite')
        const request = store.add({
          ...item,
          timestamp: Date.now(),
        })

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Put item to store (add or update)
   */
  async put(storeName, item) {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this.getCount(storeName)
        if (count >= MAX_STORE_SIZE[storeName]) {
          await this.evictLRU(storeName)
        }

        const store = this.getStore(storeName, 'readwrite')
        const request = store.put({
          ...item,
          timestamp: Date.now(),
        })

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Get item by ID
   */
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (request.result) {
          // Update timestamp on access (for LRU)
          this.put(storeName, { ...request.result, timestamp: Date.now() }).catch(
            console.error
          )
        }
        resolve(request.result)
      }
    })
  }

  /**
   * Get all items from store
   */
  async getAll(storeName, query = null) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly')
      const request = query ? store.getAll(query) : store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Query by index
   */
  async queryByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly')
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Delete item
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clear entire store
   */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get store count
   */
  async getCount(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly')
      const request = store.count()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * LRU Eviction - remove oldest accessed item
   */
  async evictLRU(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const index = store.index('timestamp')
      const request = index.openCursor()
      let oldestKey = null

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          oldestKey = cursor.primaryKey
          cursor.continue()
        } else {
          if (oldestKey !== null) {
            const deleteRequest = store.delete(oldestKey)
            deleteRequest.onerror = () => reject(deleteRequest.error)
            deleteRequest.onsuccess = () => resolve()
          } else {
            resolve()
          }
        }
      }
    })
  }

  /**
   * Batch operations
   */
  async batchPut(storeName, items) {
    const store = this.getStore(storeName, 'readwrite')
    return Promise.all(
      items.map(
        (item) =>
          new Promise((resolve, reject) => {
            const request = store.put({
              ...item,
              timestamp: Date.now(),
            })
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
          })
      )
    )
  }

  /**
   * Get storage stats
   */
  async getStats() {
    const stats = {}
    for (const storeName of Object.values(STORES)) {
      stats[storeName] = await this.getCount(storeName)
    }
    return stats
  }

  /**
   * Clear all stores
   */
  async clearAll() {
    return Promise.all(Object.values(STORES).map((storeName) => this.clear(storeName)))
  }
}

// Singleton instance
let dbInstance = null

export const getIndexedDB = async () => {
  if (!dbInstance) {
    dbInstance = new IndexedDBManager()
    await dbInstance.init()
  }
  return dbInstance
}

export const STORE_NAMES = STORES
export default IndexedDBManager
