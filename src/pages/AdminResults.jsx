import { useState, useEffect } from 'react'
import { Download, Filter, BarChart2, TrendingUp, Users, Award, Loader2, RefreshCw } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { isEssayCorrect, isMatchingCorrect } from '../utils/helpers'

export const AdminResults = () => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState('all')
  const [activeTab, setActiveTab] = useState('results')
  const [regrading, setRegrading] = useState(false)
  const [regradeResult, setRegradeResult] = useState(null)
  const [students, setStudents] = useState([])
  const [classReportExam, setClassReportExam] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    loadResults()
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const { data } = await supabase.from('students').select('id, name, nis, class_name')
      setStudents(data || [])
    } catch {}
  }

  const loadResults = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('id, score, status, submitted_at, student_id, exam_id, violations, students(name, class_name), exams(title)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((r) => ({
        id: r.id,
        studentId: r.student_id,
        examId: r.exam_id,
        studentName: r.students?.name || '-',
        className: r.students?.class_name || '-',
        exam: r.exams?.title || '-',
        score: r.score || 0,
        violations: r.violations || 0,
        status: (r.score || 0) >= 70 ? 'Lulus' : 'Tidak Lulus',
        date: r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('id-ID') : '-',
      }))
      setResults(mapped)
    } catch (err) {
      console.error('Failed to load results:', err)
    } finally {
      setLoading(false)
    }
  }

  const exams = [...new Set(results.map((r) => r.exam))]
  const filteredResults = selectedExam === 'all' ? results : results.filter((r) => r.exam === selectedExam)

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / pageSize)
  const paginatedResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1) }, [selectedExam])

  // Re-grade: hitung ulang semua nilai dengan algoritma normalisasi baru
  const handleReGradeAll = async () => {
    if (!confirm('Re-grade akan menghitung ulang SEMUA nilai siswa dengan algoritma koreksi terbaru (case-insensitive untuk essay). Lanjutkan?')) return
    setRegrading(true)
    setRegradeResult(null)
    try {
      // 1. Ambil semua session yang submitted
      const { data: sessions, error: sessErr } = await supabase
        .from('exam_sessions')
        .select('id, exam_id, score')
        .eq('status', 'submitted')
      if (sessErr) throw sessErr

      // 2. Ambil semua soal (dengan correct_answer, score, matching_pairs)
      const { data: allQuestions, error: qErr } = await supabase
        .from('questions')
        .select('id, exam_id, type, correct_answer, score, matching_pairs')
      if (qErr) throw qErr

      // 3. Ambil semua jawaban
      const { data: allAnswers, error: aErr } = await supabase
        .from('answers')
        .select('session_id, question_id, answer_text')
      if (aErr) throw aErr

      // 4. Hitung ulang per session
      let updatedCount = 0
      let changedCount = 0
      const updates = []

      for (const session of (sessions || [])) {
        const examQuestions = allQuestions.filter((q) => q.exam_id === session.exam_id)
        if (examQuestions.length === 0) continue

        const sessionAnswers = allAnswers.filter((a) => a.session_id === session.id)

        let earnedScore = 0
        let totalScore = 0
        examQuestions.forEach((q) => {
          const weight = q.score || 1
          totalScore += weight
          const ans = sessionAnswers.find((a) => a.question_id === q.id)
          if (!ans) return

          let isCorrect = false
          const type = q.type
          if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
            if (q.correct_answer) isCorrect = isEssayCorrect(ans.answer_text, q.correct_answer)
          } else if (type === 'menjodohkan' || type === 'matching') {
            try {
              const parsed = JSON.parse(ans.answer_text)
              isCorrect = isMatchingCorrect(parsed, q.matching_pairs)
            } catch {}
          } else if (type === 'pilihan_ganda_kompleks' || type === 'multiple_choice_complex') {
            const userAns = Array.isArray(ans.answer_text)
              ? ans.answer_text.sort().join(',')
              : (ans.answer_text || '')
            if (q.correct_answer) isCorrect = userAns === q.correct_answer
          } else {
            if (q.correct_answer) isCorrect = ans.answer_text === q.correct_answer
          }
          if (isCorrect) earnedScore += weight
        })

        const newScore = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0
        updatedCount++

        if (newScore !== session.score) {
          changedCount++
          updates.push({ id: session.id, score: newScore })
        }
      }

      // 5. Batch update scores yang berubah
      for (const upd of updates) {
        await supabase
          .from('exam_sessions')
          .update({ score: upd.score })
          .eq('id', upd.id)
      }

      setRegradeResult({
        total: updatedCount,
        changed: changedCount,
        success: true,
      })

      // Reload data
      await loadResults()
    } catch (err) {
      console.error('Re-grade error:', err)
      setRegradeResult({ success: false, error: err.message })
    } finally {
      setRegrading(false)
    }
  }

  const handleExportResults = () => {
    const escapeCsv = (val) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    const csv = [
      ['Nama Siswa', 'Kelas', 'Ujian', 'Nilai', 'Pelanggaran', 'Tanggal'],
      ...filteredResults.map((r) => [escapeCsv(r.studentName), escapeCsv(r.className), escapeCsv(r.exam), r.score, r.violations, r.date]),
    ].map((row) => row.join(',')).join('\n')
    const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hasil_ujian.csv'
    a.click()
  }

  const handlePrintResults = () => {
    const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')
    const schoolName = settings.schoolName || 'Sekolah'
    const examTitle = selectedExam === 'all' ? 'Semua Ujian' : selectedExam
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Hasil Ujian - ${examTitle}</title>`)
    w.document.write(`<style>body{font-family:Arial,sans-serif;padding:40px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #333;padding:8px;text-align:left}th{background:#f0f0f0;font-weight:bold}.header{text-align:center;margin-bottom:20px}h2{margin:0 0 4px 0}p{margin:4px 0}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}@media print{body{padding:20px}}</style>`)
    w.document.write(`</head><body>`)
    w.document.write(`<div class="header"><h2>${schoolName}</h2><p>DAFTAR HASIL UJIAN</p></div>`)
    w.document.write(`<p><b>Ujian:</b> ${examTitle}</p>`)
    w.document.write(`<p><b>Jumlah Peserta:</b> ${filteredResults.length}</p>`)
    w.document.write(`<p><b>Rata-rata:</b> ${avgScore}</p>`)
    w.document.write(`<p><b>Kelulusan:</b> ${passRate}% (${passCount} dari ${totalStudents})</p>`)
    w.document.write(`<table><thead><tr><th style="width:30px">No</th><th>Nama Siswa</th><th>Kelas</th><th>Ujian</th><th style="width:60px">Nilai</th><th style="width:80px">Pelanggaran</th><th>Tanggal</th></tr></thead><tbody>`)
    filteredResults.forEach((r, idx) => {
      w.document.write(`<tr><td>${idx + 1}</td><td>${r.studentName}</td><td>${r.className}</td><td>${r.exam}</td><td class="${r.score >= 70 ? 'pass' : 'fail'}">${r.score}</td><td>${r.violations > 0 ? r.violations + '×' : '-'}</td><td>${r.date}</td></tr>`)
    })
    w.document.write(`</tbody></table>`)
    w.document.write(`<p style="margin-top:30px;font-size:10px;color:#666">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`)
    w.document.write(`</body></html>`)
    w.document.close()
    w.print()
  }

  // Stats
  const totalStudents = filteredResults.length
  const avgScore = totalStudents > 0 ? Math.round(filteredResults.reduce((s, r) => s + r.score, 0) / totalStudents) : 0
  const passCount = filteredResults.filter((r) => r.status === 'Lulus').length
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0

  // Charts
  const scoreDistribution = [
    { range: '0-40', count: filteredResults.filter((r) => r.score <= 40).length },
    { range: '41-60', count: filteredResults.filter((r) => r.score > 40 && r.score <= 60).length },
    { range: '61-70', count: filteredResults.filter((r) => r.score > 60 && r.score <= 70).length },
    { range: '71-80', count: filteredResults.filter((r) => r.score > 70 && r.score <= 80).length },
    { range: '81-90', count: filteredResults.filter((r) => r.score > 80 && r.score <= 90).length },
    { range: '91-100', count: filteredResults.filter((r) => r.score > 90).length },
  ]

  const passFailData = [
    { name: 'Lulus', value: passCount },
    { name: 'Tidak Lulus', value: totalStudents - passCount },
  ]
  const COLORS = ['#10b981', '#ef4444']

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hasil & Analitik</h1>
            <p className="text-sm text-gray-600">Data dari Supabase</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReGradeAll} disabled={regrading} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {regrading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {regrading ? 'Re-grading...' : 'Re-Grade Semua'}
            </button>
            <button onClick={handlePrintResults} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Download size={18} /> Cetak Hasil
            </button>
            <button onClick={handleExportResults} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'results' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Hasil Ujian</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Analitik</button>
          <button onClick={() => setActiveTab('classReport')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'classReport' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Laporan Kelas</button>
        </div>

        {/* Re-grade Result Banner */}
        {regradeResult && (
          <div className={`mb-4 p-4 rounded-lg border ${regradeResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {regradeResult.success ? (
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-green-600" />
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Re-grade selesai!</span> {regradeResult.total} sesi diperiksa, <span className="font-bold">{regradeResult.changed} nilai diperbarui</span>.
                </p>
                <button onClick={() => setRegradeResult(null)} className="ml-auto text-green-600 hover:text-green-800 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-800"><span className="font-semibold">Gagal re-grade:</span> {regradeResult.error}</p>
                <button onClick={() => setRegradeResult(null)} className="ml-auto text-red-600 hover:text-red-800 text-sm">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><Users size={20} className="text-blue-600" /><div><p className="text-xs text-gray-500">Total Peserta</p><p className="text-2xl font-bold">{totalStudents}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><BarChart2 size={20} className="text-purple-600" /><div><p className="text-xs text-gray-500">Rata-rata</p><p className="text-2xl font-bold">{avgScore}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><TrendingUp size={20} className="text-green-600" /><div><p className="text-xs text-gray-500">Kelulusan</p><p className="text-2xl font-bold">{passRate}%</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><Award size={20} className="text-orange-600" /><div><p className="text-xs text-gray-500">Lulus</p><p className="text-2xl font-bold">{passCount}</p></div></div></CardContent></Card>
        </div>

        {activeTab === 'results' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daftar Hasil</CardTitle>
                <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">Semua Ujian</option>
                  {exams.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada hasil ujian</p>
              ) : (
                <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold">Kelas</th>
                      <th className="px-4 py-3 text-left font-semibold">Ujian</th>
                      <th className="px-4 py-3 text-left font-semibold">Nilai</th>
                      <th className="px-4 py-3 text-left font-semibold">Pelanggaran</th>
                      <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                      <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResults.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.studentName}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">{r.className}</span></td>
                        <td className="px-4 py-3">{r.exam}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${r.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{r.score}</span></td>
                        <td className="px-4 py-3">
                          {r.violations > 0 ? (
                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold">{r.violations}×</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.date}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={async () => {
                              if (!confirm(`Izinkan ${r.studentName} ujian ulang "${r.exam}"?`)) return
                              try {
                                await supabase.from('exam_sessions').delete().eq('id', r.id)
                                setResults(results.filter((x) => x.id !== r.id))
                              } catch (err) { alert('Gagal: ' + err.message) }
                            }}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-medium"
                          >
                            Remidi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-600">
                      Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredResults.length)} dari {filteredResults.length}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                      >
                        ←
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page
                        if (totalPages <= 5) page = i + 1
                        else if (currentPage <= 3) page = i + 1
                        else if (currentPage >= totalPages - 2) page = totalPages - 4 + i
                        else page = currentPage - 2 + i
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 text-sm border rounded-lg ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                          >
                            {page}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribusi Nilai</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Kelulusan</CardTitle></CardHeader>
              <CardContent>
                {totalStudents > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={passFailData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {passFailData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-12">Belum ada data</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'classReport' && (() => {
          // Group students by class
          const classes = [...new Set(students.map((s) => s.class_name).filter(Boolean))].sort()
          const selectedExamForReport = classReportExam || exams[0] || ''

          // Get student IDs who submitted this exam
          const submittedStudentIds = results
            .filter((r) => r.exam === selectedExamForReport)
            .map((r) => r.studentId)

          // Build class report
          const classData = classes.map((className) => {
            const classStudents = students.filter((s) => s.class_name === className)
            const sudahUjian = classStudents.filter((s) => submittedStudentIds.includes(s.id))
            const belumUjian = classStudents.filter((s) => !submittedStudentIds.includes(s.id))
            const avgScore = sudahUjian.length > 0
              ? Math.round(results.filter((r) => r.exam === selectedExamForReport && sudahUjian.map((s) => s.id).includes(r.studentId)).reduce((sum, r) => sum + r.score, 0) / sudahUjian.length)
              : 0

            return { className, total: classStudents.length, sudah: sudahUjian.length, belum: belumUjian.length, avgScore, belumList: belumUjian }
          })

          return (
            <div className="space-y-4">
              {/* Exam selector */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Pilih Ujian:</label>
                    <select
                      value={selectedExamForReport}
                      onChange={(e) => setClassReportExam(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                    >
                      {exams.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Total Siswa</p>
                        <p className="text-2xl font-bold">{students.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Award size={20} className="text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Sudah Ujian</p>
                        <p className="text-2xl font-bold text-green-600">{classData.reduce((s, c) => s + c.sudah, 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">Belum Ujian</p>
                        <p className="text-2xl font-bold text-red-600">{classData.reduce((s, c) => s + c.belum, 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-class table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rekap Per Kelas — {selectedExamForReport || 'Pilih ujian'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {classData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Belum ada data kelas</p>
                  ) : (
                    <div className="space-y-4">
                      {classData.map((cls) => (
                        <div key={cls.className} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-800">{cls.className}</span>
                              <span className="text-xs text-gray-500">({cls.total} siswa)</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-green-700 font-semibold">✓ {cls.sudah} sudah</span>
                              <span className="text-red-700 font-semibold">✗ {cls.belum} belum</span>
                              {cls.avgScore > 0 && <span className="text-blue-700 font-semibold">Rata-rata: {cls.avgScore}</span>}
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="px-4 py-2">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-green-500 rounded-full transition-all"
                                style={{ width: cls.total > 0 ? `${(cls.sudah / cls.total) * 100}%` : '0%' }}
                              ></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">{cls.total > 0 ? Math.round((cls.sudah / cls.total) * 100) : 0}% selesai</p>
                          </div>
                          {/* Daftar yang belum ujian */}
                          {cls.belum > 0 && (
                            <div className="px-4 pb-3">
                              <p className="text-xs font-medium text-red-600 mb-1">Belum mengerjakan:</p>
                              <div className="flex flex-wrap gap-1">
                                {cls.belumList.map((s) => (
                                  <span key={s.id} className="px-2 py-0.5 bg-red-50 text-red-700 text-[11px] rounded border border-red-100">
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })()}
      </div>
    </AdminLayout>
  )
}
