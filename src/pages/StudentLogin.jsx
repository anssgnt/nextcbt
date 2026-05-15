import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'

export const StudentLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [nis, setNis] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!nis.trim()) { setError('Masukkan NIS kamu'); return }

    setIsLoading(true)
    try {
      const { data: student, error: err } = await supabase
        .from('students')
        .select('id, name, nis, class_name, email')
        .eq('nis', nis.trim())
        .single()

      if (err || !student) { setError('NIS tidak ditemukan'); return }

      setUser(student, 'student')
      navigate('/student/dashboard')
    } catch (err) {
      setError('Gagal login. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10" />
      <div className="absolute bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full bg-white/10" />
      <div className="absolute top-[30%] left-[-40px] w-[150px] h-[150px] rounded-full bg-blue-400/30" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-5">
        {/* Logo & School */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-4 overflow-hidden">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{settings.schoolName || 'NextCBT'}</h1>
          <p className="text-blue-100 text-sm mt-1">{settings.schoolMotto || 'Ujian Berbasis Komputer'}</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-7 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Halo, Siswa! 👋</h2>
              <p className="text-gray-500 text-sm mt-1">Masukkan NIS untuk memulai</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Nomor Induk Siswa</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => { setNis(e.target.value); setError('') }}
                    placeholder="Ketik NIS kamu..."
                    className="w-full bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 pl-12 pr-4 py-4 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full group py-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/30"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      Masuk
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            <p className="text-center text-gray-400 text-xs mt-5">
              Lupa NIS? Hubungi wali kelas
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-blue-100/60 text-xs mt-8">© {new Date().getFullYear()} {settings.schoolName || 'NextCBT'}</p>
      </div>
    </div>
  )
}
