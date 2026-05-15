import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'
import { queuedFetch } from '../utils/requestQueue'

export const StudentLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [nis, setNis] = useState('')
  const [nama, setNama] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('nis') // 'nis' | 'nama'
  const [showPwaPrompt, setShowPwaPrompt] = useState(false)

  const settings = JSON.parse(localStorage.getItem('cbt_settings_cache') || localStorage.getItem('cbt_settings') || '{}')
  const loginMode = settings.loginMode || 'nis'
  const forcePwa = settings.forcePwa || false

  // Check PWA mode
  useEffect(() => {
    if (forcePwa) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
      if (!isStandalone) {
        setShowPwaPrompt(true)
      }
    }
  }, [forcePwa])

  // Set initial mode
  useEffect(() => {
    if (loginMode === 'nama') setMode('nama')
    else setMode('nis')
  }, [loginMode])

  // Autosuggest nama
  const searchNama = useCallback(async (query) => {
    if (query.length < 2) { setSuggestions([]); return }
    try {
      const { data } = await queuedFetch(
        supabase.from('students').select('id, name, nis, class_name').ilike('name', `%${query}%`).limit(8)
      )
      setSuggestions(data || [])
    } catch (e) {
      setSuggestions([])
    }
  }, [])

  useEffect(() => {
    if (mode === 'nama' && nama.length >= 2) {
      const timer = setTimeout(() => searchNama(nama), 300)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [nama, mode, searchNama])

  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    setNama(student.name)
    setSuggestions([])
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'nama') {
      if (!selectedStudent) { setError('Pilih nama dari daftar'); return }
      setUser(selectedStudent, 'student')
      navigate('/student/dashboard')
      return
    }

    // NIS mode
    if (!nis.trim()) { setError('Masukkan NIS'); return }

    setIsLoading(true)
    try {
      const { data: student, error: err } = await queuedFetch(
        supabase.from('students').select('id, name, nis, class_name, email').eq('nis', nis.trim()).single()
      )
      if (err || !student) { setError('NIS tidak ditemukan'); return }
      setUser(student, 'student')
      navigate('/student/dashboard')
    } catch (err) {
      setError('Gagal login. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  // PWA Install Prompt
  if (showPwaPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-400 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Install Aplikasi</h2>
          <p className="text-sm text-gray-600 mb-6">
            Aplikasi ini harus di-install ke perangkat Anda. Klik tombol di bawah atau gunakan menu browser → "Add to Home Screen" / "Install App".
          </p>
          <div className="space-y-3 text-left text-sm text-gray-600 bg-gray-50 rounded-xl p-4 mb-6">
            <p><b>Chrome:</b> Menu (⋮) → Install App</p>
            <p><b>Safari:</b> Share (↑) → Add to Home Screen</p>
            <p><b>Samsung:</b> Menu (≡) → Add page to → Home screen</p>
          </div>
          <button
            onClick={() => setShowPwaPrompt(false)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Sudah Install, Lanjutkan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
      <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10" />
      <div className="absolute bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full bg-white/10" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-5">
        {/* Logo */}
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
              <p className="text-gray-500 text-sm mt-1">
                {mode === 'nis' ? 'Masukkan NIS untuk memulai' : 'Ketik nama untuk mencari'}
              </p>
            </div>

            {/* Mode Switch (only if loginMode === 'both') */}
            {loginMode === 'both' && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
                <button
                  onClick={() => { setMode('nis'); setError(''); setSelectedStudent(null) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${mode === 'nis' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  Login NIS
                </button>
                <button
                  onClick={() => { setMode('nama'); setError('') }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${mode === 'nama' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  Login Nama
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* NIS Input */}
              {mode === 'nis' && (
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
                      placeholder="Ketik NIS..."
                      className="w-full bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 pl-12 pr-4 py-4 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      autoComplete="off"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}

              {/* Nama Input with Autosuggest */}
              {mode === 'nama' && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Nama Siswa</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => { setNama(e.target.value); setSelectedStudent(null); setError('') }}
                      placeholder="Ketik nama..."
                      className="w-full bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 pl-12 pr-4 py-4 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      autoComplete="off"
                    />
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && !selectedStudent && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition"
                        >
                          <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">NIS: {s.nis} • {s.class_name || '-'}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected */}
                  {selectedStudent && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm font-medium text-green-800">✓ {selectedStudent.name}</p>
                      <p className="text-xs text-green-600">NIS: {selectedStudent.nis} • {selectedStudent.class_name || '-'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}

              {/* Submit */}
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
              {mode === 'nis' ? 'Lupa NIS? Hubungi wali kelas' : 'Ketik minimal 2 huruf untuk mencari'}
            </p>
          </div>
        </div>

        <p className="text-blue-100/60 text-xs mt-8">© {new Date().getFullYear()} {settings.schoolName || 'NextCBT'}</p>
      </div>
    </div>
  )
}
