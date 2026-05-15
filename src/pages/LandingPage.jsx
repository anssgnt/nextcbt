import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookOpen, Calendar, ClipboardList, HelpCircle, Megaphone, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { queuedFetch } from '../utils/requestQueue'

export default function LandingPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cbt_settings_cache')
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.settings || parsed // backward compat
    }
    return { schoolName: 'CBT Online', schoolMotto: 'Ujian Berbasis Komputer', logo: null, tataTertib: '', tutorialPanduan: '', pengumuman: '' }
  })
  const [exams, setExams] = useState(() => {
    const saved = localStorage.getItem('cbt_settings_cache')
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.exams || []
    }
    return []
  })
  const [activeSection, setActiveSection] = useState(null)
  const [loadingExams, setLoadingExams] = useState(false)

  // Fetch combined JSON (settings + exams) from Supabase - 1 API call, cache 1h
  useEffect(() => {
    const fetchAppData = async () => {
      const cacheTime = localStorage.getItem('cbt_settings_cache_time')
      const now = Date.now()
      if (cacheTime && (now - parseInt(cacheTime)) < 3600000) return

      try {
        const { data } = await queuedFetch(
          supabase.from('app_settings').select('data').eq('id', 'main').single()
        )
        if (data?.data) {
          const appData = data.data
          // Combined format: { settings, exams, version }
          if (appData.settings) {
            setSettings(appData.settings)
            setExams(appData.exams || [])
          } else {
            // Legacy format: settings only
            setSettings(appData)
          }
          localStorage.setItem('cbt_settings_cache', JSON.stringify(appData))
          localStorage.setItem('cbt_settings_cache_time', String(now))
        }
      } catch (e) {}
    }
    fetchAppData()
  }, [])

  // Ctrl+Shift+A → Admin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        navigate('/admin/login')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // Jadwal sudah ada dari combined JSON, tapi bisa refresh jika user klik
  const loadExams = async () => {
    if (exams.length > 0) { setLoadingExams(false); return }
    setLoadingExams(true)
    try {
      const { data } = await queuedFetch(
        supabase.from('exams').select('id, title, duration, questions_count, description, is_active').eq('is_active', true).order('created_at', { ascending: false }).limit(10)
      )
      setExams((data || []).map((e) => ({
        id: e.id, title: e.title, duration: e.duration, questions_count: e.questions_count,
        meta: (() => { try { return JSON.parse(e.description || '{}') } catch { return {} } })(),
      })))
    } catch (e) {}
    setLoadingExams(false)
  }

  const getExamMeta = (exam) => { return exam.meta || ((() => { try { return JSON.parse(exam.description || '{}') } catch { return {} } })()) }

  const menuItems = [
    {
      id: 'jadwal',
      label: 'Jadwal Ujian',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      onClick: () => { setActiveSection('jadwal'); loadExams() },
      svg: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
      ),
    },
    {
      id: 'tatatertib',
      label: 'Tata Tertib',
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      svg: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      ),
    },
    {
      id: 'tutorial',
      label: 'Panduan',
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      svg: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
      ),
    },
    {
      id: 'pengumuman',
      label: 'Pengumuman',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      svg: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
        </svg>
      ),
    },
  ]

  // Detail view
  if (activeSection) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-bold text-lg">
            {activeSection === 'jadwal' && 'Jadwal Ujian'}
            {activeSection === 'tatatertib' && 'Tata Tertib'}
            {activeSection === 'tutorial' && 'Panduan Ujian'}
            {activeSection === 'pengumuman' && 'Pengumuman'}
          </h1>
        </div>

        <div className="px-4 py-5">
          {/* Jadwal */}
          {activeSection === 'jadwal' && (
            <div className="space-y-3">
              {loadingExams ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : exams.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={40} className="mx-auto mb-3" />
                  <p className="font-medium">Belum ada jadwal ujian</p>
                </div>
              ) : (
                exams.map((exam) => {
                  const meta = getExamMeta(exam)
                  return (
                    <div key={exam.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h3 className="font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{meta.subject || '-'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>⏱ {exam.duration} menit</span>
                        <span>📝 {exam.questions_count || '?'} soal</span>
                        {meta.kelas && <span>🎓 {meta.kelas}</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Tata Tertib */}
          {activeSection === 'tatatertib' && (
            <div className="space-y-3">
              {settings.tataTertib ? (
                settings.tataTertib.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                    <p className="text-sm text-gray-700 pt-1">{line.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList size={40} className="mx-auto mb-3" />
                  <p className="font-medium">Tata tertib belum diatur</p>
                </div>
              )}
            </div>
          )}

          {/* Tutorial */}
          {activeSection === 'tutorial' && (
            <div className="space-y-3">
              {settings.tutorialPanduan ? (
                settings.tutorialPanduan.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                    <p className="text-sm text-gray-700 pt-1">{line.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <HelpCircle size={40} className="mx-auto mb-3" />
                  <p className="font-medium">Panduan belum diatur</p>
                </div>
              )}
            </div>
          )}

          {/* Pengumuman */}
          {activeSection === 'pengumuman' && (
            <div>
              {settings.pengumuman ? (
                <div className="p-5 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone size={18} className="text-purple-600" />
                    <span className="text-sm font-bold text-purple-800">Pengumuman</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{settings.pengumuman}</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Megaphone size={40} className="mx-auto mb-3" />
                  <p className="font-medium">Tidak ada pengumuman</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main landing view
  return (
    <div className="min-h-screen bg-white">
      {/* Blue Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-30px] left-[-50px] w-[150px] h-[150px] rounded-full bg-white/10" />

        <div className="relative z-10 px-5 pt-8 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md flex-shrink-0">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BookOpen size={20} className="text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">{settings.schoolName}</h1>
              <p className="text-blue-100 text-[11px]">{settings.schoolMotto}</p>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Computer Based Test</h2>
            <p className="text-blue-100 text-sm">Siap Ujian, Siap Prestasi!</p>
          </div>
        </div>
      </div>

      {/* White Content */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-20 px-5 pt-6 pb-8">
        {/* CTA */}
        <button
          onClick={() => navigate('/student/login')}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-[0.98] mb-8"
        >
          Masuk Ujian
        </button>

        {/* Menu Icons Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.onClick ? item.onClick() : setActiveSection(item.id)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center shadow-md`}>
                {item.svg}
              </div>
              <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{item.label}</p>
            </button>
          ))}
        </div>

        {/* Info Sekolah */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 flex-shrink-0">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BookOpen size={18} className="text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{settings.schoolName}</p>
              <p className="text-[11px] text-gray-500">{settings.schoolMotto}</p>
            </div>
          </div>
          {(settings.schoolAddress || settings.schoolPhone || settings.schoolEmail) && (
            <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-200 pt-3">
              {settings.schoolAddress && <p>📍 {settings.schoolAddress}</p>}
              {settings.schoolPhone && <p>📞 {settings.schoolPhone}</p>}
              {settings.schoolEmail && <p>✉️ {settings.schoolEmail}</p>}
            </div>
          )}
        </div>

        {/* Powered by */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-300 uppercase tracking-widest">Powered by</p>
          <p className="text-sm font-bold text-gray-400">NextCBT</p>
          <p className="text-[10px] text-gray-300">Platform Ujian Berbasis Komputer</p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} {settings.schoolName}
        </p>
      </div>
    </div>
  )
}
