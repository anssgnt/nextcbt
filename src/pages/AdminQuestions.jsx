import { useState, useEffect } from 'react'
import { Upload, Download, Trash2, Loader2, Eye, Plus, X, Edit2, CheckCircle } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { adminService } from '../services/api'

const QUESTION_TYPES = {
  pilihan_ganda: 'Pilihan Ganda',
  pilihan_ganda_kompleks: 'PG Kompleks',
  benar_salah: 'Benar/Salah',
  menjodohkan: 'Menjodohkan',
  uraian_singkat: 'Uraian Singkat',
}

const TYPE_COLORS = {
  pilihan_ganda: 'bg-blue-100 text-blue-800',
  pilihan_ganda_kompleks: 'bg-purple-100 text-purple-800',
  benar_salah: 'bg-orange-100 text-orange-800',
  menjodohkan: 'bg-teal-100 text-teal-800',
  uraian_singkat: 'bg-pink-100 text-pink-800',
}

export const AdminQuestions = () => {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState(null)

  // Views: 'list' | 'create' | 'preview' | 'detail' | 'edit'
  const [view, setView] = useState('list')
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [newBankName, setNewBankName] = useState('')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const { data, error } = await adminService.getQuestions()
      if (error) throw error
      setQuestions(data || [])
    } catch (err) {
      console.error('Failed to load questions:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Group questions by subject
  const grouped = questions.reduce((acc, q) => {
    const key = q.subject || 'Tanpa Mapel'
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  const subjects = Object.entries(grouped).map(([name, items]) => ({
    name,
    count: items.length,
    totalScore: items.reduce((s, q) => s + (q.score || 1), 0),
    types: [...new Set(items.map((q) => q.type))],
  }))

  // Parse Excel
  const parseExcel = async (binary) => {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(binary, { type: 'binary' })
    let allRows = []
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet)
      allRows = [...allRows, ...data]
    })

    return allRows.map((row) => {
      const type = (row.Tipe || '').toLowerCase().trim()
      const q = {
        subject: row['Mata Pelajaran'] || newBankName || '',
        text: row.Soal || '',
        type,
        exam: row.Ujian || '',
        score: parseInt(row.Skor || 1),
        correct_answer: String(row['Kunci Jawaban'] || ''),
        options: null,
        matching_pairs: null,
      }

      if (type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks') {
        const opts = []
        if (row.A != null) opts.push({ id: 'A', text: String(row.A) })
        if (row.B != null) opts.push({ id: 'B', text: String(row.B) })
        if (row.C != null) opts.push({ id: 'C', text: String(row.C) })
        if (row.D != null) opts.push({ id: 'D', text: String(row.D) })
        if (row.E != null) opts.push({ id: 'E', text: String(row.E) })
        q.options = opts
      }

      if (type === 'benar_salah') {
        q.options = [{ id: 'Benar', text: 'Benar' }, { id: 'Salah', text: 'Salah' }]
      }

      if (type === 'menjodohkan') {
        const pairs = []
        for (let i = 1; i <= 5; i++) {
          const left = row[`Kiri${i}`]
          const right = row[`Kanan${i}`]
          if (left && right) pairs.push({ left: String(left), right: String(right) })
        }
        q.matching_pairs = pairs
      }

      return q
    }).filter((q) => q.text && q.type)
  }

  const handlePreview = () => {
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const parsed = await parseExcel(event.target.result)
        if (parsed.length === 0) {
          alert('Tidak ada soal valid. Pastikan format sesuai template.')
          return
        }
        setPreviewData(parsed)
        setView('preview')
      } catch (err) {
        alert('Error: ' + err.message)
      } finally {
        setImporting(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmImport = async () => {
    if (!previewData) return
    setImporting(true)
    try {
      const { data, error } = await adminService.bulkImportQuestions(previewData)
      if (error) throw error
      await loadQuestions()
      alert(`${data?.length || previewData.length} soal berhasil disimpan!`)
      setPreviewData(null)
      setFile(null)
      setView('list')
      setNewBankName('')
    } catch (err) {
      alert('Import gagal: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const allData = [
      { 'Mata Pelajaran': 'Matematika', Tipe: 'pilihan_ganda', Soal: 'Hasil dari 5 x 8 adalah?', A: '35', B: '40', C: '45', D: '50', E: '', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'B', Skor: 2, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'Matematika', Tipe: 'pilihan_ganda', Soal: 'Akar kuadrat dari 144?', A: '10', B: '11', C: '12', D: '14', E: '', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'C', Skor: 2, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'IPA', Tipe: 'pilihan_ganda_kompleks', Soal: 'Planet dalam tata surya? (pilih semua benar)', A: 'Merkurius', B: 'Venus', C: 'Jupiter', D: 'Mars', E: 'Saturnus', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'A,B,D', Skor: 3, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'IPA', Tipe: 'benar_salah', Soal: 'Air mendidih pada suhu 100°C', A: '', B: '', C: '', D: '', E: '', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'Benar', Skor: 1, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'IPA', Tipe: 'benar_salah', Soal: 'Matahari mengelilingi bumi', A: '', B: '', C: '', D: '', E: '', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'Salah', Skor: 1, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'IPS', Tipe: 'menjodohkan', Soal: 'Jodohkan negara dengan ibu kota', A: '', B: '', C: '', D: '', E: '', Kiri1: 'Indonesia', Kanan1: 'Jakarta', Kiri2: 'Jepang', Kanan2: 'Tokyo', Kiri3: 'Thailand', Kanan3: 'Bangkok', 'Kunci Jawaban': '1-1,2-2,3-3', Skor: 3, Ujian: 'UAS' },
      { 'Mata Pelajaran': 'Sejarah', Tipe: 'uraian_singkat', Soal: 'Siapa proklamator kemerdekaan Indonesia?', A: '', B: '', C: '', D: '', E: '', Kiri1: '', Kanan1: '', Kiri2: '', Kanan2: '', Kiri3: '', Kanan3: '', 'Kunci Jawaban': 'Soekarno dan Hatta', Skor: 2, Ujian: 'UAS' },
    ]
    const panduanData = [
      { Kolom: 'Mata Pelajaran', Keterangan: 'Nama mapel' },
      { Kolom: 'Tipe', Keterangan: 'pilihan_ganda | pilihan_ganda_kompleks | benar_salah | menjodohkan | uraian_singkat' },
      { Kolom: 'Soal', Keterangan: 'Teks pertanyaan' },
      { Kolom: 'A-E', Keterangan: 'Opsi jawaban (PG & PG Kompleks). Kosongkan untuk tipe lain.' },
      { Kolom: 'Kiri1-3, Kanan1-3', Keterangan: 'Pasangan menjodohkan. Kosongkan untuk tipe lain.' },
      { Kolom: 'Kunci Jawaban', Keterangan: 'PG: B | Kompleks: A,B,D | Benar/Salah: Benar/Salah | Menjodohkan: 1-1,2-2 | Uraian: teks' },
      { Kolom: 'Skor', Keterangan: 'Bobot nilai (angka)' },
      { Kolom: 'Ujian', Keterangan: 'Nama ujian (opsional)' },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData), 'Soal')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(panduanData), 'PANDUAN')
    XLSX.writeFile(wb, 'template_bank_soal.xlsx')
  }

  const handleDeleteSubject = async (subjectName) => {
    if (!confirm(`Hapus semua soal "${subjectName}"?`)) return
    const ids = (grouped[subjectName] || []).map((q) => q.id)
    for (const id of ids) {
      await adminService.deleteQuestion(id)
    }
    await loadQuestions()
  }

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Hapus soal ini?')) return
    try {
      await adminService.deleteQuestion(id)
      setQuestions(questions.filter((q) => q.id !== id))
    } catch (err) {
      alert('Gagal: ' + err.message)
    }
  }

  const handleEditQuestion = (q) => {
    setEditingQuestion({
      id: q.id,
      question_text: q.question_text || q.text || '',
      type: q.type,
      options: q.options ? [...q.options] : [],
      correct_answer: q.correct_answer || '',
      score: q.score || 1,
      matching_pairs: q.matching_pairs ? [...q.matching_pairs] : [],
      subject: q.subject || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingQuestion) return
    setSavingEdit(true)
    try {
      const updateData = {
        question_text: editingQuestion.question_text,
        type: editingQuestion.type,
        correct_answer: editingQuestion.correct_answer,
        score: editingQuestion.score,
        options: editingQuestion.options.length > 0 ? editingQuestion.options : null,
        matching_pairs: editingQuestion.matching_pairs.length > 0 ? editingQuestion.matching_pairs : null,
      }
      const { error } = await adminService.updateQuestion(editingQuestion.id, updateData)
      if (error) throw error

      // Update local state
      setQuestions(questions.map((q) =>
        q.id === editingQuestion.id ? { ...q, ...updateData } : q
      ))
      setEditingQuestion(null)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Render single question preview
  const renderQuestion = (q, idx) => (
    <div key={q.id || idx} className="p-4 border border-gray-200 rounded-lg">
      <div className="flex gap-2 mb-2 flex-wrap">
        <span className={`px-2 py-0.5 text-xs rounded font-semibold ${TYPE_COLORS[q.type] || 'bg-gray-100'}`}>
          {QUESTION_TYPES[q.type] || q.type}
        </span>
        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-semibold">Skor: {q.score || 1}</span>
      </div>
      <p className="font-medium text-gray-900 text-sm mb-2">{idx + 1}. {q.text}</p>

      {(q.type === 'pilihan_ganda' || q.type === 'pilihan_ganda_kompleks') && q.options && (
        <div className="ml-4 space-y-1">
          {q.options.map((opt) => (
            <div key={opt.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
              q.correct_answer && q.correct_answer.includes(opt.id) ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-600'
            }`}>
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                q.correct_answer && q.correct_answer.includes(opt.id) ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {q.correct_answer && q.correct_answer.includes(opt.id) && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <span>{opt.id}. {opt.text}</span>
            </div>
          ))}
        </div>
      )}

      {q.type === 'benar_salah' && (
        <div className="ml-4 space-y-1">
          {['Benar', 'Salah'].map((opt) => (
            <div key={opt} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
              q.correct_answer === opt ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-600'
            }`}>
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                q.correct_answer === opt ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {q.correct_answer === opt && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}

      {q.type === 'menjodohkan' && q.matching_pairs && (
        <div className="ml-4 mt-1 grid grid-cols-2 gap-1">
          {q.matching_pairs.map((pair, i) => (
            <div key={i} className="contents">
              <div className="text-xs bg-blue-50 px-2 py-1 rounded">{i + 1}. {pair.left}</div>
              <div className="text-xs bg-green-50 px-2 py-1 rounded">→ {pair.right}</div>
            </div>
          ))}
        </div>
      )}

      {q.type === 'uraian_singkat' && q.correct_answer && (
        <div className="ml-4 mt-1 p-2 bg-green-50 rounded text-xs text-green-800">
          <span className="font-semibold">Kunci:</span> {q.correct_answer}
        </div>
      )}
    </div>
  )

  // ==================== VIEWS ====================

  // LIST VIEW - Table of subjects
  if (view === 'list') {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
              <p className="text-sm text-gray-600">{questions.length} soal total</p>
            </div>
            <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus size={18} /> Buat Bank Soal
            </button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">Belum ada bank soal.</p>
                  <p className="text-sm">Klik "Buat Bank Soal" untuk memulai.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold w-12">No</th>
                      <th className="px-4 py-3 text-left font-semibold">Mata Pelajaran</th>
                      <th className="px-4 py-3 text-left font-semibold">Jumlah Soal</th>
                      <th className="px-4 py-3 text-left font-semibold">Total Skor</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipe Soal</th>
                      <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subj, idx) => (
                      <tr key={subj.name} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{subj.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">{subj.count} soal</span>
                        </td>
                        <td className="px-4 py-3">{subj.totalScore}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {subj.types.map((t) => (
                              <span key={t} className={`px-1.5 py-0.5 text-[10px] rounded ${TYPE_COLORS[t] || 'bg-gray-100'}`}>
                                {QUESTION_TYPES[t] || t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setSelectedSubject(subj.name); setView('detail') }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Preview">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => handleDeleteSubject(subj.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  // CREATE VIEW - Buat bank soal baru + import
  if (view === 'create') {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setView('list'); setFile(null); setNewBankName('') }} className="text-gray-500 hover:text-gray-700">← Kembali</button>
            <h1 className="text-2xl font-bold text-gray-900">Buat Bank Soal</h1>
          </div>

          {/* Step 1: Nama Mapel */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Nama Mata Pelajaran</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Contoh: Matematika, IPA, Bahasa Indonesia"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </CardContent>
          </Card>

          {/* Step 2: Import */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>2. Import Soal dari Excel</CardTitle>
              <CardDescription>Download template → isi soal → upload → preview → simpan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format info */}
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-gray-700">Format kolom "Tipe":</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <code className="bg-white px-2 py-1 rounded border">pilihan_ganda</code>
                  <code className="bg-white px-2 py-1 rounded border">pilihan_ganda_kompleks</code>
                  <code className="bg-white px-2 py-1 rounded border">benar_salah</code>
                  <code className="bg-white px-2 py-1 rounded border">menjodohkan</code>
                  <code className="bg-white px-2 py-1 rounded border">uraian_singkat</code>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
                </div>
                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap">
                  <Download size={18} /> Template
                </button>
                <button onClick={handlePreview} disabled={!file || !newBankName || importing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap">
                  {importing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                  Preview
                </button>
              </div>
              {!newBankName && file && <p className="text-xs text-red-500">Isi nama mata pelajaran dulu</p>}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  // PREVIEW VIEW - Preview sebelum save
  if (view === 'preview' && previewData) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preview: {newBankName}</h1>
              <p className="text-sm text-gray-600">{previewData.length} soal siap disimpan</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setView('create'); setPreviewData(null) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">
                ← Edit Ulang
              </button>
              <button onClick={handleConfirmImport} disabled={importing} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">
                {importing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Simpan ke Database
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {previewData.map((q, idx) => renderQuestion(q, idx))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  // DETAIL VIEW - Lihat soal per mapel
  if (view === 'detail' && selectedSubject) {
    const subjectQuestions = grouped[selectedSubject] || []

    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button onClick={() => { setView('list'); setSelectedSubject(null) }} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Kembali ke daftar</button>
              <h1 className="text-2xl font-bold text-gray-900">{selectedSubject}</h1>
              <p className="text-sm text-gray-600">{subjectQuestions.length} soal</p>
            </div>
          </div>

          <div className="space-y-3">
            {subjectQuestions.map((q, idx) => (
              <div key={q.id} className="relative">
                {renderQuestion(q, idx)}
                <div className="absolute top-3 right-3 flex gap-1">
                  <button onClick={() => handleEditQuestion(q)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded" title="Edit soal">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus soal">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Question Modal */}
          {editingQuestion && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-bold text-lg">Edit Soal</h3>
                  <button onClick={() => setEditingQuestion(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-4">
                  {/* Tipe Soal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Soal</label>
                    <select
                      value={editingQuestion.type}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teks Soal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teks Soal</label>
                    <textarea
                      value={editingQuestion.question_text}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  {/* Opsi (PG / PG Kompleks) */}
                  {(editingQuestion.type === 'pilihan_ganda' || editingQuestion.type === 'pilihan_ganda_kompleks') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opsi Jawaban</label>
                      <div className="space-y-2">
                        {editingQuestion.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500 w-6">{opt.id}.</span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = [...editingQuestion.options]
                                newOpts[i] = { ...newOpts[i], text: e.target.value }
                                setEditingQuestion({ ...editingQuestion, options: newOpts })
                              }}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => {
                                const newOpts = editingQuestion.options.filter((_, idx) => idx !== i)
                                setEditingQuestion({ ...editingQuestion, options: newOpts })
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const nextId = String.fromCharCode(65 + editingQuestion.options.length)
                            setEditingQuestion({
                              ...editingQuestion,
                              options: [...editingQuestion.options, { id: nextId, text: '' }],
                            })
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Tambah Opsi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pasangan Menjodohkan */}
                  {editingQuestion.type === 'menjodohkan' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pasangan</label>
                      <div className="space-y-2">
                        {editingQuestion.matching_pairs.map((pair, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={pair.left}
                              onChange={(e) => {
                                const newPairs = [...editingQuestion.matching_pairs]
                                newPairs[i] = { ...newPairs[i], left: e.target.value }
                                setEditingQuestion({ ...editingQuestion, matching_pairs: newPairs })
                              }}
                              placeholder="Kiri"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const newPairs = [...editingQuestion.matching_pairs]
                                newPairs[i] = { ...newPairs[i], right: e.target.value }
                                setEditingQuestion({ ...editingQuestion, matching_pairs: newPairs })
                              }}
                              placeholder="Kanan"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => {
                                const newPairs = editingQuestion.matching_pairs.filter((_, idx) => idx !== i)
                                setEditingQuestion({ ...editingQuestion, matching_pairs: newPairs })
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setEditingQuestion({
                              ...editingQuestion,
                              matching_pairs: [...editingQuestion.matching_pairs, { left: '', right: '' }],
                            })
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Tambah Pasangan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kunci Jawaban */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kunci Jawaban</label>
                    {editingQuestion.type === 'benar_salah' ? (
                      <select
                        value={editingQuestion.correct_answer}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="Benar">Benar</option>
                        <option value="Salah">Salah</option>
                      </select>
                    ) : (editingQuestion.type === 'pilihan_ganda') ? (
                      <select
                        value={editingQuestion.correct_answer}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">-- Pilih --</option>
                        {editingQuestion.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.id}. {opt.text}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editingQuestion.correct_answer}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                        placeholder={editingQuestion.type === 'pilihan_ganda_kompleks' ? 'Contoh: A,B,D' : 'Ketik kunci jawaban'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    )}
                    {editingQuestion.type === 'pilihan_ganda_kompleks' && (
                      <p className="text-xs text-gray-400 mt-1">Pisahkan dengan koma, contoh: A,B,D</p>
                    )}
                  </div>

                  {/* Skor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skor</label>
                    <input
                      type="number"
                      value={editingQuestion.score}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, score: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t">
                  <button onClick={() => setEditingQuestion(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">
                    Batal
                  </button>
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                    {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {savingEdit ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    )
  }

  return null
}
