import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookOpen, Shield, Users, Award } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cbt_settings')
    return saved ? JSON.parse(saved) : {
      schoolName: 'NextCBT',
      schoolMotto: 'Ujian Berbasis Komputer',
      logo: null,
    }
  })

  useEffect(() => {
    const handleFocus = () => {
      const saved = localStorage.getItem('cbt_settings')
      if (saved) setSettings(JSON.parse(saved))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const features = [
    { icon: BookOpen, title: 'Ujian Online', desc: 'Kerjakan ujian dari mana saja' },
    { icon: Shield, title: 'Aman & Offline', desc: 'Tetap berjalan tanpa internet' },
    { icon: Users, title: '1000+ Siswa', desc: 'Mendukung ujian massal' },
    { icon: Award, title: 'Hasil Instan', desc: 'Nilai langsung setelah submit' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10" />
      <div className="absolute bottom-[20%] left-[-80px] w-[200px] h-[200px] rounded-full bg-white/10" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shadow">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BookOpen size={20} className="text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">{settings.schoolName}</h1>
              <p className="text-blue-100 text-[10px]">{settings.schoolMotto}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="text-xs text-blue-100 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            Admin
          </button>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{settings.schoolName}</h2>
            <p className="text-blue-100 text-base mb-1">Computer Based Test</p>
            <p className="text-blue-200 text-sm">Siap Ujian, Siap Prestasi!</p>
          </div>

          {/* CTA Buttons */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => navigate('/student/login')}
              className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
            >
              Masuk Siswa
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full bg-white/10 text-white py-3 rounded-2xl font-medium text-sm border border-white/20 hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              Masuk Admin
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="px-5 pb-8">
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, idx) => {
              const Icon = f.icon
              return (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <Icon size={20} className="text-white mb-1.5" />
                  <p className="text-white text-xs font-semibold">{f.title}</p>
                  <p className="text-blue-200 text-[10px]">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 text-center">
          <p className="text-blue-200/60 text-xs">© {new Date().getFullYear()} {settings.schoolName}</p>
        </div>
      </div>
    </div>
  )
}
