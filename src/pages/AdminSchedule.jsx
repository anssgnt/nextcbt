import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Copy, Eye, RefreshCw, Edit2, Printer, FileText, X, Upload } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { supabase } from '../lib/supabase'

const generateExamCode = () => {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `EXAM${num}`
}

const generateToken = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export const AdminSchedule = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [previewSoal, setPreviewSoal] = useState(null)
  const [publishing, setPublishing] = useState(null) // exam id being published
  const [bankSoalList, setBankSoalList] = useState([]) // list mapel dari bank soal dengan jumlah
  const [form, setForm] = useState({
    code: generateExamCode(),
    title: '',
    subject: '',
    bank_soal: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    token: generateToken(),
    shuffle: true,
    duration: 120,
    kelas: '',
  })

  useEffect(() => {
    loadExams()
    loadBankSoal()
  }, [])

  const loadExams = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setExams(data || [])
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBankSoal = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('subject')
      if (error) throw error
      // Group by subject with count
      const counts = {}
      ;(data || []).forEach((q) => {
        if (q.subject) {
          counts[q.subject] = (counts[q.subject] || 0) + 1
        }
      })
      setBankSoalList(Object.entries(counts).map(([name, count]) => ({ name, count })))
    } catch (err) {
      console.error('Failed to load bank soal:', err)
    }
  }

  const handlePreviewSoal = async (bankSoal) => {
    if (!bankSoal) { alert('Bank soal tidak tersedia'); return }
    try {
      const { data } = await supabase.from('questions').select('*').eq('subject', bankSoal).order('created_at')
      setPreviewSoal({ subject: bankSoal, questions: data || [] })
    } catch (err) {
      alert('Gagal load soal: ' + err.message)
    }
  }

  const handleCetakAbsensi = (exam, meta) => {
    const w = window.open('', '_blank')
    const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')
    w.document.write(`<html><head><title>Absensi - ${exam.title}</title><style>body{font-family:Arial,sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #333;padding:8px;text-align:left}th{background:#f0f0f0}.header{text-align:center;margin-bottom:30px}h2{margin:0}p{margin:4px 0}</style></head><body>`)
    w.document.write(`<div class="header"><h2>${settings.schoolName || 'Sekolah'}</h2><p>DAFTAR HADIR PESERTA UJIAN</p></div>`)
    w.document.write(`<p><b>Ujian:</b> ${exam.title}</p>`)
    w.document.write(`<p><b>Mata Pelajaran:</b> ${meta.subject || '-'}</p>`)
    w.document.write(`<p><b>Tanggal:</b> ${meta.start_datetime ? new Date(meta.start_datetime).toLocaleDateString('id-ID') : '-'}</p>`)
    w.document.write(`<p><b>Waktu:</b> ${meta.start_datetime ? new Date(meta.start_datetime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : ''} - ${meta.end_datetime ? new Date(meta.end_datetime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : ''}</p>`)
    w.document.write(`<table><thead><tr><th style="width:40px">No</th><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th style="width:100px">Tanda Tangan</th></tr></thead><tbody>`)
    for (let i = 1; i <= 40; i++) {
      w.document.write(`<tr><td>${i}</td><td></td><td></td><td></td><td></td></tr>`)
    }
    w.document.write(`</tbody></table></body></html>`)
    w.document.close()
    w.print()
  }

  const handleCetakBeritaAcara = (exam, meta) => {
    const w = window.open('', '_blank')
    const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')
    w.document.write(`<html><head><title>Berita Acara - ${exam.title}</title><style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.8}h2{text-align:center;margin:0}p.center{text-align:center;margin:4px 0}.field{margin:10px 0}.sign{display:flex;justify-content:space-between;margin-top:60px}.sign div{text-align:center;width:200px}</style></head><body>`)
    w.document.write(`<h2>${settings.schoolName || 'Sekolah'}</h2><p class="center">BERITA ACARA PELAKSANAAN UJIAN</p><hr/>`)
    w.document.write(`<p>Pada hari ini, tanggal <b>${meta.start_datetime ? new Date(meta.start_datetime).toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'}) : '...............'}</b>, telah dilaksanakan ujian dengan rincian sebagai berikut:</p>`)
    w.document.write(`<div class="field"><p>1. Nama Ujian: <b>${exam.title}</b></p>`)
    w.document.write(`<p>2. Mata Pelajaran: <b>${meta.subject || '-'}</b></p>`)
    w.document.write(`<p>3. Waktu Pelaksanaan: <b>${meta.start_datetime ? new Date(meta.start_datetime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : ''} - ${meta.end_datetime ? new Date(meta.end_datetime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : ''} WIB</b></p>`)
    w.document.write(`<p>4. Jumlah Soal: <b>${exam.questions_count || '-'} soal</b></p>`)
    w.document.write(`<p>5. Jumlah Peserta Hadir: ............. siswa</p>`)
    w.document.write(`<p>6. Jumlah Peserta Tidak Hadir: ............. siswa</p>`)
    w.document.write(`<p>7. Catatan/Kejadian: .............................................</p></div>`)
    w.document.write(`<p>Demikian berita acara ini dibuat dengan sebenarnya.</p>`)
    w.document.write(`<div class="sign"><div><p>Pengawas 1</p><br/><br/><br/><p>(_________________)</p></div><div><p>Pengawas 2</p><br/><br/><br/><p>(_________________)</p></div></div>`)
    w.document.write(`</body></html>`)
    w.document.close()
    w.print()
  }

  const handlePublish = async (exam) => {
    const meta = parseDescription(exam.description)
    const bankSoal = meta.bank_soal || meta.subject
    if (!bankSoal) {
      alert('Ujian ini tidak memiliki bank soal yang ditentukan')
      return
    }

    setPublishing(exam.id)
    try {
      // Fetch all questions from bank soal
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, question_text, type, options, correct_answer, score, matching_pairs, subject')
        .eq('subject', bankSoal)

      if (qErr) throw qErr

      const version = Date.now()
      const publishData = {
        exam: {
          id: exam.id,
          title: exam.title,
          duration: exam.duration,
          questions_count: (questions || []).length,
          token: exam.token,
        },
        questions: questions || [],
        meta,
        version,
      }

      // Upsert to published_exams (1 row per exam)
      const { error: pubErr } = await supabase
        .from('published_exams')
        .upsert({
          exam_id: exam.id,
          version,
          data: publishData,
          published_at: new Date().toISOString(),
        }, { onConflict: 'exam_id' })

      if (pubErr) throw pubErr

      alert(`✅ Ujian "${exam.title}" berhasil dipublish!\nVersi: ${new Date(version).toLocaleString('id-ID')}\nJumlah soal: ${(questions || []).length}`)
    } catch (err) {
      alert('❌ Gagal publish: ' + err.message)
    } finally {
      setPublishing(null)
    }
  }

  const handleCreate = async () => {
    if (!form.title || !form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      alert('Lengkapi semua field yang wajib')
      return
    }

    setSaving(true)
    try {
      const startDateTime = `${form.start_date}T${form.start_time}:00`
      const endDateTime = `${form.end_date}T${form.end_time}:00`

      // Count questions from bank soal
      let questionsCount = 0
      if (form.bank_soal) {
        const found = bankSoalList.find((b) => b.name === form.bank_soal)
        questionsCount = found?.count || 0
      }

      const examData = {
        title: form.title,
        token: form.token,
        duration: form.duration,
        is_active: true,
        questions_count: questionsCount,
        description: JSON.stringify({
          code: form.code,
          subject: form.subject || form.bank_soal,
          bank_soal: form.bank_soal,
          kelas: form.kelas,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          shuffle: form.shuffle,
        }),
      }

      if (editId) {
        const { error } = await supabase.from('exams').update(examData).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exams').insert(examData)
        if (error) throw error
      }

      await loadExams()
      setShowForm(false)
      setEditId(null)
      setForm({
        code: generateExamCode(),
        title: '',
        subject: '',
        bank_soal: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        token: generateToken(),
        shuffle: true,
        duration: 120,
        kelas: '',
      })
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus jadwal ujian ini?')) return
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

  const parseDescription = (desc) => {
    try { return JSON.parse(desc) } catch { return {} }
  }

  // Form view
  if (showForm) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-gray-500 hover:text-gray-700 text-sm">← Kembali</button>
            <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian'}</h1>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Kode Ujian (auto) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Ujian (auto)</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.code} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-mono" />
                    <button onClick={() => setForm({ ...form, code: generateExamCode() })} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token Ujian (auto, 4 karakter)</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.token} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-mono font-bold text-lg tracking-widest" />
                    <button onClick={() => setForm({ ...form, token: generateToken() })} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nama Ujian */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Ujian *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: UAS Matematika Kelas IX" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              {/* Mapel & Bank Soal */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                  <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Matematika" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Soal yang Dipakai</label>
                  <select value={form.bank_soal} onChange={(e) => setForm({ ...form, bank_soal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">-- Pilih Bank Soal --</option>
                    {bankSoalList.map((b) => (
                      <option key={b.name} value={b.name}>{b.name} ({b.count} soal)</option>
                    ))}
                  </select>
                  {bankSoalList.length === 0 && <p className="text-xs text-gray-400 mt-1">Belum ada bank soal. Import soal dulu.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <input type="text" value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} placeholder="Kosongkan = semua kelas" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Kosong = semua kelas • "IX" = semua kelas 9 • "IX A" = hanya IX A</p>
                </div>
              </div>

              {/* Waktu Mulai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mulai Ujian - Tanggal *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mulai Ujian - Jam *</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* Waktu Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selesai Ujian - Tanggal *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selesai Ujian - Jam *</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* Durasi & Acak */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                  <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 120 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.shuffle} onChange={(e) => setForm({ ...form, shuffle: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-medium text-gray-700">Acak Soal</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">Batal</button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                  {saving ? 'Menyimpan...' : editId ? 'Update Jadwal' : 'Simpan Jadwal'}
                </button>
              </div>
            </CardContent>
          </Card>

        {/* Preview Soal Modal */}
        {previewSoal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-bold text-lg">Preview Soal: {previewSoal.subject}</h3>
                  <p className="text-sm text-gray-500">{previewSoal.questions.length} soal</p>
                </div>
                <button onClick={() => setPreviewSoal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {previewSoal.questions.map((q, idx) => (
                  <div key={q.id} className="p-3 border rounded-lg text-sm">
                    <p className="font-medium mb-2">{idx + 1}. {q.question_text}</p>
                    {q.options && Array.isArray(q.options) && (
                      <div className="ml-4 space-y-1">
                        {q.options.map((opt) => (
                          <p key={opt.id} className={`text-xs ${q.correct_answer && q.correct_answer.includes(opt.id) ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                            {opt.id}. {opt.text} {q.correct_answer && q.correct_answer.includes(opt.id) ? '✓' : ''}
                          </p>
                        ))}
                      </div>
                    )}
                    {q.matching_pairs && Array.isArray(q.matching_pairs) && (
                      <div className="ml-4 grid grid-cols-2 gap-1 mt-1">
                        {q.matching_pairs.map((p, i) => (
                          <div key={i} className="contents">
                            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded">{p.left}</span>
                            <span className="text-xs bg-green-50 px-2 py-0.5 rounded">→ {p.right}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'uraian_singkat' && q.correct_answer && (
                      <p className="ml-4 mt-1 text-xs text-green-700"><b>Kunci:</b> {q.correct_answer}</p>
                    )}
                  </div>
                ))}
                {previewSoal.questions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Tidak ada soal di bank soal ini</p>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </AdminLayout>
    )
  }

  // List view
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jadwal Ujian</h1>
            <p className="text-sm text-gray-600">{exams.length} ujian terdaftar</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus size={18} /> Buat Jadwal
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">Belum ada jadwal ujian.</p>
                <p className="text-sm">Klik "Buat Jadwal" untuk memulai.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Kode</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama Ujian</th>
                      <th className="px-4 py-3 text-left font-semibold">Mapel / Bank Soal</th>
                      <th className="px-4 py-3 text-left font-semibold">Waktu</th>
                      <th className="px-4 py-3 text-left font-semibold">Token</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => {
                      const meta = parseDescription(exam.description)
                      const now = new Date()
                      const start = meta.start_datetime ? new Date(meta.start_datetime) : null
                      const end = meta.end_datetime ? new Date(meta.end_datetime) : null
                      let status = 'Aktif'
                      let statusColor = 'bg-green-100 text-green-800'
                      if (!exam.is_active) { status = 'Nonaktif'; statusColor = 'bg-gray-100 text-gray-600' }
                      else if (start && now < start) { status = 'Akan Datang'; statusColor = 'bg-blue-100 text-blue-800' }
                      else if (end && now > end) { status = 'Selesai'; statusColor = 'bg-gray-100 text-gray-600' }

                      return (
                        <tr key={exam.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{meta.code || '-'}</td>
                          <td className="px-4 py-3 font-medium">{exam.title}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="text-xs">{meta.subject || meta.bank_soal || '-'}</span>
                            {exam.questions_count > 0 && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded">{exam.questions_count} soal</span>
                            )}
                            {meta.kelas && (
                              <span className="ml-2 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded">{meta.kelas}</span>
                            )}
                            {!meta.kelas && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[10px] rounded">Semua Kelas</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {start ? (
                              <div>
                                <p>{start.toLocaleDateString('id-ID')} {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-gray-400">s/d {end ? `${end.toLocaleDateString('id-ID')} ${end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '-'}</p>
                              </div>
                            ) : (
                              <span>Durasi: {exam.duration} menit</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleCopyToken(exam.token)} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded font-mono font-bold text-sm tracking-widest hover:bg-gray-200">
                              {exam.token}
                              <Copy size={12} className="text-gray-400" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>{status}</span>
                            {meta.shuffle && <span className="ml-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] rounded">Acak</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {/* Publish JSON */}
                              <button
                                onClick={() => handlePublish(exam)}
                                disabled={publishing === exam.id}
                                className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-xs font-semibold"
                                title="Publish JSON"
                              >
                                {publishing === exam.id ? '...' : 'PUB'}
                              </button>
                              {/* Toggle Aktif */}
                              <button
                                onClick={async () => {
                                  await supabase.from('exams').update({ is_active: !exam.is_active }).eq('id', exam.id)
                                  setExams(exams.map((e) => e.id === exam.id ? { ...e, is_active: !e.is_active } : e))
                                }}
                                className={`p-1.5 rounded text-xs font-semibold ${exam.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                title={exam.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              >
                                {exam.is_active ? 'ON' : 'OFF'}
                              </button>
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  const m = meta
                                  setForm({
                                    code: m.code || '',
                                    title: exam.title,
                                    subject: m.subject || '',
                                    bank_soal: m.bank_soal || '',
                                    start_date: m.start_datetime ? m.start_datetime.split('T')[0] : '',
                                    start_time: m.start_datetime ? m.start_datetime.split('T')[1]?.substring(0, 5) : '',
                                    end_date: m.end_datetime ? m.end_datetime.split('T')[0] : '',
                                    end_time: m.end_datetime ? m.end_datetime.split('T')[1]?.substring(0, 5) : '',
                                    token: exam.token,
                                    shuffle: m.shuffle || false,
                                    duration: exam.duration || 120,
                                    kelas: m.kelas || '',
                                  })
                                  setEditId(exam.id)
                                  setShowForm(true)
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              {/* Preview Soal */}
                              <button
                                onClick={() => handlePreviewSoal(meta.bank_soal)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Preview Soal"
                              >
                                <Eye size={14} />
                              </button>
                              {/* Cetak Absensi */}
                              <button
                                onClick={() => handleCetakAbsensi(exam, meta)}
                                className="p-1.5 text-teal-600 hover:bg-teal-50 rounded" title="Cetak Absensi"
                              >
                                <Printer size={14} />
                              </button>
                              {/* Cetak Berita Acara */}
                              <button
                                onClick={() => handleCetakBeritaAcara(exam, meta)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Cetak Berita Acara"
                              >
                                <FileText size={14} />
                              </button>
                              {/* Hapus */}
                              <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
