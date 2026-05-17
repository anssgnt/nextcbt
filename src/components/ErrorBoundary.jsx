import { Component } from 'react'
import { AlertCircle } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo)

    // Auto-fix: jika error "is not a function" (cache lama), clear cache otomatis
    const msg = error?.message || ''
    if (msg.includes('is not a function') || msg.includes('is not defined')) {
      this.clearCacheAndReload()
    }
  }

  clearCacheAndReload = async () => {
    try {
      // 1. Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))
      }
      // 2. Clear all caches
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      // 3. Reload tanpa cache
      window.location.reload(true)
    } catch {
      window.location.reload(true)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h1>
          <p className="text-gray-600 text-center text-sm mb-2">Aplikasi perlu dimuat ulang</p>
          <p className="text-xs text-gray-400 text-center mb-6 max-w-xs">
            Ini biasanya terjadi karena cache lama. Klik tombol di bawah untuk memperbaiki.
          </p>
          <button
            onClick={this.clearCacheAndReload}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
          >
            🔄 Bersihkan Cache & Muat Ulang
          </button>
          <button
            onClick={() => { localStorage.clear(); this.clearCacheAndReload() }}
            className="mt-3 px-4 py-2 text-red-600 text-xs underline"
          >
            Reset Total (hapus semua data lokal)
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
