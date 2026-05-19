import { useEffect, useState, useRef } from 'react'
import { useExamStore } from '../store'

export const useExamTimer = (duration, examId) => {
  const { timeRemaining, setTimeRemaining } = useExamStore()
  const [isTimeUp, setIsTimeUp] = useState(false)
  const sessionCreated = useRef(false)

  useEffect(() => {
    if (!duration || duration <= 0) return

    // Persist start time — timer survives refresh/crash
    const startKey = `exam_start_${examId}`
    let startTime = localStorage.getItem(startKey)

    if (!startTime) {
      startTime = Date.now().toString()
      localStorage.setItem(startKey, startTime)
    }

    // Validate timer against server (prevent localStorage manipulation)
    // Fire-and-forget: if server has earlier started_at, use that
    import('../lib/supabase').then(({ supabase }) => {
      import('../store').then(({ useAuthStore }) => {
        const user = useAuthStore.getState().user
        if (user?.id) {
          supabase.from('exam_sessions')
            .select('started_at')
            .eq('student_id', user.id)
            .eq('exam_id', examId)
            .eq('status', 'in_progress')
            .limit(1)
            .then(({ data: rows }) => {
              if (rows?.[0]?.started_at) {
                const serverStart = new Date(rows[0].started_at).getTime()
                const localStart = parseInt(localStorage.getItem(startKey) || '0')
                // If server start is earlier, use server time (prevents timer reset cheat)
                if (serverStart > 0 && serverStart < localStart) {
                  localStorage.setItem(startKey, serverStart.toString())
                  const elapsed = Math.floor((Date.now() - serverStart) / 1000)
                  const totalSeconds = duration * 60
                  const remaining = Math.max(0, totalSeconds - elapsed)
                  setTimeRemaining(remaining)
                  if (remaining <= 0) setIsTimeUp(true)
                }
              }
            })
            .catch(() => {}) // Silent — offline-first
        }
      })
    })

    // Create in_progress session on server (fire-and-forget, no blocking)
    // Use localStorage flag to prevent duplicates across remounts/strict mode
    const sessionFlag = `session_created_${examId}`
    if (!sessionCreated.current && !localStorage.getItem(sessionFlag)) {
      sessionCreated.current = true
      localStorage.setItem(sessionFlag, '1')
      import('../lib/supabase').then(({ supabase }) => {
        import('../store').then(({ useAuthStore }) => {
          const user = useAuthStore.getState().user
          if (user?.id) {
            // Check if session already exists before creating (use limit(1) to avoid maybeSingle crash)
            supabase.from('exam_sessions')
              .select('id')
              .eq('student_id', user.id)
              .eq('exam_id', examId)
              .in('status', ['in_progress', 'submitted'])
              .limit(1)
              .then(({ data: rows }) => {
                if (!rows || rows.length === 0) {
                  supabase.from('exam_sessions')
                    .insert({
                      student_id: user.id,
                      exam_id: examId,
                      status: 'in_progress',
                      started_at: new Date(parseInt(startTime)).toISOString(),
                    })
                    .then(() => {})
                    .catch(() => {}) // Silent fail — offline-first
                }
              })
              .catch(() => {}) // Silent fail
          }
        })
      })
    } else {
      sessionCreated.current = true
    }

    const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000)
    const totalSeconds = duration * 60
    const remaining = Math.max(0, totalSeconds - elapsed)

    setTimeRemaining(remaining)
    if (remaining <= 0) setIsTimeUp(true)
  }, [duration, examId])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
      if (timeRemaining - 1 <= 0) {
        setIsTimeUp(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, setTimeRemaining])

  return { timeRemaining, isTimeUp }
}

export const useTabVisibility = (onHidden) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [onHidden])
}

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
