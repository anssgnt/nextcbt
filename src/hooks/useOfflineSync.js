import { useEffect, useState, useCallback } from 'react'
import { getSyncService } from '../services/syncService'
import { getSubmissionService } from '../services/submissionService'
import { onOnlineStatusChange } from '../utils/offlineHelper'

/**
 * Hook untuk offline sync management
 */
export const useOfflineSync = (userId) => {
  const [syncService, setSyncService] = useState(null)
  const [submissionService, setSubmissionService] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Initialize services
  useEffect(() => {
    const init = async () => {
      try {
        const sync = await getSyncService(userId)
        const submission = await getSubmissionService()
        setSyncService(sync)
        setSubmissionService(submission)
      } catch (error) {
        console.error('Failed to initialize sync services:', error)
      }
    }

    if (userId) {
      init()
    }
  }, [userId])

  // Listen to online/offline changes
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange((online) => {
      setIsOnline(online)
      if (online) {
        // Trigger sync when coming online
        syncPending()
      }
    })

    return unsubscribe
  }, [])

  // Sync pending submissions
  const syncPending = useCallback(async () => {
    if (!syncService || !submissionService || isSyncing) return

    setIsSyncing(true)
    try {
      await syncService.syncPendingSubmissions()
      const status = await syncService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to sync pending:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [syncService, submissionService, isSyncing])

  // Get sync status
  const getStatus = useCallback(async () => {
    if (!syncService) return null
    const status = await syncService.getSyncStatus()
    setSyncStatus(status)
    return status
  }, [syncService])

  // Pre-sync exams
  const preSyncExams = useCallback(async () => {
    if (!syncService) return null
    return await syncService.preSyncExams(userId)
  }, [syncService, userId])

  // Save answer locally
  const saveAnswerLocal = useCallback(
    async (examId, questionId, answer) => {
      if (!syncService) return
      return await syncService.saveAnswerLocal(examId, questionId, answer)
    },
    [syncService]
  )

  // Queue submission
  const queueSubmission = useCallback(
    async (examId, sessionId, answers) => {
      if (!syncService) return
      return await syncService.queueSubmission(examId, sessionId, answers)
    },
    [syncService]
  )

  // Clear exam data
  const clearExamData = useCallback(
    async (examId) => {
      if (!syncService) return
      return await syncService.clearExamData(examId)
    },
    [syncService]
  )

  return {
    isOnline,
    isSyncing,
    syncStatus,
    syncPending,
    getStatus,
    preSyncExams,
    saveAnswerLocal,
    queueSubmission,
    clearExamData,
  }
}

export default useOfflineSync
