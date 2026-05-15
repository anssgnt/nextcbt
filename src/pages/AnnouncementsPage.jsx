import { StudentLayout } from '../layouts/StudentLayout'

export function AnnouncementsPage() {
  return (
    <StudentLayout>
      <div className="bg-blue-600 text-white px-4 py-4">
        <h1 className="font-bold text-lg">Pengumuman</h1>
      </div>
      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-4xl mb-3">📢</p>
        <p className="font-medium">Belum ada pengumuman</p>
        <p className="text-sm mt-1">Pengumuman dari sekolah akan muncul di sini</p>
      </div>
    </StudentLayout>
  )
}
