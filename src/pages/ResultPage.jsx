import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components'
import { CheckCircle, XCircle, Home, ArrowLeft } from 'lucide-react'

export const ResultPage = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`exam_result_${examId}`)
      if (cached) {
        setResult(JSON.parse(cached))
      }
    } catch {}
    setIsLoading(false)
  }, [examId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Hasil ujian tidak ditemukan</p>
          <Button onClick={() => navigate('/student/exams')}>Kembali</Button>
        </div>
      </div>
    )
  }

  const { score, correctCount, wrongCount, totalQuestions, questions, answers, examTitle } = result

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-5">
        <button onClick={() => navigate('/student/exams')} className="flex items-center gap-1 text-blue-100 text-sm mb-2">
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 className="text-lg font-bold">Hasil Ujian</h1>
        {examTitle && <p className="text-blue-100 text-sm mt-0.5">{examTitle}</p>}
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
              <p className="text-xl font-bold text-gray-600">{totalQuestions}</p>
              <p className="text-[11px] text-gray-700">Total Soal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="px-4 mt-4 space-y-3">
        <h2 className="font-bold text-gray-800">Detail Jawaban</h2>
        {(questions || []).map((q, idx) => {
          const userAnswer = answers?.[q.id]
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
              </div>
            </div>
          )
        })}
      </div>

      {/* Back button */}
      <div className="px-4 mt-6">
        <Button onClick={() => navigate('/student/exams')} className="w-full flex items-center justify-center gap-2">
          <Home size={18} /> Kembali ke Daftar Ujian
        </Button>
      </div>
    </div>
  )
}

function getIsCorrect(question, userAnswer) {
  if (!userAnswer || !question.correct_answer) return false
  if (Array.isArray(userAnswer)) {
    return userAnswer.sort().join(',') === question.correct_answer
  }
  return userAnswer === question.correct_answer
}

function formatAnswer(question, userAnswer) {
  if (!userAnswer) return '(tidak dijawab)'
  const opts = question.options || []
  if (Array.isArray(userAnswer)) {
    return userAnswer.map((a) => {
      const opt = opts.find((o) => o.id === a)
      return opt ? (opt.text || opt.option_text) : a
    }).join(', ') || '(tidak dijawab)'
  }
  if (typeof userAnswer === 'object') {
    return Object.entries(userAnswer).map(([k, v]) => `${parseInt(k) + 1}: ${v}`).join(', ')
  }
  const opt = opts.find((o) => o.id === userAnswer)
  return opt ? (opt.text || opt.option_text) : userAnswer
}

function formatCorrectAnswer(question) {
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
