import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { isEssayCorrect } from '../utils/helpers'

export function ReviewAnswersPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [examTitle, setExamTitle] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadReviewData()
  }, [sessionId])

  const loadReviewData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Get session info
      const { data: session, error: sessErr } = await supabase
        .from('exam_sessions')
        .select('id, exam_id, score, student_id, exams(title)')
        .eq('id', sessionId)
        .single()

      if (sessErr) throw sessErr
      if (!session) throw new Error('Sesi tidak ditemukan')
      if (session.student_id !== user?.id) throw new Error('Akses ditolak')

      setExamTitle(session.exams?.title || 'Ujian')
      setScore(session.score || 0)

      // 2. Get questions for this exam
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('id, question_text, type, options, correct_answer, "order"')
        .eq('exam_id', session.exam_id)
        .order('"order"', { ascending: true })

      if (qErr) throw qErr
      setQuestions(qData || [])

      // 3. Get student's answers for this session
      const { data: aData, error: aErr } = await supabase
        .from('answers')
        .select('question_id, answer_text')
        .eq('session_id', sessionId)

      if (aErr) throw aErr

      // Map answers by question_id
      const ansMap = {}
      ;(aData || []).forEach((a) => {
        ansMap[a.question_id] = a.answer_text
      })
      setAnswers(ansMap)
    } catch (err) {
      console.error('Failed to load review:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getIsCorrect = (question, userAnswer) => {
    if (!userAnswer || !question.correct_answer) return false
    const type = question.type
    if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
      return isEssayCorrect(userAnswer, question.correct_answer)
    }
    if (Array.isArray(userAnswer)) {
      return userAnswer.sort().join(',') === question.correct_answer
    }
    return userAnswer === question.correct_answer
  }

  const formatAnswer = (question, userAnswer) => {
    if (!userAnswer) return '(tidak dijawab)'
    const opts = question.options || []
    if (Array.isArray(userAnswer)) {
      return userAnswer.map((a) => {
        const opt = opts.find((o) => o.id === a)
        return opt ? (opt.text || opt.option_text) : a
      }).join(', ') || '(tidak dijawab)'
    }
    if (typeof userAnswer === 'object' && !Array.isArray(userAnswer)) {
      return Object.entries(userAnswer).map(([k, v]) => `${parseInt(k) + 1}: ${v}`).join(', ')
    }
    const opt = opts.find((o) => o.id === userAnswer)
    return opt ? (opt.text || opt.option_text) : userAnswer
  }

  const formatCorrectAnswer = (question) => {
    const opts = question.options || []
    const correct = question.correct_answer
    if (!correct) return '-'
    if (correct.includes(',')) {
      return correct.split(',').map((a) => {
        const opt = opts.find((o) => o.id === a.trim())
        return opt ? (opt.text || opt.option_text) : a
      }).join(', ')
    }
    const opt = opts.find((o) => o.id === correct)
    return opt ? (opt.text || opt.option_text) : correct
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate('/results')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kembali</button>
        </div>
      </div>
    )
  }

  const correctCount = questions.filter((q) => getIsCorrect(q, answers[q.id])).length
  const wrongCount = questions.length - correctCount

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-5">
        <button onClick={() => navigate('/results')} className="flex items-center gap-1 text-blue-100 text-sm mb-2">
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 className="text-lg font-bold">Review Jawaban</h1>
        <p className="text-blue-100 text-sm mt-0.5">{examTitle}</p>
      </div>

      {/* Score Summary */}
      <div className="px-4 -mt-2">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-center mb-4">
            <p className="text-5xl font-bold text-blue-600">{score}</p>
            <p className="text-sm text-gray-500 mt-1">Nilai</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-600">{correctCount}</p>
              <p className="text-[11px] text-green-700">Benar</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xl font-bold text-red-600">{wrongCount}</p>
              <p className="text-[11px] text-red-700">Salah</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-600">{questions.length}</p>
              <p className="text-[11px] text-gray-700">Total Soal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="px-4 mt-4 space-y-3">
        <h2 className="font-bold text-gray-800">Detail Jawaban</h2>
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id]
          const isCorrect = getIsCorrect(q, userAnswer)
          return (
            <div key={q.id} className={`bg-white rounded-xl p-4 border-2 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-start gap-2 mb-2">
                <span className={`flex-shrink-0 mt-0.5 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                  {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </span>
                <p className="text-sm font-medium text-gray-900">{idx + 1}. {q.question_text}</p>
              </div>
              <div className="ml-7 space-y-1 text-sm">
                <p className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  <span className="font-medium">Jawaban Anda:</span> {formatAnswer(q, userAnswer)}
                </p>
                {!isCorrect && (
                  <p className="text-green-700">
                    <span className="font-medium">Jawaban Benar:</span> {formatCorrectAnswer(q)}
                  </p>
                )}
                {/* Tampilkan info normalisasi untuk essay */}
                {(q.type === 'uraian_singkat' || q.type === 'short_answer' || q.type === 'essay') && isCorrect && userAnswer !== q.correct_answer && (
                  <p className="text-xs text-blue-500 italic">✓ Dinilai benar (case-insensitive)</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Back button */}
      <div className="px-4 mt-6">
        <button onClick={() => navigate('/results')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
          Kembali ke Hasil Ujian
        </button>
      </div>
    </div>
  )
}
