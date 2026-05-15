import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { BookOpen, Award, User, LogOut, CheckCircle } from 'lucide-react'
import { StudentLayout } from '../layouts/StudentLayout'

export const StudentDashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/student/login')
  }

  const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')

  return (
    <StudentLayout>
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
              {(user?.name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-blue-100">Selamat datang</p>
              <h1 className="font-bold">{user?.name || 'Siswa'}</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Confirmation Card */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={24} className="text-green-600" />
            <h2 className="font-bold text-gray-900">Login Berhasil</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Nama</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">NIS</span>
              <span className="font-medium">{user?.nis}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Kelas</span>
              <span className="font-medium">{user?.class_name || '-'}</span>
            </div>
            {user?.examTitle && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Ujian</span>
                <span className="font-medium text-blue-600">{user.examTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/student/exams')} className="bg-blue-600 text-white rounded-xl p-4 text-center hover:bg-blue-700 transition active:scale-95">
            <BookOpen size={28} className="mx-auto mb-2" />
            <p className="font-semibold text-sm">Daftar Ujian</p>
            <p className="text-xs text-blue-200 mt-0.5">Sync & mulai</p>
          </button>
          <button onClick={() => navigate('/results')} className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 text-center hover:bg-gray-50 transition active:scale-95">
            <Award size={28} className="mx-auto mb-2 text-purple-600" />
            <p className="font-semibold text-sm">Hasil Ujian</p>
            <p className="text-xs text-gray-500 mt-0.5">Lihat nilai</p>
          </button>
        </div>
      </div>

      <div className="px-4">
        <p className="text-center text-xs text-gray-400">{settings.schoolName || 'NextCBT'} © {new Date().getFullYear()}</p>
      </div>
    </StudentLayout>
  )
}
