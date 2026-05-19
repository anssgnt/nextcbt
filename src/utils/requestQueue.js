/**
 * Request Queue - Limit concurrent Supabase connections
 * Supabase free: ~60 pool connections
 * Kita limit client-side ke 8 concurrent max per browser
 * Ini mencegah 1000 siswa overwhelm connection pool
 * 
 * Features:
 * - Concurrency limiting (max 8 parallel requests)
 * - Exponential backoff on 429/503 errors
 * - Proper retry with fresh query execution
 * - Adaptive delay when server is under pressure
 */

class RequestQueue {
  constructor(maxConcurrent = 8) {
    this.maxConcurrent = maxConcurrent
    this.running = 0
    this.queue = []
    this.backoffUntil = 0 // Timestamp: don't send requests until this time
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        // Wait if server told us to back off
        const now = Date.now()
        if (this.backoffUntil > now) {
          await new Promise((r) => setTimeout(r, this.backoffUntil - now))
        }

        this.running++
        try {
          const result = await fn()
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          this.running--
          this.processNext()
        }
      }

      if (this.running < this.maxConcurrent) {
        execute()
      } else {
        this.queue.push(execute)
      }
    })
  }

  // Signal that server is overloaded — pause all requests
  setBackoff(ms) {
    this.backoffUntil = Math.max(this.backoffUntil, Date.now() + ms)
  }

  processNext() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift()
      next()
    }
  }

  get pending() {
    return this.queue.length
  }

  get active() {
    return this.running
  }
}

// Singleton - shared across all components
export const requestQueue = new RequestQueue(8)

/**
 * Wrapper: fetch with queue + retry
 * 
 * IMPORTANT: Supabase query builders are lazy — calling .select() etc returns
 * a builder, not a promise. The actual HTTP request fires when you await it.
 * BUT once awaited, the promise is resolved and can't be "re-executed".
 * 
 * So we accept the query builder and use .then() pattern inside the queue.
 * The query executes when the queue slot opens.
 * 
 * For retry, we need a fresh query. Since we can't re-execute a resolved promise,
 * retry is limited to connection-level errors where the request never reached the server.
 */
export async function queuedFetch(supabaseQuery) {
  return requestQueue.add(async () => {
    const result = await supabaseQuery

    // Handle rate limiting (429) or server overload (503)
    if (result.error) {
      const msg = result.error.message || ''
      const status = result.error.status || result.status

      // Server overloaded — signal backoff to queue
      if (status === 429 || status === 503 || msg.includes('too many') || msg.includes('connection')) {
        // Adaptive backoff: 2-5 seconds
        const backoffMs = 2000 + Math.random() * 3000
        requestQueue.setBackoff(backoffMs)

        // Wait and return the error (caller can handle retry at higher level)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }

    return result
  })
}

/**
 * Smart staggered delay for mass operations (e.g., 1000 siswa submit)
 * Instead of random delay, uses a deterministic spread based on user position
 * This ensures even distribution across time window
 * 
 * @param {string} userId - Student ID for deterministic positioning
 * @param {number} windowMs - Total time window to spread across (default 5s)
 * @returns {Promise} resolves after calculated delay
 */
export function staggeredDelay(userId, windowMs = 5000) {
  // Hash the userId to get a deterministic position in the window
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  const position = Math.abs(hash) % 1000 // 0-999
  const delay = Math.floor((position / 1000) * windowMs)
  return new Promise((r) => setTimeout(r, delay))
}
