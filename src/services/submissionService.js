import pako from 'pako'
import { getIndexedDB, STORE_NAMES } from '../lib/indexedDB'

/**
 * Submission Service dengan Compression, Checksum, dan Retry
 */

class SubmissionService {
  constructor() {
    this.db = null
    this.maxRetries = 5
    this.baseRetryDelay = 1000 // 1 second
  }

  /**
   * Initialize submission service
   */
  async init() {
    this.db = await getIndexedDB()
  }

  /**
   * Calculate checksum (simple hash)
   */
  calculateChecksum(data) {
    const json = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Compress data using gzip
   */
  compressData(data) {
    try {
      const json = JSON.stringify(data)
      const compressed = pako.gzip(json)
      return {
        data: btoa(String.fromCharCode.apply(null, compressed)),
        compressed: true,
        originalSize: json.length,
        compressedSize: compressed.length,
        ratio: ((1 - compressed.length / json.length) * 100).toFixed(2),
      }
    } catch (error) {
      console.error('Compression failed:', error)
      return {
        data: btoa(JSON.stringify(data)),
        compressed: false,
        originalSize: JSON.stringify(data).length,
      }
    }
  }

  /**
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      const binaryString = atob(compressedData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const decompressed = pako.ungzip(bytes, { to: 'string' })
      return JSON.parse(decompressed)
    } catch (error) {
      console.error('Decompression failed:', error)
      return null
    }
  }

  /**
   * Prepare batch submission payload
   */
  prepareBatchSubmission(sessionId, answers, metadata = {}) {
    const payload = {
      sessionId,
      answers,
      metadata: {
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...metadata,
      },
    }

    const checksum = this.calculateChecksum(payload)
    const compressed = this.compressData(payload)

    return {
      sessionId,
      payload: compressed.data,
      checksum,
      compressed: compressed.compressed,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      compressionRatio: compressed.ratio,
    }
  }

  /**
   * Submit exam with retry logic
   */
  async submitExamWithRetry(submitFn, sessionId, answers, metadata = {}) {
    const submission = this.prepareBatchSubmission(sessionId, answers, metadata)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Submission attempt ${attempt}/${this.maxRetries}`)

        const response = await submitFn(submission)

        // Verify checksum on response
        if (response.checksum && response.checksum !== submission.checksum) {
          console.warn('Checksum mismatch detected')
        }

        return {
          success: true,
          attempt,
          response,
          submission,
        }
      } catch (error) {
        console.error(`Submission attempt ${attempt} failed:`, error)

        if (attempt === this.maxRetries) {
          // Last attempt failed
          return {
            success: false,
            attempt,
            error: error.message,
            submission,
          }
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Queue submission for later sync
   */
  async queueSubmission(sessionId, answers, metadata = {}) {
    try {
      const submission = this.prepareBatchSubmission(sessionId, answers, metadata)

      const queueItem = {
        id: `${sessionId}-${Date.now()}`,
        sessionId,
        submission,
        status: 'pending',
        attempts: 0,
        createdAt: Date.now(),
        lastAttemptAt: null,
        error: null,
      }

      await this.db.put(STORE_NAMES.SYNC_QUEUE, queueItem)
      return queueItem.id
    } catch (error) {
      console.error('Failed to queue submission:', error)
      throw error
    }
  }

  /**
   * Process queued submissions
   */
  async processQueuedSubmissions(submitFn) {
    try {
      const queue = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      const pending = queue.filter((item) => item.status === 'pending')

      const results = []

      for (const item of pending) {
        try {
          const result = await submitFn(item.submission)

          // Update status to completed
          await this.db.put(STORE_NAMES.SYNC_QUEUE, {
            ...item,
            status: 'completed',
            attempts: item.attempts + 1,
            lastAttemptAt: Date.now(),
          })

          results.push({
            queueId: item.id,
            success: true,
            result,
          })
        } catch (error) {
          console.error(`Failed to process queued submission ${item.id}:`, error)

          // Update with error
          const newAttempts = item.attempts + 1
          const maxAttempts = 5

          await this.db.put(STORE_NAMES.SYNC_QUEUE, {
            ...item,
            status: newAttempts >= maxAttempts ? 'failed' : 'pending',
            attempts: newAttempts,
            lastAttemptAt: Date.now(),
            error: error.message,
          })

          results.push({
            queueId: item.id,
            success: false,
            error: error.message,
            attempts: newAttempts,
          })
        }
      }

      return results
    } catch (error) {
      console.error('Failed to process queued submissions:', error)
      throw error
    }
  }

  /**
   * Get submission stats
   */
  async getSubmissionStats() {
    try {
      const queue = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)

      const stats = {
        total: queue.length,
        pending: queue.filter((item) => item.status === 'pending').length,
        completed: queue.filter((item) => item.status === 'completed').length,
        failed: queue.filter((item) => item.status === 'failed').length,
        totalSize: 0,
        totalCompressed: 0,
      }

      queue.forEach((item) => {
        if (item.submission) {
          stats.totalSize += item.submission.originalSize || 0
          stats.totalCompressed += item.submission.compressedSize || 0
        }
      })

      stats.compressionRatio = stats.totalSize > 0
        ? ((1 - stats.totalCompressed / stats.totalSize) * 100).toFixed(2)
        : 0

      return stats
    } catch (error) {
      console.error('Failed to get submission stats:', error)
      return null
    }
  }

  /**
   * Clear completed submissions
   */
  async clearCompletedSubmissions() {
    try {
      const queue = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      const completed = queue.filter((item) => item.status === 'completed')

      for (const item of completed) {
        await this.db.delete(STORE_NAMES.SYNC_QUEUE, item.id)
      }

      return completed.length
    } catch (error) {
      console.error('Failed to clear completed submissions:', error)
      return 0
    }
  }

  /**
   * Retry failed submissions
   */
  async retryFailedSubmissions(submitFn) {
    try {
      const queue = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      const failed = queue.filter((item) => item.status === 'failed')

      const results = []

      for (const item of failed) {
        try {
          const result = await submitFn(item.submission)

          await this.db.put(STORE_NAMES.SYNC_QUEUE, {
            ...item,
            status: 'completed',
            attempts: item.attempts + 1,
            lastAttemptAt: Date.now(),
            error: null,
          })

          results.push({
            queueId: item.id,
            success: true,
            result,
          })
        } catch (error) {
          console.error(`Failed to retry submission ${item.id}:`, error)
          results.push({
            queueId: item.id,
            success: false,
            error: error.message,
          })
        }
      }

      return results
    } catch (error) {
      console.error('Failed to retry failed submissions:', error)
      throw error
    }
  }
}

// Singleton instance
let submissionServiceInstance = null

export const getSubmissionService = async () => {
  if (!submissionServiceInstance) {
    submissionServiceInstance = new SubmissionService()
    await submissionServiceInstance.init()
  }
  return submissionServiceInstance
}

export default SubmissionService
