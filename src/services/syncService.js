import { getIndexedDB, STORE_NAMES } from '../lib/indexedDB'
import { getRateLimiter, ClientRateLimiter } from '../utils/rateLimiter'
import { studentService } from './api'

/**
 * Sync Service untuk Pre-Sync H-1 dan offline exam support
 */

class SyncService {
  constructor() {
    this.db = null
    this.rateLimiter = new ClientRateLimiter(12, 60000)
    this.isSyncing = false
    this.syncQueue = []
    this.lastSyncTime = {}
  }

  /**
   * Initialize sync service
   */
  async init(userId) {
    this.db = await getIndexedDB()
    this.rateLimiter.setUserId(userId)
    this.userId = userId
  }

  /**
   * Pre-sync exams 24 hours before start time
   */
  async preSyncExams(userId) {
    try {
      // Get upcoming exams (within 24 hours)
      const { data: exams } = await studentService.getActiveExams(userId)

      if (!exams || exams.length === 0) {
        console.log('No exams to pre-sync')
        return { synced: 0, failed: 0 }
      }

      const now = Date.now()
      const upcomingExams = exams.filter((exam) => {
        const startTime = new Date(exam.start_time).getTime()
        const timeUntilStart = startTime - now
        // Pre-sync if exam starts within 24 hours
        return timeUntilStart > 0 && timeUntilStart <= 24 * 60 * 60 * 1000
      })

      let synced = 0
      let failed = 0

      for (const exam of upcomingExams) {
        try {
          await this.syncExam(exam.id, userId)
          synced++
        } catch (error) {
          console.error(`Failed to sync exam ${exam.id}:`, error)
          failed++
        }
      }

      return { synced, failed }
    } catch (error) {
      console.error('Pre-sync failed:', error)
      throw error
    }
  }

  /**
   * Sync single exam with all questions and options
   */
  async syncExam(examId, userId) {
    // Check rate limit
    const rateLimitStatus = this.rateLimiter.canMakeRequest()
    if (!rateLimitStatus.allowed) {
      await this.rateLimiter.waitForNextRequest()
    }

    try {
      // Fetch exam details
      const { data: exam } = await studentService.getExamDetails(examId)
      if (!exam) throw new Error('Exam not found')

      // Store exam
      await this.db.put(STORE_NAMES.EXAMS, {
        id: exam.id,
        ...exam,
        syncedAt: Date.now(),
      })

      // Fetch and store questions
      const { data: questions } = await studentService.getExamQuestions(examId)
      if (questions && questions.length > 0) {
        await this.db.batchPut(
          STORE_NAMES.QUESTIONS,
          questions.map((q) => ({
            ...q,
            examId: examId,
            syncedAt: Date.now(),
          }))
        )

        // Fetch and store options for each question
        for (const question of questions) {
          try {
            const { data: options } = await studentService.getQuestionOptions(question.id)
            if (options && options.length > 0) {
              await this.db.batchPut(
                STORE_NAMES.OPTIONS,
                options.map((opt) => ({
                  ...opt,
                  questionId: question.id,
                  examId: examId,
                  syncedAt: Date.now(),
                }))
              )
            }
          } catch (error) {
            console.error(`Failed to sync options for question ${question.id}:`, error)
          }
        }
      }

      this.lastSyncTime[examId] = Date.now()
      return true
    } catch (error) {
      console.error(`Sync exam ${examId} failed:`, error)
      throw error
    }
  }

  /**
   * Load exam from IndexedDB (offline-first)
   */
  async loadExamOffline(examId) {
    try {
      const exam = await this.db.get(STORE_NAMES.EXAMS, examId)
      if (!exam) {
        throw new Error('Exam not found in offline storage')
      }

      const questions = await this.db.queryByIndex(STORE_NAMES.QUESTIONS, 'examId', examId)

      // Load options for each question
      const questionsWithOptions = await Promise.all(
        questions.map(async (question) => {
          const options = await this.db.queryByIndex(STORE_NAMES.OPTIONS, 'questionId', question.id)
          return {
            ...question,
            options: options,
          }
        })
      )

      return {
        exam,
        questions: questionsWithOptions,
      }
    } catch (error) {
      console.error('Failed to load exam offline:', error)
      throw error
    }
  }

