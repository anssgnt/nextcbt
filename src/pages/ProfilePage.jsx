import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuthStore } from '../store'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/student/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="hover:opacity-80"><ArrowLeft size={24} /></button>
        <h1 className="font-bold text-lg">Profil Saya</h1>
      </div>

      <div className="px-4 py-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {(user?.name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{user?.name || 'Siswa'}</h2>
              <p className="text-sm text-gray-500">{user?.class_name || '-'}</p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Nama Lengkap</p>
              <p className="text-sm font-medium text-gray-800">{user?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">NIS</p>
              <p className="text-sm font-medium text-gray-800">{user?.nis || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kelas</p>
              <p className="text-sm font-medium text-gray-800">{user?.class_name || '-'}</p>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition">
          <LogOut size={20} /> Logout
        </button>
      </div>
    </div>
  )
}
