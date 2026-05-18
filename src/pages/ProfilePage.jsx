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

        {/* Hapus Sync */}
        <button
          onClick={() => {
            if (confirm('Hapus data sync? Anda perlu sync ulang sebelum ujian.')) {
              const keys = Object.keys(localStorage).filter((k) =>
                k.startsWith('exam_data_') || k.startsWith('answers_') || k.startsWith('pending_submit_') ||
                k === 'synced_exams' || k === 'exam_versions'
              )
              keys.forEach((k) => localStorage.removeItem(k))
              alert('Data sync dihapus. Silakan sync ulang.')
            }
          }}
          className="w-full mt-3 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition text-sm"
        >
          🔄 Reset Sync
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-1">Hanya menghapus soal offline. Status ujian dikontrol admin.</p>

        {/* Reset Aplikasi Total */}
        <button
          onClick={async () => {
            if (!confirm('Reset aplikasi akan menghapus SEMUA data lokal (cache, sync, hasil). Anda perlu login ulang. Lanjutkan?')) return
            try {
              // 1. Unregister service workers
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                await Promise.all(registrations.map((r) => r.unregister()))
              }
              // 2. Clear all caches
              if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((k) => caches.delete(k)))
              }
              // 3. Clear localStorage (kecuali auth)
              localStorage.clear()
              // 4. Reload
              window.location.href = '/student/login'
            } catch {
              localStorage.clear()
              window.location.href = '/student/login'
            }
          }}
          className="w-full mt-2 bg-red-50 text-red-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition text-sm border border-red-200"
        >
          🗑️ Reset Aplikasi (Hapus Semua Cache)
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-1">Gunakan jika aplikasi error atau perlu update. Anda harus login & sync ulang.</p>
      </div>
    </StudentLayout>
  )
}
