import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Copy } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { supabase } from '../lib/supabase'

export const AdminExams = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', duration: 120, startDate: '' })

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, duration, token, is_active, questions_count, total_attempts, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setExams(data || [])
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!form.title) return
    try {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase.from('exams').insert({
        title: form.title,
        duration: form.duration,
        token,
        is_active: true,
      })
      if (error) throw error
      await loadExams()
      setForm({ title: '', duration: 120, startDate: '' })
      setShowForm(false)
    } catch (err) {
      alert('Gagal menambah ujian: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus ujian ini?')) return
    try {
      await supabase.from('exams').delete().eq('id', id)
      setExams(exams.filter((e) => e.id !== id))
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token)
    alert('Token disalin: ' + token)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Ujian</h1>
            <p className="text-sm text-gray-600">Data dari Supabase</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus size={18} /> Tambah Ujian
          </button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Ujian</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: UAS Matematika" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                  <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Simpan</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">Batal</button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : exams.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-500">Belum ada ujian. Klik "Tambah Ujian" untuk memulai.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-md transition">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {exam.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div><p className="text-xs text-gray-400">Token</p><p className="font-mono font-bold">{exam.token}</p></div>
                        <div><p className="text-xs text-gray-400">Durasi</p><p>{exam.duration} menit</p></div>
                        <div><p className="text-xs text-gray-400">Soal</p><p>{exam.questions_count || 0}</p></div>
                        <div><p className="text-xs text-gray-400">Peserta</p><p>{exam.total_attempts || 0}</p></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopyToken(exam.token)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Copy Token">
                        <Copy size={18} />
                      </button>
                      <button onClick={() => handleDelete(exam.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
