import { useEffect, useState } from 'react'
import { useExamStore } from '../store'

export const useExamTimer = (duration, examId) => {
  const { timeRemaining, setTimeRemaining } = useExamStore()
  const [isTimeUp, setIsTimeUp] = useState(false)

  useEffect(() => {
    if (!duration || duration <= 0) return

    // Persist start time — timer survives refresh/crash
    const startKey = `exam_start_${examId}`
    let startTime = localStorage.getItem(startKey)

    if (!startTime) {
      startTime = Date.now().toString()
      localStorage.setItem(startKey, startTime)
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
