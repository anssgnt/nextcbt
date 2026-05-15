import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Calendar, Megaphone, CheckSquare, BookOpen, MessageSquare, HelpCircle, User, Home, Zap, Award } from 'lucide-react'

export const StudentDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')

  const menuItems = [
    { id: 1, icon: '📅', label: 'Jadwal\nUjian', color: 'blue' },
    { id: 2, icon: '📢', label: 'Pengumuman', color: 'green' },
    { id: 3, icon: '📋', label: 'Hasil\nUjian', color: 'purple' },
    { id: 4, icon: '📚', label: 'Materi\nBelajar', color: 'orange' },
    { id: 5, icon: '❓', label: 'Simulasi\nUjian', color: 'pink' },
    { id: 6, icon: 'ℹ️', label: 'Bantuan', color: 'teal' },
    { id: 7, icon: '💬', label: 'FAQ', color: 'yellow' },
    { id: 8, icon: '👤', label: 'Profil\nSaya', color: 'blue' },
  ]

  const announcements = [
    { id: 1, icon: '📢', title: 'Jadwal Ujian Semester Genap 2023/2024', date: '20 Mei 2024', color: 'blue' },
    { id: 2, icon: '📄', title: 'Ketentuan Pelaksanaan Ujian CBT', date: '18 Mei 2024', color: 'orange' },
    { id: 3, icon: '🎉', title: 'Selamat Mengerjakan Ujian!', date: '15 Mei 2024', color: 'green' },
  ]

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      teal: 'bg-teal-500',
      yellow: 'bg-yellow-500',
    }
    return colors[color] || 'bg-blue-500'
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-md">🏫</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">SMP NEGERI 1</h1>
              <p className="text-blue-100 text-xs font-medium">Cerdas, Berkarakter, Berprestasi</p>
            </div>
          </div>
          <button className="relative w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all">
            <Bell size={20} className="text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-blue-600"></span>
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="px-5 pt-4 pb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium mb-2">Selamat Datang 👋</p>
            <h2 className="text-5xl font-bold text-white mb-1">CBT Online</h2>
            <p className="text-blue-100 text-xl font-semibold mb-3">Siap Ujian, Siap Prestasi!</p>
            <p className="text-blue-50 text-sm mb-6 leading-relaxed">Ujian jadi lebih mudah, aman, dan terpercaya.</p>
            <button
              onClick={() => navigate('/student/exams')}
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95"
            >
              Mulai Ujian
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 space-y-6">
        {/* Menu Cepat */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Menu Cepat</h3>
            <a href="#" className="text-blue-600 text-sm font-semibold hover:text-blue-700">Lihat Semua</a>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:shadow-md transition-all active:scale-95"
              >
                <div className={`w-14 h-14 ${getColorClass(item.color)} rounded-2xl flex items-center justify-center text-2xl shadow-md hover:shadow-lg transition-all`}>
                  {item.icon}
                </div>
                <p className="text-xs font-semibold text-gray-800 text-center leading-tight">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Exam */}
        <div
          onClick={() => alert('Detail Ujian Matematika')}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 shadow-md border border-green-200 hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">📅⏰</div>
            <div className="flex-1">
              <p className="text-green-700 text-xs font-bold uppercase tracking-wide">Ujian Terdekat</p>
              <h4 className="text-xl font-bold text-gray-900 mt-1">Matematika</h4>
              <p className="text-gray-700 text-sm font-medium mt-2">Kamis, 25 Mei 2024</p>
              <p className="text-gray-700 text-sm font-medium">08.00 - 10.00 WIB</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">Akan Datang</span>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Pengumuman Terbaru</h3>
            <a href="#" className="text-blue-600 text-sm font-semibold hover:text-blue-700">Lihat Semua</a>
          </div>
          <div className="space-y-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                onClick={() => alert(`Detail ${item.title}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer active:scale-95"
              >
                <div className={`w-12 h-12 ${getColorClass(item.color)} rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.title}</h4>
                  <p className="text-gray-500 text-xs mt-1">{item.date} • Admin</p>
                </div>
                <span className="text-gray-400 text-lg flex-shrink-0">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl">
        <div className="flex justify-around items-center px-4 py-3 max-w-md mx-auto w-full">
          {[
            { id: 'home', icon: '🏠', label: 'Beranda' },
            { id: 'exams', icon: '📋', label: 'Ujian' },
            { id: 'announcements', icon: '📢', label: 'Pengumuman' },
            { id: 'results', icon: '✅', label: 'Hasil' },
            { id: 'profile', icon: '👤', label: 'Profil' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className={`text-xs font-semibold ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
