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
  const [mode, setMode] = useState('nis')
  const [showPwaPrompt, setShowPwaPrompt] = useState(false)

  const settings = JSON.parse(localStorage.getItem('cbt_settings_cache') || localStorage.getItem('cbt_settings') || '{}')
  const appSettings = settings.settings || settings
  const loginMode = appSettings.loginMode || 'nis'
  const forcePwa = appSettings.forcePwa || false

  useEffect(() => {
    if (forcePwa) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
      if (!isStandalone) setShowPwaPrompt(true)
    }
  }, [forcePwa])

  useEffect(() => {
    if (loginMode === 'nama') setMode('nama')
    else setMode('nis')
  }, [loginMode])

  const searchNama = useCallback(async (query) => {
    if (query.length < 2) { setSuggestions([]); return }
    try {
      const { data } = await queuedFetch(
        supabase.from('students').select('id, name, nis, class_name').ilike('name', `%${query}%`).limit(8)
      )
      setSuggestions(data || [])
    } catch { setSuggestions([]) }
  }, [])

  useEffect(() => {
    if (mode === 'nama' && nama.length >= 2) {
      const timer = setTimeout(() => searchNama(nama), 300)
      return () => clearTimeout(timer)
    } else { setSuggestions([]) }
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

    if (!nis.trim()) { setError('Masukkan NIS'); return }
    setIsLoading(true)
    try {
      const { data: student, error: err } = await queuedFetch(
        supabase.from('students').select('id, name, nis, class_name, email').eq('nis', nis.trim()).single()
      )
      if (err || !student) { setError('NIS tidak ditemukan'); return }
      setUser(student, 'student')
      navigate('/student/dashboard')
    } catch { setError('Gagal login') }
    finally { setIsLoading(false) }
  }

  if (showPwaPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-400 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-xl text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Install Aplikasi</h2>
          <p className="text-sm text-gray-600 mb-4">Gunakan menu browser → "Add to Home Screen"</p>
          <button onClick={() => setShowPwaPrompt(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            Sudah Install
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/10" />
      <div className="absolute bottom-[-80px] left-[-60px] w-[250px] h-[250px] rounded-full bg-white/10" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-5">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg mb-3 overflow-hidden">
            {appSettings.logo ? (
              <img src={appSettings.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">{appSettings.schoolName || 'NextCBT'}</h1>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            {/* Mode Switch */}
            {loginMode === 'both' && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
                <button onClick={() => { setMode('nis'); setError(''); setSelectedStudent(null) }} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${mode === 'nis' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>NIS</button>
                <button onClick={() => { setMode('nama'); setError('') }} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${mode === 'nama' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Nama</button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* NIS */}
              {mode === 'nis' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ketik NIS</label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => { setNis(e.target.value); setError('') }}
                    placeholder="Nomor Induk Siswa"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 transition"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* Nama */}
              {mode === 'nama' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ketik Nama</label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => { setNama(e.target.value); setSelectedStudent(null); setError('') }}
                    placeholder="Cari nama siswa..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 transition"
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && !selectedStudent && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto">
                      {suggestions.map((s) => (
                        <button key={s.id} type="button" onClick={() => handleSelectStudent(s)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-sm text-gray-900">{s.name}</p>
                          <p className="text-[11px] text-gray-500">{s.nis} • {s.class_name || '-'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <p className="text-xs text-green-600 mt-1.5">✓ {selectedStudent.name} ({selectedStudent.nis})</p>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition active:scale-[0.98]">
                {isLoading ? 'Loading...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-blue-100/50 text-[10px] mt-6">© {new Date().getFullYear()} {appSettings.schoolName || 'NextCBT'}</p>
      </div>
    </div>
  )
}
