/**
 * Request Queue - Limit concurrent Supabase connections
 * Supabase free: ~60 pool connections
 * Kita limit client-side ke 10 concurrent max per browser
 * Ini mencegah 1000 siswa overwhelm connection pool
 */

class RequestQueue {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent
    this.running = 0
    this.queue = []
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      const execute = async () => {
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
export const requestQueue = new RequestQueue(10)

/**
 * Wrapper: fetch with queue + retry
 * Jika Supabase busy, tunggu giliran + retry 1x
 */
export async function queuedFetch(supabaseQuery) {
  return requestQueue.add(async () => {
    const result = await supabaseQuery
    // Retry 1x jika error connection
    if (result.error && result.error.message?.includes('connection')) {
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))
      return await supabaseQuery
    }
    return result
  })
}
