import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Modal, Toast } from '../components'
import { useExamStore, useAuthStore } from '../store'
import { useExamTimer, useTabVisibility, useOnlineStatus } from '../hooks/useExam'
import { formatTime, debounce } from '../utils/helpers'
import { List, ChevronLeft, ChevronRight } from 'lucide-react'

export const ExamInterfacePage = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const {
    currentExam, setCurrentExam,
    answers, setAnswer,
    currentQuestionIndex, setCurrentQuestionIndex,
    markedQuestions, toggleMarkQuestion,
    setSessionId, sessionId,
  } = useExamStore()

  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [toast, setToast] = useState(null)
  const [violations, setViolations] = useState(0)
  const isOnline = useOnlineStatus()

  const { timeRemaining, isTimeUp } = useExamTimer(currentExam?.duration)

  useTabVisibility(() => {
    setViolations((v) => v + 1)
    setShowWarning(true)
  })
  useEffect(() => { if (isTimeUp) handleSubmitExam() }, [isTimeUp])

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`exam_data_${examId}`)
      if (!cached) {
        setToast({ type: 'error', message: 'Soal belum di-sync' })
        setTimeout(() => navigate('/student/exams'), 2000)
        return
      }
      const examData = JSON.parse(cached)
      setCurrentExam(examData.exam)
      let q = examData.questions || []
      if (examData.meta?.shuffle) q = [...q].sort(() => Math.random() - 0.5)
      setQuestions(q)
      if (!sessionId) setSessionId(`session_${examId}_${Date.now()}`)
    } catch { setToast({ type: 'error', message: 'Gagal memuat soal' }) }
    finally { setIsLoading(false) }
  }, [examId])

  const debouncedSave = debounce((qId, answer) => {
    const key = `answers_${examId}`
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    saved[qId] = answer
    localStorage.setItem(key, JSON.stringify(saved))
  }, 1000)

  const handleAnswerChange = (questionId, answer) => {
    setAnswer(questionId, answer)
    debouncedSave(questionId, answer)
  }

  const handleSubmitExam = async () => {
    try {
      const savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}')
      const allAnswers = { ...savedAnswers, ...answers }
      if (isOnline) {
        try {
          const { queuedFetch } = await import('../utils/requestQueue')
          const { supabase } = await import('../lib/supabase')
          await queuedFetch(supabase.from('exam_sessions').insert({
            student_id: user?.id, exam_id: examId, status: 'submitted',
            score: calculateScore(allAnswers), submitted_at: new Date().toISOString(),
          }))
        } catch { localStorage.setItem(`pending_submit_${examId}`, JSON.stringify(allAnswers)) }
      } else {
        localStorage.setItem(`pending_submit_${examId}`, JSON.stringify(allAnswers))
        setToast({ type: 'info', message: 'Jawaban disimpan. Akan dikirim saat online.' })
      }
      localStorage.removeItem(`answers_${examId}`)
      // Mark as completed
      const completed = JSON.parse(localStorage.getItem('completed_exams') || '{}')
      completed[examId] = Date.now()
      localStorage.setItem('completed_exams', JSON.stringify(completed))
      // Exit fullscreen
      try { document.exitFullscreen?.() } catch {}
      navigate('/student/exams')
    } catch { setToast({ type: 'error', message: 'Gagal submit' }) }
  }

  const calculateScore = (answersMap) => {
    let correct = 0
    questions.forEach((q) => {
      const a = answersMap[q.id]
      if (a && q.correct_answer) {
        if (Array.isArray(a)) { if (a.sort().join(',') === q.correct_answer) correct++ }
        else if (a === q.correct_answer) correct++
      }
    })
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
  }

  if (!currentExam || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div><p className="font-bold text-gray-800 mb-2">Soal tidak ditemukan</p><Button onClick={() => navigate('/student/exams')}>Kembali</Button></div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]
  const isMarked = markedQuestions.has(currentQuestion?.id)
  const answeredCount = Object.keys(answers).length

  const renderQuestion = () => {
    const type = currentQuestion.type
    const opts = currentQuestion.options || []

    // Pilihan Ganda
    if (type === 'pilihan_ganda' || type === 'multiple_choice') {
      return (
        <div className="space-y-2">
          {opts.map((opt) => (
            <label key={opt.id} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${currentAnswer === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt.id} checked={currentAnswer === opt.id} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="ml-3 text-sm">{opt.text || opt.option_text}</span>
            </label>
          ))}
        </div>
      )
    }

    // Pilihan Ganda Kompleks
    if (type === 'pilihan_ganda_kompleks' || type === 'multiple_choice_complex') {
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">Pilih semua jawaban yang benar:</p>
          {opts.map((opt) => (
            <label key={opt.id} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${(currentAnswer || []).includes(opt.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <input type="checkbox" value={opt.id} checked={(currentAnswer || []).includes(opt.id)} onChange={(e) => {
                const sel = currentAnswer || []
                handleAnswerChange(currentQuestion.id, e.target.checked ? [...sel, opt.id] : sel.filter((x) => x !== opt.id))
              }} className="w-4 h-4 text-blue-600 rounded" />
              <span className="ml-3 text-sm">{opt.text || opt.option_text}</span>
            </label>
          ))}
        </div>
      )
    }

    // Benar / Salah
    if (type === 'benar_salah' || type === 'true_false') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {['Benar', 'Salah'].map((opt) => (
            <label key={opt} className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition text-center ${currentAnswer === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt} checked={currentAnswer === opt} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="sr-only" />
              <span className={`text-sm font-medium ${currentAnswer === opt ? 'text-blue-700' : 'text-gray-700'}`}>{opt}</span>
            </label>
          ))}
        </div>
      )
    }

    // Menjodohkan - vertical layout (tidak melebar ke kanan)
    if (type === 'menjodohkan' || type === 'matching') {
      const pairs = currentQuestion.matching_pairs || []
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 mb-1">Jodohkan setiap item:</p>
          {pairs.map((pair, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-sm font-medium text-gray-800 mb-2">{idx + 1}. {pair.left}</p>
              <select
                value={(currentAnswer || {})[idx] || ''}
                onChange={(e) => {
                  const ans = { ...(currentAnswer || {}), [idx]: e.target.value }
                  handleAnswerChange(currentQuestion.id, ans)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">— Pilih pasangan —</option>
                {pairs.map((p, i) => <option key={i} value={p.right}>{p.right}</option>)}
              </select>
            </div>
          ))}
        </div>
      )
    }

    // Uraian Singkat
    if (type === 'uraian_singkat' || type === 'short_answer') {
      return (
        <textarea
          value={currentAnswer || ''}
          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
          placeholder="Ketik jawaban..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none text-sm"
          rows={4}
        />
      )
    }

    return <p className="text-sm text-red-500">Tipe soal "{type}" tidak dikenali</p>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header - blue gradient */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-blue-100 truncate">{user?.name || 'Siswa'}</p>
            <p className="text-[11px] text-blue-200">Soal {currentQuestionIndex + 1}/{questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono font-bold px-2.5 py-1 rounded-lg ${timeRemaining < 300 ? 'bg-red-500/80' : 'bg-white/20'}`}>
              {formatTime(timeRemaining)}
            </span>
            <button onClick={() => setShowNav(!showNav)} className={`p-2 rounded-lg transition ${showNav ? 'bg-white/30' : 'bg-white/10'}`}>
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Navigation (toggle) */}
      {showNav && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, idx) => (
              <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setShowNav(false) }}
                className={`aspect-square rounded-lg text-[11px] font-medium transition ${
                  idx === currentQuestionIndex ? 'bg-blue-600 text-white' :
                  answers[q.id] ? 'bg-green-100 text-green-700' :
                  markedQuestions.has(q.id) ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >{idx + 1}</button>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>🟢 {answeredCount} dijawab</span>
            <span>🟡 {markedQuestions.size} ditandai</span>
            <span>⚪ {questions.length - answeredCount} belum</span>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-4">{currentQuestion.question_text}</p>
          {currentQuestion.image_url && <img src={currentQuestion.image_url} alt="" className="max-w-full rounded-lg mb-4" />}
          {renderQuestion()}
        </div>

        {/* Submit - only at last question */}
        {currentQuestionIndex === questions.length - 1 && (
          <button onClick={() => setShowSubmitModal(true)} className="w-full mt-4 py-3.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition active:scale-[0.98]">
            Kumpulkan Jawaban ({answeredCount}/{questions.length})
          </button>
        )}
      </div>

      {/* Bottom Nav Bar - fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-30">
            <ChevronLeft size={18} /> Sebelumnya
          </button>
          <button onClick={() => toggleMarkQuestion(currentQuestion.id)} className={`px-3 py-2 rounded-lg text-sm ${isMarked ? 'bg-yellow-100 text-yellow-700 font-bold' : 'text-gray-400'}`}>
            {isMarked ? '★' : '☆'}
          </button>
          <button onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))} disabled={currentQuestionIndex === questions.length - 1} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 disabled:opacity-30">
            Selanjutnya <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)} title="⚠️ Peringatan">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-red-600 mb-2">{violations}x</p>
            <p className="text-gray-700 text-sm">Anda terdeteksi keluar dari halaman ujian.</p>
            <p className="text-xs text-gray-500 mt-1">Pelanggaran dicatat dan dilaporkan ke pengawas.</p>
          </div>
          <Button onClick={() => { setShowWarning(false); try { document.documentElement.requestFullscreen?.() } catch {} }}>
            Kembali ke Ujian
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Kumpulkan Jawaban">
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">Yakin ingin mengumpulkan? {answeredCount} dari {questions.length} soal dijawab.</p>
          {!isOnline && <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-lg">Offline. Jawaban dikirim saat online.</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Batal</Button>
            <Button onClick={handleSubmitExam}>Kumpulkan</Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
