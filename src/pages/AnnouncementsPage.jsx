import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AnnouncementsPage() {
  const navigate = useNavigate()

  const announcements = [
    {
      id: 1,
      title: 'Jadwal Ujian Semester Genap 2023/2024',
      content: 'Ujian akan dilaksanakan mulai tanggal 20 Mei 2024',
      date: '20 Mei 2024',
      author: 'Admin',
    },
    {
      id: 2,
      title: 'Ketentuan Pelaksanaan Ujian CBT',
      content: 'Peserta harus hadir 15 menit sebelum ujian dimulai',
      date: '18 Mei 2024',
      author: 'Admin',
    },
    {
      id: 3,
      title: 'Selamat Mengerjakan Ujian!',
      content: 'Semoga semua siswa dapat mengerjakan ujian dengan baik',
      date: '15 Mei 2024',
      author: 'Admin',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="hover:opacity-80">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Pengumuman</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {announcements.map((item) => (
          <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{item.content}</p>
            <p className="text-xs text-gray-500">{item.date} • {item.author}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
