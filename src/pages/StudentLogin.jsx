import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'
import { LogIn, BookOpen, KeyRound, User } from 'lucide-react'

export const StudentLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [nis, setNis] = useState('')
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!nis.trim()) { setError('Masukkan NIS'); return }
    if (!token.trim()) { setError('Masukkan Token Ujian'); return }

    setIsLoading(true)
    try {
      // 1. Cari siswa berdasarkan NIS
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id, name, nis, class_name')
        .eq('nis', nis.trim())
        .single()

      if (studentErr || !student) {
        setError('NIS tidak ditemukan')
        return
      }

      // 2. Validasi token ujian
      const { data: exam, error: examErr } = await supabase
        .from('exams')
        .select('id, title, token, is_active')
        .eq('token', token.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (examErr || !exam) {
        setError('Token ujian tidak valid atau ujian tidak aktif')
        return
      }

      // 3. Login berhasil
      setUser({ ...student, examId: exam.id, examTitle: exam.title }, 'student')
      navigate('/student/exams')
    } catch (err) {
      setError('Login gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-500 flex flex-col items-center justify-center p-4">
      {/* Card */}
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
            {/* NIS */}
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
              />
            </div>

            {/* Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <KeyRound size={14} className="inline mr-1.5" />Token Ujian
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="Masukkan 4 karakter token"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                autoComplete="off"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
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
              {isLoading ? 'Memverifikasi...' : 'Masuk Ujian'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Token didapat dari guru/pengawas ujian
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-xs mt-6">
          © {new Date().getFullYear()} {settings.schoolName || 'NextCBT'}
        </p>
      </div>
    </div>
  )
}
