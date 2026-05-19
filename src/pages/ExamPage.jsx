import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Download, CheckCircle, Loader2, Wifi, WifiOff, KeyRound, X, Clock, PlayCircle } from 'lucide-react'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'
import { StudentLayout } from '../layouts/StudentLayout'
import { queuedFetch } from '../utils/requestQueue'

export const ExamPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null)
  const [syncedExams, setSyncedExams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('synced_exams') || '{}') } catch { return {} }
  })
  const [tokenModal, setTokenModal] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [syncError, setSyncError] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [completedExams, setCompletedExams] = useState({})
  const [inProgressExams, setInProgressExams] = useState({})
  const isOnline = navigator.onLine

  useEffect(() => { loadExams(); loadCompletedStatus().then(() => retryPendingSubmissions()) }, [])

  // Retry pending submissions yang gagal (offline/error)
  const retryPendingSubmissions = async () => {
    if (!navigator.onLine || !user?.id) return
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('pending_submit_'))
    for (const key of keys) {
      const examId = key.replace('pending_submit_', '')
      try {
        const allAnswers = JSON.parse(localStorage.getItem(key))
        if (!allAnswers) continue

        // Cek apakah sudah ada session (submitted ATAU in_progress) — jangan duplikat
        const { data: existingRows } = await queuedFetch(
          supabase.from('exam_sessions')
            .select('id, status')
            .eq('student_id', user.id)
            .eq('exam_id', examId)
            .in('status', ['submitted', 'in_progress'])
            .limit(1)
        )
        const existing = existingRows?.[0] || null

        if (existing?.status === 'submitted') {
          // Sudah submitted, hapus pending
          localStorage.removeItem(key)
          continue
        }

        // Hitung score dari jawaban yang tersimpan
        let score = 0
        try {
          const examDataRaw = localStorage.getItem(`exam_data_${examId}`)
          if (examDataRaw) {
            const examData = JSON.parse(examDataRaw)
            const questions = examData.questions || []
            let earned = 0, total = 0
            questions.forEach((q) => {
              const weight = q.score || 1
              total += weight
              const a = allAnswers[q.id]
              if (!a) return
              if (q.correct_answer && a === q.correct_answer) earned += weight
            })
            score = total > 0 ? Math.round((earned / total) * 100) : 0
          }
        } catch {} // Fallback score = 0 jika exam_data tidak ada

        // Submit (update jika in_progress, insert jika belum ada)
        if (existing?.status === 'in_progress') {
          await queuedFetch(
            supabase.from('exam_sessions')
              .update({ status: 'submitted', score, submitted_at: new Date().toISOString() })
              .eq('id', existing.id)
          )
        } else {
          await queuedFetch(
            supabase.from('exam_sessions').insert({
              student_id: user.id, exam_id: examId, status: 'submitted',
              score, submitted_at: new Date().toISOString(),
            }).select('id').single()
          )
        }

        localStorage.removeItem(key)
        // Mark completed
        const completed = JSON.parse(localStorage.getItem('completed_exams') || '{}')
        completed[examId] = Date.now()
        localStorage.setItem('completed_exams', JSON.stringify(completed))
      } catch {
        // Still offline or error, will retry next time
      }
    }
  }

  // Cek status ujian dari server (siswa tidak bisa bypass)
  const loadCompletedStatus = async () => {
    if (!user?.id) return
    try {
      // Single query: fetch both submitted & in_progress sessions
      const { data } = await queuedFetch(
        supabase.from('exam_sessions')
          .select('exam_id, status')
          .eq('student_id', user.id)
          .in('status', ['submitted', 'in_progress'])
      )

      const submittedMap = {}
      const progressMap = {}
      ;(data || []).forEach((s) => {
        if (s.status === 'submitted') submittedMap[s.exam_id] = true
        else if (s.status === 'in_progress') progressMap[s.exam_id] = true
      })
      setCompletedExams(submittedMap)
      setInProgressExams(progressMap)

      // === FULL CLEANUP: Hapus SEMUA cache lokal yang tidak cocok dengan server ===
      // Ini menangani: remidi dari submitted, remidi dari in_progress, dan stale data

      const oldCompleted = JSON.parse(localStorage.getItem('completed_exams') || '{}')

      // 1. Cari exam yang dulu completed tapi sekarang tidak ada di server (remidi)
      const remidiFromCompleted = Object.keys(oldCompleted).filter((id) => !submittedMap[id])

      // 2. Cari exam yang punya exam_start_ tapi TIDAK ada di server sama sekali
      //    (admin hapus session in_progress → siswa harus mulai fresh)
      const remidiFromProgress = Object.keys(localStorage)
        .filter((k) => k.startsWith('exam_start_'))
        .map((k) => k.replace('exam_start_', ''))
        .filter((id) => !submittedMap[id] && !progressMap[id])

      // 3. Gabungkan semua exam yang perlu di-cleanup
      const allRemidiExams = [...new Set([...remidiFromCompleted, ...remidiFromProgress])]

      if (allRemidiExams.length > 0) {
        console.log('[CBT] Cache cleanup for:', allRemidiExams)
        allRemidiExams.forEach((examId) => {
          localStorage.removeItem(`exam_data_${examId}`)
          localStorage.removeItem(`exam_start_${examId}`)
          localStorage.removeItem(`answers_${examId}`)
          localStorage.removeItem(`exam_result_${examId}`)
          localStorage.removeItem(`pending_submit_${examId}`)
          localStorage.removeItem(`session_created_${examId}`)
        })

        // Clear Zustand exam-storage jika berisi data ujian yang di-cleanup
        try {
          const examStorage = JSON.parse(localStorage.getItem('exam-storage') || '{}')
          const storedExamId = examStorage.state?.currentExam?.id
          if (storedExamId && allRemidiExams.includes(storedExamId)) {
            localStorage.removeItem('exam-storage')
          }
        } catch {}

        // Bersihkan synced_exams
        const syncedExamsLocal = JSON.parse(localStorage.getItem('synced_exams') || '{}')
        allRemidiExams.forEach((examId) => { delete syncedExamsLocal[examId] })
        localStorage.setItem('synced_exams', JSON.stringify(syncedExamsLocal))
        setSyncedExams(syncedExamsLocal)

        // Bersihkan exam_versions
        const versions = JSON.parse(localStorage.getItem('exam_versions') || '{}')
        allRemidiExams.forEach((examId) => { delete versions[examId] })
        localStorage.setItem('exam_versions', JSON.stringify(versions))
      }

      // Update completed_exams — hanya simpan yang masih valid di server
      const newCompleted = {}
      Object.keys(oldCompleted).forEach((examId) => {
        if (submittedMap[examId]) newCompleted[examId] = oldCompleted[examId]
      })
      localStorage.setItem('completed_exams', JSON.stringify(newCompleted))

      // === CLEANUP submitted yang masih punya sisa lokal ===
      Object.keys(localStorage).filter((k) => k.startsWith('exam_start_')).forEach((k) => {
        const examId = k.replace('exam_start_', '')
        if (submittedMap[examId]) {
          localStorage.removeItem(`exam_start_${examId}`)
          localStorage.removeItem(`answers_${examId}`)
          localStorage.removeItem(`session_created_${examId}`)
        }
      })

      // Tambahkan localStorage fallback untuk in_progress (offline support)
      Object.keys(localStorage).filter((k) => k.startsWith('exam_start_')).forEach((k) => {
        const examId = k.replace('exam_start_', '')
        if (!submittedMap[examId] && !progressMap[examId]) {
          // Sudah di-cleanup di atas, skip
        } else if (!submittedMap[examId]) {
          progressMap[examId] = true
        }
      })
      setInProgressExams({ ...progressMap })

    } catch {
      // Fallback ke localStorage jika offline
      try { setCompletedExams(JSON.parse(localStorage.getItem('completed_exams') || '{}')) } catch {}
      const localProgress = {}
      const completed = JSON.parse(localStorage.getItem('completed_exams') || '{}')
      Object.keys(localStorage).filter((k) => k.startsWith('exam_start_')).forEach((k) => {
        const examId = k.replace('exam_start_', '')
        if (!completed[examId]) localProgress[examId] = true
      })
      setInProgressExams(localProgress)
    }
  }

  const loadExams = async () => {
    setLoading(true)
    try {
      const { data, error } = await queuedFetch(
        supabase.from('exams').select('id, title, duration, questions_count, token, description, is_active').eq('is_active', true).order('created_at', { ascending: false })
      )
      if (error) throw error

      const studentClass = user?.class_name || ''
      const filtered = (data || []).filter((exam) => {
        try {
          const meta = JSON.parse(exam.description || '{}')
          if (!meta.kelas) return true
          return meta.kelas.includes(studentClass) || studentClass.startsWith(meta.kelas)
        } catch { return true }
      })
      setExams(filtered)
    } catch (err) {
      setLoadError(err.message || 'Gagal memuat jadwal ujian')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Klik "Masuk Ujian" → tampilkan modal token
  const handleMasukUjian = (exam) => {
    // Feature 4: Time enforcement
    const meta = getExamMeta(exam)
    const now = new Date()
    if (meta.start_datetime) {
      const start = new Date(meta.start_datetime)
      if (now < start) {
        alert('⏰ Ujian belum dimulai.\nWaktu mulai: ' + start.toLocaleString('id-ID'))
        return
      }
    }
    if (meta.end_datetime) {
      const end = new Date(meta.end_datetime)
      if (now > end) {
        alert('⏰ Ujian sudah berakhir.\nWaktu selesai: ' + end.toLocaleString('id-ID'))
        return
      }
    }
    // Jika sudah sync, langsung minta token
    setTokenModal(exam)
    setTokenInput('')
    setTokenError('')
  }

  // Step 2: Validasi token
  const handleValidateToken = () => {
    if (!tokenInput.trim()) { setTokenError('Masukkan token ujian'); return }
    if (tokenInput.trim().toUpperCase() !== tokenModal.token) {
      setTokenError('Token tidak valid')
      return
    }
    // Token valid → fullscreen + mulai (iOS tidak support, skip gracefully)
    try {
      const el = document.documentElement
      if (el.requestFullscreen) el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } catch {}

    if (syncedExams[tokenModal.id]) {
      setTokenModal(null)
      navigate(`/exam/${tokenModal.id}`)
    } else {
      handleSyncAndStart(tokenModal)
    }
  }

  // Step 3: Sync soal lalu mulai
  const handleSyncAndStart = async (exam) => {
    setSyncing(exam.id)
    setTokenError('')
    try {
      // Fetch from published_exams (pre-compiled JSON)
      const { data: pubData, error: pubErr } = await queuedFetch(
        supabase.from('published_exams').select('data, version').eq('exam_id', exam.id).single()
      )

      let questions = []
      let version = null

      if (!pubErr && pubData?.data) {
        // Use published data
        questions = pubData.data.questions || []
        version = pubData.version
      } else {
        // Fallback: fetch from questions table directly
        const meta = JSON.parse(exam.description || '{}')
        const bankSoal = meta.bank_soal || meta.subject
        if (bankSoal) {
          const { data } = await queuedFetch(
            supabase.from('questions').select('id, question_text, type, options, correct_answer, score, matching_pairs, subject').eq('subject', bankSoal)
          )
          questions = data || []
        }
      }

      // Simpan ke localStorage dengan size check
      const examData = {
        exam: { id: exam.id, title: exam.title, duration: exam.duration, questions_count: questions.length },
        questions,
        syncedAt: Date.now(),
        version,
        meta: JSON.parse(exam.description || '{}'),
      }
      const payload = JSON.stringify(examData)

      // Size check: warn jika > 4MB (localStorage limit ~5-10MB)
      if (payload.length > 4 * 1024 * 1024) {
        // Strip image base64 dari soal untuk hemat space
        examData.questions = questions.map(({ image_url, ...q }) => ({
          ...q,
          image_url: image_url && image_url.startsWith('data:') ? null : image_url,
        }))
      }

      try {
        localStorage.setItem(`exam_data_${exam.id}`, JSON.stringify(examData))
      } catch (e) {
        // localStorage full — clear old exam data dan retry
        Object.keys(localStorage)
          .filter((k) => k.startsWith('exam_data_') && k !== `exam_data_${exam.id}`)
          .forEach((k) => localStorage.removeItem(k))
        localStorage.setItem(`exam_data_${exam.id}`, JSON.stringify(examData))
      }

      const newSynced = { ...syncedExams, [exam.id]: Date.now() }
      setSyncedExams(newSynced)
      localStorage.setItem('synced_exams', JSON.stringify(newSynced))

      // Save version info for footer display
      if (version) {
        const versions = JSON.parse(localStorage.getItem('exam_versions') || '{}')
        versions[exam.id] = version
        localStorage.setItem('exam_versions', JSON.stringify(versions))
      }

      // Langsung mulai ujian
      setTokenModal(null)
      navigate(`/exam/${exam.id}`)
    } catch (err) {
      setTokenError('Sync gagal: ' + err.message)
    } finally {
      setSyncing(null)
    }
  }

  // Sync tanpa mulai (pre-sync)
  const handlePreSync = async (exam) => {
    // Konfirmasi jika sudah pernah sync
    if (syncedExams[exam.id]) {
      if (!confirm('Soal sudah di-sync sebelumnya. Sync ulang untuk mendapatkan versi terbaru?')) return
    }
    setSyncing(exam.id)
    setSyncError(null)
    try {
      // Fetch from published_exams (pre-compiled JSON)
      const { data: pubData, error: pubErr } = await queuedFetch(
        supabase.from('published_exams').select('data, version').eq('exam_id', exam.id).single()
      )

      let questions = []
      let version = null

      if (!pubErr && pubData?.data) {
        // Use published data
        questions = pubData.data.questions || []
        version = pubData.version
      } else {
        // Fallback: fetch from questions table directly
        const meta = JSON.parse(exam.description || '{}')
        const bankSoal = meta.bank_soal || meta.subject
        if (bankSoal) {
          const { data } = await queuedFetch(
            supabase.from('questions').select('id, question_text, type, options, correct_answer, score, matching_pairs, subject').eq('subject', bankSoal)
          )
          questions = data || []
        }
      }

      const examData = {
        exam: { id: exam.id, title: exam.title, duration: exam.duration, questions_count: questions.length },
        questions,
        syncedAt: Date.now(),
        version,
        meta: JSON.parse(exam.description || '{}'),
      }

      // Size check: strip base64 images jika > 4MB
      const payload = JSON.stringify(examData)
      if (payload.length > 4 * 1024 * 1024) {
        examData.questions = questions.map(({ image_url, ...q }) => ({
          ...q,
          image_url: image_url && image_url.startsWith('data:') ? null : image_url,
        }))
      }

      try {
        localStorage.setItem(`exam_data_${exam.id}`, JSON.stringify(examData))
      } catch (e) {
        // localStorage full — clear old exam data dan retry
        Object.keys(localStorage)
          .filter((k) => k.startsWith('exam_data_') && k !== `exam_data_${exam.id}`)
          .forEach((k) => localStorage.removeItem(k))
        localStorage.setItem(`exam_data_${exam.id}`, JSON.stringify(examData))
      }

      const newSynced = { ...syncedExams, [exam.id]: Date.now() }
      setSyncedExams(newSynced)
      localStorage.setItem('synced_exams', JSON.stringify(newSynced))

      // Save version info for footer display
      if (version) {
        const versions = JSON.parse(localStorage.getItem('exam_versions') || '{}')
        versions[exam.id] = version
        localStorage.setItem('exam_versions', JSON.stringify(versions))
      }
    } catch (err) {
      setSyncError({ examId: exam.id, message: err.message || 'Koneksi gagal' })
    } finally {
      setSyncing(null)
    }
  }

  const getExamMeta = (exam) => { try { return JSON.parse(exam.description || '{}') } catch { return {} } }

  return (
    <StudentLayout>
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Jadwal Ujian</h1>
            <p className="text-blue-100 text-sm mt-0.5">{user?.name} • {user?.class_name || '-'}</p>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
                  <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="font-medium text-gray-800 mb-1">Gagal Memuat Jadwal</p>
            <p className="text-sm text-gray-500 mb-4">{loadError}</p>
            <button
              onClick={() => { setLoadError(null); loadExams() }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Belum ada ujian aktif</p>
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
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{exam.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} />{exam.duration} menit</span>
                      <span className="text-xs text-gray-500">{exam.questions_count || '?'} soal</span>
                      {meta.kelas && <span className="text-xs text-purple-600">{meta.kelas}</span>}
                    </div>
                    {meta.start_datetime && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(meta.start_datetime).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {meta.end_datetime && ` - ${new Date(meta.end_datetime).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    )}
                  </div>
                  {isSynced && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full flex-shrink-0">
                      <CheckCircle size={10} /> Siap Offline
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Pre-sync button */}
                  <button
                    onClick={() => handlePreSync(exam)}
                    disabled={isSynced || isSyncing || !isOnline}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition ${
                      isSynced
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                    } disabled:opacity-60`}
                  >
                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isSyncing ? 'Sync...' : isSynced ? 'Synced ✓' : 'Sync'}
                  </button>

                  {/* Masuk Ujian button */}
                  <button
                    onClick={() => inProgressExams[exam.id] ? navigate(`/exam/${exam.id}`) : handleMasukUjian(exam)}
                    disabled={(!isSynced && !inProgressExams[exam.id]) || !!completedExams[exam.id]}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition active:scale-95 ${
                      completedExams[exam.id]
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : inProgressExams[exam.id]
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : isSynced
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {completedExams[exam.id] ? (
                      <><CheckCircle size={16} /> Sudah Ujian</>
                    ) : inProgressExams[exam.id] ? (
                      <><PlayCircle size={16} /> Lanjutkan Mengerjakan</>
                    ) : (
                      <><KeyRound size={16} /> Masuk Ujian</>
                    )}
                  </button>
                </div>

                {/* Notice sync dulu */}
                {!isSynced && !syncError?.examId && (
                  <p className="text-[11px] text-orange-600 mt-2 text-center bg-orange-50 rounded-lg py-1.5 px-2">
                    ⚠️ Sync soal terlebih dahulu sebelum mulai ujian
                  </p>
                )}

                {/* Error sync */}
                {syncError?.examId === exam.id && (
                  <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700 font-medium mb-1.5">❌ Sync gagal: {syncError.message}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSyncError(null); handlePreSync(exam) }}
                        className="flex-1 text-xs py-1.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => setSyncError(null)}
                        className="text-xs py-1.5 px-3 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )}

                {isSynced && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Sync: {new Date(syncedExams[exam.id]).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Token Modal */}
      {tokenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Masukkan Token</h3>
              <button onClick={() => setTokenModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Ujian: <span className="font-semibold">{tokenModal.title}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Ujian</label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value.toUpperCase()); setTokenError('') }}
                placeholder="Masukkan token dari pengawas"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {tokenError && <p className="text-red-600 text-xs mt-2">{tokenError}</p>}
            </div>

            <button
              onClick={handleValidateToken}
              disabled={syncing === tokenModal.id}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {syncing === tokenModal.id ? (
                <><Loader2 size={18} className="animate-spin" /> Menyiapkan soal...</>
              ) : (
                <><BookOpen size={18} /> Mulai Ujian</>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Token didapat dari guru pengawas
            </p>
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