  /**
   * Save answer locally
   */
  async saveAnswerLocal(examId, questionId, answer) {
    try {
      const answerId = `${examId}-${questionId}`
      await this.db.put(STORE_NAMES.ANSWERS, {
        id: answerId,
        examId,
        questionId,
        answer,
        savedAt: Date.now(),
        synced: false,
      })
    } catch (error) {
      console.error('Failed to save answer locally:', error)
      throw error
    }
  }

  /**
   * Get all local answers
   */
  async getLocalAnswers(examId) {
    try {
      const answers = await this.db.queryByIndex(STORE_NAMES.ANSWERS, 'examId', examId)
      return answers
    } catch (error) {
      console.error('Failed to get local answers:', error)
      return []
    }
  }

  /**
   * Queue submission for sync
   */
  async queueSubmission(examId, sessionId, answers) {
    try {
      const queueId = `${sessionId}-${Date.now()}`
      await this.db.put(STORE_NAMES.SYNC_QUEUE, {
        id: queueId,
        examId,
        sessionId,
        answers,
        status: 'pending',
        attempts: 0,
        createdAt: Date.now(),
        lastAttemptAt: null,
      })
      return queueId
    } catch (error) {
      console.error('Failed to queue submission:', error)
      throw error
    }
  }

  /**
   * Get pending submissions
   */
  async getPendingSubmissions() {
    try {
      const queue = await this.db.getAll(STORE_NAMES.SYNC_QUEUE)
      return queue.filter((item) => item.status === 'pending')
    } catch (error) {
      console.error('Failed to get pending submissions:', error)
      return []
    }
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(queueId, status, error = null) {
    try {
      const item = await this.db.get(STORE_NAMES.SYNC_QUEUE, queueId)
      if (item) {
        await this.db.put(STORE_NAMES.SYNC_QUEUE, {
          ...item,
          status,
          error,
          lastAttemptAt: Date.now(),
          attempts: item.attempts + 1,
        })
      }
    } catch (error) {
      console.error('Failed to update submission status:', error)
    }
  }

  /**
   * Sync pending submissions
   */
  async syncPendingSubmissions() {
    if (this.isSyncing) return

    this.isSyncing = true
    try {
      const pending = await this.getPendingSubmissions()

      for (const submission of pending) {
        try {
          // Check rate limit
          const rateLimitStatus = this.rateLimiter.canMakeRequest()
          if (!rateLimitStatus.allowed) {
            await this.rateLimiter.waitForNextRequest()
          }

          // Submit exam
          const { data } = await studentService.submitExam(submission.sessionId, {
            answers: submission.answers,
          })

          await this.updateSubmissionStatus(submission.id, 'completed')
        } catch (error) {
          console.error(`Failed to sync submission ${submission.id}:`, error)

          // Exponential backoff: retry after 1s, 2s, 4s, 8s, 16s
          const maxAttempts = 5
          if (submission.attempts < maxAttempts) {
            await this.updateSubmissionStatus(submission.id, 'pending', error.message)
          } else {
            await this.updateSubmissionStatus(submission.id, 'failed', error.message)
          }
        }
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Clear offline data for exam
   */
  async clearExamData(examId) {
    try {
      const questions = await this.db.queryByIndex(STORE_NAMES.QUESTIONS, 'examId', examId)
      const answers = await this.db.queryByIndex(STORE_NAMES.ANSWERS, 'examId', examId)

      // Delete questions
      for (const question of questions) {
        await this.db.delete(STORE_NAMES.QUESTIONS, question.id)
      }

      // Delete options
      for (const question of questions) {
        const options = await this.db.queryByIndex(STORE_NAMES.OPTIONS, 'questionId', question.id)
        for (const option of options) {
          await this.db.delete(STORE_NAMES.OPTIONS, option.id)
        }
      }

      // Delete answers
      for (const answer of answers) {
        await this.db.delete(STORE_NAMES.ANSWERS, answer.id)
      }

      // Delete exam
      await this.db.delete(STORE_NAMES.EXAMS, examId)
    } catch (error) {
      console.error('Failed to clear exam data:', error)
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const stats = await this.db.getStats()
      const pending = await this.getPendingSubmissions()

      return {
        exams: stats.exams,
        questions: stats.questions,
        options: stats.options,
        answers: stats.answers,
        pendingSubmissions: pending.length,
        isSyncing: this.isSyncing,
        rateLimitStatus: this.rateLimiter.getStatus(),
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      return null
    }
  }
}

// Singleton instance
let syncServiceInstance = null

export const getSyncService = async (userId) => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService()
    await syncServiceInstance.init(userId)
  }
  return syncServiceInstance
}

export default SyncService
