import { useState, useEffect } from 'react'
import { Users, BookOpen, BarChart3, TrendingUp, Loader2 } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ students: 0, exams: 0, avgScore: 0, passRate: 0 })
  const [examScores, setExamScores] = useState([])
  const [examStatus, setExamStatus] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Count students
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })

      // Count exams
      const { count: examCount } = await supabase.from('exams').select('*', { count: 'exact', head: true })

      // Get exam sessions for stats
      const { data: sessions } = await supabase.from('exam_sessions').select('score, status')

      const submitted = sessions?.filter((s) => s.status === 'submitted') || []
      const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((sum, s) => sum + (s.score || 0), 0) / submitted.length) : 0
      const passRate = submitted.length > 0 ? Math.round((submitted.filter((s) => (s.score || 0) >= 70).length / submitted.length) * 100) : 0

      setStats({
        students: studentCount || 0,
        exams: examCount || 0,
        avgScore,
        passRate,
      })

      // Get per-exam scores
      const { data: exams } = await supabase.from('exams').select('id, title').limit(10)
      if (exams && exams.length > 0) {
        const scores = []
        for (const exam of exams) {
          const { data: examSessions } = await supabase
            .from('exam_sessions')
            .select('score')
            .eq('exam_id', exam.id)
            .eq('status', 'submitted')
          const avg = examSessions && examSessions.length > 0
            ? Math.round(examSessions.reduce((s, e) => s + (e.score || 0), 0) / examSessions.length)
            : 0
          scores.push({ name: exam.title, average: avg, total: examSessions?.length || 0 })
        }
        setExamScores(scores)
      }

      // Exam status distribution
      const { count: completedCount } = await supabase.from('exam_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
      const { count: pendingCount } = await supabase.from('exam_sessions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
      setExamStatus([
        { name: 'Selesai', value: completedCount || 0 },
        { name: 'Berlangsung', value: pendingCount || 0 },
      ])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3b82f6', '#f59e0b']

  const statCards = [
    { title: 'Total Siswa', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { title: 'Total Ujian', value: stats.exams, icon: BookOpen, color: 'bg-green-500' },
    { title: 'Rata-rata Nilai', value: stats.avgScore, icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'Tingkat Kelulusan', value: `${stats.passRate}%`, icon: BarChart3, color: 'bg-orange-500' },
  ]

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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg text-white`}><Icon size={20} /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Rata-rata Nilai per Ujian</CardTitle>
              <CardDescription>Data dari database</CardDescription>
            </CardHeader>
            <CardContent>
              {examScores.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={examScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#3b82f6" name="Rata-rata" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">Belum ada data ujian</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Ujian</CardTitle>
              <CardDescription>Distribusi sesi ujian</CardDescription>
            </CardHeader>
            <CardContent>
              {examStatus.some((s) => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={examStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {examStatus.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">Belum ada sesi ujian</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
