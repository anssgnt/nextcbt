import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'
import { LogIn, BookOpen, User } from 'lucide-react'

export const StudentLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [nis, setNis] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!nis.trim()) { setError('Masukkan NIS'); return }

    setIsLoading(true)
    try {
      const { data: student, error: err } = await supabase
        .from('students')
        .select('id, name, nis, class_name, email')
        .eq('nis', nis.trim())
        .single()

      if (err || !student) {
        setError('NIS tidak ditemukan')
        return
      }

      setUser(student, 'student')
      navigate('/student/dashboard')
    } catch (err) {
      setError('Login gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg overflow-hidden">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BookOpen size={32} className="text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold">{settings.schoolName || 'NextCBT'}</h1>
          <p className="text-blue-100 text-sm mt-1">Ujian Berbasis Komputer</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-6">Login Siswa</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <User size={14} className="inline mr-1.5" />NIS (Nomor Induk Siswa)
              </label>
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="Masukkan NIS Anda"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                inputMode="numeric"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Hubungi guru jika lupa NIS
          </p>
        </div>

        <p className="text-center text-blue-100 text-xs mt-6">
          © {new Date().getFullYear()} {settings.schoolName || 'NextCBT'}
        </p>
      </div>
    </div>
  )
}
