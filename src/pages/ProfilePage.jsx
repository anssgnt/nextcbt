import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../store'
import { StudentLayout } from '../layouts/StudentLayout'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/student/login')
  }

  return (
    <StudentLayout>
      <div className="bg-blue-600 text-white px-4 py-4">
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
            <div><p className="text-xs text-gray-500 mb-1">Nama</p><p className="text-sm font-medium">{user?.name || '-'}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">NIS</p><p className="text-sm font-medium">{user?.nis || '-'}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Kelas</p><p className="text-sm font-medium">{user?.class_name || '-'}</p></div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition active:scale-95">
          <LogOut size={20} /> Logout
        </button>

        {/* Reset Aplikasi */}
        <button
          onClick={async () => {
            if (!confirm('Reset aplikasi akan menghapus cache ujian. Anda perlu sync ulang soal. Lanjutkan?')) return
            try {
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                await Promise.all(registrations.map((r) => r.unregister()))
              }
              if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((k) => caches.delete(k)))
              }
              // Hapus semua cache ujian tapi PERTAHANKAN auth
              const authData = localStorage.getItem('auth-storage')
              const keysToRemove = Object.keys(localStorage).filter((k) =>
                k !== 'auth-storage'
              )
              keysToRemove.forEach((k) => localStorage.removeItem(k))
              if (authData) localStorage.setItem('auth-storage', authData)
              navigate('/student/dashboard')
              window.location.reload()
            } catch {
              const authData = localStorage.getItem('auth-storage')
              const keysToRemove = Object.keys(localStorage).filter((k) =>
                k !== 'auth-storage'
              )
              keysToRemove.forEach((k) => localStorage.removeItem(k))
              if (authData) localStorage.setItem('auth-storage', authData)
              navigate('/student/dashboard')
              window.location.reload()
            }
          }}
          className="w-full mt-3 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition text-sm"
        >
          🔄 Reset Aplikasi
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-1">Hapus semua cache & data lokal. Gunakan jika ada error atau perlu sync ulang.</p>
      </div>
    </StudentLayout>
  )
}
