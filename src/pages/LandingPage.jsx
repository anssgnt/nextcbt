import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookOpen, Calendar, ClipboardList, HelpCircle, Megaphone, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cbt_settings')
    return saved ? JSON.parse(saved) : {
      schoolName: 'NextCBT',
      schoolMotto: 'Ujian Berbasis Komputer',
      logo: null,
      tataTertib: '',
      tutorialPanduan: '',
      pengumuman: '',
    }
  })
  const [exams, setExams] = useState([])
  const [activeTab, setActiveTab] = useState('jadwal')

  useEffect(() => {
    const handleFocus = () => {
      const saved = localStorage.getItem('cbt_settings')
      if (saved) setSettings(JSON.parse(saved))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
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

  // Load active exams
  useEffect(() => {
    const loadExams = async () => {
      try {
        const { data } = await supabase
          .from('exams')
          .select('id, title, duration, questions_count, description, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5)
        setExams(data || [])
      } catch (e) {}
    }
    loadExams()
  }, [])

  const getExamMeta = (exam) => { try { return JSON.parse(exam.description || '{}') } catch { return {} } }

  const tabs = [
    { id: 'jadwal', icon: Calendar, label: 'Jadwal' },
    { id: 'tatatertib', icon: ClipboardList, label: 'Tata Tertib' },
    { id: 'tutorial', icon: HelpCircle, label: 'Panduan' },
    { id: 'pengumuman', icon: Megaphone, label: 'Info' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Blue Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-30px] left-[-50px] w-[150px] h-[150px] rounded-full bg-white/10" />

        <div className="relative z-10 px-5 pt-8 pb-16">
          {/* School info */}
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

          {/* Hero */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Computer Based Test</h2>
            <p className="text-blue-100 text-sm">Siap Ujian, Siap Prestasi!</p>
          </div>
        </div>
      </div>

      {/* White Content - overlaps header */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-20 min-h-[65vh] px-5 pt-6 pb-8">
        {/* CTA */}
        <button
          onClick={() => navigate('/student/login')}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-[0.98] mb-6"
        >
          Masuk Ujian
        </button>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition flex-1 justify-center ${
                  activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {/* Jadwal Ujian */}
          {activeTab === 'jadwal' && (
            <div className="space-y-3">
              {exams.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Belum ada jadwal ujian</p>
                </div>
              ) : (
                exams.map((exam) => {
                  const meta = getExamMeta(exam)
                  return (
                    <div key={exam.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{exam.title}</p>
                        <p className="text-xs text-gray-500">{meta.subject || '-'} • {exam.duration} menit • {exam.questions_count || '?'} soal</p>
                        {meta.kelas && <p className="text-[10px] text-purple-600">Kelas: {meta.kelas}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Tata Tertib */}
          {activeTab === 'tatatertib' && (
            <div className="space-y-2">
              {settings.tataTertib ? (
                settings.tataTertib.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-sm text-gray-700">{line.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ClipboardList size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Tata tertib belum diatur</p>
                </div>
              )}
            </div>
          )}

          {/* Tutorial */}
          {activeTab === 'tutorial' && (
            <div className="space-y-2">
              {settings.tutorialPanduan ? (
                settings.tutorialPanduan.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                    <p className="text-sm text-gray-700 pt-0.5">{line.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <HelpCircle size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Panduan belum diatur</p>
                </div>
              )}
            </div>
          )}

          {/* Pengumuman */}
          {activeTab === 'pengumuman' && (
            <div>
              {settings.pengumuman ? (
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone size={16} className="text-yellow-600" />
                    <span className="text-xs font-semibold text-yellow-800">Pengumuman</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{settings.pengumuman}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Megaphone size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Tidak ada pengumuman</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © {new Date().getFullYear()} {settings.schoolName}
        </p>
      </div>
    </div>
  )
}
