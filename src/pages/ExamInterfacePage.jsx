import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Modal, Toast } from '../components'
import { useExamStore, useAuthStore } from '../store'
import { useExamTimer, useTabVisibility, useOnlineStatus } from '../hooks/useExam'
import { formatTime, debounce } from '../utils/helpers'
import { List } from 'lucide-react'

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
  const isOnline = useOnlineStatus()

  const { timeRemaining, isTimeUp } = useExamTimer(currentExam?.duration)

  useTabVisibility(() => setShowWarning(true))

  useEffect(() => { if (isTimeUp) handleSubmitExam() }, [isTimeUp])

  // Load from localStorage
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
      navigate('/student/exams')
    } catch { setToast({ type: 'error', message: 'Gagal submit' }) }
  }

  const calculateScore = (answersMap) => {
    let correct = 0
    questions.forEach((q) => {
      const a = answersMap[q.id]
      if (a && q.correct_answer) {
        if (Array.isArray(a)) {
          if (a.sort().join(',') === q.correct_answer) correct++
        } else if (a === q.correct_answer) correct++
      }
    })
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!currentExam || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800 mb-2">Soal tidak ditemukan</p>
          <Button onClick={() => navigate('/student/exams')}>Kembali</Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]
  const isMarked = markedQuestions.has(currentQuestion?.id)
  const answeredCount = Object.keys(answers).length

  // Render question based on type (support both old & new naming)
  const renderQuestion = () => {
    const type = currentQuestion.type
    const opts = currentQuestion.options || []

    // Pilihan Ganda
    if (type === 'pilihan_ganda' || type === 'multiple_choice') {
      return (
        <div className="space-y-2">
          {opts.map((opt) => (
            <label key={opt.id} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${currentAnswer === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt.id} checked={currentAnswer === opt.id} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="ml-3 text-sm text-gray-900">{opt.text || opt.option_text}</span>
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
            <label key={opt.id} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${(currentAnswer || []).includes(opt.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="checkbox" value={opt.id} checked={(currentAnswer || []).includes(opt.id)} onChange={(e) => {
                const sel = currentAnswer || []
                const next = e.target.checked ? [...sel, opt.id] : sel.filter((x) => x !== opt.id)
                handleAnswerChange(currentQuestion.id, next)
              }} className="w-4 h-4 text-blue-600 rounded" />
              <span className="ml-3 text-sm text-gray-900">{opt.text || opt.option_text}</span>
            </label>
          ))}
        </div>
      )
    }

    // Benar / Salah
    if (type === 'benar_salah' || type === 'true_false') {
      return (
        <div className="space-y-2">
          {['Benar', 'Salah'].map((opt) => (
            <label key={opt} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${currentAnswer === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt} checked={currentAnswer === opt} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="ml-3 text-sm text-gray-900">{opt}</span>
            </label>
          ))}
        </div>
      )
    }

    // Menjodohkan
    if (type === 'menjodohkan' || type === 'matching') {
      const pairs = currentQuestion.matching_pairs || []
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">Jodohkan kolom kiri dengan kanan:</p>
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium w-1/3">{pair.left}</span>
              <span className="text-gray-400">→</span>
              <select
                value={(currentAnswer || {})[idx] || ''}
                onChange={(e) => {
                  const ans = { ...(currentAnswer || {}), [idx]: e.target.value }
                  handleAnswerChange(currentQuestion.id, ans)
                }}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Pilih</option>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header - minimal */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Soal {currentQuestionIndex + 1}/{questions.length}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${timeRemaining < 300 ? 'bg-red-50 text-red-700' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </span>
            <button onClick={() => setShowNav(!showNav)} className={`p-1.5 rounded-lg ${showNav ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Navigation (toggle) */}
      {showNav && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, idx) => (
              <button key={q.id} onClick={() => { setCurrentQuestionIndex(idx); setShowNav(false) }}
                className={`aspect-square rounded-lg text-xs font-medium transition ${
                  idx === currentQuestionIndex ? 'bg-blue-600 text-white' :
                  answers[q.id] ? 'bg-green-100 text-green-700' :
                  markedQuestions.has(q.id) ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >{idx + 1}</button>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>🟢 Dijawab: {answeredCount}</span>
            <span>🟡 Ditandai: {markedQuestions.size}</span>
            <span>⚪ Belum: {questions.length - answeredCount}</span>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">{currentQuestion.question_text}</p>
          {currentQuestion.image_url && (
            <img src={currentQuestion.image_url} alt="" className="max-w-full rounded-lg mb-4" />
          )}
          {renderQuestion()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-40">
            Sebelumnya
          </button>
          <button onClick={() => toggleMarkQuestion(currentQuestion.id)} className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isMarked ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
            {isMarked ? '★' : '☆'}
          </button>
          {currentQuestionIndex < questions.length - 1 && (
            <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
              Selanjutnya
            </button>
          )}
        </div>

        {/* Submit button - only at last question */}
        {currentQuestionIndex === questions.length - 1 && (
          <button onClick={() => setShowSubmitModal(true)} className="w-full mt-3 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition active:scale-[0.98]">
            Kumpulkan Jawaban ({answeredCount}/{questions.length} dijawab)
          </button>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)} title="Peringatan">
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">Anda berpindah tab. Tetap fokus pada ujian.</p>
          <Button onClick={() => setShowWarning(false)}>Lanjutkan</Button>
        </div>
      </Modal>

      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Selesai Ujian">
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">Yakin ingin mengumpulkan? Dijawab {answeredCount} dari {questions.length} soal.</p>
          {!isOnline && <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-lg">Anda offline. Jawaban akan dikirim saat online.</p>}
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
