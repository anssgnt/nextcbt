import { useState, useEffect } from 'react'
import { Loader2, BarChart2, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { isEssayCorrect, isMatchingCorrect } from '../utils/helpers'

export const AdminAnalysis = () => {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [selectedExam, setSelectedExam] = useState('all')
  const [exams, setExams] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: qData } = await supabase.from('questions').select('id, question_text, type, subject, correct_answer, score')
      const { data: aData } = await supabase.from('answers').select('id, question_id, answer_text')
      const { data: eData } = await supabase.from('exams').select('id, title')
      setQuestions(qData || [])
      setAnswers(aData || [])
      setExams(eData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Analisis per soal (client-side calculation)
  const analysis = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.question_id === q.id)
    const totalAttempts = qAnswers.length
    const correctCount = qAnswers.filter((a) => {
      const type = q.type
      // Essay/uraian singkat: pakai normalisasi
      if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
        if (!q.correct_answer) return false
        return isEssayCorrect(a.answer_text, q.correct_answer)
      }
      // Menjodohkan: parse jawaban JSON dan bandingkan dengan matching_pairs
      if (type === 'menjodohkan' || type === 'matching') {
        try {
          const parsed = JSON.parse(a.answer_text)
          return isMatchingCorrect(parsed, q.matching_pairs)
        } catch { return false }
      }
      if (!q.correct_answer) return false
      return a.answer_text === q.correct_answer || q.correct_answer.includes(a.answer_text)
    }).length

    const difficulty = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : null
    let level = 'Belum ada data'
    let color = '#9ca3af'
    if (difficulty !== null) {
      if (difficulty >= 80) { level = 'Mudah'; color = '#10b981' }
      else if (difficulty >= 50) { level = 'Sedang'; color = '#f59e0b' }
      else if (difficulty >= 20) { level = 'Sulit'; color = '#ef4444' }
      else { level = 'Sangat Sulit'; color = '#7c2d12' }
    }

    return {
      ...q,
      totalAttempts,
      correctCount,
      difficulty,
      level,
      color,
    }
  }).filter((q) => q.totalAttempts > 0)

  // Stats
  const totalAnalyzed = analysis.length
  const avgDifficulty = totalAnalyzed > 0 ? Math.round(analysis.reduce((s, a) => s + (a.difficulty || 0), 0) / totalAnalyzed) : 0
  const easyCount = analysis.filter((a) => a.difficulty >= 80).length
  const hardCount = analysis.filter((a) => a.difficulty < 30).length

  // Chart data (top 20 hardest)
  const chartData = [...analysis]
    .sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0))
    .slice(0, 15)
    .map((q, idx) => ({
      name: `Soal ${idx + 1}`,
      difficulty: q.difficulty,
      text: q.question_text?.substring(0, 40) + '...',
      color: q.color,
    }))

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analisis Butir Soal</h1>
          <p className="text-sm text-gray-600">Tingkat kesulitan dan daya pembeda soal (dihitung dari jawaban siswa)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <BarChart2 size={20} className="text-blue-600" />
                <div><p className="text-xs text-gray-500">Soal Teranalisis</p><p className="text-2xl font-bold">{totalAnalyzed}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-green-600" />
                <div><p className="text-xs text-gray-500">Rata-rata Ketepatan</p><p className="text-2xl font-bold">{avgDifficulty}%</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-emerald-600" />
                <div><p className="text-xs text-gray-500">Soal Mudah</p><p className="text-2xl font-bold">{easyCount}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-600" />
                <div><p className="text-xs text-gray-500">Soal Sulit</p><p className="text-2xl font-bold">{hardCount}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Soal Tersulit (% siswa menjawab benar)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.[0]) return null
                    const d = payload[0].payload
                    return <div className="bg-white p-2 border rounded shadow text-xs"><p className="font-semibold">{d.text}</p><p>Ketepatan: {d.difficulty}%</p></div>
                  }} />
                  <Bar dataKey="difficulty" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Per Soal</CardTitle>
            <CardDescription>Klik header kolom untuk sort</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Belum ada data jawaban untuk dianalisis. Siswa harus mengerjakan ujian dulu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold w-12">No</th>
                      <th className="px-3 py-3 text-left font-semibold">Soal</th>
                      <th className="px-3 py-3 text-left font-semibold">Mapel</th>
                      <th className="px-3 py-3 text-left font-semibold">Dijawab</th>
                      <th className="px-3 py-3 text-left font-semibold">Benar</th>
                      <th className="px-3 py-3 text-left font-semibold">Ketepatan</th>
                      <th className="px-3 py-3 text-left font-semibold">Tingkat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.map((q, idx) => (
                      <tr key={q.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-3 max-w-[200px] truncate" title={q.question_text}>{q.question_text}</td>
                        <td className="px-3 py-3 text-xs">{q.subject || '-'}</td>
                        <td className="px-3 py-3">{q.totalAttempts}</td>
                        <td className="px-3 py-3">{q.correctCount}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div className="h-2 rounded-full" style={{ width: `${q.difficulty}%`, backgroundColor: q.color }}></div>
                            </div>
                            <span className="text-xs font-medium">{q.difficulty}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: q.color + '20', color: q.color }}>
                            {q.level}
                          </span>
                        </td>
                      </tr>
                    ))}
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
