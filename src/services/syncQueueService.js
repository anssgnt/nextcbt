import { supabase } from '../lib/supabase'
import { getIndexedDB, STORE_NAMES } from '../lib/indexedDB'
import { getExponentialBackoffDelay, retrySubmissionWithBackoff } from './apiHandlers'

/**
 * Sync Queue Service untuk PHASE 3
 * Handles offline submissions, retry mechanism, conflict resolution
 */

class SyncQueueService {
  constructor() {
    this.db = null
    this.isSyncing = false
    this.syncInterval = null
    this.maxRetries = 5
    this.isOnline = navigator.onLine
  }

  /**
   * Initialize sync queue service
   */
  async init() {
    this.db = await getIndexedDB()
    this.setupEventListeners()
    return this
  }

  /**
   * Setup online/offline event listeners
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('Connection restored - starting sync')
      this.isOnline = true
      this.syncPendingSubmissions()
    })

    window.addEventListener('offline', () => {
      console.log('Connection lost - queuing submissions')
      this.isOnline = false
    })
  }

  /**
   * Queue submission untuk sync later
   * Disimpan ke IndexedDB jika offline, atau langsung ke Supabase jika online
   */
  async queueSubmission(examId, sessionId, studentId, answers, options = {}) {
    const { immediate = true } = options

    try {
      const queueItem = {
        id: `${sessionId}-${Date.now()}`,
        sessionId,
        examId,
        studentId,
        payload: {
          answers,
          timestamp: new Date().toISOString(),
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: this.maxRetries,
        createdAt: Date.now(),
        lastAttemptAt: null,
        errorMessage: null,
      }

      // Jika online dan immediate, langsung submit
      if (this.isOnline && immediate) {
        return await this.submitToServer(queueItem)
      }

      // Simpan ke IndexedDB untuk sync later
      await this.db.put(STORE_NAMES.SYNC_QUEUE, queueItem)

      // Juga simpan ke Supabase sync_queue table
      const { data, error } = await supabase
        .from('sync_queue')
        .insert({
          session_id: sessionId,
          exam_id: examId,
          student_id: studentId,
          payload: queueItem.payload,
          status: 'pending',
          attempts: 0,
          max_attempts: this.maxRetries,
        })
        .select()
        .single()

      if (error) {
        console.warn('Failed to save to Supabase sync_queue, using IndexedDB only:', error)
      }

      return {
        success: true,
        queueId: queueItem.id,
        status: 'queued',
        message: this.isOnline ? 'Queued for immediate sync' : 'Queued for sync when online',
      }
    } catch (error) {
      console.error('Failed to queue submission:', error)
      throw error
    }
  }

  /**
   * Submit queue item ke server
   */
  async submitToServer(queueItem) {
    try {
      const { submitExamBatch } = await import('./apiHandlers')

      const result = await submitExamBatch(
        queueItem.examId,
        queueItem.sessionId,
        queueItem.payload.answers,
        { compress: false }
      )

      // Update queue item status
      queueItem.status = 'completed'
      queueItem.attempts += 1
      queueItem.lastAttemptAt = Date.now()

      // Update IndexedDB
      await this.db.put(STORE_NAMES.SYNC_QUEUE, queueItem)

      // Update Supabase
      await supabase
        .from('sync_queue')
        .update({
          status: 'completed',
          attempts: queueItem.attempts,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('session_id', queueItem.sessionId)

      return {
        success: true,
        queueId: queueItem.id,
        status: 'completed',
        result,
      }
    } catch (error) {
      console.error('Failed to submit to server:', error)

      // Update queue item with error
      queueItem.attempts += 1
      queueItem.lastAttemptAt = Date.now()
      queueItem.errorMessage = error.message

      // Jika sudah max retries, mark as failed
      if (queueItem.attempts >= this.maxRetries) {
        queueItem.status = 'failed'
      }

      // Update IndexedDB
      await this.db.put(STORE_NAMES.SYNC_QUEUE, queueItem)

      // Update Supabase
      await supabase
        .from('sync_queue')
        .update({
          status: queueItem.status,
          attempts: queueItem.attempts,
          error_message: error.message,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('session_id', queueItem.sessionId)

      throw error
    }
  }

  /**
   * Sync pending submissions dengan exponential backoff
   */
  async syncPendingSubmissions() {
    if (this.isSyncing || !this.isOnline) {
      console.log('Sync already in progress or offline')
      return
    }

    this.isSyncing = true

    try {
      // Get pending items dari IndexedDB
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      const pendingItems = allItems.filter((item) => item.status === 'pending')

      console.log(`Found ${pendingItems.length} pending submissions`)

      for (const item of pendingItems) {
        try {
          // Calculate delay berdasarkan attempts
          const delay = getExponentialBackoffDelay(item.attempts)

          if (delay === null) {
            // Max retries reached
            item.status = 'failed'
            item.errorMessage = 'Max retries exceeded'
            await this.db.put(STORE_NAMES.SYNC_QUEUE, item)

            // Update Supabase
            await supabase
              .from('sync_queue')
              .update({
                status: 'failed',
                error_message: 'Max retries exceeded',
              })
              .eq('session_id', item.sessionId)

            continue
          }

          // Wait before retry
          if (item.attempts > 0) {
            console.log(`Waiting ${delay}ms before retry for ${item.id}`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          // Submit to server
          await this.submitToServer(item)

          console.log(`Successfully synced ${item.id}`)
        } catch (error) {
          console.error(`Failed to sync ${item.id}:`, error)
          // Continue to next item
        }
      }

      // Cleanup completed items older than 7 days
      await this.cleanupOldItems()
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Start background sync interval
   */
  startBackgroundSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingSubmissions()
      }
    }, intervalMs)

    console.log(`Background sync started with interval ${intervalMs}ms`)
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Background sync stopped')
    }
  }

  /**
   * Get sync queue status
   */
  async getSyncStatus() {
    try {
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)

      const pending = allItems.filter((item) => item.status === 'pending')
      const failed = allItems.filter((item) => item.status === 'failed')
      const completed = allItems.filter((item) => item.status === 'completed')

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pending: pending.length,
        failed: failed.length,
        completed: completed.length,
        total: allItems.length,
        items: {
          pending,
          failed,
          completed,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      return null
    }
  }

  /**
   * Get pending submissions
   */
  async getPendingSubmissions() {
    try {
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      return allItems.filter((item) => item.status === 'pending')
    } catch (error) {
      console.error('Failed to get pending submissions:', error)
      return []
    }
  }

  /**
   * Get failed submissions
   */
  async getFailedSubmissions() {
    try {
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      return allItems.filter((item) => item.status === 'failed')
    } catch (error) {
      console.error('Failed to get failed submissions:', error)
      return []
    }
  }

  /**
   * Retry failed submission
   */
  async retryFailedSubmission(queueId) {
    try {
      const item = await this.db.get(STORE_NAMES.SYNC_QUEUE, queueId)
      if (!item) {
        throw new Error('Queue item not found')
      }

      if (item.status !== 'failed') {
        throw new Error('Only failed submissions can be retried')
      }

      // Reset attempts untuk retry
      item.status = 'pending'
      item.attempts = 0
      item.errorMessage = null

      await this.db.put(STORE_NAMES.SYNC_QUEUE, item)

      // Update Supabase
      await supabase
        .from('sync_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
        })
        .eq('session_id', item.sessionId)

      // Immediately try to sync
      if (this.isOnline) {
        return await this.submitToServer(item)
      }

      return {
        success: true,
        message: 'Submission queued for retry',
      }
    } catch (error) {
      console.error('Failed to retry submission:', error)
      throw error
    }
  }

  /**
   * Cleanup old completed items (older than 7 days)
   */
  async cleanupOldItems() {
    try {
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      for (const item of allItems) {
        if (item.status === 'completed' && item.createdAt < sevenDaysAgo) {
          await this.db.delete(STORE_NAMES.SYNC_QUEUE, item.id)
        }
      }

      console.log('Cleanup completed')
    } catch (error) {
      console.error('Failed to cleanup old items:', error)
    }
  }

  /**
   * Clear all sync queue items
   */
  async clearAll() {
    try {
      const allItems = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      for (const item of allItems) {
        await this.db.delete(STORE_NAMES.SYNC_QUEUE, item.id)
      }
      console.log('Sync queue cleared')
    } catch (error) {
      console.error('Failed to clear sync queue:', error)
    }
  }

  /**
   * Resolve conflicts antara client dan server
   * Strategy: server-side data wins untuk consistency
   */
  async resolveConflict(sessionId, questionId, clientAnswer) {
    try {
      // Get server answer
      const { data: serverAnswer, error } = await supabase
        .from('answers')
        .select('answer_text, answered_at')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Jika server answer exists, gunakan server data
      if (serverAnswer) {
        return {
          resolved: true,
          winner: 'server',
          answer: serverAnswer.answer_text,
          timestamp: serverAnswer.answered_at,
        }
      }

      // Jika tidak ada server answer, gunakan client answer
      return {
        resolved: true,
        winner: 'client',
        answer: clientAnswer,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }
}

// Singleton instance
let syncQueueServiceInstance = null

/**
 * Get or create sync queue service instance
 */
export const getSyncQueueService = async () => {
  if (!syncQueueServiceInstance) {
    syncQueueServiceInstance = new SyncQueueService()
    await syncQueueServiceInstance.init()
  }
  return syncQueueServiceInstance
}

export default SyncQueueService
