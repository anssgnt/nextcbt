import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Download, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'

export const ExamPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null) // examId being synced
  const [syncedExams, setSyncedExams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('synced_exams') || '{}') } catch { return {} }
  })
  const isOnline = navigator.onLine

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    setLoading(true)
    try {
      // Fetch active exams, filter by kelas if applicable
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, duration, questions_count, token, description, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter by student's class
      const studentClass = user?.class_name || ''
      const filtered = (data || []).filter((exam) => {
        try {
          const meta = JSON.parse(exam.description || '{}')
          if (!meta.kelas) return true // kosong = semua kelas
          // Check if student's class matches
          return meta.kelas.includes(studentClass) || studentClass.startsWith(meta.kelas)
        } catch { return true }
      })

      setExams(filtered)
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (exam) => {
    setSyncing(exam.id)
    try {
      // Fetch questions for this exam's bank soal
      const meta = JSON.parse(exam.description || '{}')
      const bankSoal = meta.bank_soal || meta.subject

      let questions = []
      if (bankSoal) {
        const { data } = await supabase
          .from('questions')
          .select('id, question_text, type, options, correct_answer, score, matching_pairs, subject')
          .eq('subject', bankSoal)
        questions = data || []
      }

      // Save to localStorage (offline storage for exam)
      const examData = {
        exam: { id: exam.id, title: exam.title, duration: exam.duration, questions_count: questions.length },
        questions,
        syncedAt: Date.now(),
        meta,
      }
      localStorage.setItem(`exam_data_${exam.id}`, JSON.stringify(examData))

      // Mark as synced
      const newSynced = { ...syncedExams, [exam.id]: Date.now() }
      setSyncedExams(newSynced)
      localStorage.setItem('synced_exams', JSON.stringify(newSynced))
    } catch (err) {
      alert('Sync gagal: ' + err.message)
    } finally {
      setSyncing(null)
    }
  }

  const handleStartExam = (examId) => {
    if (!syncedExams[examId]) {
      alert('Sync soal dulu sebelum mulai ujian')
      return
    }
    navigate(`/exam/${examId}`)
  }

  const getExamMeta = (exam) => {
    try { return JSON.parse(exam.description || '{}') } catch { return {} }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Daftar Ujian</h1>
            <p className="text-blue-100 text-sm mt-0.5">Halo, {user?.name || 'Siswa'}</p>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">📱 Cara mengerjakan ujian:</p>
          <p>1. Klik "Sync Soal" untuk download soal ke HP</p>
          <p>2. Setelah sync berhasil, klik "Mulai Ujian"</p>
          <p>3. Ujian bisa dikerjakan offline setelah sync</p>
        </div>
      </div>

      {/* Exams List */}
      <div className="px-4 space-y-3">
        {exams.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Belum ada ujian tersedia</p>
            <p className="text-sm mt-1">Hubungi guru jika ada masalah</p>
          </div>
        ) : (
          exams.map((exam) => {
            const meta = getExamMeta(exam)
            const isSynced = !!syncedExams[exam.id]
            const isSyncing = syncing === exam.id

            return (
              <div key={exam.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{exam.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {meta.subject || '-'} • {exam.duration} menit • {exam.questions_count || '?'} soal
                    </p>
                    {meta.kelas && <p className="text-xs text-purple-600 mt-0.5">Kelas: {meta.kelas}</p>}
                  </div>
                  {isSynced && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      <CheckCircle size={12} /> Siap
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Sync Button */}
                  <button
                    onClick={() => handleSync(exam)}
                    disabled={isSyncing || !isOnline}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                      isSynced
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } disabled:opacity-50`}
                  >
                    {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isSyncing ? 'Syncing...' : isSynced ? 'Sync Ulang' : 'Sync Soal'}
                  </button>

                  {/* Start Button */}
                  <button
                    onClick={() => handleStartExam(exam.id)}
                    disabled={!isSynced}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <BookOpen size={16} />
                    Mulai Ujian
                  </button>
                </div>

                {isSynced && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Terakhir sync: {new Date(syncedExams[exam.id]).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
