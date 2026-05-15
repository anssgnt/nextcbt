import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AnnouncementsPage() {
  const navigate = useNavigate()

  // Pengumuman bisa ditambahkan nanti via admin
  // Untuk sekarang tampilkan empty state
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="hover:opacity-80"><ArrowLeft size={24} /></button>
        <h1 className="font-bold text-lg">Pengumuman</h1>
      </div>

      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-4xl mb-3">📢</p>
        <p className="font-medium">Belum ada pengumuman</p>
        <p className="text-sm mt-1">Pengumuman dari sekolah akan muncul di sini</p>
      </div>
    </div>
  )
}
