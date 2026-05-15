import { useState, useEffect } from 'react'
import { Download, Filter, BarChart2, TrendingUp, Users, Award, Loader2 } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'

export const AdminResults = () => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExam, setSelectedExam] = useState('all')
  const [activeTab, setActiveTab] = useState('results')

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('id, score, status, submitted_at, student_id, exam_id, students(name), exams(title)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((r) => ({
        id: r.id,
        studentName: r.students?.name || '-',
        exam: r.exams?.title || '-',
        score: r.score || 0,
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

  const handleExportResults = () => {
    const csv = [
      ['Nama Siswa', 'Ujian', 'Nilai', 'Status', 'Tanggal'],
      ...filteredResults.map((r) => [r.studentName, r.exam, r.score, r.status, r.date]),
    ].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hasil_ujian.csv'
    a.click()
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
          <button onClick={handleExportResults} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Download size={18} /> Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'results' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Hasil Ujian</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Analitik</button>
        </div>

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
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold">Ujian</th>
                      <th className="px-4 py-3 text-left font-semibold">Nilai</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.studentName}</td>
                        <td className="px-4 py-3">{r.exam}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${r.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{r.score}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'Lulus' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span></td>
                        <td className="px-4 py-3 text-gray-600">{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </div>
    </AdminLayout>
  )
}
