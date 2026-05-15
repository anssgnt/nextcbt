import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { BookOpen, Award, LogOut, ChevronRight } from 'lucide-react'
import { StudentLayout } from '../layouts/StudentLayout'

export const StudentDashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/student/login')
  }

  const settings = JSON.parse(localStorage.getItem('cbt_settings_cache') || localStorage.getItem('cbt_settings') || '{}')

  return (
    <StudentLayout>
      {/* Header - gradient konsisten */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white px-5 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-30px] w-[150px] h-[150px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-20px] left-[-30px] w-[100px] h-[100px] rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-lg font-bold border border-white/30">
                {(user?.name || 'S')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-blue-100 text-xs">Selamat datang</p>
                <h1 className="font-bold text-lg leading-tight">{user?.name || 'Siswa'}</h1>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition" title="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {/* Info card */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-blue-100 text-[10px] uppercase tracking-wider">NIS</p>
                <p className="font-bold text-sm mt-0.5">{user?.nis || '-'}</p>
              </div>
              <div>
                <p className="text-blue-100 text-[10px] uppercase tracking-wider">Kelas</p>
                <p className="font-bold text-sm mt-0.5">{user?.class_name || '-'}</p>
              </div>
              <div>
                <p className="text-blue-100 text-[10px] uppercase tracking-wider">Status</p>
                <p className="font-bold text-sm mt-0.5 text-green-300">Aktif</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - white card overlap */}
      <div className="bg-white rounded-t-3xl -mt-5 relative z-20 px-5 pt-6 pb-8 min-h-[50vh]">
        {/* Quick Actions */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Utama</p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => navigate('/student/exams')}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl hover:shadow-md transition active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen size={22} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">Daftar Ujian</p>
              <p className="text-xs text-gray-500 mt-0.5">Sync soal & mulai ujian</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button
            onClick={() => navigate('/results')}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200 rounded-2xl hover:shadow-md transition active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Award size={22} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">Hasil Ujian</p>
              <p className="text-xs text-gray-500 mt-0.5">Lihat nilai & riwayat</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>

        {/* Tips */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">💡 Tips Ujian</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Sync soal sebelum ujian dimulai</li>
            <li>• Pastikan baterai HP terisi penuh</li>
            <li>• Ujian bisa dikerjakan offline setelah sync</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-300 text-[10px] mt-8">
          {settings.schoolName || 'NextCBT'} © {new Date().getFullYear()}
        </p>
      </div>
    </StudentLayout>
  )
}
