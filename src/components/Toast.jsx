import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useEffect, useState, createContext, useContext, useCallback } from 'react'

// Toast Context for global usage
const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback if not wrapped in provider
    return {
      success: (msg) => console.log('Toast:', msg),
      error: (msg) => console.error('Toast:', msg),
      info: (msg) => console.info('Toast:', msg),
    }
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ToastItem = ({ message, type, duration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const config = {
    success: { icon: <CheckCircle size={18} />, bg: 'bg-green-50 border-green-300 text-green-800' },
    error: { icon: <AlertCircle size={18} />, bg: 'bg-red-50 border-red-300 text-red-800' },
    info: { icon: <Info size={18} />, bg: 'bg-blue-50 border-blue-300 text-blue-800' },
  }

  const { icon, bg } = config[type] || config.info

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${bg}`}>
      {icon}
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

// Legacy single toast (backward compat)
export const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const config = {
    success: { icon: <CheckCircle size={18} />, bg: 'bg-green-50 border-green-300 text-green-800' },
    error: { icon: <AlertCircle size={18} />, bg: 'bg-red-50 border-red-300 text-red-800' },
    info: { icon: <Info size={18} />, bg: 'bg-blue-50 border-blue-300 text-blue-800' },
  }
  const { icon, bg } = config[type] || config.info

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg z-[9999] ${bg}`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
