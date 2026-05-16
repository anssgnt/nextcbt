import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { queuedFetch } from '../utils/requestQueue'

export const AdminLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Check against admins table in Supabase
      const { data, error: dbError } = await queuedFetch(
        supabase.from('admins').select('id, email, name, password').eq('email', email).maybeSingle()
      )

      if (!dbError && data) {
        // Verify password
        if (data.password === password) {
          setUser({ id: data.id, email: data.email, name: data.name || 'Admin' }, 'admin')
          navigate('/admin/dashboard')
          setIsLoading(false)
          return
        } else {
          setError('Password salah')
          setIsLoading(false)
          return
        }
      }
    } catch {
      // DB check failed, fall through to mock credentials
    }

    // Fallback: mock credentials (jika tabel belum ada atau DB error)
    if (email === 'admin@cbt.com' && password === 'admin123') {
      setUser({ id: 'admin-1', email, name: 'Admin' }, 'admin')
      navigate('/admin/dashboard')
    } else {
      setError('Email atau password salah')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900" />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition">
              {isLoading ? 'Loading...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">NextCBT Admin</p>
      </div>
    </div>
  )
}
