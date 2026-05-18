import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Modal, Toast } from '../components'
import { useExamStore, useAuthStore } from '../store'
import { useExamTimer, useTabVisibility, useOnlineStatus } from '../hooks/useExam'
import { formatTime, debounce, isEssayCorrect, isMatchingCorrect } from '../utils/helpers'
import { RichText } from '../components/RichText'
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
    resetExam,
  } = useExamStore()

  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [toast, setToast] = useState(null)
  const [violations, setViolations] = useState(0)
  const [examMeta, setExamMeta] = useState({})
  const [warningCountdown, setWarningCountdown] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isOnline = useOnlineStatus()

  const { timeRemaining, isTimeUp } = useExamTimer(currentExam?.duration, examId)

  useTabVisibility(() => {
    setViolations((v) => {
      const newCount = v + 1
      // Countdown semakin lama setiap pelanggaran
      const durations = [5, 10, 20, 30, 30]
      const countdown = durations[Math.min(newCount - 1, durations.length - 1)]
      setWarningCountdown(countdown)
      setShowWarning(true)
      return newCount
    })
  })
  useEffect(() => { if (isTimeUp) handleSubmitExam() }, [isTimeUp])

  // Countdown timer untuk pelanggaran tab
  useEffect(() => {
    if (!showWarning || warningCountdown <= 0) return
    const timer = setInterval(() => {
      setWarningCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showWarning, warningCountdown > 0])

  // Prevent back button during exam (Android)
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', preventBack)
    return () => window.removeEventListener('popstate', preventBack)
  }, [])

  // Prevent accidental page close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Ujian sedang berlangsung. Yakin ingin keluar?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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
      setExamMeta(examData.meta || {})
      let q = examData.questions || []

      // Soal dari published_exams sudah terkunci (urutan & seleksi sudah final)
      // Hanya shuffle/limit jika BELUM dipublish (legacy/fallback)
      if (!examData.version) {
        if (examData.meta?.shuffle) q = [...q].sort(() => Math.random() - 0.5)
        const questionsLimit = examData.meta?.questions_limit
        if (questionsLimit && questionsLimit > 0 && q.length > questionsLimit) {
          q = [...q].sort(() => Math.random() - 0.5).slice(0, questionsLimit)
        }
      }

      setQuestions(q)

      // Restore answers dari localStorage (survive crash/refresh)
      const savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}')
      Object.entries(savedAnswers).forEach(([qId, ans]) => {
        setAnswer(qId, ans)
      })

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
    if (isSubmitting) return // Prevent double submit
    setIsSubmitting(true)
    try {
      const savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}')
      const allAnswers = { ...savedAnswers, ...answers }
      const finalScore = calculateScore(allAnswers)

      if (isOnline) {
        try {
          const { queuedFetch } = await import('../utils/requestQueue')
          const { supabase } = await import('../lib/supabase')

          // Random delay 0-3 detik untuk menghindari 1000 siswa hit server bersamaan
          await new Promise((r) => setTimeout(r, Math.random() * 3000))

          // Cek apakah sudah pernah submit ujian ini
          const { data: existing } = await queuedFetch(
            supabase.from('exam_sessions')
              .select('id')
              .eq('student_id', user?.id)
              .eq('exam_id', examId)
              .eq('status', 'submitted')
              .maybeSingle()
          )

          if (existing) {
            // Sudah pernah submit, skip insert, langsung ke result
            setToast({ type: 'info', message: 'Ujian sudah pernah disubmit' })
          } else {
            // 1. Insert exam_session dan ambil ID-nya (retry up to 2x)
            let sessionData = null
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const { data, error } = await queuedFetch(
                  supabase.from('exam_sessions').insert({
                    student_id: user?.id, exam_id: examId, status: 'submitted',
                    score: finalScore, submitted_at: new Date().toISOString(),
                  }).select('id').single()
                )
                if (error) throw error
                sessionData = data
              break
            } catch (e) {
              if (attempt === 2) throw e
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
            }
          }

          // 2. Simpan jawaban per soal ke tabel answers (single batch) - hanya jika save_answers ON
          if (sessionData?.id && examMeta.save_answers) {
            const answersToInsert = Object.entries(allAnswers)
              .filter(([, val]) => val !== null && val !== undefined && val !== '')
              .map(([questionId, answerValue]) => ({
                session_id: sessionData.id,
                question_id: questionId,
                answer_text: typeof answerValue === 'object' ? JSON.stringify(answerValue) : String(answerValue),
                answered_at: new Date().toISOString(),
              }))

            if (answersToInsert.length > 0) {
              await queuedFetch(
                supabase.from('answers').upsert(answersToInsert, { onConflict: 'session_id,question_id' })
              )
            }
          }
          } // close else (not existing)
        } catch { localStorage.setItem(`pending_submit_${examId}`, JSON.stringify(allAnswers)) }
      } else {
        localStorage.setItem(`pending_submit_${examId}`, JSON.stringify(allAnswers))
        setToast({ type: 'info', message: 'Jawaban disimpan. Akan dikirim saat online.' })
      }

      // Save result detail for ResultPage
      let correctCount = 0
      let wrongCount = 0
      questions.forEach((q) => {
        const a = allAnswers[q.id]
        if (!a) { wrongCount++; return }
        const type = q.type
        if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
          if (q.correct_answer && isEssayCorrect(a, q.correct_answer)) correctCount++; else wrongCount++
        } else if (type === 'menjodohkan' || type === 'matching') {
          if (isMatchingCorrect(a, q.matching_pairs)) correctCount++; else wrongCount++
        } else if (Array.isArray(a)) {
          if (q.correct_answer && a.sort().join(',') === q.correct_answer) correctCount++; else wrongCount++
        } else if (q.correct_answer && a === q.correct_answer) correctCount++
        else wrongCount++
      })
      const resultData = {
        score: finalScore,
        correctCount,
        wrongCount,
        totalQuestions: questions.length,
        questions,
        answers: allAnswers,
        examTitle: currentExam?.title || '',
      }
      localStorage.setItem(`exam_result_${examId}`, JSON.stringify(resultData))

      localStorage.removeItem(`answers_${examId}`)
      localStorage.removeItem(`exam_start_${examId}`)
      // Mark as completed
      const completed = JSON.parse(localStorage.getItem('completed_exams') || '{}')
      completed[examId] = Date.now()
      localStorage.setItem('completed_exams', JSON.stringify(completed))
      // Exit fullscreen
      try { document.exitFullscreen?.() } catch {}
      resetExam()
      navigate(`/result/${examId}`)
    } catch { setToast({ type: 'error', message: 'Gagal submit' }); setIsSubmitting(false) }
  }

  const calculateScore = (answersMap) => {
    let earnedScore = 0
    let totalScore = 0
    questions.forEach((q) => {
      const weight = q.score || 1
      totalScore += weight
      const a = answersMap[q.id]
      if (!a) return
      const type = q.type
      let isCorrect = false
      if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
        if (q.correct_answer) isCorrect = isEssayCorrect(a, q.correct_answer)
      } else if (type === 'menjodohkan' || type === 'matching') {
        isCorrect = isMatchingCorrect(a, q.matching_pairs)
      } else if (Array.isArray(a)) {
        if (q.correct_answer) isCorrect = a.sort().join(',') === q.correct_answer
      } else if (q.correct_answer) {
        isCorrect = a === q.correct_answer
      }
      if (isCorrect) earnedScore += weight
    })
    return totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0
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
  const isMarked = (markedQuestions || []).includes(currentQuestion?.id)
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
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt.id} checked={currentAnswer === opt.id} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="ml-3 text-sm"><RichText text={opt.text || opt.option_text} /></span>
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
              }} className="w-4 h-4 text-blue-600 rounded flex-shrink-0" />
              <span className="ml-3 text-sm"><RichText text={opt.text || opt.option_text} /></span>
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
            <label key={opt} className={`flex items-center justify-center p-5 border-2 rounded-xl cursor-pointer transition text-center ${
              currentAnswer === opt
                ? opt === 'Benar'
                  ? 'border-green-500 bg-green-100 shadow-md'
                  : 'border-red-500 bg-red-100 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name={`q-${currentQuestion.id}`} value={opt} checked={currentAnswer === opt} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="sr-only" />
              <span className={`text-base font-bold ${
                currentAnswer === opt
                  ? opt === 'Benar' ? 'text-green-700' : 'text-red-700'
                  : 'text-gray-600'
              }`}>{opt === 'Benar' ? '✓ Benar' : '✗ Salah'}</span>
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
    <div className="min-h-[100dvh] bg-gray-50 pb-16">
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
                  markedQuestions.includes(q.id) ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >{idx + 1}</button>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>🟢 {answeredCount} dijawab</span>
            <span>🟡 {(markedQuestions || []).length} ditandai</span>
            <span>⚪ {questions.length - answeredCount} belum</span>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <RichText text={currentQuestion.question_text} className="text-sm font-medium text-gray-900 mb-4 block" />
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

      {/* Violation Overlay with Countdown */}
      {showWarning && (
        <div className="fixed inset-0 bg-red-900/95 z-[9999] flex items-center justify-center p-4">
          <div className="text-center text-white max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-700 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">PELANGGARAN TERDETEKSI</h2>
            <p className="text-red-200 mb-4">Anda terdeteksi keluar dari halaman ujian</p>

            <div className="bg-red-800 rounded-2xl p-6 mb-4">
              <p className="text-sm text-red-300 mb-1">Pelanggaran ke-</p>
              <p className="text-5xl font-bold text-white">{violations}</p>
            </div>

            {warningCountdown > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-red-300 mb-2">Anda harus menunggu sebelum melanjutkan</p>
                <div className="w-24 h-24 mx-auto rounded-full border-4 border-red-400 flex items-center justify-center">
                  <span className="text-4xl font-bold">{warningCountdown}</span>
                </div>
                <p className="text-xs text-red-400 mt-3">Pelanggaran dicatat dan dilaporkan ke pengawas</p>
              </div>
            ) : (
              <button
                onClick={() => { setShowWarning(false); try { document.documentElement.requestFullscreen?.() } catch {} }}
                className="w-full py-3 bg-white text-red-900 rounded-xl font-bold text-sm hover:bg-red-100 transition"
              >
                Kembali ke Ujian
              </button>
            )}

            {violations >= 3 && (
              <p className="text-xs text-red-400 mt-3">⚠️ Pelanggaran berulang dapat mengakibatkan ujian dibatalkan</p>
            )}
          </div>
        </div>
      )}

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
