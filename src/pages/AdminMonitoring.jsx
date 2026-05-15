import { useState, useEffect } from 'react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Activity, Users, Database, AlertTriangle, CheckCircle, Clock, RefreshCw, Loader2, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCapacityService } from '../services/capacityService'

export const AdminMonitoring = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ students: 0, exams: 0, sessions: 0, submitted: 0 })
  const [capacityReport, setCapacityReport] = useState(null)
  const [studentInput, setStudentInput] = useState(1000)
  const [questionsInput, setQuestionsInput] = useState(50)
  const [syncStatus, setSyncStatus] = useState({ pending: 0, failed: 0, completed: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [syncedStudents, setSyncedStudents] = useState([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [syncPercentage, setSyncPercentage] = useState(0)
  const [loadingTable, setLoadingTable] = useState(false)

  useEffect(() => {
    loadMonitoringData()
  }, [])

  const loadMonitoringData = async () => {
    setLoading(true)
    try {
      // Real counts from Supabase
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
      const { count: examCount } = await supabase.from('exams').select('*', { count: 'exact', head: true })
      const { count: sessionCount } = await supabase.from('exam_sessions').select('*', { count: 'exact', head: true })
      const { count: submittedCount } = await supabase.from('exam_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted')

      setStats({
        students: studentCount || 0,
        exams: examCount || 0,
        sessions: sessionCount || 0,
        submitted: submittedCount || 0,
      })

      // Sync queue from Supabase
      const { count: pendingSync } = await supabase.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: failedSync } = await supabase.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed')
      const { count: completedSync } = await supabase.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed')

      setSyncStatus({
        pending: pendingSync || 0,
        failed: failedSync || 0,
        completed: completedSync || 0,
      })

      // Load synced students
      await loadSyncedStudents(studentCount || 0)

      // Capacity report
      const capacityService = getCapacityService()
      setCapacityReport(capacityService.generateReport(studentInput, questionsInput))
    } catch (err) {
      console.error('Failed to load monitoring data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSyncedStudents = async (total) => {
    setLoadingTable(true)
    try {
      setTotalStudents(total)

      // Get unique students yang sudah sync (completed)
      const { data: syncedData, error } = await supabase
        .from('sync_queue')
        .select('student_id, updated_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Get unique student IDs
      const uniqueStudentIds = [...new Set(syncedData?.map(s => s.student_id) || [])]

      // Get student details
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name, class_id')
        .in('id', uniqueStudentIds)

      if (studentError) throw studentError

      // Get class names
      const classIds = [...new Set(students?.map(s => s.class_id) || [])]
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)

      const classMap = {}
      classes?.forEach(c => {
        classMap[c.id] = c.name
      })

      // Combine data
      const syncedList = students?.map(student => {
        const syncRecord = syncedData.find(s => s.student_id === student.id)
        return {
          id: student.id,
          name: student.name,
          class: classMap[student.class_id] || '-',
          lastSync: syncRecord?.updated_at ? new Date(syncRecord.updated_at).toLocaleString('id-ID') : '-',
          syncDate: syncRecord?.updated_at ? new Date(syncRecord.updated_at).toLocaleDateString('id-ID') : '-',
        }
      }) || []

      setSyncedStudents(syncedList)
      setSyncPercentage(total > 0 ? Math.round((uniqueStudentIds.length / total) * 100) : 0)
    } catch (err) {
      console.error('Failed to load synced students:', err)
    } finally {
      setLoadingTable(false)
    }
  }

  const handleCalculateCapacity = () => {
    const capacityService = getCapacityService()
    setCapacityReport(capacityService.generateReport(studentInput, questionsInput))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMonitoringData()
    setRefreshing(false)
  }

  const handleExportCSV = () => {
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Tanggal Sync', 'Waktu Sync']
    const rows = syncedStudents.map((student, idx) => [
      idx + 1,
      student.name,
      student.class,
      student.syncDate,
      student.lastSync,
    ])

    const csvContent = [
      ['LAPORAN SISWA YANG SUDAH SYNC'],
      [`Total Siswa: ${totalStudents}`, `Sudah Sync: ${syncedStudents.length}`, `Persentase: ${syncPercentage}%`],
      [`Tanggal Export: ${new Date().toLocaleString('id-ID')}`],
      [],
      headers,
      ...rows,
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `laporan-sync-${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  // Chart data
  const quotaData = [
    { name: 'API Calls', used: capacityReport?.apiCalls?.quotaPercentage || 0 },
    { name: 'Storage', used: capacityReport?.storage?.quotaPercentage || 0 },
    { name: 'Bandwidth', used: capacityReport?.bandwidth?.quotaPercentage || 0 },
  ]

  const syncPieData = [
    { name: 'Pending', value: syncStatus.pending || 0 },
    { name: 'Failed', value: syncStatus.failed || 0 },
    { name: 'Completed', value: syncStatus.completed || 0 },
  ].filter((d) => d.value > 0)

  const SYNC_COLORS = ['#f59e0b', '#ef4444', '#10b981']

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoring Sistem</h1>
            <p className="text-sm text-gray-600">Data real-time dari Supabase</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Total Siswa</p>
                  <p className="text-2xl font-bold">{stats.students}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Total Ujian</p>
                  <p className="text-2xl font-bold">{stats.exams}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Sesi Ujian</p>
                  <p className="text-2xl font-bold">{stats.sessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-teal-600" />
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="text-2xl font-bold">{stats.submitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Quota Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimasi Quota (Supabase Free)</CardTitle>
              <CardDescription>Untuk {studentInput} siswa concurrent</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={quotaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="used" radius={[0, 4, 4, 0]}>
                    {quotaData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.used > 80 ? '#ef4444' : entry.used > 50 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sync Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Queue</CardTitle>
              <CardDescription>Status antrian submission</CardDescription>
            </CardHeader>
            <CardContent>
              {syncPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={syncPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                      {syncPieData.map((entry, idx) => (
                        <Cell key={idx} fill={SYNC_COLORS[idx % SYNC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-gray-500">
                  <div className="text-center">
                    <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Tidak ada antrian sync</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Capacity Planning */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacity Planning</CardTitle>
            <CardDescription>Estimasi resource untuk ujian concurrent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Siswa</label>
                <input type="number" value={studentInput} onChange={(e) => setStudentInput(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Soal</label>
                <input type="number" value={questionsInput} onChange={(e) => setQuestionsInput(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex items-end">
                <button onClick={handleCalculateCapacity} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Hitung Estimasi
                </button>
              </div>
            </div>

            {capacityReport && (
              <div className="space-y-4">
                {/* Health Status */}
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  capacityReport.overallHealth === 'healthy' ? 'bg-green-50 border border-green-200' :
                  capacityReport.overallHealth === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  {capacityReport.overallHealth === 'healthy' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <AlertTriangle size={20} className={capacityReport.overallHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'} />
                  )}
                  <span className="text-sm font-medium">
                    {capacityReport.overallHealth === 'healthy' && `✓ Sistem mampu menangani ${studentInput} siswa concurrent`}
                    {capacityReport.overallHealth === 'warning' && `⚠ Mendekati batas quota untuk ${studentInput} siswa`}
                    {capacityReport.overallHealth === 'critical' && `✗ Melebihi batas quota untuk ${studentInput} siswa`}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">API Calls</p>
                    <p className="text-lg font-bold">{capacityReport.apiCalls.total}</p>
                    <p className="text-xs text-gray-500">{capacityReport.apiCalls.quotaPercentage}% dari quota</p>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full">
                      <div className={`h-2 rounded-full ${capacityReport.apiCalls.quotaPercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(capacityReport.apiCalls.quotaPercentage, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Storage</p>
                    <p className="text-lg font-bold">{capacityReport.storage.totalMB} MB</p>
                    <p className="text-xs text-gray-500">{capacityReport.storage.quotaPercentage}% dari quota</p>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full">
                      <div className={`h-2 rounded-full ${capacityReport.storage.quotaPercentage > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(capacityReport.storage.quotaPercentage, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Bandwidth</p>
                    <p className="text-lg font-bold">{capacityReport.bandwidth.totalMB} MB</p>
                    <p className="text-xs text-gray-500">{capacityReport.bandwidth.quotaPercentage}% dari quota</p>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full">
                      <div className={`h-2 rounded-full ${capacityReport.bandwidth.quotaPercentage > 80 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(capacityReport.bandwidth.quotaPercentage, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {capacityReport.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2">Rekomendasi:</p>
                    <ul className="space-y-1">
                      {capacityReport.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                          <span>•</span><span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Laporan Siswa Sync */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Laporan Siswa yang Sudah Sync</CardTitle>
              <CardDescription>Daftar siswa dengan status sync completed</CardDescription>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={syncedStudents.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Export CSV
            </button>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Total Siswa</p>
                <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium">Sudah Sync</p>
                <p className="text-2xl font-bold text-green-900">{syncedStudents.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 font-medium">Persentase Sync</p>
                <p className="text-2xl font-bold text-purple-900">{syncPercentage}%</p>
              </div>
            </div>

            {/* Table */}
            {loadingTable ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : syncedStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Nama Siswa</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Kelas</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tanggal Sync</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Waktu Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncedStudents.map((student, idx) => (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-gray-600">{student.class}</td>
                        <td className="px-4 py-3 text-gray-600">{student.syncDate}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{student.lastSync}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Belum ada siswa yang sync</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
