import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookOpen, Shield, Users, Award, Wifi, Clock } from 'lucide-react'

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

  // Ctrl+Shift+A → Admin login (hidden shortcut)
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

  const features = [
    { icon: BookOpen, title: 'Ujian Online', desc: 'Kerjakan dari mana saja' },
    { icon: Shield, title: 'Mode Offline', desc: 'Tetap jalan tanpa internet' },
    { icon: Users, title: '1000+ Siswa', desc: 'Ujian massal sekaligus' },
    { icon: Award, title: 'Hasil Instan', desc: 'Nilai langsung keluar' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Blue Header Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-30px] left-[-50px] w-[150px] h-[150px] rounded-full bg-white/10" />

        <div className="relative z-10 px-5 pt-8 pb-16">
          {/* School info */}
          <div className="flex items-center gap-3 mb-10">
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-5 overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Computer Based Test</h2>
            <p className="text-blue-100 text-sm">Siap Ujian, Siap Prestasi!</p>
          </div>
        </div>
      </div>

      {/* White Content Section - overlaps header */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-20 min-h-[60vh] px-5 pt-8 pb-10">
        {/* CTA Button */}
        <button
          onClick={() => navigate('/student/login')}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98] mb-8"
        >
          Masuk Ujian
        </button>

        {/* Features */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Keunggulan Platform</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, idx) => {
              const Icon = f.icon
              return (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
            <Wifi size={18} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-800">Offline Support</p>
              <p className="text-[11px] text-green-600">Sync soal sebelum ujian, kerjakan tanpa internet</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
            <Clock size={18} className="text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-800">Timer Otomatis</p>
              <p className="text-[11px] text-orange-600">Waktu ujian berjalan akurat di perangkat</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} {settings.schoolName}
        </p>
      </div>
    </div>
  )
}
