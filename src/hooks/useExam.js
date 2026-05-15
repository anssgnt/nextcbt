import { useEffect, useState } from 'react'
import { useExamStore } from '../store'

export const useExamTimer = (duration) => {
  const { timeRemaining, setTimeRemaining } = useExamStore()
  const [isTimeUp, setIsTimeUp] = useState(false)

  useEffect(() => {
    if (timeRemaining === 0 && duration > 0) {
      setTimeRemaining(duration * 60)
    }
  }, [duration, timeRemaining, setTimeRemaining])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
      if (timeRemaining - 1 === 0) {
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
