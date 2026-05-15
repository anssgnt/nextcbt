import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Calendar, MessageSquare, BookOpen, Users, HelpCircle, User, Home, CheckSquare, Megaphone, Award, Settings } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cbt_settings')
    return saved ? JSON.parse(saved) : {
      schoolName: 'SMP NEGERI 1',
      schoolMotto: 'Cerdas, Berkarakter, Berprestasi',
      logo: null,
    }
  })

  // Listen for storage changes (when admin saves settings)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('cbt_settings')
      if (saved) setSettings(JSON.parse(saved))
    }
    window.addEventListener('storage', handleStorage)
    // Also re-read on focus (same tab won't trigger storage event)
    const handleFocus = () => {
      const saved = localStorage.getItem('cbt_settings')
      if (saved) setSettings(JSON.parse(saved))
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const menuItems = [
    { icon: Calendar, label: 'Jadwal\nUjian', color: 'bg-blue-500', path: '/student/exams' },
    { icon: Megaphone, label: 'Pengumuman', color: 'bg-green-500', path: '/announcements' },
    { icon: Award, label: 'Hasil\nUjian', color: 'bg-purple-500', path: '/results' },
    { icon: BookOpen, label: 'Materi\nBelajar', color: 'bg-orange-500', path: '/materials' },
    { icon: HelpCircle, label: 'Simulasi\nUjian', color: 'bg-pink-500', path: '/simulation' },
    { icon: MessageSquare, label: 'Bantuan', color: 'bg-teal-500', path: '/help' },
    { icon: MessageSquare, label: 'FAQ', color: 'bg-yellow-500', path: '/faq' },
    { icon: User, label: 'Profil\nSaya', color: 'bg-blue-600', path: '/profile' },
  ]

  const announcements = [
    {
      icon: Calendar,
      title: 'Ujian Terdokat',
      subtitle: 'Matematika',
      date: 'Kamis, 25 Mei 2024',
      time: '08:00 - 10:00 WIB',
      status: 'Akan Datang',
    },
    {
      icon: Megaphone,
      title: 'Jadwal Ujian Semester Genap 2023/2024',
      date: '20 Mei 2024 • Admin',
    },
    {
      icon: BookOpen,
      title: 'Ketentuan Pelaksanaan Ujian CBT',
      date: '18 Mei 2024 • Admin',
    },
    {
      icon: Users,
      title: 'Selamat Mengerjakan Ujian!',
      date: '15 Mei 2024 • Admin',
    },
  ]

  const bottomNav = [
    { icon: Home, label: 'Beranda', active: true },
    { icon: CheckSquare, label: 'Ujian' },
    { icon: Megaphone, label: 'Pengumuman' },
    { icon: Award, label: 'Hasil' },
    { icon: User, label: 'Profil' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Section with Hero Content */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 text-white px-4 py-6 relative z-20 rounded-b-3xl">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center text-2xl border-2 border-white flex-shrink-0 overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                '🛡️'
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-xl leading-tight">{settings.schoolName}</h1>
              <p className="text-xs text-blue-100">{settings.schoolMotto}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-2xl hover:opacity-80 transition"
              title="Admin"
            >
              ⚙️
            </button>
            <button className="text-3xl hover:opacity-80 transition">🔔</button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="40" y="30" width="120" height="140" rx="8" fill="white" opacity="0.3"/>
              <circle cx="100" cy="50" r="15" fill="white" opacity="0.3"/>
              <rect x="60" y="75" width="80" height="60" rx="4" fill="white" opacity="0.3"/>
              <path d="M70 140 L130 140 L130 160 L70 160 Z" fill="white" opacity="0.3"/>
              <circle cx="85" cy="95" r="3" fill="white" opacity="0.4"/>
              <circle cx="100" cy="95" r="3" fill="white" opacity="0.4"/>
              <circle cx="115" cy="95" r="3" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <div className="relative z-10 max-w-xs">
            <p className="text-sm mb-2">Selamat Datang 👋</p>
            <h2 className="text-4xl font-bold mb-2">CBT Online</h2>
            <p className="text-lg font-semibold mb-2">Siap Ujian, Siap Prestasi!</p>
            <p className="text-sm text-blue-100 mb-6">
              Ujian jadi lebih mudah, aman, dan terpercaya.
            </p>
            <button
              onClick={() => navigate('/student/login')}
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-50 transition"
            >
              Mulai Ujian
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* White Box Container - Removed */}
      <div className="mb-8"></div>

      {/* Menu Cepat */}
      <div className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Menu Cepat</h3>
          <a href="#" className="text-blue-600 text-sm font-semibold">
            Lihat Semua
          </a>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition"
              >
                <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md hover:shadow-lg transition`}>
                  <Icon size={24} />
                </div>
                <p className="text-xs text-center font-medium text-gray-700 leading-tight">
                  {item.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Ujian Terdokat */}
      <div className="px-4 mt-8">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <Calendar size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-green-600 font-semibold mb-1">Ujian Terdokat</p>
              <h4 className="font-bold text-gray-800 mb-1">Matematika</h4>
              <p className="text-xs text-gray-600 mb-2">Kamis, 25 Mei 2024</p>
              <p className="text-xs text-gray-600">08:00 - 10:00 WIB</p>
            </div>
            <button className="text-green-600 text-xl">→</button>
          </div>
          <button className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-600 transition">
            Akan Datang
          </button>
        </div>
      </div>

      {/* Pengumuman Terbaru */}
      <div className="px-4 mt-8 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Pengumuman Terbaru</h3>
          <a href="#" className="text-blue-600 text-sm font-semibold">
            Lihat Semua
          </a>
        </div>

        <div className="space-y-3">
          {announcements.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                className="w-full bg-white rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition border border-gray-100"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-800 text-sm">{item.title}</h4>
                  {item.subtitle && (
                    <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {bottomNav.map((item, idx) => {
            const Icon = item.icon
            const paths = ['/', '/student/exams', '/announcements', '/results', '/profile']
            return (
              <button
                key={idx}
                onClick={() => navigate(paths[idx])}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
                  item.active
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Indicator */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-black rounded-full"></div>
    </div>
  )
}
